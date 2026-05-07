'use strict';

const { Router } = require('express');
const controller = require('./auth.controller');
const validate   = require('../../middleware/validate');
const schema     = require('./auth.validation');

const router = Router();

router.post('/login', validate(schema.login), controller.login);

module.exports = router;
