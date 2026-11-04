const crypto = require('node:crypto');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.bin']);
const ALLOWED_CONTENT_TYPES = new Set([
  'application/octet-stream',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
]);

function isSafeUploadName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    return false;
  }

  const normalized = name.replace(/\\/g, '/');
  if (normalized.includes('\0') || normalized.includes('..') || normalized.startsWith('/')) {
    return false;
  }

  const basename = path.basename(normalized);
  if (!basename || basename === '.' || basename === '..') {
    return false;
  }

  const safeName = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safeName.length > 0 && safeName === basename;
}

router.get('/:id', requireLogin, (req, res) => {
  const rawId = typeof req.params.id === 'string' ? req.params.id : '';
  if (!rawId || rawId.includes('..') || rawId.includes('/')) {
    return res.status(400).json({ error: 'Invalid upload id.' });
  }

  const filePath = path.resolve(UPLOAD_ROOT, rawId);
  if (!filePath.startsWith(UPLOAD_ROOT)) {
    return res.status(400).json({ error: 'Invalid upload path.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Upload not found.' });
  }

  res.download(filePath, path.basename(filePath));
});

router.post('/', requireLogin, express.raw({ type: () => true, limit: '5mb' }), (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name : 'upload.bin';
  const contentType = String(req.headers['content-type'] || 'application/octet-stream').split(';', 1)[0].trim();

  if (!Buffer.isBuffer(req.body) || req.body.length === 0 || req.body.length > MAX_UPLOAD_SIZE) {
    return res.status(400).json({ error: 'Upload size is invalid.' });
  }

  if (!isSafeUploadName(name)) {
    return res.status(400).json({ error: 'Invalid file name.' });
  }

  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return res.status(400).json({ error: 'File type not allowed.' });
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return res.status(400).json({ error: 'Content type not allowed.' });
  }

  const storedName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_ROOT, storedName);
  fs.writeFileSync(filePath, req.body);

  res.status(201).json({
    id: storedName,
    name,
    url: `/api/uploads/${storedName}`,
  });
});

module.exports = router;
