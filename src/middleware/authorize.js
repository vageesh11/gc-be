'use strict';

const AppError = require('../utils/AppError');

/**
 * Role-based access control gate.
 * Usage: authorize('admin') or authorize('admin', 'operator')
 * Must be used AFTER authenticate middleware.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    return next();
  };
}

module.exports = authorize;
