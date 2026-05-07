'use strict';

const { Router }   = require('express');
const controller   = require('./tables.controller');
const validate     = require('../../middleware/validate');
const schema       = require('./tables.validation');
const authorize    = require('../../middleware/authorize');

const router = Router();
// authenticate is applied at the router level in routes/index.js

router.get('/',             authorize('admin', 'operator'), controller.getTables);
router.post('/',            authorize('admin'),             validate(schema.createTable),  controller.createTable);
router.get('/:id',          authorize('admin', 'operator'), controller.getTableById);
router.delete('/:id',       authorize('admin'),             controller.deleteTable);
router.patch('/:id/status', authorize('admin'),             validate(schema.updateStatus), controller.updateTableStatus);
router.get('/:id/session',  authorize('admin', 'operator'), controller.getTableActiveSession);

module.exports = router;
