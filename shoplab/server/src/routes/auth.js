const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const requireLogin = require('../middleware/requireLogin');
const { issueCsrfToken } = require('../middleware/csrf');
const { loginBodySchema } = require('../validation/catalog');
const bcrypt = require('bcryptjs')

const rateLimit = require('express-rate-limit');



const router = express.Router();


function sha256Hex(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

function bcryptHash(password){
  return bcrypt.hashSync(password, 10);
}

const loginLimiter = rateLimit({
  windowMs: 60* 15* 1000,
  limit: 5,
  message: {error:'Too many attempts, please try again later'},
})


router.post('/login', loginLimiter , (req, res, next) => {
  const parsed = loginBodySchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const { email, password } = parsed.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Lab 4 teaching build: different messages reveal whether the account exists.
  if (!user) {
    return res.status(401).json({ error:'Invalid data' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)){
    return res.status(401).json({ error: 'Invalid data'});
  }

  // Lab 4 teaching build: JWT has no exp claim.
  const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {expiresIn: '1h'});

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
