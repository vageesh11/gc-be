'use strict';

const db = require('../config/db');
const {
  calcBillableMinutes,
  calcSessionCost,
  applyDiscount,
  roundToNearest5,
  calcOrdersTotal,
  addAmounts,
} = require('../utils/billing');
const ordersRepo  = require('../modules/orders/orders.repository');
const sessionsRepo = require('../modules/sessions/sessions.repository');
const passesRepo  = require('../modules/passes/passes.repository');
const wiz         = require('../utils/wiz');

/**
 * Finds all active fixed_slot sessions whose booked time has expired,
 * ends each one, and emits `session_fixed_slot_expired` via Socket.IO.
 * Runs every 30 seconds.
 */
async function runFixedSlotCheck(io) {
  let expired;
  try {
    // Find active fixed_slot sessions where start_time + booked_duration has passed
    const { rows } = await db.query(`
      SELECT s.id, s.table_id, s.start_time, s.booked_duration,
             s.discount_type, s.discount_value, s.customer_pass_id,
             t.price_per_minute, t.wiz_ip,
             t.name AS table_name, t.type AS table_type,
             c.name AS customer_name, c.phone AS customer_phone
      FROM sessions s
      JOIN gaming_tables t ON t.id = s.table_id
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.booking_type = 'fixed_slot'
        AND s.status       = 'active'
        AND s.end_time     IS NULL
        AND s.booked_duration IS NOT NULL
        AND (s.start_time + (s.booked_duration || ' minutes')::interval) <= NOW()
    `);
    expired = rows;
  } catch (err) {
    console.error('[FixedSlotScheduler] Query error:', err.message);
    return;
  }

  for (const session of expired) {
    try {
      const endTime  = new Date();
      const pauses   = await sessionsRepo.findPausesBySessionId(session.id);
      const billable = calcBillableMinutes(session.start_time, endTime, pauses);
      const sessionAmount = calcSessionCost(billable, session.price_per_minute);

      const orders      = await ordersRepo.findBySessionId(session.id);
      const ordersTotal = calcOrdersTotal(orders);
      const totalAmount = addAmounts(sessionAmount, ordersTotal);

      const { discount_amount, net_amount: rawNet } = applyDiscount(
        totalAmount, session.discount_type, session.discount_value
      );
      const net_amount = roundToNearest5(rawNet);

      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        if (session.discount_type === 'pass' && session.customer_pass_id) {
          await passesRepo.deductPassMinutes(session.customer_pass_id, billable, client);
        }

        await sessionsRepo.endSession(
          session.id,
          { endTime, duration: billable, sessionAmount, totalAmount,
            discountAmount: discount_amount, netAmount: net_amount,
            cashAmount: 0, onlineAmount: 0 },
          client
        );

        await client.query(
          `UPDATE gaming_tables SET status = 'AVAILABLE' WHERE id = $1`,
          [session.table_id]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      console.log(`[FixedSlotScheduler] Auto-ended session ${session.id} (${session.table_name})`);

      // WiZ: auto-ended — turn OFF table light
      wiz.turnOff(session.wiz_ip).catch(() => {});

      if (io) {
        // Notify all clients to open the bill/payment modal for this session
        io.emit('session_fixed_slot_expired', {
          sessionId:    session.id,
          tableId:      session.table_id,
          tableName:    session.table_name,
          tableType:    session.table_type,
          netAmount:    net_amount,
          customerName: session.customer_name,
        });
        // Also emit generic events so table card and session log update
        io.emit('session_ended', {
          sessionId: session.id,
          tableId:   session.table_id,
          duration:  billable,
          netAmount: net_amount,
        });
        io.emit('table_status_changed', { tableId: session.table_id, status: 'AVAILABLE' });
      }
    } catch (err) {
      console.error(`[FixedSlotScheduler] Failed to auto-end session ${session.id}:`, err.message);
    }
  }
}

function startFixedSlotScheduler(io) {
  // Run immediately on startup, then every 30 seconds
  runFixedSlotCheck(io);
  const interval = setInterval(() => runFixedSlotCheck(io), 30_000);
  console.log('[FixedSlotScheduler] Started — checking every 30s');
  return interval;
}

module.exports = { startFixedSlotScheduler };
