const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const requireLogin = require('../middleware/requireLogin');
const { issueCsrfToken } = require('../middleware/csrf');
const { loginBodySchema } = require('../validation/catalog');
const bcrypt = require('bcryptjs')
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15min
  limit: 5,
  message: {error: "Too many requests"}
})

const router = express.Router();

// Lab 4 teaching build: secret lives in source (students move this to env).
const JWT_SECRET = 'shoplab-jwt-secret';

function sha256Hex(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

function bycriptHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.hashSync(password, salt);
  return hash;
}

router.post('/login', limiter, (req, res, next) => {
  const parsed = loginBodySchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'something went wrong' });
  }

  const { email, password } = parsed.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Lab 4 teaching build: different messages reveal whether the account exists.
  if (!user) {
    return res.status(401).json({ error: 'something went wrong' });
  }

  if (sha256Hex(password) !== user.password_hash) {
    return res.status(401).json({ error: 'something went wrong' });
  }

  // Lab 4 teaching build: JWT has no exp claim.
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);

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
