
// const db = require('../db');

// function requireRole(req, res, next) {

//     const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
//     if (user.role !== 'admin') {
//         return res.status(403).json({ error: 'Not Authorized' });
//     }

//     next();
    
// }

// module.exports = requireRole;