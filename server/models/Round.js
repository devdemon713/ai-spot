const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Spot Round 2025-26'
  },
  status: {
    type: String,
    enum: ['demo', 'setup', 'active', 'paused', 'completed'],
    default: 'demo'
  },
  isDemo: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: 'Demo round with sample data'
  },
  announcementText: {
    type: String,
    default: 'THIS FORM IS ONLY FOR STUDENTS APPLYING FOR 1ST YEAR ACAP / SPOT ROUND REGISTRATION'
  },
  announcementEnabled: {
    type: Boolean,
    default: true
  },
  announcementDirection: {
    type: String,
    enum: ['ltr', 'rtl'],
    default: 'ltr'
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  totalSeatsInitial: {
    type: Number,
    default: 0
  },
  totalSeatsAllocated: {
    type: Number,
    default: 0
  },
  roundNumber: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('Round', roundSchema);
