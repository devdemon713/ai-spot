const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Helper — build the user payload returned to the client
function buildUserPayload(user) {
  return {
    id:                  user._id,
    applicationId:       user.applicationId,
    fullName:            user.fullName,
    email:               user.email,
    phone:               user.phone,
    photo:               user.photo,
    role:                user.role,
    studentType:         user.studentType,
    // Merit list fields
    wceMeritNumber:      user.wceMeritNumber,
    stateMeritNumber:    user.stateMeritNumber,
    category:            user.category,
    gender:              user.gender,
    phType:              user.phType,
    defenceType:         user.defenceType,
    isOrphan:            user.isOrphan,
    mhtCetPercentile:    user.mhtCetPercentile,
    mathPercentile:      user.mathPercentile,
    physicsPercentile:   user.physicsPercentile,
    chemistryPercentile: user.chemistryPercentile,
    hscPercentage:       user.hscPercentage,
    // Allocation (admin-controlled)
    allocationStatus:       user.allocationStatus,
    allocatedBranch:        user.allocatedBranch,
    allocatedSeatCategory:  user.allocatedSeatCategory,
    allocatedSeatType:      user.allocatedSeatType
  };
}

// @route   POST /api/auth/register
// @desc    Register a new student
router.post('/register', [
  body('applicationId').notEmpty().withMessage('MHT-CET Application ID is required'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('gender').isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),
  body('category')
    .isIn(['OPEN', 'SC', 'ST', 'VJ_DT', 'NTB', 'NTC', 'NTD', 'OBC', 'SEBC', 'EWS'])
    .withMessage('Valid category is required'),
  body('mhtCetPercentile').isNumeric().withMessage('Total MHT-CET percentile is required'),
  body('studentType').isIn(['CAP', 'Non-CAP']).withMessage('Student type must be CAP or Non-CAP'),
  // Optional validations
  body('phType').optional().isIn(['Not Applicable', 'VH', 'HH', 'OH', 'ASD', 'MR', 'SLD', 'MI', 'MD']),
  body('defenceType').optional().isIn([
    'Not Applicable', 'Ward of Ex-Serviceman',
    'Ward of Serving Def Personnel', 'Ward of Serving Paramilitary'
  ]),
  body('mathPercentile').optional().isNumeric(),
  body('physicsPercentile').optional().isNumeric(),
  body('chemistryPercentile').optional().isNumeric(),
  body('wceMeritNumber').optional().isNumeric(),
  body('stateMeritNumber').optional().isNumeric(),
  body('hscPercentage').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { applicationId, email } = req.body;

    const existingApp = await User.findOne({ applicationId });
    if (existingApp) {
      return res.status(400).json({ message: 'This MHT-CET Application ID is already registered' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const user = new User({ ...req.body, role: 'student' });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: buildUserPayload(user) });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (student or admin)
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('allocatedBranch');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: buildUserPayload(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('allocatedBranch');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
