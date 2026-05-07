'use strict';

const { Router }  = require('express');
const controller  = require('./inventory.controller');
const validate    = require('../../middleware/validate');
const schema      = require('./inventory.validation');
const authorize   = require('../../middleware/authorize');

const router = Router();
// authenticate is applied at the router level in routes/index.js

router.get('/',       authorize('admin', 'operator'), controller.getItems);
router.post('/',      authorize('admin'),             validate(schema.createItem), controller.createItem);
router.get('/:id',    authorize('admin', 'operator'), controller.getItemById);
router.patch('/:id',  authorize('admin'),             validate(schema.updateItem), controller.updateItem);
router.delete('/:id', authorize('admin'),             controller.deleteItem);

module.exports = router;
