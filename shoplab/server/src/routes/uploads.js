const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const requireLogin = require('../middleware/requireLogin');
const crypto = require('node:crypto');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Lab 6 teaching build: filename from query string, no allowlist, path traversal possible.
router.post('/', requireLogin, express.raw({ type: () => true, limit: '5mb' }), (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name : 'upload.bin';

  const fileType = name.split('.').pop().toLowerCase();

  const allowedFileTypes = ['txt', 'jpg', 'jpeg', 'png', 'gif', 'pdf', 'bin'];

  if (!allowedFileTypes.includes(fileType)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  const hashName = crypto.createHash('sha256').update(name).digest('hex');
   hasedFileName = `${hashName}.${fileType}`;

  
  const filePath = path.join(UPLOAD_ROOT, hashName);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, req.body || Buffer.alloc(0));

  res.status(201).json({
    hashName,
    url: `/uploads/${hasedFileName}`,
  });
});

module.exports = router;
