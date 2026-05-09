const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const authMiddleware = require('../middleware/auth');

// CREATE blood request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { donorId, bloodGroup, hospital, city, message, urgency } = req.body;

    const ref = db.collection('requests').doc();
    const requestData = {
      id: ref.id,
      senderId: req.user.id,
      senderName: req.user.name,
      donorId,
      bloodGroup,
      hospital,
      city,
      message,
      urgency,           // 'urgent' | 'normal' | 'planned'
      status: 'pending', // 'pending' | 'accepted' | 'rejected' | 'completed'
      createdAt: new Date().toISOString()
    };

    await ref.set(requestData);
    res.status(201).json(requestData);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET requests sent by me
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('requests')
      .where('senderId', '==', req.user.id)
      .get();
    // Sort in JavaScript instead of Firestore
    const sorted = snap.docs
      .map(d => d.data())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (err) {
    console.error('sent error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET requests received by me (as a donor)
router.get('/received', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('requests')
      .where('donorId', '==', req.user.id)
      .get();
    // Sort in JavaScript instead of Firestore
    const sorted = snap.docs
      .map(d => d.data())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (err) {
    console.error('received error:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE request status (accept/reject/complete)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await db.collection('requests').doc(req.params.id).update({ status });

    // If completed, increment donor's donation count
    if (status === 'completed') {
      const reqDoc = await db.collection('requests').doc(req.params.id).get();
      const reqData = reqDoc.data();
      const donorRef = db.collection('users').doc(reqData.donorId);
      const donorDoc = await donorRef.get();
      await donorRef.update({
        totalDonations: (donorDoc.data().totalDonations || 0) + 1,
        lastDonation: new Date().toISOString()
      });
    }

    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a request
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.collection('requests').doc(req.params.id).delete();
    res.json({ message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;