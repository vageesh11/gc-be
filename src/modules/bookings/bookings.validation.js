'use strict';

const Joi = require('joi');

const createBooking = Joi.object({
  customer_id:     Joi.number().integer().positive().required(),
  table_id:        Joi.number().integer().positive().required(),
  scheduled_start: Joi.date().iso().greater('now').required(),
  booked_duration: Joi.number().integer().min(1).required(),
  notes:           Joi.string().trim().max(500).optional().allow(''),
});

module.exports = { createBooking };
