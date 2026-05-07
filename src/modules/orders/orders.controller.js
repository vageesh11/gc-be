'use strict';

const ordersService                  = require('./orders.service');
const { parsePagination, buildMeta } = require('../../utils/paginate');

async function createOrder(req, res, next) {
  try {
    const order = await ordersService.createOrder(req.body);
    return res.status(201).json({ status: 'success', data: order });
  } catch (err) {
    return next(err);
  }
}

async function getOrdersBySession(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await ordersService.getOrdersBySession(
      Number(req.params.sessionId), { limit, offset }
    );
    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: buildMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createOrder, getOrdersBySession };
