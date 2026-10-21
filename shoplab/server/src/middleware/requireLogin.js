const jwt = require('jsonwebtoken');

// Мора да биде ТОЧНО ИСТИОТ клуч од auth.js:
const JWT_SECRET = 'shoplab-jwt-secret';

function requireLogin(req, res, next) {
  const header = req.get('Authorization');
  
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload && payload.userId) {
        req.session.userId = payload.userId;
        return next();
      }
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in' });
  }
  
  next();
}

module.exports = requireLogin;