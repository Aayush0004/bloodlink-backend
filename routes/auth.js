const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../firebase');

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, bloodGroup, city, age } = req.body;

    // Check if user already exists
    const existing = await db.collection('users')
      .where('email', '==', email).get();
    if (!existing.empty) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Save to Firestore
    const userRef = db.collection('users').doc();
    const userData = {
      id: userRef.id,
      name,
      email,
      password: hashedPassword,
      phone,
      bloodGroup,
      city,
      age: parseInt(age),
      isAvailable: true,
      totalDonations: 0,
      lastDonation: null,
      createdAt: new Date().toISOString()
    };

    await userRef.set(userData);

    // Create JWT token
    const token = jwt.sign(
      { id: userRef.id, email, name, bloodGroup, city },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: userRef.id, name, email, bloodGroup, city, phone, age, isAvailable: true, totalDonations: 0 }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const snap = await db.collection('users').where('email', '==', email).get();
    if (snap.empty) return res.status(400).json({ error: 'Invalid credentials' });

    const userData = snap.docs[0].data();
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: userData.id, email: userData.email, name: userData.name, bloodGroup: userData.bloodGroup, city: userData.city },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...safeUser } = userData;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET MY PROFILE
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.user.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    const { password, ...safeUser } = doc.data();
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE PROFILE
router.put('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const { name, phone, city, age, isAvailable, lastDonation } = req.body;
    await db.collection('users').doc(req.user.id).update({
      name, phone, city, age: parseInt(age), isAvailable, lastDonation
    });
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;