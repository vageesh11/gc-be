'use strict';

const passesRepo    = require('./passes.repository');
const customersRepo = require('../customers/customers.repository');
const AppError      = require('../../utils/AppError');

async function getAllPasses(filters) {
  return passesRepo.findAllPasses(filters);
}

async function createPass(data) {
  return passesRepo.createPass(data);
}

async function purchasePass({ customer_id, pass_id, expires_at }) {
  const customer = await customersRepo.findById(customer_id);
  if (!customer) throw new AppError(`Customer with id ${customer_id} not found.`, 404);

  const pass = await passesRepo.findPassById(pass_id);
  if (!pass) throw new AppError(`Pass with id ${pass_id} not found.`, 404);
  if (!pass.is_active) throw new AppError('This pass type is no longer available.', 400);

  return passesRepo.purchasePass({
    customer_id,
    pass_id,
    total_minutes: pass.total_minutes,
    expires_at,
  });
}

async function getCustomerPasses(customerId, filters) {
  const customer = await customersRepo.findById(customerId);
  if (!customer) throw new AppError(`Customer with id ${customerId} not found.`, 404);
  return passesRepo.findCustomerPasses(customerId, filters);
}

module.exports = { getAllPasses, createPass, purchasePass, getCustomerPasses };
