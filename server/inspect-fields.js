const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const col = mongoose.connection.db.collection('users');
  // Check a sample student for name fields
  const sample = await col.findOne({ role: { $ne: 'admin' } });
  console.log('\n=== NAME FIELDS CHECK ===');
  console.log('fullName      :', sample?.fullName);
  console.log('candidateName :', sample?.candidateName);
  console.log('applicationId :', sample?.applicationId);
  
  // Count docs that still have candidateName
  const oldCount = await col.countDocuments({ candidateName: { $exists: true } });
  const newCount = await col.countDocuments({ fullName: { $exists: true } });
  console.log('\ncandidateName docs remaining:', oldCount);
  console.log('fullName docs count         :', newCount);
  
  await mongoose.disconnect();
  process.exit(0);
}).catch(err => { console.error(err.message); process.exit(1); });
