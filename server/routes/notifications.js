// server/routes/notifications.js
const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const notifications = await Notification.find({ recipient: req.userId })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ notifications });
});

router.put('/:id/read', auth, async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.userId },
    { read: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json({ notification });
});

router.put('/read-all', auth, async (req, res) => {
  await Notification.updateMany({ recipient: req.userId, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
});

module.exports = router;