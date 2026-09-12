const express = require('express');
const router = express.Router();
const Round = require('../models/Round');
const Branch = require('../models/Branch');
const Allocation = require('../models/Allocation');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/round/current
// @desc    Get current round status (PUBLIC)
router.get('/current', async (req, res) => {
  try {
    let round = await Round.findOne().sort({ createdAt: -1 });
    if (!round) {
      round = new Round({ name: 'Spot Round 2025-26', status: 'demo', isDemo: true });
      await round.save();
    }
    res.json(round);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/round/announcement
// @desc    Update the public announcement banner (ADMIN)
router.put('/announcement', auth, adminOnly, async (req, res) => {
  try {
    const round = await Round.findOne().sort({ createdAt: -1 });
    if (!round) return res.status(404).json({ message: 'No round found' });

    const { announcementText, announcementEnabled, announcementDirection, resetToDefault } = req.body;

    if (resetToDefault) {
      round.announcementText = 'THIS FORM IS ONLY FOR STUDENTS APPLYING FOR 1ST YEAR ACAP / SPOT ROUND REGISTRATION';
    } else if (typeof announcementText === 'string') {
      round.announcementText = announcementText.trim().slice(0, 500);
    }
    if (typeof announcementEnabled === 'boolean') round.announcementEnabled = announcementEnabled;
    if (announcementDirection === 'ltr' || announcementDirection === 'rtl') round.announcementDirection = announcementDirection;
    await round.save();

    const io = req.app.get('io');
    io.emit('announcement-update', { round: round.toJSON(), updatedAt: new Date() });
    res.json({ message: 'Announcement updated', round });
  } catch (error) {
    console.error('Announcement update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/round/alert
// @desc    Broadcast an instant live alert popup to ALL connected users (ADMIN)
router.post('/alert', auth, adminOnly, async (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ message: 'Alert message required' });
    const alertTypes = ['info', 'success', 'warning', 'urgent'];
    const alertType = alertTypes.includes(type) ? type : 'info';
    const io = req.app.get('io');
    io.emit('admin-alert', {
      message: message.trim().slice(0, 300),
      type: alertType,
      sentAt: new Date(),
      sentBy: req.user.fullName || 'Admin'
    });
    res.json({ message: 'Alert broadcast sent', count: io.engine.clientsCount });
  } catch (error) {
    console.error('Alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/round/initialize
// @desc    Initialize a new round (ADMIN) - preserves seats and allocations
router.post('/initialize', auth, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;

    // Get the previous round to determine next round number
    const prevRound = await Round.findOne().sort({ createdAt: -1 });
    const nextRoundNumber = prevRound ? (prevRound.roundNumber || 1) + 1 : 1;

    // Mark previous rounds as completed
    await Round.updateMany({ status: { $ne: 'completed' } }, { status: 'completed', endedAt: new Date() });

    // Create new round in setup mode — seats and allocations are PRESERVED
    const round = new Round({
      name: name || `Spot Round 2025-26 — Round ${nextRoundNumber}`,
      status: 'setup',
      isDemo: false,
      roundNumber: nextRoundNumber,
      description: `Round ${nextRoundNumber} — seats and previous allocations preserved`
    });
    await round.save();

    const io = req.app.get('io');
    io.emit('round-update', { round: round.toJSON(), updatedAt: new Date() });

    res.json({
      message: `Round ${nextRoundNumber} initialized. Existing seats and allocations are preserved.`,
      round
    });
  } catch (error) {
    console.error('Initialize round error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/round/start
// @desc    Start the round (change status to active)
router.post('/start', auth, adminOnly, async (req, res) => {
  try {
    const round = await Round.findOne().sort({ createdAt: -1 });
    if (!round) return res.status(404).json({ message: 'No round found' });

    round.status = 'active';
    round.startedAt = new Date();

    // Calculate total initial seats
    const branches = await Branch.find({ isActive: true });
    let totalSeats = 0;
    for (const b of branches) {
      totalSeats += b.totalVacant;
    }
    round.totalSeatsInitial = totalSeats;
    await round.save();

    const io = req.app.get('io');
    io.emit('round-update', { round: round.toJSON(), updatedAt: new Date() });

    res.json({ message: 'Round started!', round });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/round/pause
router.post('/pause', auth, adminOnly, async (req, res) => {
  try {
    const round = await Round.findOne().sort({ createdAt: -1 });
    if (!round) return res.status(404).json({ message: 'No round found' });
    round.status = 'paused';
    await round.save();

    const io = req.app.get('io');
    io.emit('round-update', { round: round.toJSON(), updatedAt: new Date() });

    res.json({ message: 'Round paused', round });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/round/end
router.post('/end', auth, adminOnly, async (req, res) => {
  try {
    const round = await Round.findOne().sort({ createdAt: -1 });
    if (!round) return res.status(404).json({ message: 'No round found' });
    round.status = 'completed';
    round.endedAt = new Date();

    const allocated = await Allocation.countDocuments({ status: { $ne: 'cancelled' } });
    round.totalSeatsAllocated = allocated;
    await round.save();

    const io = req.app.get('io');
    io.emit('round-update', { round: round.toJSON(), updatedAt: new Date() });

    res.json({ message: 'Round completed', round });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/round/break
// @desc    Start or end a break (tea/lunch) — broadcasts overlay to all connected users (ADMIN)
router.post('/break', auth, adminOnly, async (req, res) => {
  try {
    const { action, type } = req.body;
    const io = req.app.get('io');

    if (action === 'start') {
      const breakTypes = ['tea', 'lunch'];
      if (!breakTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid break type. Use "tea" or "lunch".' });
      }
      io.emit('break-start', { type, startedAt: new Date() });
      res.json({ message: `${type} break started`, type });
    } else if (action === 'end') {
      io.emit('break-end', { endedAt: new Date() });
      res.json({ message: 'Break ended' });
    } else {
      res.status(400).json({ message: 'Invalid action. Use "start" or "end".' });
    }
  } catch (error) {
    console.error('Break control error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
