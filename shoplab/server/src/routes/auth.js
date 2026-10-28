const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { db, verifyPassword } = require('../db');
const requireLogin = require('../middleware/requireLogin');
const { issueCsrfToken } = require('../middleware/csrf');
const { loginBodySchema, profilePatchSchema } = require('../validation/catalog');

const router = express.Router();

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

router.post('/login', loginLimiter, (req, res, next) => {
  const parsed = loginBodySchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const { email, password } = parsed.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, jwtSecret(), { expiresIn: '1h' });

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    issueCsrfToken(req);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'customer',
      token,
    });
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
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Please log in' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role || 'customer' });
});

// Lab 5 teaching build: whole request body can change role and email (mass assignment).
router.patch('/me', requireLogin, (req, res) => {

  const parsed = profilePatchSchema.safeParse(req.body || {});

  if(!parsed.success) {
      return res.status(400).json({error: 'Invalid'})
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Please log in' });

  const { name } = parsed.data

  if (!name) {
    return res.status(400).json({ error: 'Invalid profile' });
  }

  
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, user.id);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

module.exports = router;
