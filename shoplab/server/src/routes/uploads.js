const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { TextDecoder } = require('node:util');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();
const UPLOAD_ROOT = path.resolve(__dirname, '..', '..', 'uploads');
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

function validateUpload(req, res, next) {
  const name = req.query.name;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.length > 128 ||
    name.includes('..') ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0') ||
    path.posix.isAbsolute(name) ||
    path.win32.isAbsolute(name) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._ -]*\.txt$/i.test(name)
  ) {
    return res.status(400).json({
      error: 'Use a safe filename ending in .txt',
    });
  }

  if (!req.is('text/plain')) {
    return res.status(415).json({
      error: 'Only text/plain uploads are allowed',
    });
  }

  next();
}

router.post(
  '/',
  requireLogin,
  validateUpload,
  express.raw({
    type: 'text/plain',
    limit: '1mb',
    inflate: false,
  }),
  (req, res, next) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'File is empty' });
    }

    // Check that the content is valid UTF-8 text.
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(req.body);

      if (req.body.includes(0)) {
        throw new Error('Null byte in text');
      }
    } catch {
      return res.status(400).json({
        error: 'File must contain valid UTF-8 text without null bytes',
      });
    }

    const id = randomUUID();
    const filePath = path.resolve(UPLOAD_ROOT, `${id}.txt`);

    if (path.dirname(filePath) !== UPLOAD_ROOT) {
      return res.status(400).json({ error: 'Invalid upload path' });
    }

    try {
      fs.writeFileSync(filePath, req.body, { flag: 'wx' });

      return res.status(201).json({
        name: req.query.name,
        url: `/api/uploads/${id}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:id', requireLogin, (req, res, next) => {
  const { id } = req.params;

  if (!UUID_PATTERN.test(id)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.resolve(UPLOAD_ROOT, `${id}.txt`);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');

  res.download(filePath, 'download.txt', (err) => {
    if (!err) return;

    if (res.headersSent) return next(err);

    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }

    next(err);
  });
});

// Handle upload parser errors without exposing internal details.
router.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Maximum file size is 1 MB' });
  }

  if (err.type === 'encoding.unsupported') {
    return res.status(415).json({
      error: 'Compressed uploads are not supported',
    });
  }

  next(err);
});

module.exports = router;