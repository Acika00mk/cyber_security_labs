<<<<<<< HEAD

const { db } = require('../db');

function requireRole(role, req, res, next) {
    // if (!req.session.userId) {
    //     return res.status(401).json({ error: 'Please log in' });
    // }

    // const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    // if (!user || user.role !== 'admin') {
    //     return res.status(403).json({ error: 'Not authorized' });
    // }

    return function (req, res, next) {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
        if (!user || user.role !== role) {
            return res.status(403).json({ error: 'Not authorized' });
        }
    
    next();
    };
    
}

module.exports = requireRole;
=======
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
>>>>>>> c73c5f3d7c3d68935fd1f54194209bdb061a6508
