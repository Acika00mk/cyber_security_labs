const { db } = require('../db');


function requireRole(role) {
    // const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);

    // if(user.role !== 'admin'){
    //     return res.status(403).json({ error: 'Not Authorized!' });
    // }

    return function(req, res, next){
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
        if(user.role !== role){
            return res.status(403).json({ error: 'Not Authorized!' });
        }
        next();
    }



    // next();

}

module.exports = requireRole;