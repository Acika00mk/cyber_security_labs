// Lab 6 teaching build: CSP from Lab 3 only — add HSTS, nosniff, Referrer-Policy in the lab.
function securityHeaders(req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
  next();
}

module.exports = securityHeaders;
