const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const requestLog = require('./middleware/requestLog');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const debugRoutes = require('./routes/debug');

function createApp() {
  const app = express();

  if (process.env.CORS_MODE === 'reflect') {
    console.warn('WARNING: CORS_MODE=reflect – any website can read API responses. Use only for the lecture demo.');
    app.use(cors({ origin: true, credentials: true }));
  }

  app.use(express.json());
  app.use(
    session({
      name: 'shoplab.sid',
      secret: process.env.SESSION_SECRET || 'change-me-in-lab',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 60 * 60 * 1000 },
    })
  );

  app.use('/api', requestLog);
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/debug', debugRoutes);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  return app;
}

module.exports = { createApp };
