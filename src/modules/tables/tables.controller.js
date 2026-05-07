'use strict';

const tablesService             = require('./tables.service');
const { parsePagination, buildMeta } = require('../../utils/paginate');

async function getTables(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { type, status } = req.query;
    const { rows, total } = await tablesService.getAllTables({ type, status, limit, offset });
    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: buildMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function createTable(req, res, next) {
  try {
    const table = await tablesService.createTable(req.body);
    return res.status(201).json({ status: 'success', data: table });
  } catch (err) {
    return next(err);
  }
}

async function updateTableStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const table = await tablesService.updateTableStatus(Number(id), status, req.io);
    return res.status(200).json({ status: 'success', data: table });
  } catch (err) {
    return next(err);
  }
}

async function getTableById(req, res, next) {
  try {
    const table = await tablesService.getTableById(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: table });
  } catch (err) {
    return next(err);
  }
}

async function deleteTable(req, res, next) {
  try {
    const table = await tablesService.deleteTable(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: table });
  } catch (err) {
    return next(err);
  }
}

async function getTableActiveSession(req, res, next) {
  try {
    const session = await tablesService.getTableActiveSession(Number(req.params.id));
    if (!session) {
      return res.status(200).json({ status: 'success', data: null, message: 'No active session for this table.' });
    }
    return res.status(200).json({ status: 'success', data: session });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getTables, createTable, updateTableStatus, getTableById, deleteTable, getTableActiveSession };
