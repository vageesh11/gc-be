'use strict';

const inventoryRepo = require('./inventory.repository');
const AppError = require('../../utils/AppError');

async function getAllItems(filters) {
  return inventoryRepo.findAll(filters);
}

async function createItem(data) {
  return inventoryRepo.create(data);
}

async function updateItem(id, data) {
  const item = await inventoryRepo.findById(id);
  if (!item) {
    throw new AppError(`Inventory item with id ${id} not found.`, 404);
  }
  const updated = await inventoryRepo.update(id, data);
  return updated;
}

async function getItemById(id) {
  const item = await inventoryRepo.findById(id);
  if (!item) {
    throw new AppError(`Inventory item with id ${id} not found.`, 404);
  }
  return item;
}

async function deleteItem(id) {
  const item = await inventoryRepo.findById(id);
  if (!item) {
    throw new AppError(`Inventory item with id ${id} not found.`, 404);
  }
  return inventoryRepo.remove(id);
}

module.exports = { getAllItems, createItem, updateItem, getItemById, deleteItem };
