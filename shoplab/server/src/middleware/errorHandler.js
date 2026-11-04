const { randomUUID } = require('node:crypto');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const requestId = randomUUID();

  console.error(`[${requestId}] ${err && err.stack ? err.stack : err}`);

  res.status(status).json({
    error: 'Something went wrong',
    requestId,
  });
}

module.exports = errorHandler;
