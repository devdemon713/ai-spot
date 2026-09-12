const mongoose = require('mongoose');

const categorySlotSchema = new mongoose.Schema({
  general: { type: Number, default: 0, min: 0 },
  ladies: { type: Number, default: 0, min: 0 }
}, { _id: false });

const defaultCategorySlot = () => ({ general: 0, ladies: 0 });

const categoriesSchema = new mongoose.Schema({
  OPEN: { type: categorySlotSchema, default: defaultCategorySlot },
  SC: { type: categorySlotSchema, default: defaultCategorySlot },
  ST: { type: categorySlotSchema, default: defaultCategorySlot },
  VJ_DT: { type: categorySlotSchema, default: defaultCategorySlot },
  NTB: { type: categorySlotSchema, default: defaultCategorySlot },
  NTC: { type: categorySlotSchema, default: defaultCategorySlot },
  NTD: { type: categorySlotSchema, default: defaultCategorySlot },
  OBC: { type: categorySlotSchema, default: defaultCategorySlot },
  SEBC: { type: categorySlotSchema, default: defaultCategorySlot }
}, { _id: false });

const branchSchema = new mongoose.Schema({
  choiceCode: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Aided', 'Unaided'],
    required: true
  },
  sanctionedIntake: {
    type: Number,
    required: true
  },
  msSeats: {
    type: Number,
    default: 0
  },
  minoritySeats: {
    type: Number,
    default: 0
  },
  allIndiaSeats: {
    type: Number,
    default: 0
  },
  instituteSeats: {
    type: Number,
    default: 0
  },
  orphanSeats: {
    type: Number,
    default: 0
  },

  // State Level category-wise seats (General / Ladies)
  stateLevel: {
    type: categoriesSchema,
    default: () => ({})
  },

  // PWD category-wise seats
  pwd: {
    type: categoriesSchema,
    default: () => ({})
  },

  // DEF category-wise seats
  def: {
    type: categoriesSchema,
    default: () => ({})
  },

  pwdCommonReserved: { type: Number, default: 0 },
  defCommonReserved: { type: Number, default: 0 },
  ewsSeats: { type: Number, default: 0 },
  tfwsChoiceCode: { type: String, default: '' },
  tfwsSeats: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Virtual: compute total vacant seats
branchSchema.virtual('totalVacant').get(function() {
  let total = 0;
  const categories = ['OPEN', 'SC', 'ST', 'VJ_DT', 'NTB', 'NTC', 'NTD', 'OBC', 'SEBC'];
  
  if (this.stateLevel) {
    for (const cat of categories) {
      if (this.stateLevel[cat]) {
        total += (this.stateLevel[cat].general || 0) + (this.stateLevel[cat].ladies || 0);
      }
    }
  }
  
  if (this.pwd) {
    for (const cat of categories) {
      if (this.pwd[cat]) {
        total += (this.pwd[cat].general || 0) + (this.pwd[cat].ladies || 0);
      }
    }
  }
  
  if (this.def) {
    for (const cat of categories) {
      if (this.def[cat]) {
        total += (this.def[cat].general || 0) + (this.def[cat].ladies || 0);
      }
    }
  }
  
  total += (this.pwdCommonReserved || 0);
  total += (this.defCommonReserved || 0);
  total += (this.ewsSeats || 0);
  total += (this.allIndiaSeats || 0);
  total += (this.instituteSeats || 0);
  total += (this.orphanSeats || 0);
  total += (this.minoritySeats || 0);
  
  return total;
});

branchSchema.virtual('stateLevelTotal').get(function() {
  let total = 0;
  const categories = ['OPEN', 'SC', 'ST', 'VJ_DT', 'NTB', 'NTC', 'NTD', 'OBC', 'SEBC'];
  if (this.stateLevel) {
    for (const cat of categories) {
      if (this.stateLevel[cat]) {
        total += (this.stateLevel[cat].general || 0) + (this.stateLevel[cat].ladies || 0);
      }
    }
  }
  return total;
});

branchSchema.set('toJSON', { virtuals: true });
branchSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Branch', branchSchema);
