'use strict';

const { Router }  = require('express');
const controller  = require('./orders.controller');
const validate    = require('../../middleware/validate');
const schema      = require('./orders.validation');
const authorize   = require('../../middleware/authorize');

const router = Router();
// authenticate is applied at the router level in routes/index.js

router.post('/',          authorize('admin', 'operator'), validate(schema.createOrder), controller.createOrder);
router.get('/:sessionId', authorize('admin', 'operator'), controller.getOrdersBySession);

module.exports = router;
