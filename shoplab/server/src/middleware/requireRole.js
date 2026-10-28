const { db } = require('../db');
function requireRole(role) {
    return (req, res, next) => {
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
        if (!user || user.role !== role) {
            return res.status(403).json({ error: 'AAccess required' });
        }
        next();
    };
}

module.exports = requireRole;