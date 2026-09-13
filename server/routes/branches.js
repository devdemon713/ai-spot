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

const Allocation = require('../models/Allocation');

// @route   POST /api/branches
// @desc    Create a new branch with seat matrix (ADMIN)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const {
      choiceCode,
      branchGroup,
      name,
      specialization,
      type,
      sanctionedIntake,
      nonSponsoredDetails,
      sponsoredDetails,
      msSeats,
      minoritySeats,
      allIndiaSeats,
      instituteSeats,
      orphanSeats
    } = req.body;

    if (!choiceCode || !name || !type || sanctionedIntake === undefined) {
      return res.status(400).json({ message: 'Choice Code, Course Name, Type, and Sanctioned Intake are required' });
    }

    const existing = await Branch.findOne({ choiceCode: choiceCode.trim() });
    if (existing) {
      return res.status(400).json({ message: `Branch with Choice Code "${choiceCode}" already exists (${existing.name})` });
    }

    const newBranch = new Branch({
      choiceCode: choiceCode.trim(),
      branchGroup: branchGroup?.trim() || name.trim(),
      name: name.trim(),
      specialization: specialization?.trim() || name.trim(),
      type,
      sanctionedIntake: Number(sanctionedIntake) || 60,
      nonSponsoredDetails: nonSponsoredDetails || {},
      sponsoredDetails: sponsoredDetails || {},
      msSeats: Number(msSeats) || 0,
      minoritySeats: Number(minoritySeats) || 0,
      allIndiaSeats: Number(allIndiaSeats) || 0,
      instituteSeats: Number(instituteSeats) || 0,
      orphanSeats: Number(orphanSeats) || 0,
      isActive: true
    });

    await newBranch.save();

    // Broadcast update to all connected clients
    const io = req.app.get('io');
    if (io) {
      const allBranches = await Branch.find({ isActive: true }).sort({ choiceCode: 1 });
      io.emit('seat-update', {
        branchId: newBranch._id,
        branch: newBranch.toJSON(),
        branches: allBranches.map(b => b.toJSON()),
        updatedAt: new Date()
      });
    }

    res.status(201).json(newBranch);
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ message: error.message || 'Server error creating branch' });
  }
});

// @route   PUT /api/branches/:id
// @desc    Update branch seat data (ADMIN) - broadcasts via Socket.IO
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    Object.assign(branch, req.body);
    if (req.body.nonSponsoredDetails) {
      branch.nonSponsoredDetails = req.body.nonSponsoredDetails;
      branch.markModified('nonSponsoredDetails');
    }
    if (req.body.sponsoredDetails) {
      branch.sponsoredDetails = req.body.sponsoredDetails;
      branch.markModified('sponsoredDetails');
    }
    if (req.body.stateLevel) {
      branch.markModified('stateLevel');
    }

    await branch.save();

    // Broadcast seat update to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('seat-update', {
        branchId: branch._id,
        branch: branch.toJSON(),
        updatedAt: new Date()
      });
    }

    res.json(branch);
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   DELETE /api/branches/:id
// @desc    Delete a branch (ADMIN)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check if there are active allocations for this branch
    const activeAllocations = await Allocation.countDocuments({
      branch: branch._id,
      status: { $ne: 'cancelled' }
    });

    if (activeAllocations > 0) {
      return res.status(400).json({
        message: `Cannot delete branch: There are ${activeAllocations} active allocation(s) for this branch. Please cancel them first.`
      });
    }

    await Branch.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      const allBranches = await Branch.find({ isActive: true }).sort({ choiceCode: 1 });
      io.emit('seat-update', {
        branchId: req.params.id,
        deleted: true,
        branches: allBranches.map(b => b.toJSON()),
        updatedAt: new Date()
      });
    }

    res.json({ message: `Branch "${branch.name}" deleted successfully`, branchId: req.params.id });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ message: error.message || 'Server error deleting branch' });
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
