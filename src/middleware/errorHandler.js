'use strict';

const env = require('../config/env');
const AppError = require('../utils/AppError');

// Translate known pg error codes to user-friendly messages
function handlePgError(err) {
  if (err.code === '23503') {
    return new AppError('Referenced record does not exist (foreign key violation).', 400);
  }
  if (err.code === '23505') {
    return new AppError('A record with that value already exists (duplicate).', 409);
  }
  if (err.code === '22P02') {
    return new AppError('Invalid input syntax — check the data types you provided.', 400);
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Translate pg errors first
  const pgTranslated = err.code ? handlePgError(err) : null;
  const error = pgTranslated || err;

  const statusCode = error.statusCode || 500;
  const message = error.isOperational
    ? error.message
    : 'An unexpected error occurred. Please try again later.';

  const response = { status: 'error', message };

  // Include stack trace in development for easier debugging
  if (env.nodeEnv === 'development' && !error.isOperational) {
    response.stack = err.stack;
  }

  if (statusCode >= 500) {
    console.error('[ERROR]', err);
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
