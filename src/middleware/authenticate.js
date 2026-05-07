'use strict';

const jwt     = require('jsonwebtoken');
const env     = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Verifies the Bearer JWT on every protected route.
 * Attaches decoded payload as req.user = { id, username, role }.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Provide a Bearer token.', 401));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = { id: payload.id, username: payload.username, role: payload.role };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Session expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid token.', 401));
  }
}

module.exports = authenticate;
