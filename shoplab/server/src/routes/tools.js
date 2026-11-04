const express = require('express');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

// Lab 6 teaching build: allow only known hosts.
const ALLOWED_HOSTS = new Set(['example.com']);

router.get('/fetch', requireLogin, async (req, res, next) => {
  const input = req.query.url;

  if (typeof input !== 'string' || !input.trim()) {
    return res.status(400).json({
      error: 'url query parameter required',
    });
  }

  let url;

  try {
    url = new URL(input.trim());
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (
    url.protocol !== 'https:' ||
    !ALLOWED_HOSTS.has(url.hostname) ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  ) {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  try {
    const response = await fetch(url.href, {
      // Never follow redirects to an unvalidated destination.
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });

    if (response.status >= 300 && response.status < 400) {
      if (response.body) {
        await response.body.cancel();
      }

      return res.status(400).json({
        error: 'Redirects are not allowed',
      });
    }

    const body = await response.text();

    return res.json({
      url: url.href,
      status: response.status,
      body: body.slice(0, 8000),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;