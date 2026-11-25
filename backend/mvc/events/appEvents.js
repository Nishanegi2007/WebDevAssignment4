const EventEmitter = require('node:events');

const appEvents = new EventEmitter();
appEvents.on('user:registered', ({ id, email }) => console.log(`[event] user:registered id=${id} email=${email}`));
appEvents.on('note:created', ({ id, userId }) => console.log(`[event] note:created id=${id} user=${userId}`));
appEvents.on('chat:message', ({ username, message }) => console.log(`[event] chat:message ${username}: ${message}`));

module.exports = appEvents;
