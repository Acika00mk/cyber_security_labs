const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.txt', '.pdf']);

function resolveStoredPath(storedName) {
  const base = path.basename(storedName);
  const resolvedRoot = path.resolve(UPLOAD_ROOT);
  const filePath = path.resolve(UPLOAD_ROOT, base);
  if (!filePath.startsWith(resolvedRoot + path.sep)) {
    return null;
  }
  return filePath;
}

function pickStoredName(originalName) {
  const base = path.basename(String(originalName || 'upload.bin')).replace(/\0/g, '');
  if (!base || base === '.' || base === '..') {
    return { error: 'Invalid filename', status: 400 };
  }
  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return { error: 'File type not allowed', status: 400 };
  }
  return { stored: `${crypto.randomUUID()}${ext}` };
}

router.post('/', requireLogin, express.raw({ type: () => true, limit: '5mb' }), (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name : 'upload.bin';
  const picked = pickStoredName(name);
  if (picked.error) {
    return res.status(picked.status).json({ error: picked.error });
  }

  const filePath = resolveStoredPath(picked.stored);
  if (!filePath) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  fs.writeFileSync(filePath, req.body || Buffer.alloc(0));

  res.status(201).json({
    id: picked.stored,
    originalName: path.basename(name),
    downloadUrl: `/api/uploads/${picked.stored}`,
  });
});

router.get('/:fileId', requireLogin, (req, res) => {
  const filePath = resolveStoredPath(req.params.fileId);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(filePath);
});

module.exports = router;
