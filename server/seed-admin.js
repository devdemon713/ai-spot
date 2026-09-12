/**
 * seed-admin.js
 * Run: node seed-admin.js
 * Creates/updates the admin user directly in MongoDB Atlas.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/wce-spot-round';

async function seedAdmin() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  // Inline schema — avoids any import issues
  const userSchema = new mongoose.Schema({
    applicationId:       { type: String, unique: true, trim: true },
    fullName:            { type: String, trim: true },
    email:               { type: String, unique: true, lowercase: true, trim: true },
    password:            { type: String },
    phone:               { type: String },
    photo:               { type: String, default: null },
    wceMeritNumber:      { type: Number, default: null },
    stateMeritNumber:    { type: Number, default: null },
    category:            { type: String, default: 'OPEN' },
    gender:              { type: String },
    phType:              { type: String, default: 'Not Applicable' },
    defenceType:         { type: String, default: 'Not Applicable' },
    isOrphan:            { type: Boolean, default: false },
    mhtCetPercentile:    { type: Number, default: 0 },
    mathPercentile:      { type: Number, default: 0 },
    physicsPercentile:   { type: Number, default: 0 },
    chemistryPercentile: { type: Number, default: 0 },
    hscPercentage:       { type: Number, default: 0 },
    studentType:         { type: String, default: 'CAP' },
    role:                { type: String, default: 'student' },
    allocationStatus:    { type: String, default: 'pending' },
    allocatedBranch:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    allocatedSeatCategory: { type: String, default: null },
    allocatedSeatType:   { type: String, default: null }
  }, { timestamps: true });

  // Use existing model if already compiled
  const User = mongoose.models.User || mongoose.model('User', userSchema);

  const ADMIN_EMAIL    = 'admin@wce.ac.in';
  const ADMIN_PASSWORD = 'admin@123';

  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    console.log(`⚠️  User found: ${ADMIN_EMAIL}`);
    // Force role to admin — update directly in DB (no pre-save hook triggered)
    await User.updateOne(
      { email: ADMIN_EMAIL },
      { $set: { role: 'admin', fullName: 'WCE Admin' } }
    );
    console.log('✅ Role updated to admin successfully!');
  } else {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({
      applicationId:   'ADMIN001',
      fullName:        'WCE Admin',
      email:           ADMIN_EMAIL,
      password:        hashedPassword,
      phone:           '9999999999',
      gender:          'Male',
      category:        'OPEN',
      studentType:     'CAP',
      phType:          'Not Applicable',
      defenceType:     'Not Applicable',
      mhtCetPercentile: 0,
      role:            'admin'
    });
    console.log('✅ Admin user created successfully!');
  }

  console.log('─────────────────────────────────');
  console.log('  📧  Email   : admin@wce.ac.in');
  console.log('  🔑  Password: admin@123');
  console.log('─────────────────────────────────');

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Done!');
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
