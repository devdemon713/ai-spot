const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    required: [true, 'MHT-CET Application ID is required'],
    trim: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  mhtCetPercentile: {
    type: Number,
    default: 0
  },
  mhtCetScore: {
    type: Number,
    default: 0
  },
  jeeMainPercentile: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    default: 'OPEN'
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true
  },
  isPWD: { type: Boolean, default: false },
  isDEF: { type: Boolean, default: false },
  isOrphan: { type: Boolean, default: false },
  isMinority: { type: Boolean, default: false },
  studentType: {
    type: String,
    default: 'CAP'
  },
  sscAggregate: { type: Number, default: 0 },
  sscMaths: { type: Number, default: 0 },
  sscScience: { type: Number, default: 0 },
  sscEnglish: { type: Number, default: 0 },
  hscPercentage: { type: Number, default: 0 },
  diplomaPercentage: { type: Number, default: 0 },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  allocationStatus: {
    type: String,
    enum: ['pending', 'allocated', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  allocatedBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  allocatedSeatCategory: { type: String, default: null },
  allocatedSeatType: { type: String, default: null },
  branchPreferences: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }],
  skippedInRounds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round'
  }]
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
