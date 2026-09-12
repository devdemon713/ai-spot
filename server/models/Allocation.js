const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  seatCategory: {
    type: String,
    required: true
    // e.g. 'OPEN', 'SC', 'ST', 'VJ_DT', 'NTB', 'NTC', 'NTD', 'OBC', 'SEBC'
  },
  seatType: {
    type: String,
    enum: ['general', 'ladies'],
    required: true
  },
  seatPool: {
    type: String,
    enum: ['stateLevel', 'pwd', 'def', 'pwdCommonReserved', 'defCommonReserved', 'ewsSeats', 'allIndiaSeats', 'instituteSeats', 'minoritySeats', 'orphanSeats'],
    default: 'stateLevel'
  },
  allocatedBy: {
    type: String,
    enum: ['manual', 'auto', 'upgrade'],
    required: true
  },
  upgradeFromBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  allocatedByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  round: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round',
    default: null
  },
  status: {
    type: String,
    enum: ['allocated', 'confirmed', 'cancelled'],
    default: 'allocated'
  }
}, { timestamps: true });

module.exports = mongoose.model('Allocation', allocationSchema);
