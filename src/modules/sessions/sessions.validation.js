'use strict';

const Joi = require('joi');

const BOOKING_TYPES  = ['pay_as_you_go', 'fixed_slot', 'pre_booking'];
const DISCOUNT_TYPES = ['none', 'percentage', 'flat', 'pass'];

const startSession = Joi.object({
  table_id:          Joi.number().integer().positive().required(),

  // Customer info — auto-creates or matches by phone
  customer_name:     Joi.string().trim().min(1).max(150).required(),
  customer_phone:    Joi.string().trim().pattern(/^[6-9]\d{9}$/).required()
                       .messages({ 'string.pattern.base': 'Phone must be a valid 10-digit Indian mobile number.' }),

  // Booking type
  booking_type:      Joi.string().valid(...BOOKING_TYPES).default('pay_as_you_go'),

  // scheduled_start: required for pre_booking, forbidden for others
  scheduled_start:   Joi.when('booking_type', {
    is:        'pre_booking',
    then:      Joi.date().iso().greater('now').required()
                 .messages({ 'date.greater': 'scheduled_start must be a future date/time.' }),
    otherwise: Joi.forbidden(),
  }),

  // booked_duration: required for fixed_slot and pre_booking
  booked_duration:   Joi.when('booking_type', {
    is:        Joi.valid('fixed_slot', 'pre_booking'),
    then:      Joi.number().integer().min(1).required(),
    otherwise: Joi.number().integer().min(1).optional(),
  }),

  // Discount
  discount_type:     Joi.string().valid(...DISCOUNT_TYPES).default('none'),
  discount_value:    Joi.when('discount_type', {
    is:        Joi.valid('percentage', 'flat'),
    then:      Joi.number().min(0).required(),
    otherwise: Joi.number().min(0).default(0),
  }),

  // Pass
  customer_pass_id:  Joi.when('discount_type', {
    is:        'pass',
    then:      Joi.number().integer().positive().required(),
    otherwise: Joi.number().integer().positive().optional(),
  }),

  booking_id:        Joi.number().integer().positive().optional(),
});

const endSession = Joi.object({
  session_id:    Joi.number().integer().positive().required(),
  cash_amount:   Joi.number().min(0).precision(2).required()
                   .messages({ 'any.required': 'cash_amount is required.' }),
  online_amount: Joi.number().min(0).precision(2).required()
                   .messages({ 'any.required': 'online_amount is required.' }),
}).custom((val, helpers) => {
  // cash_amount + online_amount must sum to approximately net_amount (validated in service)
  // Here we just ensure at least one is > 0 (can't pay nothing)
  if (val.cash_amount === 0 && val.online_amount === 0) {
    return helpers.error('any.invalid');
  }
  return val;
}).messages({ 'any.invalid': 'cash_amount and online_amount cannot both be zero.' });

const pauseSession = Joi.object({
  session_id: Joi.number().integer().positive().required(),
});

const resumeSession = Joi.object({
  session_id: Joi.number().integer().positive().required(),
});

module.exports = { startSession, endSession, pauseSession, resumeSession };
