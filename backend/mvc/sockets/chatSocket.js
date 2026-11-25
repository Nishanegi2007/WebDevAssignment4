const jwt = require('jsonwebtoken');
const appEvents = require('../events/appEvents');

function registerChatSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required. Send a JWT token.'));
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch {
      return next(new Error('Invalid or expired JWT token.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected ${socket.user.email}`);
    socket.emit('chat:system', { message: `Connected as ${socket.user.email}.` });
    socket.on('chat:message', (payload = {}) => {
      const message = typeof payload.message === 'string' ? payload.message.trim().slice(0, 500) : '';
      if (!message) return;
      const data = { username: socket.user.email, message, sentAt: new Date().toISOString() };
      appEvents.emit('chat:message', data);
      io.emit('chat:message', data);
    });
    socket.on('disconnect', () => console.log(`[socket] disconnected ${socket.user.email}`));
  });
}

module.exports = registerChatSocket;
