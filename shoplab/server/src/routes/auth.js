const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const requireLogin = require('../middleware/requireLogin');
const { issueCsrfToken } = require('../middleware/csrf');
const { loginBodySchema } = require('../validation/catalog');
const bycrypt = require('bcryptjs');
const router = express.Router();
const {rateLimite, default: rateLimit} = require('express-rate-limit');

// Lab 4 teaching build: secret lives in source (students move this to env).

const JWT_SECRET = process.env.JWT_SECRET

// function sha256Hex(password) {
//   return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
// }

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit:5,
    standartHeaders: 'draft-8',
    legacyHeaders: false,
    message: {error: 'Too many login attempts, please try again later.'}
  })

  function bycryptHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash;
  }

  

router.post('/login', loginLimiter ,(req, res, next) => {
  const parsed = loginBodySchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const { email, password } = parsed.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Lab 4 teaching build: different messages reveal whether the account exists.

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bycrypt.compareSync(password, user.password.hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Lab 4 teaching build: JWT has no exp claim.
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' }
);

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
