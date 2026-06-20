'use strict';

const customersService               = require('./customers.service');
const { parsePagination, buildMeta } = require('../../utils/paginate');

async function getCustomers(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;
    const { rows, total } = await customersService.getAllCustomers({ search, limit, offset });
    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: buildMeta(total, page, limit),
    });
  } catch (err) { return next(err); }
}

async function getCustomerById(req, res, next) {
  try {
    const customer = await customersService.getCustomerById(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: customer });
  } catch (err) { return next(err); }
}

async function createCustomer(req, res, next) {
  try {
    const customer = await customersService.createCustomer(req.body);
    return res.status(201).json({ status: 'success', data: customer });
  } catch (err) { return next(err); }
}

async function updateCustomer(req, res, next) {
  try {
    const customer = await customersService.updateCustomer(Number(req.params.id), req.body);
    return res.status(200).json({ status: 'success', data: customer });
  } catch (err) { return next(err); }
}

async function getCustomerSessions(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await customersService.getCustomerSessions(
      Number(req.params.id), { limit, offset }
    );
    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: buildMeta(total, page, limit),
    });
  } catch (err) { return next(err); }
}

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, getCustomerSessions };
