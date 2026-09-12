const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Branch = require('../models/Branch');
const Allocation = require('../models/Allocation');
const Round = require('../models/Round');
const { auth, adminOnly } = require('../middleware/auth');

// Helper: Push allocation news into the announcement ticker in real-time
async function pushAllocationAnnouncement(io, studentName, branchName, branchType, category, seatType) {
  try {
    const round = await Round.findOne().sort({ createdAt: -1 });
    if (!round) return;
    const typeLabel = seatType === 'ladies' ? '(Ladies)' : '';
    const newEntry = `🎉 ${studentName} secured ${branchName} (${branchType}) — ${category} ${typeLabel} seat`;
    // Keep existing text, prepend new entry with separator
    const existing = round.announcementText || '';
    // Extract the base static text (everything after the last '|' separator or full text)
    const parts = existing.split('  |  ');
    // Keep only the latest 5 allocation entries + original base text
    const allocParts = parts.filter(p => p.startsWith('🎉')).slice(0, 4);
    const baseParts  = parts.filter(p => !p.startsWith('🎉'));
    const combined = [newEntry, ...allocParts, ...baseParts].join('  |  ');
    round.announcementText = combined.slice(0, 500);
    await round.save();
    io.emit('announcement-update', { round: round.toJSON(), updatedAt: new Date() });
  } catch (e) {
    console.error('Announcement push error:', e.message);
  }
}

// Helper: Decrement a seat from a branch
async function decrementSeat(branchId, seatPool, seatCategory, seatType) {
  const branch = await Branch.findById(branchId);
  if (!branch) throw new Error('Branch not found');

  if (seatPool === 'stateLevel' || seatPool === 'pwd' || seatPool === 'def') {
    if (!branch[seatPool] || !branch[seatPool][seatCategory] || branch[seatPool][seatCategory][seatType] <= 0) {
      throw new Error('No seats available in this category');
    }
    branch[seatPool][seatCategory][seatType] -= 1;
  } else {
    // Scalar pools: ewsSeats, minoritySeats, orphanSeats, pwdCommonReserved, defCommonReserved
    if ((branch[seatPool] || 0) <= 0) {
      throw new Error('No seats available in this pool');
    }
    branch[seatPool] -= 1;
  }

  await branch.save();
  return branch;
}

// Helper: Increment a seat back (for cancellation)
async function incrementSeat(branchId, seatPool, seatCategory, seatType) {
  const branch = await Branch.findById(branchId);
  if (!branch) throw new Error('Branch not found');

  if (seatPool === 'stateLevel' || seatPool === 'pwd' || seatPool === 'def') {
    if (!branch[seatPool][seatCategory]) {
      branch[seatPool][seatCategory] = { general: 0, ladies: 0 };
    }
    branch[seatPool][seatCategory][seatType] += 1;
  } else {
    branch[seatPool] = (branch[seatPool] || 0) + 1;
  }

  await branch.save();
  return branch;
}

// @route   POST /api/allocation/upgrade
// @desc    Branch Upgrade — student moves from CAP-allotted branch to a better spot-round branch.
//          FROM branch seat → +1 (returned to pool, visible live)
//          TO   branch seat → -1 (new allocation)
router.post('/upgrade', auth, adminOnly, async (req, res) => {
  try {
    const {
      studentId,
      fromBranchId, fromSeatPool, fromSeatCategory, fromSeatType,
      toBranchId,   toSeatPool,   toSeatCategory,   toSeatType
    } = req.body;

    if (!studentId || !fromBranchId || !toBranchId) {
      return res.status(400).json({ message: 'studentId, fromBranchId, and toBranchId are required' });
    }

    // Validate student exists
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Validate FROM branch exists
    const fromBranch = await Branch.findById(fromBranchId);
    if (!fromBranch) return res.status(404).json({ message: 'Source (FROM) branch not found' });

    // Validate TO branch has available seat
    const toBranch = await Branch.findById(toBranchId);
    if (!toBranch) return res.status(404).json({ message: 'Target (TO) branch not found' });

    const toPool = toSeatPool || 'stateLevel';
    const fromPool = fromSeatPool || 'stateLevel';

    // Check TO branch seat availability
    let toHasSeats = false;
    if (toPool === 'stateLevel' || toPool === 'pwd' || toPool === 'def') {
      toHasSeats = !!(toBranch[toPool] && toBranch[toPool][toSeatCategory] && toBranch[toPool][toSeatCategory][toSeatType] > 0);
    } else {
      toHasSeats = (toBranch[toPool] || 0) > 0;
    }
    if (!toHasSeats) {
      return res.status(400).json({ message: `No vacant seat available in target branch (${toBranch.name}) for selected category/type` });
    }

    const io = req.app.get('io');

    // Step 1: Return FROM branch seat to pool (+1)
    const updatedFromBranch = await incrementSeat(fromBranchId, fromPool, fromSeatCategory, fromSeatType);

    // Step 2: Decrement TO branch seat (-1)
    const updatedToBranch = await decrementSeat(toBranchId, toPool, toSeatCategory, toSeatType);

    // Step 3: Cancel any existing allocation record for this student
    await Allocation.updateMany(
      { student: studentId, status: { $ne: 'cancelled' } },
      { status: 'cancelled' }
    );

    // Step 4: Create new upgrade allocation record
    const allocation = new Allocation({
      student: studentId,
      branch: toBranchId,
      seatCategory: toSeatCategory,
      seatType: toSeatType,
      seatPool: toPool,
      allocatedBy: 'upgrade',
      allocatedByAdmin: req.user._id,
      status: 'allocated',
      upgradeFromBranch: fromBranchId
    });
    await allocation.save();

    // Step 5: Update student record
    student.allocationStatus = 'allocated';
    student.allocatedBranch = toBranchId;
    student.allocatedSeatCategory = toSeatCategory;
    student.allocatedSeatType = toSeatType;
    await student.save();

    // Step 6: Broadcast BOTH branch updates live to all connected users
    io.emit('seat-update', { branchId: updatedFromBranch._id, branch: updatedFromBranch.toJSON(), updatedAt: new Date() });
    io.emit('seat-update', { branchId: updatedToBranch._id,   branch: updatedToBranch.toJSON(),   updatedAt: new Date() });
    io.emit('allocation-update', { studentId: student._id, updatedAt: new Date() });

    console.log(`🔄 Branch Upgrade: ${student.applicationId} | ${fromBranch.name} → ${toBranch.name}`);

    const populated = await Allocation.findById(allocation._id)
      .populate('student', '-password')
      .populate('branch');

    res.status(201).json({
      message: `Branch upgrade successful: ${fromBranch.name} → ${toBranch.name}`,
      allocation: populated,
      fromBranch: updatedFromBranch,
      toBranch: updatedToBranch
    });
  } catch (error) {
    console.error('Branch upgrade error:', error);
    res.status(500).json({ message: error.message || 'Server error during branch upgrade' });
  }
});

// @route   POST /api/allocation/manual
// @desc    Admin manually allocates a student to a branch/seat

router.post('/manual', auth, adminOnly, async (req, res) => {
  try {
    const { studentId, branchId, seatCategory, seatType, seatPool } = req.body;

    // Get current round
    const currentRound = await Round.findOne().sort({ createdAt: -1 });

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.allocationStatus === 'allocated' || student.allocationStatus === 'confirmed') {
      return res.status(400).json({ message: 'Student already has an active allocation' });
    }

    const pool = seatPool || 'stateLevel';
    const branch = await decrementSeat(branchId, pool, seatCategory, seatType);

    const allocation = new Allocation({
      student: studentId,
      branch: branchId,
      seatCategory,
      seatType,
      seatPool: pool,
      allocatedBy: 'manual',
      allocatedByAdmin: req.user._id,
      round: currentRound ? currentRound._id : null,
      status: 'allocated'
    });
    await allocation.save();

    student.allocationStatus = 'allocated';
    student.allocatedBranch = branchId;
    student.allocatedSeatCategory = seatCategory;
    student.allocatedSeatType = seatType;
    await student.save();

    const io = req.app.get('io');
    io.emit('seat-update', { branchId: branch._id, branch: branch.toJSON(), updatedAt: new Date() });
    io.emit('allocation-update', { studentId: student._id, updatedAt: new Date() });
    // Auto-push to announcement ticker
    await pushAllocationAnnouncement(io, student.fullName, branch.name, branch.type, seatCategory, seatType);

    const populated = await Allocation.findById(allocation._id)
      .populate('student', '-password')
      .populate('branch');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Manual allocation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/allocation/auto
// @desc    Auto-allocate all pending students by verified MHT-CET official rules
router.post('/auto', auth, adminOnly, async (req, res) => {
  try {
    const { branchId } = req.body;

    // Get current round
    const currentRound = await Round.findOne().sort({ createdAt: -1 });
    const currentRoundId = currentRound ? currentRound._id : null;

    // ── STEP 1: Sort students by merit ───────────────────────────────────────
    // Official rule: highest MHT-CET percentile first.
    // Tiebreaker 1: MHT-CET raw score descending
    // Tiebreaker 2: SSC aggregate percentage descending
    // Filter out students skipped in the current round
    const allPending = await User.find({
      role: 'student',
      allocationStatus: 'pending'
    }).sort({ mhtCetPercentile: -1, mhtCetScore: -1, sscAggregate: -1 });

    // Exclude students skipped in this round
    const pendingStudents = currentRoundId
      ? allPending.filter(s => !s.skippedInRounds || !s.skippedInRounds.some(r => r.toString() === currentRoundId.toString()))
      : allPending;

    if (pendingStudents.length === 0) {
      return res.json({ message: 'No pending students to allocate', allocations: [] });
    }

    const branchFilter = { isActive: true };
    if (branchId) branchFilter._id = branchId;
    const branches = await Branch.find(branchFilter);

    const allocations = [];
    const io = req.app.get('io');

    // ── STEP 2: Process each student in merit order ──────────────────────────
    for (const student of pendingStudents) {

      // All branches considered — no branch preferences feature
      const eligibleBranches = branches;

      let allocated = false;

      for (const branch of eligibleBranches) {
        if (allocated) break;

        const isFemale = student.gender === 'Female';

        // ── OMS Rule: Non-CAP / Outside Maharashtra State students ───────────
        // Official: OMS candidates treated as OPEN only — no state reservations
        const effectiveCat = (student.studentType === 'Non-CAP') ? 'OPEN' : student.category;

        // ── Build seat attempt list in verified MHT-CET priority order ───────
        //
        // KEY OFFICIAL RULES:
        //  1. Ladies quota (30%) does NOT apply to PWD, DEF, or Orphan seats
        //  2. Ladies quota DOES apply to State Level (regular category) seats
        //  3. Reserved category tries own seats first, then falls back to OPEN
        //  4. PWD/DEF checked before regular category seats
        //  5. Orphan and Minority are highest priority special pools
        //
        const seatAttempts = [];

        // Priority 1: Orphan seats (NO ladies quota per official rules)
        if (student.isOrphan) {
          seatAttempts.push({ pool: 'orphanSeats', cat: null, type: null, label: 'Orphan' });
        }

        // Priority 2: Minority seats (NO ladies quota)
        if (student.isMinority) {
          seatAttempts.push({ pool: 'minoritySeats', cat: null, type: null, label: 'Minority' });
        }

        // Priority 3: PWD seats — own category → OPEN → Common Reserved
        // IMPORTANT: NO ladies quota for PWD seats (official rule)
        if (student.isPWD) {
          if (effectiveCat !== 'OPEN') {
            seatAttempts.push({ pool: 'pwd', cat: effectiveCat, type: 'general', label: `PWD-${effectiveCat}` });
          }
          seatAttempts.push({ pool: 'pwd', cat: 'OPEN', type: 'general', label: 'PWD-OPEN' });
          seatAttempts.push({ pool: 'pwdCommonReserved', cat: null, type: null, label: 'PWD-Common' });
        }

        // Priority 4: DEF seats — own category → OPEN → Common Reserved
        // IMPORTANT: NO ladies quota for DEF seats (official rule)
        if (student.isDEF) {
          if (effectiveCat !== 'OPEN') {
            seatAttempts.push({ pool: 'def', cat: effectiveCat, type: 'general', label: `DEF-${effectiveCat}` });
          }
          seatAttempts.push({ pool: 'def', cat: 'OPEN', type: 'general', label: 'DEF-OPEN' });
          seatAttempts.push({ pool: 'defCommonReserved', cat: null, type: null, label: 'DEF-Common' });
        }

        // Priority 5: EWS seats (supernumerary pool)
        if (effectiveCat === 'EWS') {
          seatAttempts.push({ pool: 'ewsSeats', cat: null, type: null, label: 'EWS' });
        }

        // Priority 6: Own reserved category (State Level)
        // Ladies seat first for female candidates, then General — official 30% ladies rule
        if (effectiveCat !== 'OPEN' && effectiveCat !== 'EWS') {
          if (isFemale) {
            seatAttempts.push({ pool: 'stateLevel', cat: effectiveCat, type: 'ladies', label: `${effectiveCat}-L` });
          }
          seatAttempts.push({ pool: 'stateLevel', cat: effectiveCat, type: 'general', label: `${effectiveCat}-G` });
        }

        // Priority 7: OPEN category (State Level) — fallback for all
        // Ladies seat first for female candidates, then General
        if (isFemale) {
          seatAttempts.push({ pool: 'stateLevel', cat: 'OPEN', type: 'ladies', label: 'OPEN-L' });
        }
        seatAttempts.push({ pool: 'stateLevel', cat: 'OPEN', type: 'general', label: 'OPEN-G' });

        // ── Try each seat attempt in priority order ──────────────────────────
        for (const attempt of seatAttempts) {
          try {
            // Always re-fetch to get latest counts (another student may have taken it)
            const freshBranch = await Branch.findById(branch._id);
            if (!freshBranch) continue;

            // Check availability
            let hasSeats = false;
            if (attempt.pool === 'stateLevel' || attempt.pool === 'pwd' || attempt.pool === 'def') {
              hasSeats = !!(
                freshBranch[attempt.pool] &&
                freshBranch[attempt.pool][attempt.cat] &&
                freshBranch[attempt.pool][attempt.cat][attempt.type] > 0
              );
            } else {
              hasSeats = (freshBranch[attempt.pool] || 0) > 0;
            }

            if (!hasSeats) continue;

            // Decrement seat
            const updatedBranch = await decrementSeat(branch._id, attempt.pool, attempt.cat, attempt.type);

            // Save allocation record
            const allocation = new Allocation({
              student: student._id,
              branch: branch._id,
              seatCategory: attempt.cat || effectiveCat,
              seatType: attempt.type || 'general',
              seatPool: attempt.pool,
              allocatedBy: 'auto',
              allocatedByAdmin: req.user._id,
              round: currentRoundId,
              status: 'allocated'
            });
            await allocation.save();

            // Update student record
            student.allocationStatus = 'allocated';
            student.allocatedBranch = branch._id;
            student.allocatedSeatCategory = attempt.cat || effectiveCat;
            student.allocatedSeatType = attempt.type || 'general';
            await student.save();

            allocations.push(allocation);

            // Broadcast real-time updates
            io.emit('seat-update', {
              branchId: updatedBranch._id,
              branch: updatedBranch.toJSON(),
              updatedAt: new Date()
            });
            io.emit('allocation-update', {
              studentId: student._id,
              updatedAt: new Date()
            });

            console.log(`✅ Auto-allocated: ${student.applicationId} → ${branch.name} [${attempt.label}]`);
            allocated = true;
            break;

          } catch (err) {
            continue; // seat unavailable or taken, try next
          }
        }

        if (allocated) break;
      }

      if (!allocated) {
        console.log(`⚠️  No seat: ${student.applicationId} (${student.category}, ${student.mhtCetPercentile}%ile)`);
      }
    }

    // Broadcast batch complete
    io.emit('allocation-batch-complete', {
      count: allocations.length,
      updatedAt: new Date()
    });

    const populatedAllocations = await Allocation.find({
      _id: { $in: allocations.map(a => a._id) }
    }).populate('student', '-password').populate('branch');

    res.json({
      message: `Successfully allocated ${allocations.length} out of ${pendingStudents.length} students`,
      allocated: allocations.length,
      unallocated: pendingStudents.length - allocations.length,
      allocations: populatedAllocations
    });

  } catch (error) {
    console.error('Auto allocation error:', error);
    res.status(500).json({ message: 'Server error during auto allocation' });
  }
});

// @route   GET /api/allocation/history
// @desc    Get all allocations (admin)
router.get('/history', auth, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.roundId) {
      filter.round = req.query.roundId;
    }
    const allocations = await Allocation.find(filter)
      .populate('student', '-password')
      .populate('branch')
      .populate('round', 'name roundNumber')
      .sort({ createdAt: -1 });
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/allocation/:id
// @desc    Cancel an allocation — returns seat to pool
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const allocation = await Allocation.findById(req.params.id);
    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });

    // Return seat to pool
    const branch = await incrementSeat(
      allocation.branch,
      allocation.seatPool,
      allocation.seatCategory,
      allocation.seatType
    );

    // Reset student status back to pending
    await User.findByIdAndUpdate(allocation.student, {
      allocationStatus: 'pending',
      allocatedBranch: null,
      allocatedSeatCategory: null,
      allocatedSeatType: null
    });

    allocation.status = 'cancelled';
    await allocation.save();

    const io = req.app.get('io');
    io.emit('seat-update', { branchId: branch._id, branch: branch.toJSON(), updatedAt: new Date() });

    res.json({ message: 'Allocation cancelled, seat returned to pool' });
  } catch (error) {
    console.error('Cancel allocation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/allocation/student/:studentId
// @desc    Get allocation for a specific student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.studentId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const allocation = await Allocation.findOne({
      student: req.params.studentId,
      status: { $ne: 'cancelled' }
    }).populate('branch');
    res.json(allocation);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/allocation/skip
// @desc    Skip a student for the current round (ADMIN)
router.post('/skip', auth, adminOnly, async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    const currentRound = await Round.findOne().sort({ createdAt: -1 });
    if (!currentRound) return res.status(400).json({ message: 'No active round' });

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Check if already skipped in this round
    const alreadySkipped = student.skippedInRounds && student.skippedInRounds.some(
      r => r.toString() === currentRound._id.toString()
    );
    if (alreadySkipped) {
      return res.status(400).json({ message: 'Student already skipped in this round' });
    }

    student.skippedInRounds = [...(student.skippedInRounds || []), currentRound._id];
    await student.save();

    console.log(`⏭ Skipped: ${student.applicationId} in Round ${currentRound.roundNumber}`);
    res.json({ message: `${student.fullName} skipped for this round`, studentId: student._id });
  } catch (error) {
    console.error('Skip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/allocation/unskip
// @desc    Unskip a student for the current round (ADMIN)
router.post('/unskip', auth, adminOnly, async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    const currentRound = await Round.findOne().sort({ createdAt: -1 });
    if (!currentRound) return res.status(400).json({ message: 'No active round' });

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    student.skippedInRounds = (student.skippedInRounds || []).filter(
      r => r.toString() !== currentRound._id.toString()
    );
    await student.save();

    console.log(`↩ Unskipped: ${student.applicationId} in Round ${currentRound.roundNumber}`);
    res.json({ message: `${student.fullName} unskipped for this round`, studentId: student._id });
  } catch (error) {
    console.error('Unskip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/allocation/round-summary
// @desc    Get round-wise summary: allocated this round, remaining students, skipped (ADMIN)
router.get('/round-summary', auth, adminOnly, async (req, res) => {
  try {
    const currentRound = await Round.findOne().sort({ createdAt: -1 });
    if (!currentRound) return res.json({ currentRound: null, allocatedThisRound: [], remainingStudents: [], skippedStudents: [] });

    // Allocations made in this round
    const allocatedThisRound = await Allocation.find({
      round: currentRound._id,
      status: { $ne: 'cancelled' }
    }).populate('student', '-password').populate('branch').sort({ createdAt: -1 });

    // All pending students sorted by merit (MHT-CET percentile desc)
    const allPending = await User.find({
      role: 'student',
      allocationStatus: 'pending'
    }).sort({ mhtCetPercentile: -1, mhtCetScore: -1, sscAggregate: -1 });

    // Separate skipped vs remaining
    const skippedStudents = allPending.filter(s =>
      s.skippedInRounds && s.skippedInRounds.some(r => r.toString() === currentRound._id.toString())
    );
    const remainingStudents = allPending.filter(s =>
      !s.skippedInRounds || !s.skippedInRounds.some(r => r.toString() === currentRound._id.toString())
    );

    res.json({
      currentRound: currentRound.toJSON(),
      allocatedThisRound,
      remainingStudents: remainingStudents.map(s => { const o = s.toJSON(); delete o.password; return o; }),
      skippedStudents: skippedStudents.map(s => { const o = s.toJSON(); delete o.password; return o; })
    });
  } catch (error) {
    console.error('Round summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/allocation/export-csv
// @desc    Download CSV of allocated students for a specific round (ADMIN)
router.get('/export-csv', auth, adminOnly, async (req, res) => {
  try {
    const { roundId } = req.query;
    const filter = { status: { $ne: 'cancelled' } };
    let roundLabel = 'all-rounds';

    if (roundId) {
      filter.round = roundId;
      const round = await Round.findById(roundId);
      if (round) {
        roundLabel = (round.name || `Round-${round.roundNumber}`).replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
      }
    }

    const allocations = await Allocation.find(filter)
      .populate('student', '-password')
      .populate('branch')
      .populate('round', 'name roundNumber')
      .sort({ createdAt: 1 });

    // CSV header
    const headers = [
      'Sr No', 'Application ID', 'Full Name', 'Email', 'Phone',
      'MHT-CET Percentile', 'MHT-CET Score', 'JEE Main Percentile',
      'Category', 'Gender', 'Student Type',
      'Is PWD', 'Is DEF', 'Is Orphan', 'Is Minority',
      'Branch Code', 'Branch Name', 'Branch Type',
      'Seat Category', 'Seat Type', 'Seat Pool', 'Allocation Method',
      'Round Name', 'Round Number', 'Status', 'Allocated At'
    ];

    // Escape CSV field (wrap in quotes if contains comma, quote, or newline)
    const esc = (val) => {
      if (val == null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows = allocations.map((a, idx) => {
      const s = a.student || {};
      const b = a.branch || {};
      const r = a.round || {};
      return [
        idx + 1,
        esc(s.applicationId),
        esc(s.fullName),
        esc(s.email),
        esc(s.phone),
        s.mhtCetPercentile || 0,
        s.mhtCetScore || 0,
        s.jeeMainPercentile || 0,
        esc(s.category),
        esc(s.gender),
        esc(s.studentType),
        s.isPWD ? 'Yes' : 'No',
        s.isDEF ? 'Yes' : 'No',
        s.isOrphan ? 'Yes' : 'No',
        s.isMinority ? 'Yes' : 'No',
        esc(b.choiceCode),
        esc(b.name),
        esc(b.type),
        esc(a.seatCategory),
        esc(a.seatType),
        esc(a.seatPool),
        esc(a.allocatedBy),
        esc(r.name),
        r.roundNumber || '',
        esc(a.status),
        a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `allocated-students-${roundLabel}-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ message: 'Server error during CSV export' });
  }
});

module.exports = router;
