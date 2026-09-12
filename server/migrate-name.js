const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('✅ Connected to MongoDB Atlas');
  const col = mongoose.connection.db.collection('users');

  // Step 1: Copy candidateName value into fullName using aggregation pipeline update
  const r1 = await col.updateMany(
    { candidateName: { $exists: true } },
    [{ $set: { fullName: '$candidateName' } }]
  );
  console.log('Step 1 — copied candidateName → fullName:', r1.modifiedCount, 'docs');

  // Step 2: Remove the old candidateName field
  const r2 = await col.updateMany(
    { candidateName: { $exists: true } },
    { $unset: { candidateName: '' } }
  );
  console.log('Step 2 — removed old candidateName field:', r2.modifiedCount, 'docs');

  // Verify
  const sample = await col.findOne({});
  console.log('\n=== VERIFICATION ===');
  console.log('fullName      :', sample?.fullName);
  console.log('candidateName :', sample?.candidateName);

  const remaining = await col.countDocuments({ candidateName: { $exists: true } });
  console.log('candidateName docs remaining:', remaining, '(should be 0)');

  await mongoose.disconnect();
  console.log('✅ Migration complete!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
