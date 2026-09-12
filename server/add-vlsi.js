const mongoose = require('mongoose');
require('dotenv').config();
const Branch = require('./models/Branch');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  // Check if VLSI already exists
  const existing = await Branch.findOne({ choiceCode: '06000738810U' });
  if (existing) {
    console.log('VLSI branch already exists:', existing.name);
    return mongoose.disconnect();
  }

  const vlsiBranch = new Branch({
    choiceCode: '06000738810U',
    name: 'VLSI Design & Technology',
    type: 'Unaided',
    sanctionedIntake: 60,
    msSeats: 0,
    minoritySeats: 0,
    allIndiaSeats: 0,
    instituteSeats: 0,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 0, ladies: 0 },
      SC: { general: 0, ladies: 0 },
      ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 },
      NTC: { general: 0, ladies: 0 },
      NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 },
      SEBC: { general: 0, ladies: 0 }
    },
    pwd: {
      OPEN: { general: 0, ladies: 0 }, SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 }, NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 },
      NTD: { general: 0, ladies: 0 }, OBC: { general: 0, ladies: 0 }, SEBC: { general: 0, ladies: 0 }
    },
    def: {
      OPEN: { general: 0, ladies: 0 }, SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 }, NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 },
      NTD: { general: 0, ladies: 0 }, OBC: { general: 0, ladies: 0 }, SEBC: { general: 0, ladies: 0 }
    },
    pwdCommonReserved: 0,
    defCommonReserved: 0,
    ewsSeats: 0,
    tfwsChoiceCode: '',
    tfwsSeats: 0,
    isActive: true
  });

  await vlsiBranch.save();
  console.log('✅ VLSI Design & Technology branch added successfully!');
  console.log('   Choice Code:', vlsiBranch.choiceCode);
  console.log('   ID:', vlsiBranch._id);
  mongoose.disconnect();
}).catch(err => { console.error('Error:', err.message); process.exit(1); });
