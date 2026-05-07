'use strict';

const { Router }   = require('express');
const controller   = require('./passes.controller');
const validate     = require('../../middleware/validate');
const schema       = require('./passes.validation');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();

router.use(authenticate);

router.get('/',                              authorize('admin'), controller.getPasses);
router.post('/',                             authorize('admin'), validate(schema.createPass), controller.createPass);
router.post('/purchase',                     authorize('admin'), validate(schema.purchasePass), controller.purchasePass);
router.get('/customer/:customerId',          authorize('admin', 'operator'), controller.getCustomerPasses);

module.exports = router;
