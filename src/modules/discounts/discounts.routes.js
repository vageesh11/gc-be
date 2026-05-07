'use strict';

const { Router }   = require('express');
const controller   = require('./discounts.controller');
const validate     = require('../../middleware/validate');
const schema       = require('./discounts.validation');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();
router.use(authenticate);

router.get('/',            authorize('admin', 'operator'), controller.getDiscounts);
router.post('/',           authorize('admin'),             validate(schema.createDiscount), controller.createDiscount);
router.get('/code/:code',  authorize('admin', 'operator'), controller.getDiscountByCode);
router.get('/:id',         authorize('admin', 'operator'), controller.getDiscountById);
router.patch('/:id',       authorize('admin'),             validate(schema.updateDiscount), controller.updateDiscount);
router.delete('/:id',      authorize('admin'),             controller.deleteDiscount);

module.exports = router;
