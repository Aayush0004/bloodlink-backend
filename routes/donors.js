const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const authMiddleware = require('../middleware/auth');

// SEARCH DONORS by blood group and city
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;

    let query = db.collection('users').where('isAvailable', '==', true);

    if (bloodGroup) query = query.where('bloodGroup', '==', bloodGroup);
    if (city) query = query.where('city', '==', city);

    const snap = await query.get();
    const donors = snap.docs
      .map(doc => {
        const { password, ...d } = doc.data();
        return d;
      })
      .filter(d => d.id !== req.user.id); // exclude self

    res.json(donors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET ALL DONORS (admin / stats)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('users').where('isAvailable', '==', true).get();
    const donors = snap.docs.map(doc => {
      const { password, ...d } = doc.data();
      return d;
    });
    res.json(donors);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET ONE DONOR by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Donor not found' });
    const { password, ...donor } = doc.data();
    res.json(donor);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;