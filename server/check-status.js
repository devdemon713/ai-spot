const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const total = await User.countDocuments({ role: 'student' });
  const pending = await User.countDocuments({ role: 'student', allocationStatus: 'pending' });
  const allocated = await User.countDocuments({ role: 'student', allocationStatus: 'allocated' });
  const noStatus = await User.countDocuments({ role: 'student', allocationStatus: { $exists: false } });
  const nullStatus = await User.countDocuments({ role: 'student', allocationStatus: null });
  
  // Get distinct values of allocationStatus
  const distinctStatuses = await User.distinct('allocationStatus', { role: 'student' });
  
  // Sample a student
  const sample = await User.findOne({ role: 'student' }).select('applicationId allocationStatus fullName studentType category').lean();
  
  console.log(JSON.stringify({ total, pending, allocated, noStatus, nullStatus, distinctStatuses, sample }, null, 2));
  mongoose.disconnect();
}).catch(err => { console.error(err); process.exit(1); });
