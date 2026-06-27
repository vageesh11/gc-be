'use strict';

const { Router }   = require('express');
const controller   = require('./frames.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();
router.use(authenticate);

// Start a new frame on an active frame_wise session
router.post('/start',                  authorize('admin', 'operator'), controller.startFrame);
// End the currently running frame
router.patch('/:id/end',               authorize('admin', 'operator'), controller.endFrame);
// Get all frames for a session
router.get('/session/:sessionId',      authorize('admin', 'operator'), controller.getFrames);

module.exports = router;
