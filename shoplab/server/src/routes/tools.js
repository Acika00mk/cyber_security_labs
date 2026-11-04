const dns = require('node:dns/promises');
const net = require('node:net');
const express = require('express');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

function isDisallowedAddress(address) {
  const ip = net.isIP(address);
  if (!ip) {
    return false;
  }

  if (address === '::1' || address === '127.0.0.1' || address === '0.0.0.0') {
    return true;
  }

  if (ip === 4) {
    const parts = address.split('.').map(Number);
    const [a, b, c] = parts;
    if (a === 10 || a === 127 || a === 169 && b === 254 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    if (a === 0 || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19) || a === 224 || a >= 240) {
      return true;
    }
  }

  if (ip === 6) {
    return address.startsWith('::1') || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80');
  }

  return false;
}

async function isAllowedFetchTarget(target) {
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
    return false;
  }

  if (hostname === 'metadata.google.internal' || hostname === 'metadata' || hostname === '169.254.169.254') {
    return false;
  }

  if (net.isIP(hostname)) {
    return !isDisallowedAddress(hostname);
  }

  try {
    const { address } = await dns.lookup(hostname);
    return !isDisallowedAddress(address);
  } catch {
    return false;
  }
}

// Allow only public HTTPS destinations to avoid SSRF against internal services.
router.get('/fetch', requireLogin, async (req, res, next) => {
  const url = req.query.url;
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  const trimmedUrl = url.trim();

  try {
    if (!(await isAllowedFetchTarget(trimmedUrl))) {
      return res.status(400).json({ error: 'Only public HTTPS URLs are allowed.' });
    }

    const response = await fetch(trimmedUrl, { redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
      return res.status(400).json({ error: 'Redirects are not allowed.' });
    }

    const body = await response.text();
    return res.json({
      url: trimmedUrl,
      status: response.status,
      body: body.slice(0, 8000),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
