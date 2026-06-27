'use strict';

const tablesRepo = require('./tables.repository');
const AppError = require('../../utils/AppError');
const { calcDurationMinutes, calcSessionCost } = require('../../utils/billing');

async function getAllTables(filters) {
  return tablesRepo.findAll(filters);
}

async function createTable(data) {
  // Convert price_per_hour → price_per_minute if needed (stored as per-minute)
  let price_per_minute = data.price_per_minute;
  if (!price_per_minute && data.price_per_hour) {
    // Round to 4 decimal places for accuracy, stored as NUMERIC(10,4) in DB
    price_per_minute = parseFloat((data.price_per_hour / 60).toFixed(4));
  }
  return tablesRepo.create({
    name: data.name,
    type: data.type,
    price_per_minute,
    wiz_ip:  data.wiz_ip  || null,
    wiz_mac: data.wiz_mac || null,
  });
}

async function updateTableStatus(id, status, io) {
  const table = await tablesRepo.findById(id);
  if (!table) {
    throw new AppError(`Table with id ${id} not found.`, 404);
  }

  if (table.status === status) {
    throw new AppError(`Table is already ${status}.`, 400);
  }

  const updated = await tablesRepo.updateStatus(id, status);

  // Emit real-time event to all connected clients
  if (io) {
    io.emit('table_status_changed', { tableId: id, status });
  }

  return updated;
}

async function getTableById(id) {
  const table = await tablesRepo.findById(id);
  if (!table) {
    throw new AppError(`Table with id ${id} not found.`, 404);
  }
  return table;
}

async function deleteTable(id) {
  const table = await tablesRepo.findById(id);
  if (!table) {
    throw new AppError(`Table with id ${id} not found.`, 404);
  }
  if (table.status === 'OCCUPIED') {
    throw new AppError('Cannot delete a table with an active session. End the session first.', 409);
  }
  const hasSessions = await tablesRepo.hasAnySessions(id);
  if (hasSessions) {
    throw new AppError(
      'Cannot delete this table because it has session history. You can mark it inactive instead.',
      409
    );
  }
  return tablesRepo.remove(id);
}

async function getTableActiveSession(tableId) {
  const table = await tablesRepo.findById(tableId);
  if (!table) {
    throw new AppError(`Table with id ${tableId} not found.`, 404);
  }
  if (table.status === 'AVAILABLE') return null;

  const session = await tablesRepo.findActiveSessionByTableId(tableId);
  if (!session) return null;

  // For RESERVED tables: no billing clock, return booking details only
  if (session.status === 'reserved') {
    return {
      ...session,
      duration_min:   null,
      session_amount: null,
      // Dashboard actions available for this table
      available_actions: ['confirm_booking', 'cancel_booking'],
    };
  }

  // For OCCUPIED / PAUSED: live billing estimate
  const duration     = calcDurationMinutes(session.start_time, new Date());
  const sessionAmount = calcSessionCost(duration, session.price_per_minute);

  return { ...session, duration_min: duration, session_amount: sessionAmount };
}

module.exports = { getAllTables, createTable, updateTableStatus, getTableById, deleteTable, getTableActiveSession };
