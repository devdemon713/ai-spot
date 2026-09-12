const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

// Connect directly (bypass model validation for the update)
mongoose.connect(MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const users = db.collection('users');

  // ── Category normalization map ──
  // Maps all known messy values → clean enum values
  const catMap = {
    'Open': 'OPEN', 'open': 'OPEN', 'OPEN': 'OPEN',
    'SC': 'SC', 'SC$': 'SC',
    'ST': 'ST',
    'VJ': 'VJ_DT', 'VJ/DT': 'VJ_DT', 'DT/VJ': 'VJ_DT', 'VJ_DT': 'VJ_DT',
    'NTB': 'NTB', 'NT-B': 'NTB', 'NT 1 (NT-B)': 'NTB',
    'NTC': 'NTC', 'NT-C': 'NTC', 'NT 2 (NT-C)': 'NTC', '(NT-C)': 'NTC',
    'NTD': 'NTD', 'NT-D': 'NTD', 'NT 3 (NT-D)': 'NTD',
    'OBC': 'OBC', 'OBC$': 'OBC', 'OBC#': 'OBC', 'OBC$#': 'OBC',
    'SEBC': 'SEBC', 'SEBC$': 'SEBC', 'SEBC#': 'SEBC', 'SEBC$#': 'SEBC',
    'SBC': 'SEBC', 'SBC$': 'SEBC',
    'EWS': 'EWS',
    'NT#': 'NTB', // fallback for bare NT
  };

  // Get all distinct categories
  const distinctCats = await users.distinct('category', { role: 'student' });
  console.log('Found categories:', distinctCats);

  let totalUpdated = 0;

  for (const rawCat of distinctCats) {
    const cleanCat = catMap[rawCat];
    if (!cleanCat) {
      console.log(`  ⚠️  No mapping for "${rawCat}" — skipping`);
      continue;
    }
    if (rawCat === cleanCat) {
      console.log(`  ✓ "${rawCat}" already clean`);
      continue;
    }
    const result = await users.updateMany(
      { role: 'student', category: rawCat },
      { $set: { category: cleanCat } }
    );
    console.log(`  ✅ "${rawCat}" → "${cleanCat}": ${result.modifiedCount} students updated`);
    totalUpdated += result.modifiedCount;
  }

  // ── Also fix allocationStatus: null → 'pending' ──
  const nullStatusResult = await users.updateMany(
    { role: 'student', allocationStatus: null },
    { $set: { allocationStatus: 'pending' } }
  );
  console.log(`\n✅ Fixed allocationStatus null → pending: ${nullStatusResult.modifiedCount} students`);

  // ── Also normalize studentType: 'ACAP' → 'CAP' ──
  const acapResult = await users.updateMany(
    { role: 'student', studentType: 'ACAP' },
    { $set: { studentType: 'CAP' } }
  );
  console.log(`✅ Fixed studentType ACAP → CAP: ${acapResult.modifiedCount} students`);

  // Verify
  const afterCats = await users.distinct('category', { role: 'student' });
  const afterStatus = await users.distinct('allocationStatus', { role: 'student' });
  console.log('\n── After normalization ──');
  console.log('Categories:', afterCats);
  console.log('Statuses:', afterStatus);
  console.log(`Total category fixes: ${totalUpdated}`);

  mongoose.disconnect();
}).catch(err => { console.error(err); process.exit(1); });
