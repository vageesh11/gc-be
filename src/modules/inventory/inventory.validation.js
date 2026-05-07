'use strict';

const Joi = require('joi');

const createItem = Joi.object({
  name:           Joi.string().trim().min(1).max(150).required(),
  price:          Joi.number().min(0).precision(2).required(),
  stock_quantity: Joi.number().integer().min(0).required(),
});

const updateItem = Joi.object({
  name:           Joi.string().trim().min(1).max(150),
  price:          Joi.number().min(0).precision(2),
  stock_quantity: Joi.number().integer().min(0),
}).min(1); // at least one field required

module.exports = { createItem, updateItem };
