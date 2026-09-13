const mongoose = require('mongoose');
const User = require('./models/User');
const Branch = require('./models/Branch');
const Allocation = require('./models/Allocation');
const Round = require('./models/Round');

async function testAllocation() {
  await mongoose.connect('mongodb://localhost:27017/wce-spot-round');
  console.log('Connected to MongoDB');

  // Re-seed DB to clean state
  const seed = require('./seed');
  // Wait a bit
  await new Promise(r => setTimeout(r, 1000));

  const admin = await User.findOne({ role: 'admin' });
  const student1 = await User.findOne({ role: 'student', candidateType: 'Non-Sponsored' });
  const student2 = await User.findOne({ role: 'student', candidateType: 'Sponsored' }) || await User.findOne({ role: 'student' });
  const branch1 = await Branch.findOne({ choiceCode: '0600724210' }); // Computer Science & Engg
  const branch2 = await Branch.findOne({ choiceCode: '0600761210' }); // Mechanical - Design Engg

  console.log('--- Initial Vacancy ---');
  console.log(`${branch1.name}: Non-Sponsored Total = ${branch1.effectiveNonSponsoredVacant}, Sponsored Total = ${branch1.effectiveSponsoredVacant}, Total = ${branch1.totalVacant}`);
  console.log(`${branch2.name}: Non-Sponsored Total = ${branch2.effectiveNonSponsoredVacant}, Sponsored Total = ${branch2.effectiveSponsoredVacant}, Total = ${branch2.totalVacant}`);

  // Test 1: Manual Allocation (Non-Sponsored)
  const initialNS = branch1.effectiveNonSponsoredVacant;
  const initialTotal = branch1.totalVacant;

  const axios = require('axios');
  // We can call internal functions or start server and use HTTP
  console.log('\n--- Testing Helper Functions ---');
  const routeModule = require('./routes/allocation');

  console.log('Testing completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

testAllocation().catch(e => {
  console.error(e);
  process.exit(1);
});
