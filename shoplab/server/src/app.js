const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const requestLog = require('./middleware/requestLog');
const securityHeaders = require('./middleware/securityHeaders');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const debugRoutes = require('./routes/debug');
const adminRoutes = require('./routes/admin');
const toolsRoutes = require('./routes/tools');
const uploadRoutes = require('./routes/uploads');
const requireLogin = require('./middleware/requireLogin');
const requireRole = require('./middleware/requireRole');

function sessionSecret() {
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required when NODE_ENV=production');
  }
  return process.env.SESSION_SECRET || 'change-me-in-lab';
}

function createApp() {
  const app = express();

  if (process.env.CORS_MODE === 'reflect') {
    console.warn(
      'WARNING: CORS_MODE=reflect – any website can read API responses. Use only for the lecture demo.'
    );
    app.use(cors({ origin: true, credentials: true }));
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(
    session({
      name: 'shoplab.sid',
      secret: sessionSecret(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 1000,
      },
    })
  );

  app.use(securityHeaders);

  // Uploads are handled by authenticated routes, not public static hosting.
  app.use('/api', requestLog);
  app.use('/api/auth', authRoutes);
  app.use('/api/products/:productId/reviews', reviewRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', requireLogin, requireRole('admin'), adminRoutes);
  app.use('/api/tools', toolsRoutes);
  app.use('/api/uploads', uploadRoutes);

  // Debug routes are unavailable in production.
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/debug', debugRoutes);
  }

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Explicitly block the former public upload URLs.
  app.use('/uploads', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const clientDist = path.join(
    __dirname,
    '..',
    '..',
    'client',
    'dist'
  );

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };