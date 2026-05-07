'use strict';

const { Router }  = require('express');
const controller  = require('./billing.controller');
const authorize   = require('../../middleware/authorize');

const router = Router();
// authenticate is applied at the router level in routes/index.js

router.get('/:sessionId', authorize('admin', 'operator'), controller.getBill);

module.exports = router;
