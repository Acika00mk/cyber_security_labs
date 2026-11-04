const { db } = require('../db');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
    const role = user?.role || 'customer';
    if (!user || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = requireRole;
