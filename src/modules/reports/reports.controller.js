'use strict';

const reportsService = require('./reports.service');

// ── Daily ──────────────────────────────────────────────────────────────────

async function getDailyReport(req, res, next) {
  try {
    const data = await reportsService.getDailyReport(req.query.date);
    return res.status(200).json({ status: 'success', data });
  } catch (err) { return next(err); }
}

async function downloadDailyExcel(req, res, next) {
  try {
    const buffer = await reportsService.generateDailyExcel(req.query.date);
    const date   = req.query.date || new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="gaming-cafe-daily-${date}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err) { return next(err); }
}

// ── Weekly ─────────────────────────────────────────────────────────────────

async function getWeeklyReport(req, res, next) {
  try {
    const data = await reportsService.getWeeklyReport(req.query.week_start);
    return res.status(200).json({ status: 'success', data });
  } catch (err) { return next(err); }
}

async function downloadWeeklyExcel(req, res, next) {
  try {
    const buffer     = await reportsService.generateWeeklyExcel(req.query.week_start);
    const weekStart  = req.query.week_start || new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="gaming-cafe-weekly-${weekStart}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err) { return next(err); }
}

// ── Monthly ────────────────────────────────────────────────────────────────

async function getMonthlyReport(req, res, next) {
  try {
    const data = await reportsService.getMonthlyReport(req.query.month);
    return res.status(200).json({ status: 'success', data });
  } catch (err) { return next(err); }
}

async function downloadMonthlyExcel(req, res, next) {
  try {
    const buffer = await reportsService.generateMonthlyExcel(req.query.month);
    const month  = req.query.month || new Date().toISOString().slice(0, 7);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="gaming-cafe-monthly-${month}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err) { return next(err); }
}

module.exports = {
  getDailyReport,   downloadDailyExcel,
  getWeeklyReport,  downloadWeeklyExcel,
  getMonthlyReport, downloadMonthlyExcel,
};
