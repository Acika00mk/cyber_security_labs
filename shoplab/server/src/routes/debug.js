const express = require('express');

const router = express.Router();

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// Teaching endpoint: shows what the browser sends. Cookie values are never returned.
router.get('/echo', (req, res) => {
  const cookies = (req.headers.cookie || '')
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter(Boolean);

  const headers = { ...req.headers };
  if (headers.cookie) headers.cookie = `(${cookies.length} cookie(s), values hidden)`;

  res.json({ method: req.method, url: req.originalUrl, headers, cookies });
});

// Lab 6 teaching build: configuration hints without printing secret values.
router.get('/config', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV || '(not set)',
    verboseErrors: process.env.VERBOSE_ERRORS || '(not set)',
    sessionSecretFromEnv: Boolean(process.env.SESSION_SECRET),
    usingDefaultSessionSecret: !process.env.SESSION_SECRET,
  });
});

router.get('/crash', (req, res, next) => {
  next(new Error('Intentional Lab 6 error for verbose error handling demo'));
});

module.exports = router;
