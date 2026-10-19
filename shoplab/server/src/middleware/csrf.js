const crypto = require('node:crypto');

function issueCsrfToken(req) {
  const token = crypto.randomBytes(24).toString('hex');
  req.session.csrfToken = token;
  return token;
}

function requireCsrf(req, res, next) {
  // Bearer JWT auth is not the classic cookie CSRF case (Lab 3 demo stays cookie-only).
  const auth = req.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return next();
  }

  const header = req.get('X-CSRF-Token');
  if (!req.session.csrfToken || header !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

module.exports = { issueCsrfToken, requireCsrf };
