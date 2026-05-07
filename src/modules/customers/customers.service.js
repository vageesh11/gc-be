'use strict';

const customersRepo = require('./customers.repository');
const AppError      = require('../../utils/AppError');

async function getAllCustomers(filters) {
  return customersRepo.findAll(filters);
}

async function getCustomerById(id) {
  const customer = await customersRepo.findById(id);
  if (!customer) throw new AppError(`Customer with id ${id} not found.`, 404);
  return customer;
}

async function createCustomer(data) {
  return customersRepo.create(data);
}

async function getCustomerSessions(customerId, filters) {
  const customer = await customersRepo.findById(customerId);
  if (!customer) throw new AppError(`Customer with id ${customerId} not found.`, 404);
  return customersRepo.findSessionHistory(customerId, filters);
}

module.exports = { getAllCustomers, getCustomerById, createCustomer, getCustomerSessions };
