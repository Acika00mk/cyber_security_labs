const dns = require('node:dns');
const net = require('node:net');
const express = require('express');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
}

function isBlockedAddress(ip) {
  if (net.isIP(ip) === 4) {
    return isPrivateIPv4(ip);
  }
  if (net.isIP(ip) === 6) {
    return isPrivateIPv6(ip);
  }
  return false;
}

async function assertAllowedUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error('Invalid URL'), { status: 400 });
  }

  const hostname = parsed.hostname.toLowerCase();
  const isIP = net.isIP(hostname);
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || (isIP !== 0 && isBlockedAddress(hostname))) {
    throw Object.assign(new Error('URL target is blocked'), { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    throw Object.assign(new Error('Only HTTPS URLs are allowed'), { status: 400 });
  }

  const addresses = await new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true }, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });

  const targetAddresses = Array.isArray(addresses) ? addresses.map((entry) => entry.address) : [];
  if (targetAddresses.some(isBlockedAddress)) {
    throw Object.assign(new Error('URL target is blocked'), { status: 400 });
  }

  return parsed;
}

router.get('/fetch', requireLogin, async (req, res, next) => {
  const url = req.query.url;
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  try {
    const targetUrl = await assertAllowedUrl(url.trim());
    const response = await fetch(targetUrl, { redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
      return res.status(400).json({ error: 'Redirects are not allowed' });
    }
    const body = await response.text();
    res.json({
      url: targetUrl.toString(),
      status: response.status,
      body: body.slice(0, 8000),
    });
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
