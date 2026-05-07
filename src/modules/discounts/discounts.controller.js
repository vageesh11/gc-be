'use strict';

const discountsService               = require('./discounts.service');
const { parsePagination, buildMeta } = require('../../utils/paginate');

async function getDiscounts(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const include_inactive = req.query.include_inactive === 'true';
    const { rows, total } = await discountsService.getAllDiscounts({ include_inactive, limit, offset });
    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: buildMeta(total, page, limit),
    });
  } catch (err) { return next(err); }
}

async function getDiscountById(req, res, next) {
  try {
    const d = await discountsService.getDiscountById(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: d });
  } catch (err) { return next(err); }
}

async function getDiscountByCode(req, res, next) {
  try {
    const d = await discountsService.getDiscountByCode(req.params.code.toUpperCase());
    return res.status(200).json({ status: 'success', data: d });
  } catch (err) { return next(err); }
}

async function createDiscount(req, res, next) {
  try {
    const d = await discountsService.createDiscount(req.body);
    return res.status(201).json({ status: 'success', data: d });
  } catch (err) { return next(err); }
}

async function updateDiscount(req, res, next) {
  try {
    const d = await discountsService.updateDiscount(Number(req.params.id), req.body);
    return res.status(200).json({ status: 'success', data: d });
  } catch (err) { return next(err); }
}

async function deleteDiscount(req, res, next) {
  try {
    const d = await discountsService.deleteDiscount(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: d });
  } catch (err) { return next(err); }
}

module.exports = {
  getDiscounts, getDiscountById, getDiscountByCode,
  createDiscount, updateDiscount, deleteDiscount,
};
