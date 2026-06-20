'use strict';

const Joi = require('joi');

const createCustomer = Joi.object({
  name:  Joi.string().trim().min(1).max(150).required(),
  phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required()
           .messages({ 'string.pattern.base': 'Phone must be a valid 10-digit Indian mobile number.' }),
});

const updateCustomer = Joi.object({
  name:  Joi.string().trim().min(1).max(150).required(),
  phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required()
           .messages({ 'string.pattern.base': 'Phone must be a valid 10-digit Indian mobile number.' }),
});

module.exports = { createCustomer, updateCustomer };
