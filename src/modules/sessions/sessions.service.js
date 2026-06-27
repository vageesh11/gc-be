'use strict';

const db             = require('../../config/db');
const sessionsRepo   = require('./sessions.repository');
const framesRepo     = require('../frames/frames.repository');
const tablesRepo     = require('../tables/tables.repository');
const ordersRepo     = require('../orders/orders.repository');
const customersRepo  = require('../customers/customers.repository');
const passesRepo     = require('../passes/passes.repository');
const AppError       = require('../../utils/AppError');
const wiz            = require('../../utils/wiz');
const {
  calcBillableMinutes,
  calcSessionCost,
  applyDiscount,
  roundToNearest5,
  calcOrdersTotal,
  addAmounts,
} = require('../../utils/billing');

async function resolveCustomer(name, phone, client) {
  let customer = await customersRepo.findByPhone(phone, client);
  if (!customer) {
    customer = await customersRepo.create({ name, phone }, client);
  }
  return customer;
}

async function startSession(data, io) {
  const {
    table_id,
    customer_name,
    customer_phone,
    booking_type     = 'pay_as_you_go',
    booked_duration  = null,
    scheduled_start  = null,
    discount_type    = 'none',
    discount_value   = 0,
    discount_scope   = 'all',
    customer_pass_id = null,
    booking_id       = null,
  } = data;

  const table = await tablesRepo.findById(table_id);
  if (!table) throw new AppError(`Table with id ${table_id} not found.`, 404);

  // Pre-booking reserves the table; other types require it to be free
  if (booking_type === 'pre_booking') {
    if (table.status !== 'AVAILABLE') {
      throw new AppError(`Table is ${table.status}. Cannot place a pre-booking on it.`, 409);
    }
    if (!scheduled_start) {
      throw new AppError('scheduled_start is required for pre_booking.', 400);
    }
  } else {
    if (table.status === 'OCCUPIED') {
      throw new AppError('Table is already occupied. End the current session first.', 409);
    }
    if (table.status === 'RESERVED') {
      const existing = await sessionsRepo.findActiveByTableId(table_id);
      if (existing && existing.scheduled_start) {
        const dt = new Date(existing.scheduled_start);
        const formatted = dt.toLocaleString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'short',
          year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        });
        throw new AppError(`This table already has a booking on ${formatted}.`, 409);
      }
      throw new AppError('This table already has a pre-booking. Confirm or cancel it first.', 409);
    }
  }

  // Validate pass
  if (discount_type === 'pass') {
    if (!customer_pass_id) throw new AppError('customer_pass_id is required when discount_type is pass.', 400);
    const passRecord = await passesRepo.findCustomerPassById(customer_pass_id);
    if (!passRecord) throw new AppError(`Customer pass with id ${customer_pass_id} not found.`, 404);
    if (passRecord.expires_at && new Date(passRecord.expires_at) < new Date()) {
      throw new AppError('This pass has expired.', 400);
    }
    if (passRecord.remaining_minutes <= 0) {
      throw new AppError('This pass has no remaining minutes.', 400);
    }
  }

  // Determine session status and table status based on booking_type
  const sessionStatus = booking_type === 'pre_booking' ? 'reserved' : 'active';
  const tableStatus   = booking_type === 'pre_booking' ? 'RESERVED' : 'OCCUPIED';

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const customer = (customer_name && customer_phone)
      ? await resolveCustomer(customer_name, customer_phone, client)
      : null;

    const session = await sessionsRepo.create({
      table_id,
      customer_id:      customer ? customer.id : null,
      booking_id,
      customer_pass_id,
      booking_type,
      booked_duration,
      discount_type,
      discount_value,
      discount_scope,
      status:           sessionStatus,
      scheduled_start:  booking_type === 'pre_booking' ? scheduled_start : null,
    }, client);

    await client.query(
      `UPDATE gaming_tables SET status = $1 WHERE id = $2`,
      [tableStatus, table_id]
    );

    await client.query('COMMIT');

    if (io) {
      // WiZ: turn ON for active sessions (not pre_booking — light on only on confirm)
      if (booking_type !== 'pre_booking') wiz.turnOn(table.wiz_ip).catch(() => {});

      if (booking_type === 'pre_booking') {
        io.emit('table_pre_booked', {
          tableId: table_id, tableName: table.name,
          sessionId: session.id, scheduledStart: scheduled_start,
          customerName: customer ? customer.name : null,
          customerPhone: customer ? customer.phone : null,
        });
      } else {
        io.emit('session_started', { sessionId: session.id, tableId: table_id, tableName: table.name });
      }
      io.emit('table_status_changed', { tableId: table_id, status: tableStatus });
    }

    return { ...session, customer_name: customer ? customer.name : null, customer_phone: customer ? customer.phone : null };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Confirm a pre-booking — customer has arrived, start the billing clock.
 */
async function confirmPreBooking(sessionId, io) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new AppError(`Session with id ${sessionId} not found.`, 404);
  if (session.status !== 'reserved') {
    throw new AppError(
      session.status === 'active'    ? 'Session is already active.' :
      session.status === 'ended'     ? 'Session has already ended.' :
      session.status === 'cancelled' ? 'This pre-booking was cancelled.' :
      `Cannot confirm a session with status "${session.status}".`,
      400
    );
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const activated = await sessionsRepo.activateReservedSession(sessionId, client);

    await client.query(
      `UPDATE gaming_tables SET status = 'OCCUPIED' WHERE id = $1`,
      [session.table_id]
    );

    await client.query('COMMIT');

    if (io) {
      io.emit('session_started', {
        sessionId, tableId: session.table_id,
        tableName: session.table_name,
      });
      io.emit('table_status_changed', { tableId: session.table_id, status: 'OCCUPIED' });
    }

    // WiZ: customer arrived and confirmed — turn ON
    const tableRow = await tablesRepo.findById(session.table_id);
    wiz.turnOn(tableRow?.wiz_ip).catch(() => {});

    return { ...activated, customer_name: session.customer_name, customer_phone: session.customer_phone };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cancel a pre-booking — customer did not arrive, free the table.
 */
async function cancelPreBooking(sessionId, io) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new AppError(`Session with id ${sessionId} not found.`, 404);
  if (session.status !== 'reserved') {
    throw new AppError(
      session.status === 'active'    ? 'Session is already active. End it instead of cancelling.' :
      session.status === 'cancelled' ? 'Pre-booking is already cancelled.' :
      session.status === 'ended'     ? 'Session has already ended.' :
      `Cannot cancel a session with status "${session.status}".`,
      400
    );
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const cancelled = await sessionsRepo.cancelReservedSession(sessionId, client);

    await client.query(
      `UPDATE gaming_tables SET status = 'AVAILABLE' WHERE id = $1`,
      [session.table_id]
    );

    await client.query('COMMIT');

    if (io) {
      io.emit('table_booking_cancelled', { tableId: session.table_id, sessionId });
      io.emit('table_status_changed', { tableId: session.table_id, status: 'AVAILABLE' });
    }

    return cancelled;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function endSession(sessionId, { cashAmount, onlineAmount }, io) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new AppError(`Session with id ${sessionId} not found.`, 404);
  if (session.end_time) throw new AppError('Session has already ended.', 400);
  if (session.status === 'reserved') {
    throw new AppError('Session is a pre-booking. Confirm it first, then end it.', 400);
  }
  if (session.status === 'paused') {
    throw new AppError('Session is paused. Resume it before ending.', 400);
  }

  const endTime = new Date();

  let billable;
  let sessionAmount;

  if (session.booking_type === 'frame_wise') {
    // For frame_wise, billing = sum of all completed frames
    const summary = await framesRepo.sumBySessionId(sessionId);
    billable      = Math.ceil(parseFloat(summary.total_duration_min));
    sessionAmount = parseFloat(summary.total_amount).toFixed(2);
  } else {
    const pauses = await sessionsRepo.findPausesBySessionId(sessionId);
    billable      = calcBillableMinutes(session.start_time, endTime, pauses);
    sessionAmount = calcSessionCost(billable, session.price_per_minute);
  }

  const orders      = await ordersRepo.findBySessionId(sessionId);
  const ordersTotal = calcOrdersTotal(orders);
  const totalAmount = addAmounts(sessionAmount, ordersTotal);

  const { discount_amount, net_amount: rawNetAmount } = applyDiscount(
    sessionAmount, ordersTotal,
    session.discount_type, session.discount_value, session.discount_scope || 'all'
  );

  // Round net_amount to the nearest ₹5 — stored in DB as the final billed amount.
  // cash_amount + online_amount are stored as-is (actual cash collected by staff).
  const net_amount = roundToNearest5(rawNetAmount);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    if (session.discount_type === 'pass' && session.customer_pass_id) {
      const deducted = await passesRepo.deductPassMinutes(
        session.customer_pass_id, billable, client
      );
      if (!deducted) throw new AppError('Pass has insufficient minutes for this session.', 400);
    }

    const ended = await sessionsRepo.endSession(
      sessionId,
      { endTime, duration: billable, sessionAmount, totalAmount,
        discountAmount: discount_amount, netAmount: net_amount,
        cashAmount, onlineAmount },
      client
    );

    await client.query(
      `UPDATE gaming_tables SET status = 'AVAILABLE' WHERE id = $1`,
      [session.table_id]
    );

    await client.query('COMMIT');

    // WiZ: session ended — turn OFF the table light
    wiz.turnOff(session.wiz_ip).catch(() => {});

    if (io) {
      io.emit('session_ended', { sessionId, tableId: session.table_id, duration: billable, netAmount: net_amount });
      io.emit('table_status_changed', { tableId: session.table_id, status: 'AVAILABLE' });
    }

    return ended;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function pauseSession(sessionId, io) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new AppError(`Session with id ${sessionId} not found.`, 404);
  if (session.end_time) throw new AppError('Session has already ended.', 400);
  if (session.status === 'reserved') throw new AppError('Cannot pause a pre-booking. Confirm it first.', 400);
  if (session.status === 'paused')   throw new AppError('Session is already paused.', 400);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const pause = await sessionsRepo.pauseSession(sessionId, client);
    await client.query(`UPDATE gaming_tables SET status = 'PAUSED' WHERE id = $1`, [session.table_id]);
    await client.query('COMMIT');

    if (io) {
      io.emit('session_paused', { sessionId, tableId: session.table_id });
      io.emit('table_status_changed', { tableId: session.table_id, status: 'PAUSED' });
    }
    return pause;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function resumeSession(sessionId, io) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new AppError(`Session with id ${sessionId} not found.`, 404);
  if (session.end_time)          throw new AppError('Session has already ended.', 400);
  if (session.status !== 'paused') throw new AppError('Session is not paused.', 400);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const pause = await sessionsRepo.resumeSession(sessionId, client);
    await client.query(`UPDATE gaming_tables SET status = 'OCCUPIED' WHERE id = $1`, [session.table_id]);
    await client.query('COMMIT');

    if (io) {
      io.emit('session_resumed', { sessionId, tableId: session.table_id });
      io.emit('table_status_changed', { tableId: session.table_id, status: 'OCCUPIED' });
    }
    return pause;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getActiveSessions()        { return sessionsRepo.findAllActive(); }
async function getSessionById(sessionId)  {
  const s = await sessionsRepo.findById(sessionId);
  if (!s) throw new AppError(`Session with id ${sessionId} not found.`, 404);
  return s;
}
async function getAllSessions(filters)    { return sessionsRepo.findAll(filters); }

async function updatePayment(sessionId, { cashAmount, onlineAmount }) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new AppError(`Session with id ${sessionId} not found.`, 404);
  if (session.status !== 'ended') throw new AppError('Payment can only be edited on closed sessions.', 400);
  const updated = await sessionsRepo.updatePayment(sessionId, { cashAmount, onlineAmount });
  return updated;
}

module.exports = {
  startSession,
  confirmPreBooking,
  cancelPreBooking,
  endSession,
  pauseSession,
  resumeSession,
  getActiveSessions,
  getSessionById,
  getAllSessions,
  updatePayment,
};
