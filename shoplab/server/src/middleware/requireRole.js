const { db } = require("../db");

function requireRole(allowedRoles) {

  return function (req, res, next) {

    const userId = req.session.userId;

    const userRole = db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId);

    if (!userRole) {
      return res.status(404).josn({ error: "User not found" });
    }

    if (!allowedRoles.includes(userRole.role)) {
      return res.status(403).json({ error: "Forbidden Access" });
    }

    next();
  };

}

module.exports = requireRole;
