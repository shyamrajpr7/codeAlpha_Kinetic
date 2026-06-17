// server/sockets/index.js
const jwt = require('jsonwebtoken');

module.exports = function initSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('project:join', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('task:typing', ({ taskId, projectId, userName }) => {
      socket.to(`project:${projectId}`).emit('task:typing', { taskId, userName });
    });

    socket.on('disconnect', () => {});
  });
};