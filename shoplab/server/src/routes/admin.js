const express = require('express');
const { db } = require('../db');
const adminRoutes = require('../middleware/adminRoutes');

const router = express.Router();

// Lab 5 teaching build: any logged-in user can list all accounts (UI hides the Admin link).
router.get('/users', adminRoutes, (req, res) => {
  const rows = db.prepare('SELECT id, email, name, role FROM users ORDER BY id').all();
  res.json(rows);
});

module.exports = router;
