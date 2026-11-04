// Lab 6 teaching build: returns stack traces (and SQLite hints) to API clients.
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const payload = {
    error: err.message || 'Error',
    stack: err.stack,
  };

  if (err.code === 'SQLITE_ERROR') {
    payload.sql = err.message;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
