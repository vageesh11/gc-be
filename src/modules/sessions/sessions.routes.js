'use strict';

const { Router }   = require('express');
const controller   = require('./sessions.controller');
const validate     = require('../../middleware/validate');
const schema       = require('./sessions.validation');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();
router.use(authenticate);

router.post('/start',           authorize('admin', 'operator'), validate(schema.startSession),  controller.startSession);
router.post('/end',             authorize('admin', 'operator'), validate(schema.endSession),    controller.endSession);
router.post('/pause',           authorize('admin', 'operator'), validate(schema.pauseSession),  controller.pauseSession);
router.post('/resume',          authorize('admin', 'operator'), validate(schema.resumeSession), controller.resumeSession);
router.patch('/:id/confirm',    authorize('admin', 'operator'), controller.confirmPreBooking);
router.patch('/:id/cancel',     authorize('admin', 'operator'), controller.cancelPreBooking);
router.get('/active',           authorize('admin', 'operator'), controller.getActiveSessions);
router.get('/',                 authorize('admin', 'operator'),  controller.getAllSessions);
router.get('/:id',              authorize('admin', 'operator'), controller.getSessionById);

module.exports = router;
