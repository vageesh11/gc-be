'use strict';

const Joi = require('joi');

const createOrder = Joi.object({
  session_id: Joi.number().integer().positive().required(),
  item_id:    Joi.number().integer().positive().required(),
  quantity:   Joi.number().integer().min(1).required(),
});

const createSnackOrder = Joi.object({
  item_id:  Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).required(),
});

module.exports = { createOrder, createSnackOrder };
