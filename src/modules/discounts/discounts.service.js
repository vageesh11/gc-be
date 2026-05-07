'use strict';

const discountsRepo = require('./discounts.repository');
const AppError      = require('../../utils/AppError');

async function getAllDiscounts({ include_inactive, limit, offset }) {
  return discountsRepo.findAll({ include_inactive, limit, offset });
}

async function getDiscountById(id) {
  const d = await discountsRepo.findById(id);
  if (!d) throw new AppError(`Discount with id ${id} not found.`, 404);
  return d;
}

async function getDiscountByCode(code) {
  const d = await discountsRepo.findByCode(code);
  if (!d) throw new AppError(`No discount found with code "${code}".`, 404);
  if (!d.is_active) throw new AppError(`Discount "${code}" is inactive.`, 400);
  if (d.valid_until && new Date(d.valid_until) < new Date()) {
    throw new AppError(`Discount "${code}" has expired.`, 400);
  }
  return d;
}

async function createDiscount(data) {
  return discountsRepo.create(data);
}

async function updateDiscount(id, data) {
  const d = await discountsRepo.findById(id);
  if (!d) throw new AppError(`Discount with id ${id} not found.`, 404);
  return discountsRepo.update(id, data);
}

async function deleteDiscount(id) {
  const d = await discountsRepo.findById(id);
  if (!d) throw new AppError(`Discount with id ${id} not found.`, 404);
  return discountsRepo.remove(id);
}

module.exports = {
  getAllDiscounts, getDiscountById, getDiscountByCode,
  createDiscount, updateDiscount, deleteDiscount,
};
