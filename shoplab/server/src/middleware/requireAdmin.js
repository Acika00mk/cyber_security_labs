
const { db } = require('../db');

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Please log in' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
    }
    next();


}
module.exports = requireLogin;