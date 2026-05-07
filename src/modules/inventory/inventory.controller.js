'use strict';

const inventoryService               = require('./inventory.service');
const { parsePagination, buildMeta } = require('../../utils/paginate');

async function getItems(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;
    const { rows, total } = await inventoryService.getAllItems({ search, limit, offset });
    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: buildMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const item = await inventoryService.createItem(req.body);
    return res.status(201).json({ status: 'success', data: item });
  } catch (err) {
    return next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const item = await inventoryService.updateItem(Number(req.params.id), req.body);
    return res.status(200).json({ status: 'success', data: item });
  } catch (err) {
    return next(err);
  }
}

async function getItemById(req, res, next) {
  try {
    const item = await inventoryService.getItemById(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: item });
  } catch (err) {
    return next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const item = await inventoryService.deleteItem(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: item });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getItems, createItem, updateItem, getItemById, deleteItem };
