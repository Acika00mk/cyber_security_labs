function requestLog(req, res, next) {
  res.on("finish", () => {
    const time = new Date().toTimeString().slice(0, 8);
    const origin = req.headers.origin || "-";
    const hasSession = /(^|;\s*)shoplab\.sid=/.test(req.headers.cookie || "")
      ? "yes"
      : "no";
    if (res.statusCode === 401) {
      console.log(
        `${time} ${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} origin:${origin} sid:${hasSession} Session Id: ${req.session.id} Account ${req.body.email} Status ${res.statusMessage} `,
      );
    }
    console.log(
      `${time} ${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} origin:${origin} sid:${hasSession}  Status ${res.statusMessage} `,
    );
  });
  next();
}

module.exports = requestLog;
