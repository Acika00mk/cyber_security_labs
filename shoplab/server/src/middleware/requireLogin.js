const jwt = require('jsonwebtoken');
const JWT_SECRET = 'shoplab-jwt-secret';

function requireLogin(req, res, next) {
  const header = req.get('Authorization');
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    // Lab 4 teaching build: decode without verifying signature or expiry.
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload && payload.userId) {
      req.session.userId = payload.userId;
      return next();
    }
    return res.status(401).json({ error: 'Please log in' });
  }

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in' });
  }
  next();
}

module.exports = requireLogin;
