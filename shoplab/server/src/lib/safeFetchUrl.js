const net = require('node:net');
const { URL } = require('node:url');
const dns = require('node:dns').promises;

function isBlockedIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe80')) return true;
  }
  return false;
}

async function assertSafeFetchUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    const err = new Error('Invalid URL');
    err.status = 400;
    throw err;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    const err = new Error('URL scheme not allowed');
    err.status = 400;
    throw err;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal') {
    const err = new Error('Host not allowed');
    err.status = 400;
    throw err;
  }

  if (net.isIP(host)) {
    if (isBlockedIp(host)) {
      const err = new Error('Target not allowed');
      err.status = 400;
      throw err;
    }
    return parsed.href;
  }

  const { address } = await dns.lookup(host, { verbatim: true });
  if (isBlockedIp(address)) {
    const err = new Error('Target not allowed');
    err.status = 400;
    throw err;
  }

  return parsed.href;
}

module.exports = { assertSafeFetchUrl };
