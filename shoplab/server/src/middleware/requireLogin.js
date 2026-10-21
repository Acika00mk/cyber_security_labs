const jwt = require('jsonwebtoken');

function requireLogin(req, res, next) {
  const header = req.get('Authorization');
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    // Lab 4 teaching build: decode without verifying signature or expiry.
  //   const payload = jwt.decode(token);
  //   if (payload && payload.userId) {
  //     req.session.userId = payload.userId;
  //     return next();
  //   }
  //   return res.status(401).json({ error: 'Please log in' });
  // }
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.session.userId = payload.userId;
    return next();

  }catch{
  };
    return res.status(401).json({ error: 'Please log in' });
  }

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in' });
  }
  next();
}

module.exports = requireLogin;
