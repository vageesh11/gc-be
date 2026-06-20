'use strict';

const { Router }  = require('express');
const controller  = require('./customers.controller');
const validate    = require('../../middleware/validate');
const schema      = require('./customers.validation');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();

router.use(authenticate);

router.get('/',              authorize('admin', 'operator'), controller.getCustomers);
router.post('/',             authorize('admin', 'operator'), validate(schema.createCustomer), controller.createCustomer);
router.get('/:id',           authorize('admin', 'operator'), controller.getCustomerById);
router.put('/:id',           authorize('admin'),             validate(schema.updateCustomer), controller.updateCustomer);
router.get('/:id/sessions',  authorize('admin', 'operator'), controller.getCustomerSessions);

module.exports = router;
