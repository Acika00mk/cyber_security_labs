const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit'); // 1. Увоз на express-rate-limit
const { db } = require('../db');
const requireLogin = require('../middleware/requireLogin');
const { issueCsrfToken } = require('../middleware/csrf');
const { loginBodySchema } = require('../validation/catalog');
const bycrypt = require('bcryptjs');

const router = express.Router();

// Lab 4 teaching build: secret lives in source (students move this to env).
const JWT_SECRET = 'shoplab-jwt-secret';


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

function sha256Hex(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

function bcryptHash(password) {
  return bycrypt.hashSync(password, 10);
}


router.post('/login', loginLimiter, (req, res, next) => {
  const parsed = loginBodySchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Something is wrong' });
  }

  const { email, password } = parsed.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Lab 4 teaching build: different messages reveal whether the account exists.
  if (!user) {
    return res.status(401).json({ error: 'Invalid ' });
  }
  if (!bycrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid' });
  }

  // Lab 4 teaching build: JWT has no exp claim.
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    issueCsrfToken(req);
    res.json({ id: user.id, name: user.name, email: user.email, token });
  });
});

router.get('/csrf', requireLogin, (req, res) => {
  if (!req.session.csrfToken) {
    issueCsrfToken(req);
  }
  res.json({ csrfToken: req.session.csrfToken });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('shoplab.sid');
    res.status(204).end();
  });
});

router.get('/me', requireLogin, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Please log in' });
  res.json({ id: user.id, name: user.name, email: user.email });
});

module.exports = router;