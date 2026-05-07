'use strict';

const db             = require('../../config/db');
const bookingsRepo   = require('./bookings.repository');
const customersRepo  = require('../customers/customers.repository');
const tablesRepo     = require('../tables/tables.repository');
const sessionsService = require('../sessions/sessions.service');
const AppError       = require('../../utils/AppError');

async function createBooking(data) {
  const { customer_id, table_id, scheduled_start, booked_duration, notes } = data;

  const customer = await customersRepo.findById(customer_id);
  if (!customer) throw new AppError(`Customer with id ${customer_id} not found.`, 404);

  const table = await tablesRepo.findById(table_id);
  if (!table) throw new AppError(`Table with id ${table_id} not found.`, 404);

  return bookingsRepo.create({ customer_id, table_id, scheduled_start, booked_duration, notes });
}

async function getAllBookings(filters) {
  return bookingsRepo.findAll(filters);
}

async function getBookingById(id) {
  const booking = await bookingsRepo.findById(id);
  if (!booking) throw new AppError(`Booking with id ${id} not found.`, 404);
  return booking;
}

async function confirmBooking(bookingId, io) {
  const booking = await bookingsRepo.findById(bookingId);
  if (!booking) throw new AppError(`Booking with id ${bookingId} not found.`, 404);
  if (booking.status !== 'pending') {
    throw new AppError(`Booking is already ${booking.status}.`, 400);
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Mark booking confirmed
    await bookingsRepo.updateStatus(bookingId, 'confirmed', client);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Start the actual session — uses existing session service
  const session = await sessionsService.startSession({
    table_id:        booking.table_id,
    customer_name:   booking.customer_name,
    customer_phone:  booking.customer_phone,
    booking_type:    'pre_booking',
    booked_duration: booking.booked_duration,
    discount_type:   'none',
    discount_value:  0,
    booking_id:      bookingId,
  }, io);

  return session;
}

async function cancelBooking(bookingId) {
  const booking = await bookingsRepo.findById(bookingId);
  if (!booking) throw new AppError(`Booking with id ${bookingId} not found.`, 404);
  if (booking.status === 'completed' || booking.status === 'cancelled') {
    throw new AppError(`Booking is already ${booking.status}.`, 400);
  }
  return bookingsRepo.updateStatus(bookingId, 'cancelled');
}

module.exports = { createBooking, getAllBookings, getBookingById, confirmBooking, cancelBooking };
