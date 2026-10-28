const { db } = require('../db');

function requireRole(req, res, next) {

    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    if (!user) {
        return res.status(401).json({ error: 'Please log in' });
    }

    if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    next();
}

module.exports = requireRole;