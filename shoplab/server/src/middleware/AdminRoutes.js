const { db } = require("../db");

function adminRoutes(req, res, next) {
  console.log(req);
  const userId = req.session.userId;
  console.log("user id: ", userId);
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
  console.log(user);
  if (user.role != "admin") {
    return res.status(403).json({ "message": "403 forbidden"});
  }

  next()
}


module.exports = adminRoutes;