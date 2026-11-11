const express = require('express');
const requireLogin = require('../middleware/requireLogin');
const { assertSafeFetchUrl } = require('../lib/safeFetchUrl');

const router = express.Router();

router.get('/fetch', requireLogin, async (req, res, next) => {
  const url = req.query.url;
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  try {
    const safeUrl = await assertSafeFetchUrl(url.trim());
    const response = await fetch(safeUrl, { redirect: 'error' });
    const body = await response.text();
    res.json({
      url: safeUrl,
      status: response.status,
      body: body.slice(0, 8000),
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
