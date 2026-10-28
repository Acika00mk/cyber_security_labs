const { db } = require('../db');

function requireRole(...allowedRoles) {
  if (allowedRoles.length === 0) {
    throw new Error('At least one role must be allowed');
  }

  return (req, res, next) => {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}

module.exports = requireRole;
