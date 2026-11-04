const express = require('express');
const requireLogin = require('../middleware/requireLogin');
const hostHandler = require('../middleware/hostHandler');

const router = express.Router();

// Lab 6 teaching build: server-side fetch of user-supplied URL (SSRF).
router.get('/fetch', requireLogin,hostHandler, async (req, res, next) => {
  const url = req.query.url;

  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  try {
    const response = await fetch(url.trim(), { redirect: 'follow' });
    const body = await response.text();
    res.json({
      url: url.trim(),
      status: response.status,
      body: body.slice(0, 8000),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
