const { db } = require("../db");

function requireAdmin(req, res, next) {
  const role = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(req.session.userId);

  if (role.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

module.exports = requireAdmin;
