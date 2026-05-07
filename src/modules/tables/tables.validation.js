'use strict';

const Joi = require('joi');

const TABLE_TYPES = ['pool', 'snooker', 'ps5'];
const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'PAUSED'];

const createTable = Joi.object({
  name:           Joi.string().trim().min(1).max(100).required(),
  type:           Joi.string().valid(...TABLE_TYPES).required(),
  // Accept either per-hour or per-minute pricing; at least one required
  price_per_hour:   Joi.number().positive().precision(2),
  price_per_minute: Joi.number().positive().precision(2),
}).or('price_per_hour', 'price_per_minute');

const updateStatus = Joi.object({
  status: Joi.string().valid(...TABLE_STATUSES).required(),
});

module.exports = { createTable, updateStatus };
