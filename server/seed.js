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
    name: 'Civil Engineering',
    type: 'Aided',
    sanctionedIntake: 60,
    msSeats: 2,
    minoritySeats: 0,
    allIndiaSeats: 0,
    instituteSeats: 1,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 2, ladies: 0 },
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
    tfwsChoiceCode: '0600719111T',
    tfwsSeats: 0
  },
  {
    choiceCode: '0600761210',
    name: 'Mechanical Engineering',
    type: 'Aided',
    sanctionedIntake: 60,
    msSeats: 4,
    minoritySeats: 0,
    allIndiaSeats: 0,
    instituteSeats: 2,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 3, ladies: 1 },
      SC: { general: 1, ladies: 0 },
      ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 },
      NTC: { general: 0, ladies: 0 },
      NTD: { general: 0, ladies: 0 },
      OBC: { general: 1, ladies: 0 },
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
    tfwsChoiceCode: '0600761211T',
    tfwsSeats: 0
  },
  {
    choiceCode: '0600729310',
    name: 'Electrical Engineering',
    type: 'Aided',
    sanctionedIntake: 60,
    msSeats: 5,
    minoritySeats: 0,
    allIndiaSeats: 0,
    instituteSeats: 1,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 4, ladies: 1 },
      SC: { general: 1, ladies: 0 },
      ST: { general: 1, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 },
      NTC: { general: 0, ladies: 0 },
      NTD: { general: 1, ladies: 0 },
      OBC: { general: 0, ladies: 1 },
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
    tfwsChoiceCode: '0600729311T',
    tfwsSeats: 0
  },
  {
    choiceCode: '0600737610',
    name: 'Electronics Engineering',
    type: 'Aided',
    sanctionedIntake: 60,
    msSeats: 6,
    minoritySeats: 0,
    allIndiaSeats: 0,
    instituteSeats: 1,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 5, ladies: 2 },
      SC: { general: 1, ladies: 0 },
      ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 1, ladies: 0 },
      NTC: { general: 0, ladies: 0 },
      NTD: { general: 0, ladies: 0 },
      OBC: { general: 1, ladies: 0 },
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
    tfwsChoiceCode: '0600737611T',
    tfwsSeats: 0
  },
  {
    choiceCode: '0600724210',
    name: 'Computer Science and Engineering',
    type: 'Aided',
    sanctionedIntake: 90,
    msSeats: 9,
    minoritySeats: 0,
    allIndiaSeats: 0,
    instituteSeats: 4,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 3, ladies: 0 },
      SC: { general: 0, ladies: 0 },
      ST: { general: 2, ladies: 1 },
      VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 },
      NTC: { general: 0, ladies: 1 },
      NTD: { general: 1, ladies: 0 },
      OBC: { general: 0, ladies: 1 },
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
    tfwsChoiceCode: '0600724211T',
    tfwsSeats: 0
  },
  {
    choiceCode: '0600724270U',
    name: 'Computer Science and Engineering',
    type: 'Unaided',
    sanctionedIntake: 90,
    msSeats: 8,
    minoritySeats: 0,
    allIndiaSeats: 5,
    instituteSeats: 0,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 4, ladies: 0 },
      SC: { general: 2, ladies: 0 },
      ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 1 },
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
      OPEN: { general: 1, ladies: 0 }, SC: { general: 0, ladies: 0 }, ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 }, NTB: { general: 0, ladies: 0 }, NTC: { general: 0, ladies: 0 },
      NTD: { general: 0, ladies: 0 }, OBC: { general: 0, ladies: 0 }, SEBC: { general: 0, ladies: 0 }
    },
    pwdCommonReserved: 0,
    defCommonReserved: 0,
    ewsSeats: 0,
    tfwsChoiceCode: '0600724271UT',
    tfwsSeats: 0
  },
  {
    choiceCode: '0600724610',
    name: 'Information Technology',
    type: 'Aided',
    sanctionedIntake: 60,
    msSeats: 6,
    minoritySeats: 0,
    allIndiaSeats: 0,
    instituteSeats: 1,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 2, ladies: 1 },
      SC: { general: 0, ladies: 0 },
      ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 1, ladies: 0 },
      NTC: { general: 0, ladies: 0 },
      NTD: { general: 0, ladies: 0 },
      OBC: { general: 0, ladies: 1 },
      SEBC: { general: 0, ladies: 1 }
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
    tfwsChoiceCode: '0600724611T',
    tfwsSeats: 0
  },
  {
    choiceCode: '0600724670U',
    name: 'Information Technology',
    type: 'Unaided',
    sanctionedIntake: 60,
    msSeats: 5,
    minoritySeats: 0,
    allIndiaSeats: 3,
    instituteSeats: 0,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 3, ladies: 1 },
      SC: { general: 1, ladies: 0 },
      ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 },
      NTC: { general: 0, ladies: 0 },
      NTD: { general: 0, ladies: 0 },
      OBC: { general: 1, ladies: 0 },
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
    tfwsChoiceCode: '0600724671UT',
    tfwsSeats: 0
  },
  {
    choiceCode: '0600721970U',
    name: 'Robotics and Automation',
    type: 'Unaided',
    sanctionedIntake: 60,
    msSeats: 6,
    minoritySeats: 0,
    allIndiaSeats: 3,
    instituteSeats: 0,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 5, ladies: 0 },
      SC: { general: 0, ladies: 1 },
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
    pwdCommonReserved: 1,
    defCommonReserved: 0,
    ewsSeats: 0,
    tfwsChoiceCode: '0600721971UT',
    tfwsSeats: 0
  },
  {
    choiceCode: '0600792170U',
    name: 'Artificial Intelligence and Machine Learning',
    type: 'Unaided',
    sanctionedIntake: 60,
    msSeats: 5,
    minoritySeats: 0,
    allIndiaSeats: 2,
    instituteSeats: 0,
    orphanSeats: 0,
    stateLevel: {
      OPEN: { general: 3, ladies: 1 },
      SC: { general: 1, ladies: 0 },
      ST: { general: 0, ladies: 0 },
      VJ_DT: { general: 0, ladies: 0 },
      NTB: { general: 0, ladies: 0 },
      NTC: { general: 0, ladies: 0 },
      NTD: { general: 0, ladies: 0 },
      OBC: { general: 1, ladies: 0 },
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
    tfwsChoiceCode: '0600792171UT',
    tfwsSeats: 0
  },
  {
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
    tfwsSeats: 0
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
      name: 'Spot Round 2025-26 (Demo)',
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
