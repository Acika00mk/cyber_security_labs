const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'shoplab-dev-secret';

function requireLogin(req, res, next) {
  const header = req.get('Authorization');
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();

    try {
      const payload = jwt.verify(token, getJwtSecret());
      if (payload && payload.userId) {
        req.session.userId = payload.userId;
        return next();
      }
    } catch (err) {
      return res.status(401).json({ error: 'Please log in' });
    }

    return res.status(401).json({ error: 'Please log in' });
  }

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in' });
  }
  next();
}

module.exports = requireLogin;
