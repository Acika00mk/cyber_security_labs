const express = require('express');
const { db } = require('../db');

const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
// Lab 5 teaching build: any logged-in user can list all accounts (UI hides the Admin link).
router.get('/users', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, email, name, role FROM users ORDER BY id').all();
  res.json(rows);
});



module.exports = router;
