const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Test Firebase connection immediately on startup
try {
  const { db } = require('./firebase');
  console.log('✅ Firebase connected successfully');
} catch (err) {
  console.error('❌ Firebase connection FAILED:', err.message);
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donors');
const requestRoutes = require('./routes/requests');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://bloodlink-frontend-six.vercel.app',  // ← PUT YOUR ACTUAL VERCEL URL HERE
    /\.vercel\.app$/                         // ← this covers ALL vercel.app subdomains
  ],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);

app.get('/', (req, res) => res.json({ message: 'BloodLink API running ✅' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));