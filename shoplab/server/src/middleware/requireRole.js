function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }

    db.get(
      'SELECT role FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) {
          return next(err);
        }

        if (!user || !allowedRoles.includes(user.role)) {
          return res.status(403).json({
            error: 'Forbidden'
          });
        }

        next();
      }
    );
  };
}

module.exports = requireRole;