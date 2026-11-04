const crypto = require('node:crypto');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/octet-stream', 'application/json', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain']);

function sanitizeUploadName(value) {
  const name = typeof value === 'string' ? value : 'upload.bin';
  if (!name || name.includes('\0') || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw Object.assign(new Error('Invalid file name'), { status: 400 });
  }

  const safeName = path.basename(name);
  if (!safeName || safeName === '.' || safeName === '..') {
    throw Object.assign(new Error('Invalid file name'), { status: 400 });
  }

  const extension = path.extname(safeName).toLowerCase();
  return extension ? `${crypto.randomUUID()}${extension}` : `${crypto.randomUUID()}.bin`;
}

router.post('/', requireLogin, express.raw({ type: () => true, limit: '5mb' }), (req, res) => {
  const rawType = req.headers['content-type'] || 'application/octet-stream';
  const contentType = Array.isArray(rawType) ? rawType[0] : rawType;
  if (!ALLOWED_TYPES.has(contentType.split(';')[0].trim())) {
    return res.status(415).json({ error: 'Unsupported file type' });
  }

  if (!req.body || req.body.length === 0 || req.body.length > MAX_BYTES) {
    return res.status(413).json({ error: 'File too large' });
  }

  try {
    const originalName = typeof req.query.name === 'string' ? req.query.name : 'upload.bin';
    const storedName = sanitizeUploadName(originalName);
    const filePath = path.join(UPLOAD_ROOT, storedName);

    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    fs.writeFileSync(filePath, req.body);

    res.status(201).json({
      id: storedName,
      name: originalName,
      url: `/api/uploads/${storedName}`,
    });
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message || 'Upload failed' });
  }
});

router.get('/:id', requireLogin, (req, res) => {
  const safeName = path.basename(req.params.id || '');
  if (!safeName || safeName === '.' || safeName === '..') {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  const filePath = path.join(UPLOAD_ROOT, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.download(filePath, safeName);
});

module.exports = router;
