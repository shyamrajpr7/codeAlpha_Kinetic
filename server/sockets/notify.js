// server/sockets/notify.js
const Notification = require('../models/Notification');

async function notify(io, { recipient, type, message, project, task }) {
  if (!recipient) return;
  const notification = await Notification.create({ recipient, type, message, project, task });
  io.to(`user:${recipient}`).emit('notification:new', notification);
  return notification;
}

module.exports = { notify };