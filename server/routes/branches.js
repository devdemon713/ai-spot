const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/branches
// @desc    Get all branches with seat data (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;

    const branches = await Branch.find(filter).sort({ choiceCode: 1 });
    res.json(branches);
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/branches/:id
// @desc    Get single branch details (PUBLIC)
router.get('/:id', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    res.json(branch);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/branches/:id
// @desc    Update branch seat data (ADMIN) - broadcasts via Socket.IO
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Broadcast seat update to all connected clients
    const io = req.app.get('io');
    io.emit('seat-update', {
      branchId: branch._id,
      branch: branch.toJSON(),
      updatedAt: new Date()
    });

    res.json(branch);
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/branches/:id/reset
// @desc    Reset branch seats to zero (ADMIN) - for initializing actual round
router.put('/:id/reset', auth, adminOnly, async (req, res) => {
  try {
    const emptySlot = { general: 0, ladies: 0 };
    const emptyCategories = {
      OPEN: { ...emptySlot }, SC: { ...emptySlot }, ST: { ...emptySlot },
      VJ_DT: { ...emptySlot }, NTB: { ...emptySlot }, NTC: { ...emptySlot },
      NTD: { ...emptySlot }, OBC: { ...emptySlot }, SEBC: { ...emptySlot }
    };

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          stateLevel: emptyCategories,
          pwd: emptyCategories,
          def: emptyCategories,
          pwdCommonReserved: 0,
          defCommonReserved: 0,
          ewsSeats: 0,
          allIndiaSeats: 0,
          instituteSeats: 0,
          orphanSeats: 0,
          minoritySeats: 0
        }
      },
      { new: true }
    );

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const io = req.app.get('io');
    io.emit('seat-update', {
      branchId: branch._id,
      branch: branch.toJSON(),
      updatedAt: new Date()
    });

    res.json(branch);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/branches/reset-all
// @desc    Reset ALL branch seats to zero (ADMIN) - for starting actual round
router.post('/reset-all', auth, adminOnly, async (req, res) => {
  try {
    const emptySlot = { general: 0, ladies: 0 };
    const emptyCategories = {
      OPEN: { ...emptySlot }, SC: { ...emptySlot }, ST: { ...emptySlot },
      VJ_DT: { ...emptySlot }, NTB: { ...emptySlot }, NTC: { ...emptySlot },
      NTD: { ...emptySlot }, OBC: { ...emptySlot }, SEBC: { ...emptySlot }
    };

    await Branch.updateMany({}, {
      $set: {
        stateLevel: emptyCategories,
        pwd: emptyCategories,
        def: emptyCategories,
        pwdCommonReserved: 0,
        defCommonReserved: 0,
        ewsSeats: 0,
        allIndiaSeats: 0,
        instituteSeats: 0,
        orphanSeats: 0,
        minoritySeats: 0
      }
    });

    const branches = await Branch.find({ isActive: true });

    const io = req.app.get('io');
    io.emit('seats-reset', { branches, updatedAt: new Date() });

    res.json({ message: 'All seats reset. Ready to enter actual vacancy data.', branches });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
