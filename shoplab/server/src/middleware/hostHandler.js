function hostHandler(req, res, next) {
  if (req.hostname != "127.0.0.1" && req.hostname != "localhost") {
    return res.status(400).json({ error: "Not allowed IP address." });
  }

  next();
}

module.exports = hostHandler;
