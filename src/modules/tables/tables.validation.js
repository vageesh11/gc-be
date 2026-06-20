'use strict';

const Joi = require('joi');

const TABLE_TYPES = ['pool', 'snooker', 'ps5'];
const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'PAUSED'];

const createTable = Joi.object({
  name:             Joi.string().trim().min(1).max(100).required(),
  type:             Joi.string().valid(...TABLE_TYPES).required(),
  // Accept either per-hour or per-minute pricing; at least one required
  price_per_hour:   Joi.number().positive().precision(2),
  price_per_minute: Joi.number().positive().precision(2),
  // WiZ smart plug (optional)
  wiz_ip:  Joi.string().trim().ip({ version: ['ipv4'] }).optional().allow('', null)
             .messages({ 'string.ip': 'wiz_ip must be a valid IPv4 address (e.g. 192.168.1.101)' }),
  wiz_mac: Joi.string().trim().pattern(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/).optional().allow('', null)
             .messages({ 'string.pattern.base': 'wiz_mac must be a valid MAC address (e.g. AA:BB:CC:DD:EE:FF)' }),
}).or('price_per_hour', 'price_per_minute');

const updateStatus = Joi.object({
  status: Joi.string().valid(...TABLE_STATUSES).required(),
});

module.exports = { createTable, updateStatus };
