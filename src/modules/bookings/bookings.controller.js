'use strict';

const bookingsService = require('./bookings.service');

async function createBooking(req, res, next) {
  try {
    const booking = await bookingsService.createBooking(req.body);
    return res.status(201).json({ status: 'success', data: booking });
  } catch (err) { return next(err); }
}

async function getBookings(req, res, next) {
  try {
    const { table_id, date, status, limit, offset } = req.query;
    const bookings = await bookingsService.getAllBookings({
      table_id: table_id ? Number(table_id) : undefined,
      date, status,
      limit:  limit  ? Number(limit)  : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({ status: 'success', data: bookings });
  } catch (err) { return next(err); }
}

async function getBookingById(req, res, next) {
  try {
    const booking = await bookingsService.getBookingById(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: booking });
  } catch (err) { return next(err); }
}

async function confirmBooking(req, res, next) {
  try {
    const session = await bookingsService.confirmBooking(Number(req.params.id), req.io);
    return res.status(200).json({ status: 'success', data: session });
  } catch (err) { return next(err); }
}

async function cancelBooking(req, res, next) {
  try {
    const booking = await bookingsService.cancelBooking(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: booking });
  } catch (err) { return next(err); }
}

module.exports = { createBooking, getBookings, getBookingById, confirmBooking, cancelBooking };
