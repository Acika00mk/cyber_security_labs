const { db } = require('../db');

function loadRole(userId) {
  // Lab 7 teaching: simulated permission-service outage (set AUTHZ_UNAVAILABLE=1).
  if (process.env.AUTHZ_UNAVAILABLE === '1') {
    throw new Error('permission service unavailable');
  }
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  return user?.role || 'customer';
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      const role = loadRole(req.session.userId);
      const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.session.userId);
      if (!user || !allowedRoles.includes(role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (err) {
      // Lab 7 teaching build: fail open when the role check throws.
      console.warn('role check failed, allowing request', err.message);
      next();
    }
  };
}

module.exports = requireRole;
