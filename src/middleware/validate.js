'use strict';

const AppError = require('../utils/AppError');

/**
 * Returns an Express middleware that validates req.body against a Joi schema.
 * On failure, throws a 400 AppError with the first validation message.
 * @param {import('joi').ObjectSchema} schema
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    req.body = value; // use the sanitised/coerced value
    return next();
  };
}

module.exports = validate;
