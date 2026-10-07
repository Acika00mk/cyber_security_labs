const express = require('express');
const { db } = require('../db');
const requireLogin = require('../middleware/requireLogin');
const { LoginSchema } = require('./validation/catalog');

const router = express.Router();

router.post('/login', (req, res, next) => {
  const { email, password } = req.body || {};

  const parseBody = LoginSchema.safeParse(req.body)

  if (!parseBody.success) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const user = db
  .prepare("SELECT * FROM users WHERE email = ? AND password = ?")
  .get(parseBody.data.email, parseBody.data.password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    res.json({ id: user.id, name: user.name, email: user.email });
  });
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
