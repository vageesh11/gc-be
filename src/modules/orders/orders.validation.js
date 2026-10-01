'use strict';

const Joi = require('joi');

const createOrder = Joi.object({
  session_id: Joi.number().integer().positive().required(),
  item_id:    Joi.number().integer().positive().required(),
  quantity:   Joi.number().integer().min(1).required(),
});

const snackCustomerFields = {
  customer_name: Joi.string().trim().max(120).allow('').optional(),
  customer_phone: Joi.string().trim().pattern(/^[0-9+()\-\s]{7,20}$/).allow('').optional(),
  snack_order_ref: Joi.string().trim().max(64).required(),
};

const createSnackOrder = Joi.object({
  item_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).required(),
  ...snackCustomerFields,
});

const createSnackOrderBatch = Joi.object({
  items: Joi.array().items(Joi.object({
    item_id: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().min(1).required(),
  })).min(1).required(),
  ...snackCustomerFields,
});

const closeSnackOrders = Joi.object({
  order_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  payment_method: Joi.string().valid('cash', 'online').required(),
});

module.exports = { createOrder, createSnackOrder, createSnackOrderBatch, closeSnackOrders };
