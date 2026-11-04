function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number(err.status || err.statusCode || 500);
  const requestId = req.id || req.get('X-Request-Id');

  console.error(`[${requestId || 'unknown'}] ${err.stack || err.message}`);

  const payload = { error: 'Something went wrong' };
  if (requestId) {
    payload.requestId = requestId;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
