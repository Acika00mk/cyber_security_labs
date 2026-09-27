function requestLog(req, res, next) {
  res.on('finish', () => {
    const time = new Date().toTimeString().slice(0, 8);
    const origin = req.headers.origin || '-';
    const hasSession = /(^|;\s*)shoplab\.sid=/.test(req.headers.cookie || '') ? 'yes' : 'no';
    console.log(`${time} ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} origin:${origin} sid:${hasSession}`);
  });
  next();
}

module.exports = requestLog;
