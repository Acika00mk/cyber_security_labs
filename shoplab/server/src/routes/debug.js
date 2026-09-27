const express = require('express');

const router = express.Router();

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

module.exports = router;
