const crypto = require("node:crypto");

function issueCsrfToken(req) {
  const token = crypto.randomBytes(24).toString('hex');
  req.session.csrfToken = token;
  return token;
}

function requireCsrf(req,res,next) {
  const header = req.get('X-CSRF-Token');
  if (!req.session.csrfToken || header !== req.session.csrfToken) {
    return res.status(403).json({error: 'Invalid CSRF token'});
  }
  next();
}


module.exports = { issueCsrfToken, requireCsrf };
