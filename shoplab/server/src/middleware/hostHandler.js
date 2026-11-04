  
  function hostHandler(req, res, next) {
    if(req.hostname == "localhost" && req.hostname == "127.0.0.1") {
      return res.status(400).json({ error: 'Not allowed' });
    }
    next();
  }
  
  module.exports = hostHandler