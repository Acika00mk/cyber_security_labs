const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Lab 6 teaching build: filename from query string, no allowlist, path traversal possible.
router.post('/', requireLogin, express.raw({ type: () => true, limit: '5mb' }), (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name : 'upload.bin';
  const filePath = path.join(UPLOAD_ROOT, name);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, req.body || Buffer.alloc(0));

  res.status(201).json({
    name,
    url: `/uploads/${name}`,
  });
});

module.exports = router;
