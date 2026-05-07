'use strict';

const Joi = require('joi');

const login = Joi.object({
  username: Joi.string().trim().min(1).required(),
  password: Joi.string().min(1).required(),
});

module.exports = { login };
