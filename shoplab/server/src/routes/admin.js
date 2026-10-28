const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/users', (req, res) => {
  const rows = db.prepare('SELECT id, email, name, role FROM users ORDER BY id').all();
  res.json(rows);
});

module.exports = router;
