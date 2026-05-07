'use strict';

const { Router }   = require('express');
const controller   = require('./bookings.controller');
const validate     = require('../../middleware/validate');
const schema       = require('./bookings.validation');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();

router.use(authenticate);

router.post('/',               authorize('admin', 'operator'), validate(schema.createBooking), controller.createBooking);
router.get('/',                authorize('admin', 'operator'), controller.getBookings);
router.get('/:id',             authorize('admin', 'operator'), controller.getBookingById);
router.patch('/:id/confirm',   authorize('admin', 'operator'), controller.confirmBooking);
router.patch('/:id/cancel',    authorize('admin', 'operator'), controller.cancelBooking);

module.exports = router;
