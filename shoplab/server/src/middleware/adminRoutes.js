const { db } = require('../db');

function adminRoutes(req, res, next){
    console.log(req.session.userId);
    const userId = req.session.userId;
    console.log("User Id:", userId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if(user.role == "admin"){
    next();
    }else{
        return res.status(403).json({ error: 'Forbiden Access' });
    }
}

module.exports = adminRoutes;
