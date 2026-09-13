const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Branch = require('./models/Branch');
const Round = require('./models/Round');
const Allocation = require('./models/Allocation');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/wce-spot-round';

const branches = [
  {
    choiceCode: '0600719110',
    branchGroup: '1. CIVIL Aided',
    name: 'Construction Management',
    specialization: 'Un-Aided Construction Management',
    type: 'Aided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 2, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 1, ladies: 0 }, PwCR: 1, DEFCR: 1, SEBC: { general: 0, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 2, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600719120U',
    branchGroup: '2. CIVIL Un-Aided',
    name: 'CIVIL-Environment',
    specialization: 'Un-Aided CIVIL-Environment',
    type: 'Unaided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 2, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 1, ladies: 0 }, ST: { general: 1, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 1, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 3, ladies: 0 }, PwCR: 1, DEFCR: 1, SEBC: { general: 2, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 3, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600724210',
    branchGroup: '3. CSE Aided',
    name: 'CSE Design',
    specialization: 'Un-Aided CSE Design',
    type: 'Aided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 2, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 1, ladies: 0 }, ST: { general: 1, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 3, ladies: 0 }, PwCR: 1, DEFCR: 1, SEBC: { general: 0, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 4, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600724270U',
    branchGroup: '4. CSE Un-Aided',
    name: 'ETC',
    specialization: 'Un-Aided ETC',
    type: 'Unaided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 0, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 1 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 0, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600724610',
    branchGroup: '5. I.T. Aided',
    name: 'Elect-Cont- & INST',
    specialization: 'Un-Aided Elect-Cont- & INST',
    type: 'Aided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 0, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 2, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600761210',
    branchGroup: '6. Mechanical Aided',
    name: 'Manufacturing Engineering',
    specialization: 'Un-Aided Manuf. Engi',
    type: 'Aided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 2, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 1, ladies: 0 }, VJ_DT: { general: 1, ladies: 0 },
      NTB: { general: 1, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 1, ladies: 0 }, PwCR: 1, DEFCR: 1, SEBC: { general: 1, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 2, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600761220',
    branchGroup: '7. Mechanical Aided',
    name: 'Thermal Engineering',
    specialization: 'Un-Aided Thermal Engni',
    type: 'Aided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 3, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 1, ladies: 0 }, ST: { general: 1, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 2, ladies: 0 }, PwCR: 1, DEFCR: 1, SEBC: { general: 1, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 3, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600737610',
    branchGroup: '8. Electronics Aided',
    name: 'Data Science',
    specialization: 'Un-Aided Data Science',
    type: 'Aided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 0, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 1, ladies: 0 }, PwCR: 1, DEFCR: 1, SEBC: { general: 0, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 1, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600761230',
    branchGroup: '9. Mechanical Aided',
    name: 'Structural Engineering',
    specialization: 'Un-Aided Civil-Structure',
    type: 'Aided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 0, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 1, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 1, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600792170U',
    branchGroup: '10. AIML Un-Aided',
    name: 'Computer Science and Engineering',
    specialization: 'Un-Aided CSE',
    type: 'Unaided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 0, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 0, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  },
  {
    choiceCode: '0600792180U',
    branchGroup: '11. AIML Un-Aided',
    name: 'Electrical Power System',
    specialization: 'Un-Aided Elect-Power system',
    type: 'Unaided',
    sanctionedIntake: 60,
    nonSponsoredDetails: {
      OPEN: { general: 1, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    },
    sponsoredDetails: {
      OPEN: { general: 2, ladies: 0, pw: 0, def: 0 },
      ORPHAN: { general: 0 },
      SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 }, VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 }, NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 0 }, PwCR: 0, DEFCR: 0, SEBC: { general: 0, ladies: 0 }
    }
  }
];

// Demo students for testing
const demoStudents = [
  { applicationId: 'EN24100001', fullName: 'Rahul Sharma', email: 'rahul@demo.com', password: 'demo123', phone: '9876543210', mhtCetPercentile: 95.5, mhtCetScore: 145, category: 'OPEN', gender: 'Male', studentType: 'CAP', sscAggregate: 89.2, sscMaths: 92, sscScience: 88, sscEnglish: 85, hscPercentage: 88.5 },
  { applicationId: 'EN24100002', fullName: 'Priya Patil', email: 'priya@demo.com', password: 'demo123', phone: '9876543211', mhtCetPercentile: 93.2, mhtCetScore: 138, category: 'OBC', gender: 'Female', studentType: 'CAP', sscAggregate: 91.0, sscMaths: 94, sscScience: 90, sscEnglish: 88, hscPercentage: 90.2 },
  { applicationId: 'EN24100003', fullName: 'Amit Jadhav', email: 'amit@demo.com', password: 'demo123', phone: '9876543212', mhtCetPercentile: 91.8, mhtCetScore: 132, category: 'SC', gender: 'Male', studentType: 'CAP', sscAggregate: 82.5, sscMaths: 85, sscScience: 80, sscEnglish: 78, hscPercentage: 84.0 },
  { applicationId: 'EN24100004', fullName: 'Sneha Kulkarni', email: 'sneha@demo.com', password: 'demo123', phone: '9876543213', mhtCetPercentile: 89.7, mhtCetScore: 128, category: 'OPEN', gender: 'Female', studentType: 'CAP', sscAggregate: 94.0, sscMaths: 96, sscScience: 93, sscEnglish: 91, hscPercentage: 92.5 },
  { applicationId: 'EN24100005', fullName: 'Vishal More', email: 'vishal@demo.com', password: 'demo123', phone: '9876543214', mhtCetPercentile: 87.5, mhtCetScore: 122, category: 'ST', gender: 'Male', studentType: 'CAP', sscAggregate: 78.0, sscMaths: 80, sscScience: 76, sscEnglish: 74, hscPercentage: 79.5 },
  { applicationId: 'EN24100006', fullName: 'Anita Gaikwad', email: 'anita@demo.com', password: 'demo123', phone: '9876543215', mhtCetPercentile: 85.3, mhtCetScore: 118, category: 'VJ_DT', gender: 'Female', studentType: 'CAP', sscAggregate: 86.5, sscMaths: 88, sscScience: 85, sscEnglish: 83, hscPercentage: 85.0 },
  { applicationId: 'EN24100007', fullName: 'Rohan Deshmukh', email: 'rohan@demo.com', password: 'demo123', phone: '9876543216', mhtCetPercentile: 82.1, mhtCetScore: 112, category: 'NTB', gender: 'Male', studentType: 'CAP', sscAggregate: 80.0, sscMaths: 82, sscScience: 78, sscEnglish: 76, hscPercentage: 81.0 },
  { applicationId: 'EN24100008', fullName: 'Pooja Kamble', email: 'pooja@demo.com', password: 'demo123', phone: '9876543217', mhtCetPercentile: 79.6, mhtCetScore: 108, category: 'SEBC', gender: 'Female', studentType: 'CAP', sscAggregate: 87.5, sscMaths: 90, sscScience: 86, sscEnglish: 84, hscPercentage: 86.5 },
  { applicationId: 'EN24100009', fullName: 'Sagar Pawar', email: 'sagar@demo.com', password: 'demo123', phone: '9876543218', mhtCetPercentile: 76.4, mhtCetScore: 102, category: 'NTC', gender: 'Male', studentType: 'Non-CAP', sscAggregate: 75.0, sscMaths: 78, sscScience: 73, sscEnglish: 70, hscPercentage: 76.0 },
  { applicationId: 'EN24100010', fullName: 'Madhuri Shinde', email: 'madhuri@demo.com', password: 'demo123', phone: '9876543219', mhtCetPercentile: 73.2, mhtCetScore: 98, category: 'NTD', gender: 'Female', studentType: 'CAP', sscAggregate: 83.0, sscMaths: 85, sscScience: 81, sscEnglish: 80, hscPercentage: 82.0 }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Branch.deleteMany({});
    await User.deleteMany({});
    await Allocation.deleteMany({});
    await Round.deleteMany({});

    console.log('Cleared existing data');

    // Seed branches
    await Branch.insertMany(branches);
    console.log(`✅ Seeded ${branches.length} branches`);

    // Seed admin (plain-text password — model pre-save hook hashes it)
    await User.create({
      applicationId: 'ADMIN001',
      fullName: 'WCE Admin',
      email: 'admin@wce.ac.in',
      password: 'admin123',
      phone: '0233-2300183',
      category: 'OPEN',
      gender: 'Male',
      studentType: 'CAP',
      role: 'admin'
    });
    console.log('✅ Seeded admin account (admin@wce.ac.in / admin123)');

    // Seed demo students (plain-text password — model pre-save hook hashes it)
    for (const s of demoStudents) {
      await User.create({ ...s, role: 'student' });
    }
    console.log(`✅ Seeded ${demoStudents.length} demo students`);

    // Create demo round
    await Round.create({
      name: 'ACAP Round 2025-26 (Demo)',
      status: 'demo',
      isDemo: true,
      description: 'Demo round with sample data for testing'
    });
    console.log('✅ Created demo round');

    console.log('\n🎉 Seed completed successfully!');
    console.log('Admin Login: admin@wce.ac.in / admin123');
    console.log('Demo Student: rahul@demo.com / demo123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
