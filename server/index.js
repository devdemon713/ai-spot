const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const studentRoutes = require('./routes/students');
const allocationRoutes = require('./routes/allocation');
const roundRoutes = require('./routes/round');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/allocation', allocationRoutes);
app.use('/api/round', roundRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WCE Spot Round Server Running' });
});

// ── ONE-TIME Admin Seed ──────────────────────────────────────────────────────
// Visit GET /api/seed-admin once in browser to create the admin account.
// Remove this route after the admin is created.
app.get('/api/seed-admin', async (req, res) => {
  try {
    const User = require('./models/User');
    const existing = await User.findOne({ email: 'admin@wce.ac.in' });
    if (existing) {
      // Ensure role is admin even if already registered
      existing.role = 'admin';
      await existing.save();
      return res.json({ message: '✅ Admin role updated for admin@wce.ac.in', email: 'admin@wce.ac.in', password: 'admin@123' });
    }
    const admin = new User({
      applicationId: 'ADMIN001',
      fullName:      'WCE Admin',
      email:         'admin@wce.ac.in',
      password:      '$2a$10$IlTMkz8s0F3HDtsr3m58yuRvgrkI/V57ROQX/f/6ycnHgRSBK3//K', // hashed version of 'admin@123'
      phone:         '9999999999',
      gender:        'Male',
      category:      'OPEN',
      studentType:   'CAP',
      phType:        'Not Applicable',
      defenceType:   'Not Applicable',
      mhtCetPercentile: 0,
      role:          'admin',
    });
    await admin.save();
    res.json({ message: '✅ Admin created successfully!', email: 'admin@wce.ac.in', password: 'admin@123' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Socket.IO connection handling
let connectedClients = 0;

io.on('connection', (socket) => {
  connectedClients++;
  console.log(`Client connected: ${socket.id} (Total: ${connectedClients})`);

  // Send current connection count to all clients
  io.emit('clients-count', connectedClients);

  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`Client disconnected: ${socket.id} (Total: ${connectedClients})`);
    io.emit('clients-count', connectedClients);
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/wce-spot-round';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`🚀 WCE Spot Round Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
