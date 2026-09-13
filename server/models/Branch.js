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

const quotaMatrixSchema = new mongoose.Schema({
  OPEN: {
    general: { type: Number, default: 0 },
    ladies: { type: Number, default: 0 },
    pw: { type: Number, default: 0 },
    def: { type: Number, default: 0 }
  },
  ORPHAN: { general: { type: Number, default: 0 } },
  SC: { general: { type: Number, default: 0 }, ladies: { type: Number, default: 0 } },
  ST: { general: { type: Number, default: 0 }, ladies: { type: Number, default: 0 } },
  VJ_DT: { general: { type: Number, default: 0 }, ladies: { type: Number, default: 0 } },
  NTB: { general: { type: Number, default: 0 }, ladies: { type: Number, default: 0 } },
  NTC: { general: { type: Number, default: 0 }, ladies: { type: Number, default: 0 } },
  NTD: { general: { type: Number, default: 0 }, ladies: { type: Number, default: 0 } },
  OBC: { general: { type: Number, default: 0 }, ladies: { type: Number, default: 0 } },
  PwCR: { type: Number, default: 0 },
  DEFCR: { type: Number, default: 0 },
  SEBC: { general: { type: Number, default: 0 }, ladies: { type: Number, default: 0 } }
}, { _id: false });

const branchSchema = new mongoose.Schema({
  choiceCode: {
    type: String,
    required: true,
    unique: true
  },
  branchGroup: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true
  },
  specialization: {
    type: String,
    default: ''
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
  msSeats: { type: Number, default: 0 },
  minoritySeats: { type: Number, default: 0 },
  allIndiaSeats: { type: Number, default: 0 },
  instituteSeats: { type: Number, default: 0 },
  orphanSeats: { type: Number, default: 0 },

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

  // Non-Sponsored & Sponsored detailed matrices
  nonSponsoredDetails: {
    type: quotaMatrixSchema,
    default: () => ({})
  },
  sponsoredDetails: {
    type: quotaMatrixSchema,
    default: () => ({})
  },

  // Scalar counts
  sponsoredVacant: { type: Number, default: 0 },
  nonSponsoredVacant: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

function sumQuotaMatrix(m) {
  if (!m) return 0;
  let total = 0;
  total += (m.OPEN?.general || 0) + (m.OPEN?.ladies || 0) + (m.OPEN?.pw || 0) + (m.OPEN?.def || 0);
  total += (m.ORPHAN?.general || 0);
  total += (m.SC?.general || 0) + (m.SC?.ladies || 0);
  total += (m.ST?.general || 0) + (m.ST?.ladies || 0);
  total += (m.VJ_DT?.general || 0) + (m.VJ_DT?.ladies || 0);
  total += (m.NTB?.general || 0) + (m.NTB?.ladies || 0);
  total += (m.NTC?.general || 0) + (m.NTC?.ladies || 0);
  total += (m.NTD?.general || 0) + (m.NTD?.ladies || 0);
  total += (m.OBC?.general || 0) + (m.OBC?.ladies || 0);
  total += (m.PwCR || 0);
  total += (m.DEFCR || 0);
  total += (m.SEBC?.general || 0) + (m.SEBC?.ladies || 0);
  return total;
}

// Virtual: compute effective non-sponsored vacant seats
branchSchema.virtual('effectiveNonSponsoredVacant').get(function() {
  const sumMatrix = sumQuotaMatrix(this.nonSponsoredDetails);
  if (sumMatrix > 0) return sumMatrix;
  if (this.nonSponsoredVacant > 0) return this.nonSponsoredVacant;
  
  let total = 0;
  const categories = ['OPEN', 'SC', 'ST', 'VJ_DT', 'NTB', 'NTC', 'NTD', 'OBC', 'SEBC'];
  if (this.stateLevel) {
    for (const cat of categories) {
      if (this.stateLevel[cat]) {
        total += (this.stateLevel[cat].general || 0) + (this.stateLevel[cat].ladies || 0);
      }
    }
  }
  total += (this.pwdCommonReserved || 0) + (this.defCommonReserved || 0) + (this.ewsSeats || 0) + (this.allIndiaSeats || 0) + (this.instituteSeats || 0) + (this.orphanSeats || 0) + (this.minoritySeats || 0);
  return total;
});

// Virtual: compute effective sponsored vacant seats
branchSchema.virtual('effectiveSponsoredVacant').get(function() {
  const sumMatrix = sumQuotaMatrix(this.sponsoredDetails);
  if (sumMatrix > 0) return sumMatrix;
  return this.sponsoredVacant || 0;
});

// Virtual: compute total vacant seats (Sponsored + Non-Sponsored)
branchSchema.virtual('totalVacant').get(function() {
  return this.effectiveSponsoredVacant + this.effectiveNonSponsoredVacant;
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
