const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/students
// @desc    Get all students (ADMIN)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { category, status, search, gender } = req.query;
    const filter = { role: 'student' };

    if (category) filter.category = category;
    if (status) filter.allocationStatus = status;
    if (gender) filter.gender = gender;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { applicationId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(filter)
      .select('-password')
      .populate('allocatedBranch')
      .sort({ mhtCetPercentile: -1 });

    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/students/stats
// @desc    Get student statistics (ADMIN)
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const total     = await User.countDocuments({ role: 'student' });
    const pending   = await User.countDocuments({ role: 'student', allocationStatus: 'pending' });
    const allocated = await User.countDocuments({ role: 'student', allocationStatus: 'allocated' });
    const confirmed = await User.countDocuments({ role: 'student', allocationStatus: 'confirmed' });
    const cancelled = await User.countDocuments({ role: 'student', allocationStatus: 'cancelled' });

    const categoryWise = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({ total, pending, allocated, confirmed, cancelled, categoryWise });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/students/:id
// @desc    Get single student (ADMIN)
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .select('-password')
      .populate('allocatedBranch');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
