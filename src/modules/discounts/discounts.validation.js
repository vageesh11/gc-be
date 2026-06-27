'use strict';

const Joi = require('joi');

const DISCOUNT_TYPES  = ['percentage', 'flat'];
const SCOPES          = ['session', 'order', 'all'];
const TABLE_TYPES     = ['pool', 'snooker', 'ps5'];

const createDiscount = Joi.object({
  name:           Joi.string().trim().min(1).max(100).required(),
  code:           Joi.string().trim().uppercase().max(50).optional().allow('', null),
  discount_type:  Joi.string().valid(...DISCOUNT_TYPES).required(),
  discount_value: Joi.when('discount_type', {
    is:        'percentage',
    then:      Joi.number().min(0).max(100).required(),
    otherwise: Joi.number().min(0).required(),
  }),
  scope:                    Joi.string().valid(...SCOPES).default('session'),
  applicable_table_types:   Joi.array().items(Joi.string().valid(...TABLE_TYPES)).optional().allow(null),
  valid_from:               Joi.date().iso().optional().allow(null),
  valid_until:              Joi.date().iso().optional().allow(null),
});

const updateDiscount = Joi.object({
  name:           Joi.string().trim().min(1).max(100),
  code:           Joi.string().trim().uppercase().max(50).allow('', null),
  discount_type:  Joi.string().valid(...DISCOUNT_TYPES),
  discount_value: Joi.number().min(0),
  scope:                    Joi.string().valid(...SCOPES),
  applicable_table_types:   Joi.array().items(Joi.string().valid(...TABLE_TYPES)).allow(null),
  is_active:                Joi.boolean(),
  valid_from:               Joi.date().iso().allow(null),
  valid_until:              Joi.date().iso().allow(null),
}).min(1);

module.exports = { createDiscount, updateDiscount };
