'use strict';

const { Router }  = require('express');
const controller  = require('./orders.controller');
const validate    = require('../../middleware/validate');
const schema      = require('./orders.validation');
const authorize   = require('../../middleware/authorize');

const router = Router();
// authenticate is applied at the router level in routes/index.js

router.post('/',             authorize('admin', 'operator'), validate(schema.createOrder),      controller.createOrder);
router.post('/snack',        authorize('admin', 'operator'), validate(schema.createSnackOrder), controller.createSnackOrder);
router.post('/snacks/batch', authorize('admin', 'operator'), validate(schema.createSnackOrderBatch), controller.createSnackOrderBatch);
router.get('/snacks/open', authorize('admin', 'operator'), controller.getOpenSnackOrders);
router.post('/snacks/close', authorize('admin', 'operator'), validate(schema.closeSnackOrders), controller.closeSnackOrders);
router.get('/:sessionId',    authorize('admin', 'operator'), controller.getOrdersBySession);

module.exports = router;
