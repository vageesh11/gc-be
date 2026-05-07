'use strict';

const passesService                  = require('./passes.service');
const { parsePagination, buildMeta } = require('../../utils/paginate');

async function getPasses(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await passesService.getAllPasses({ limit, offset });
    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: buildMeta(total, page, limit),
    });
  } catch (err) { return next(err); }
}

async function createPass(req, res, next) {
  try {
    const pass = await passesService.createPass(req.body);
    return res.status(201).json({ status: 'success', data: pass });
  } catch (err) { return next(err); }
}

async function purchasePass(req, res, next) {
  try {
    const cp = await passesService.purchasePass(req.body);
    return res.status(201).json({ status: 'success', data: cp });
  } catch (err) { return next(err); }
}

async function getCustomerPasses(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await passesService.getCustomerPasses(
      Number(req.params.customerId), { limit, offset }
    );
    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: buildMeta(total, page, limit),
    });
  } catch (err) { return next(err); }
}

module.exports = { getPasses, createPass, purchasePass, getCustomerPasses };
