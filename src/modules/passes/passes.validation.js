'use strict';

const Joi = require('joi');

const createPass = Joi.object({
  name:          Joi.string().trim().min(1).max(100).required(),
  total_minutes: Joi.number().integer().min(1).required(),
  price:         Joi.number().min(0).precision(2).required(),
});

const purchasePass = Joi.object({
  customer_id: Joi.number().integer().positive().required(),
  pass_id:     Joi.number().integer().positive().required(),
  expires_at:  Joi.date().iso().greater('now').optional(),
});

module.exports = { createPass, purchasePass };
