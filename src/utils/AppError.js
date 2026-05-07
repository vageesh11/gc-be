'use strict';

/**
 * Operational error with an HTTP status code.
 * Non-operational errors (programming bugs) should be plain Error instances.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
