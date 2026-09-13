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

  const cat = seatCategory || 'OPEN';
  const st = seatType || 'general';

  const isSponsoredPool = (seatPool === 'sponsoredSeats' || seatPool === 'sponsored');
  const matrix = isSponsoredPool ? branch.sponsoredDetails : branch.nonSponsoredDetails;

  let done = false;

  if (matrix) {
    if (cat === 'PwCR' || cat === 'DEFCR') {
      if (typeof matrix[cat] === 'number' && matrix[cat] > 0) {
        matrix[cat] -= 1;
        done = true;
      }
    } else if (cat === 'OPEN' && (st === 'pw' || st === 'def')) {
      if (matrix.OPEN && typeof matrix.OPEN[st] === 'number' && matrix.OPEN[st] > 0) {
        matrix.OPEN[st] -= 1;
        done = true;
      } else if (matrix.OPEN && matrix.OPEN.general > 0) {
        matrix.OPEN.general -= 1;
        done = true;
      }
    } else if (matrix[cat]) {
      if (typeof matrix[cat][st] === 'number' && matrix[cat][st] > 0) {
        matrix[cat][st] -= 1;
        done = true;
      } else if (st !== 'general' && typeof matrix[cat].general === 'number' && matrix[cat].general > 0) {
        matrix[cat].general -= 1;
        done = true;
      } else if (matrix.OPEN && matrix.OPEN.general > 0) {
        matrix.OPEN.general -= 1;
        done = true;
      }
    } else if (matrix.OPEN && matrix.OPEN.general > 0) {
      matrix.OPEN.general -= 1;
      done = true;
    }
  }

  if (!done) {
    if (isSponsoredPool) {
      if ((branch.sponsoredVacant || 0) <= 0) throw new Error('No sponsored seats available in this branch');
      branch.sponsoredVacant -= 1;
    } else {
      if ((branch.nonSponsoredVacant || 0) > 0) {
        branch.nonSponsoredVacant -= 1;
      } else if (branch.stateLevel && branch.stateLevel[cat] && branch.stateLevel[cat][st] > 0) {
        branch.stateLevel[cat][st] -= 1;
      } else {
        throw new Error('No vacant seats available in this branch for selected category');
      }
    }
  }

  branch.markModified('nonSponsoredDetails');
  branch.markModified('sponsoredDetails');
  branch.markModified('stateLevel');
  await branch.save();
  return branch;
}

// Helper: Increment a seat back (for cancellation or branch upgrade release)
async function incrementSeat(branchId, seatPool, seatCategory, seatType) {
  const branch = await Branch.findById(branchId);
  if (!branch) throw new Error('Branch not found');

  const cat = seatCategory || 'OPEN';
  const st = seatType || 'general';

  const isSponsoredPool = (seatPool === 'sponsoredSeats' || seatPool === 'sponsored');
  const matrix = isSponsoredPool ? branch.sponsoredDetails : branch.nonSponsoredDetails;

  if (matrix) {
    if (cat === 'PwCR' || cat === 'DEFCR') {
      matrix[cat] = (matrix[cat] || 0) + 1;
    } else if (cat === 'OPEN' && (st === 'pw' || st === 'def')) {
      if (!matrix.OPEN) matrix.OPEN = {};
      matrix.OPEN[st] = (matrix.OPEN[st] || 0) + 1;
    } else if (matrix[cat]) {
      if (typeof matrix[cat][st] === 'number') {
        matrix[cat][st] += 1;
      } else {
        matrix[cat].general = (matrix[cat].general || 0) + 1;
      }
    } else {
      if (isSponsoredPool) {
        branch.sponsoredVacant = (branch.sponsoredVacant || 0) + 1;
      } else {
        branch.nonSponsoredVacant = (branch.nonSponsoredVacant || 0) + 1;
      }
    }
  } else {
    if (isSponsoredPool) {
      branch.sponsoredVacant = (branch.sponsoredVacant || 0) + 1;
    } else {
      branch.nonSponsoredVacant = (branch.nonSponsoredVacant || 0) + 1;
    }
  }

  branch.markModified('nonSponsoredDetails');
  branch.markModified('sponsoredDetails');
  branch.markModified('stateLevel');
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

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const fromBranch = await Branch.findById(fromBranchId);
    if (!fromBranch) return res.status(404).json({ message: 'Source (FROM) branch not found' });

    const toBranch = await Branch.findById(toBranchId);
    if (!toBranch) return res.status(404).json({ message: 'Target (TO) branch not found' });

    const isSponsored = student.candidateType === 'Sponsored' || student.candidateType === 'Experienced With Sponsorship' || student.isSponsored === true;
    const defaultPool = isSponsored ? 'sponsoredSeats' : 'nonSponsoredSeats';

    const toPool = toSeatPool || defaultPool;
    const fromPool = fromSeatPool || defaultPool;

    // Check TO branch seat availability
    const toMatrix = (toPool === 'sponsoredSeats' || toPool === 'sponsored') ? toBranch.sponsoredDetails : toBranch.nonSponsoredDetails;
    let toHasSeats = false;
    if (toMatrix) {
      if (toSeatCategory === 'PwCR' || toSeatCategory === 'DEFCR') {
        toHasSeats = (toMatrix[toSeatCategory] || 0) > 0;
      } else if (toSeatCategory === 'OPEN' && (toSeatType === 'pw' || toSeatType === 'def')) {
        toHasSeats = (toMatrix.OPEN?.[toSeatType] || 0) > 0 || (toMatrix.OPEN?.general || 0) > 0;
      } else if (toMatrix[toSeatCategory]) {
        toHasSeats = (toMatrix[toSeatCategory]?.[toSeatType] || 0) > 0 || (toMatrix[toSeatCategory]?.general || 0) > 0 || (toMatrix.OPEN?.general || 0) > 0;
      }
    }
    if (!toHasSeats) {
      if (toPool === 'sponsoredSeats' || toPool === 'sponsored') {
        toHasSeats = (toBranch.sponsoredVacant || 0) > 0;
      } else {
        toHasSeats = (toBranch.nonSponsoredVacant || 0) > 0 || (toBranch.totalVacant || 0) > 0;
      }
    }

    if (!toHasSeats) {
      return res.status(400).json({ message: `No vacant seat available in target branch (${toBranch.name}) for selected category/type` });
    }

    const io = req.app.get('io');

    const updatedFromBranch = await incrementSeat(fromBranchId, fromPool, fromSeatCategory, fromSeatType);
    const updatedToBranch = await decrementSeat(toBranchId, toPool, toSeatCategory, toSeatType);

    await Allocation.updateMany(
      { student: studentId, status: { $ne: 'cancelled' } },
      { status: 'cancelled' }
    );

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

    student.allocationStatus = 'allocated';
    student.allocatedBranch = toBranchId;
    student.allocatedSeatCategory = toSeatCategory;
    student.allocatedSeatType = toSeatType;
    await student.save();

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

    const currentRound = await Round.findOne().sort({ createdAt: -1 });

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.allocationStatus === 'allocated' || student.allocationStatus === 'confirmed') {
      return res.status(400).json({ message: 'Student already has an active allocation' });
    }

    const pool = seatPool || (student.candidateType === 'Sponsored' || student.candidateType === 'Experienced With Sponsorship' || student.isSponsored ? 'sponsoredSeats' : 'nonSponsoredSeats');
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

    const currentRound = await Round.findOne().sort({ createdAt: -1 });
    const currentRoundId = currentRound ? currentRound._id : null;

    const allPending = await User.find({
      role: 'student',
      allocationStatus: 'pending'
    }).sort({ mhtCetPercentile: -1, mhtCetScore: -1, sscAggregate: -1 });

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

    for (const student of pendingStudents) {
      const eligibleBranches = branches;
      let allocated = false;

      const isSponsored = student.candidateType === 'Sponsored' || student.candidateType === 'Experienced With Sponsorship' || student.isSponsored === true;
      const targetPool = isSponsored ? 'sponsoredSeats' : 'nonSponsoredSeats';

      for (const branch of eligibleBranches) {
        if (allocated) break;

        const isFemale = student.gender === 'Female';
        const effectiveCat = (student.studentType === 'Non-CAP') ? 'OPEN' : student.category;

        const seatAttempts = [];

        if (student.isOrphan) {
          seatAttempts.push({ pool: targetPool, cat: 'ORPHAN', type: 'general', label: 'Orphan' });
        }

        if (student.isPWD) {
          seatAttempts.push({ pool: targetPool, cat: 'PwCR', type: null, label: 'PwCR' });
          seatAttempts.push({ pool: targetPool, cat: 'OPEN', type: 'pw', label: 'OPEN-PW' });
        }

        if (student.isDEF) {
          seatAttempts.push({ pool: targetPool, cat: 'DEFCR', type: null, label: 'DEFCR' });
          seatAttempts.push({ pool: targetPool, cat: 'OPEN', type: 'def', label: 'OPEN-DEF' });
        }

        if (effectiveCat !== 'OPEN' && effectiveCat !== 'EWS') {
          if (isFemale) {
            seatAttempts.push({ pool: targetPool, cat: effectiveCat, type: 'ladies', label: `${effectiveCat}-L` });
          }
          seatAttempts.push({ pool: targetPool, cat: effectiveCat, type: 'general', label: `${effectiveCat}-G` });
        }

        if (isFemale) {
          seatAttempts.push({ pool: targetPool, cat: 'OPEN', type: 'ladies', label: 'OPEN-L' });
        }
        seatAttempts.push({ pool: targetPool, cat: 'OPEN', type: 'general', label: 'OPEN-G' });

        for (const attempt of seatAttempts) {
          try {
            const freshBranch = await Branch.findById(branch._id);
            if (!freshBranch) continue;

            const matrix = isSponsored ? freshBranch.sponsoredDetails : freshBranch.nonSponsoredDetails;
            let hasSeats = false;
            if (matrix) {
              if (attempt.cat === 'PwCR' || attempt.cat === 'DEFCR') {
                hasSeats = (matrix[attempt.cat] || 0) > 0;
              } else if (attempt.cat === 'OPEN' && (attempt.type === 'pw' || attempt.type === 'def')) {
                hasSeats = (matrix.OPEN?.[attempt.type] || 0) > 0 || (matrix.OPEN?.general || 0) > 0;
              } else if (matrix[attempt.cat]) {
                hasSeats = (matrix[attempt.cat]?.[attempt.type] || 0) > 0 || (matrix[attempt.cat]?.general || 0) > 0 || (matrix.OPEN?.general || 0) > 0;
              }
            }
            if (!hasSeats) {
              if (isSponsored) {
                hasSeats = (freshBranch.sponsoredVacant || 0) > 0;
              } else {
                hasSeats = (freshBranch.nonSponsoredVacant || 0) > 0;
              }
            }

            if (!hasSeats) continue;

            const updatedBranch = await decrementSeat(branch._id, attempt.pool, attempt.cat, attempt.type);

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

            student.allocationStatus = 'allocated';
            student.allocatedBranch = branch._id;
            student.allocatedSeatCategory = attempt.cat || effectiveCat;
            student.allocatedSeatType = attempt.type || 'general';
            await student.save();

            allocations.push(allocation);

            io.emit('seat-update', {
              branchId: updatedBranch._id,
              branch: updatedBranch.toJSON(),
              updatedAt: new Date()
            });
            io.emit('allocation-update', {
              studentId: student._id,
              updatedAt: new Date()
            });

            console.log(`✅ Auto-allocated (${targetPool}): ${student.applicationId} → ${branch.name} [${attempt.label}]`);
            allocated = true;
            break;

          } catch (err) {
            continue;
          }
        }

        if (allocated) break;
      }
    }

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
