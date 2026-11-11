function requestLog(req, res, next) {
  res.on('finish', () => {
    // console.log(res);
    const time = new Date().toTimeString().slice(0, 8);
    const origin = req.headers.origin || '-';
    const hasSession = /(^|;\s*)shoplab\.sid=/.test(req.headers.cookie || '') ? 'yes' : 'no';
    if (res.statusCode === 401){
      console.log(`Account ${req.body.email} Status: ${res.statusMessage} ${time} ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} origin:${origin} sid:${hasSession}`)
    }
    else {
    console.log(`Session ID: ${req.session.id} Status: ${res.statusMessage} ${time} ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} origin:${origin} sid:${hasSession}`);
    }
  });
  next();
}

module.exports = requestLog;
