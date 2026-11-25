require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const http = require('node:http');
const { Server } = require('socket.io');
const createApp = require('./app');
const { connectDatabase } = require('./config/database');
const registerChatSocket = require('./sockets/chatSocket');

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 24) {
  throw new Error('Set JWT_SECRET in backend/.env (at least 24 characters).');
}

async function startServer() {
  await connectDatabase();
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server);
  registerChatSocket(io);
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => console.log(`Secure Connect running at http://localhost:${port}`));
}

startServer().catch((error) => {
  console.error('Unable to start Secure Connect:', error);
  process.exitCode = 1;
});
