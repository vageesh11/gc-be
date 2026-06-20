'use strict';

const sessionsService                = require('./sessions.service');
const { parsePagination, buildMeta } = require('../../utils/paginate');

async function startSession(req, res, next) {
  try {
    const session = await sessionsService.startSession(req.body, req.io);
    return res.status(201).json({ status: 'success', data: session });
  } catch (err) { return next(err); }
}

async function confirmPreBooking(req, res, next) {
  try {
    const session = await sessionsService.confirmPreBooking(Number(req.params.id), req.io);
    return res.status(200).json({ status: 'success', data: session });
  } catch (err) { return next(err); }
}

async function cancelPreBooking(req, res, next) {
  try {
    const result = await sessionsService.cancelPreBooking(Number(req.params.id), req.io);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) { return next(err); }
}

async function endSession(req, res, next) {
  try {
    const { session_id, cash_amount, online_amount } = req.body;
    const session = await sessionsService.endSession(
      Number(session_id),
      { cashAmount: cash_amount, onlineAmount: online_amount },
      req.io
    );
    return res.status(200).json({ status: 'success', data: session });
  } catch (err) { return next(err); }
}

async function pauseSession(req, res, next) {
  try {
    const { session_id } = req.body;
    const pause = await sessionsService.pauseSession(Number(session_id), req.io);
    return res.status(200).json({ status: 'success', data: pause });
  } catch (err) { return next(err); }
}

async function resumeSession(req, res, next) {
  try {
    const { session_id } = req.body;
    const pause = await sessionsService.resumeSession(Number(session_id), req.io);
    return res.status(200).json({ status: 'success', data: pause });
  } catch (err) { return next(err); }
}

async function getActiveSessions(req, res, next) {
  try {
    const sessions = await sessionsService.getActiveSessions();
    return res.status(200).json({ status: 'success', data: sessions });
  } catch (err) { return next(err); }
}

async function getSessionById(req, res, next) {
  try {
    const session = await sessionsService.getSessionById(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: session });
  } catch (err) { return next(err); }
}

async function getAllSessions(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status, table_id, date } = req.query;
    const { rows, total } = await sessionsService.getAllSessions({
      status,
      table_id: table_id ? Number(table_id) : undefined,
      date,
      limit,
      offset,
    });
    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: buildMeta(total, page, limit),
    });
  } catch (err) { return next(err); }
}

async function updatePayment(req, res, next) {
  try {
    const { cash_amount, online_amount } = req.body;
    const result = await sessionsService.updatePayment(
      Number(req.params.id),
      { cashAmount: cash_amount, onlineAmount: online_amount }
    );
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) { return next(err); }
}

module.exports = {
  startSession,
  confirmPreBooking,
  cancelPreBooking,
  endSession,
  pauseSession,
  resumeSession,
  getActiveSessions,
  getSessionById,
  getAllSessions,
  updatePayment,
};
