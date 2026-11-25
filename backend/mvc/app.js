const path = require('node:path');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { getStorageMode } = require('./config/database');
const { currentUser } = require('./controllers/authController');
const { authenticate } = require('./middleware/authMiddleware');

function createApp() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', storage: getStorageMode() }));
  app.get('/api/me', authenticate, currentUser);
  app.use('/api/auth', authRoutes);
  app.use('/api/notes', noteRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    if (err.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' });
    return res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error.' });
  });

  return app;
}

module.exports = createApp;
