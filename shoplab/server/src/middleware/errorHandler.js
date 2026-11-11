const crypto = require('node:crypto');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const requestId = crypto.randomBytes(8).toString('hex');
  console.error(`[${requestId}]`, err.stack || err);

  const message = status >= 500 ? 'Something went wrong' : err.message || 'Error';

  res.status(status).json({ error: message, requestId });
}

module.exports = errorHandler;
