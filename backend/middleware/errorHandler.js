const logger = require('../utils/logger');

/**
 * Central error handling middleware.
 * Controllers should call next(err) to reach here.
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  logger.error(err.message, {
    status,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.status(status).json({ success: false, message });
};

/**
 * Wraps an async route handler and forwards errors to next().
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler };
