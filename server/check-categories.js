const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const distinctCats = await User.distinct('category', { role: 'student' });
  console.log('Distinct categories:', distinctCats);
  
  // Count per category
  for (const cat of distinctCats) {
    const count = await User.countDocuments({ role: 'student', category: cat });
    console.log(`  ${cat === null ? 'NULL' : cat === '' ? 'EMPTY' : cat}: ${count}`);
  }
  
  // Sample students with null/empty/unusual categories
  const nullCat = await User.find({ role: 'student', category: { $in: [null, ''] } }).select('applicationId fullName category').limit(5).lean();
  const openCat = await User.find({ role: 'student', category: 'OPEN' }).select('applicationId fullName category').limit(2).lean();
  console.log('\nStudents with null/empty category:', nullCat);
  console.log('Sample OPEN students:', openCat);
  
  // Check if any categories have unexpected values (not in enum)
  const expectedCats = ['OPEN', 'SC', 'ST', 'VJ_DT', 'NTB', 'NTC', 'NTD', 'OBC', 'SEBC', 'EWS'];
  const unexpected = distinctCats.filter(c => c && !expectedCats.includes(c));
  console.log('\nUnexpected category values:', unexpected.length > 0 ? unexpected : 'None');
  
  // Check specific students from screenshot
  const soham = await User.findOne({ fullName: /SOHAM DEEPAK/i }).select('applicationId fullName category').lean();
  const ishant = await User.findOne({ fullName: /ISHANT RAJENDRA/i }).select('applicationId fullName category').lean();
  const atharva = await User.findOne({ fullName: /ATHARVA ASHOK/i }).select('applicationId fullName category').lean();
  console.log('\nSoham:', soham);
  console.log('Ishant:', ishant);
  console.log('Atharva:', atharva);
  
  mongoose.disconnect();
}).catch(err => { console.error(err); process.exit(1); });
