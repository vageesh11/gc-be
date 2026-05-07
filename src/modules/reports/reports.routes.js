'use strict';

const { Router }   = require('express');
const controller   = require('./reports.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

// Daily
router.get('/daily',           controller.getDailyReport);
router.get('/daily/excel',     controller.downloadDailyExcel);

// Weekly
router.get('/weekly',          controller.getWeeklyReport);
router.get('/weekly/excel',    controller.downloadWeeklyExcel);

// Monthly
router.get('/monthly',         controller.getMonthlyReport);
router.get('/monthly/excel',   controller.downloadMonthlyExcel);

module.exports = router;
