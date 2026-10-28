const { db } = require('../db');

function adminRoutes(req, res, next) {
  console.log(req);
  const userId = req.session.userId;
  console.log("user id: " + userId);
  const user = db.prepare('SELECT role FROM users where id = ?').get(userId);
  console.log(user);
  if (user.role != "admin") {
    return res.status(403).json({ message: "Forbidden Access" });
  }

  next();
}

module.exports = adminRoutes;
