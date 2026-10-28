const { db } = require("../db");

function requireRole(role) {
//   const role = db
//     .prepare("SELECT role FROM users WHERE id = ?")
//     .get(req.session.userId);

//   if (role.role !== "admin") {
//     return res.status(403).json({ error: "Admin access required" });
//   }

    return function(req, res, next) {
        const userId = req.session.userId;
        const userRole = db
            .prepare("SELECT role FROM users WHERE id = ?")
            .get(userId).role;

        if (userRole !== role) {
            return res.status(403).json({ error: "Admin access required" });
        }

        next();
    }

//   next();
}

module.exports = requireRole;
