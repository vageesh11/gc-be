'use strict';

const db = require('../../config/db');

// Derived payment_method expression reused across queries
const PAYMENT_METHOD_EXPR =
  "CASE " +
  "WHEN s.cash_amount > 0 AND s.online_amount = 0 THEN 'cash' " +
  "WHEN s.cash_amount = 0 AND s.online_amount > 0 THEN 'online' " +
  "WHEN s.cash_amount > 0 AND s.online_amount > 0 THEN 'split' " +
  "ELSE NULL END AS payment_method";

async function create(
  { table_id, customer_id, booking_id, customer_pass_id,
    booking_type, booked_duration, discount_type, discount_value,
    status, scheduled_start },
  client
) {
  const runner = client || db;
  const { rows } = await runner.query(
    `INSERT INTO sessions
       (table_id, customer_id, booking_id, customer_pass_id,
        booking_type, booked_duration, discount_type, discount_value,
        status, scheduled_start)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, table_id, customer_id, booking_type, booked_duration,
               discount_type, discount_value, status, scheduled_start,
               start_time, created_at`,
    [table_id, customer_id || null, booking_id || null, customer_pass_id || null,
     booking_type, booked_duration || null, discount_type, discount_value,
     status, scheduled_start || null]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT s.id, s.table_id, s.customer_id, s.booking_id, s.customer_pass_id,
            s.start_time, s.end_time, s.duration, s.status,
            s.booking_type, s.booked_duration, s.scheduled_start,
            s.discount_type, s.discount_value, s.discount_amount,
            s.session_amount, s.total_amount, s.net_amount,
            s.cash_amount, s.online_amount,
            ${PAYMENT_METHOD_EXPR},
            s.created_at, s.updated_at,
            t.name            AS table_name,
            t.type            AS table_type,
            t.price_per_minute,
            c.name            AS customer_name,
            c.phone           AS customer_phone
     FROM sessions s
     JOIN gaming_tables t ON t.id = s.table_id
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findActiveByTableId(tableId) {
  const { rows } = await db.query(
    `SELECT id, table_id, start_time, status, booking_type, scheduled_start
     FROM sessions
     WHERE table_id = $1 AND end_time IS NULL
     LIMIT 1`,
    [tableId]
  );
  return rows[0] || null;
}

async function findAllActive() {
  const { rows } = await db.query(
    `SELECT s.id, s.table_id, s.start_time, s.status,
            s.booking_type, s.scheduled_start, s.customer_id,
            t.name AS table_name, t.type AS table_type,
            c.name AS customer_name, c.phone AS customer_phone
     FROM sessions s
     JOIN gaming_tables t ON t.id = s.table_id
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.end_time IS NULL
     ORDER BY s.start_time`
  );
  return rows;
}

async function findAll({ status, table_id, date, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const values     = [];

  if (status === 'active')   conditions.push("s.status = 'active'");
  if (status === 'reserved') conditions.push("s.status = 'reserved'");
  if (status === 'paused')   conditions.push("s.status = 'paused'");
  if (status === 'closed')   conditions.push('s.end_time IS NOT NULL');

  if (table_id) { values.push(table_id); conditions.push('s.table_id = $' + values.length); }
  if (date)     { values.push(date);     conditions.push('s.start_time::date = $' + values.length + '::date'); }

  values.push(limit);  const limitIdx  = values.length;
  values.push(offset); const offsetIdx = values.length;

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql =
    'SELECT s.id, s.table_id, s.customer_id, s.start_time, s.end_time,' +
    ' s.duration, s.booking_type, s.status, s.scheduled_start,' +
    ' s.session_amount, s.total_amount, s.net_amount,' +
    ' s.cash_amount, s.online_amount,' +
    ' ' + PAYMENT_METHOD_EXPR + ', s.created_at,' +
    ' t.name AS table_name, t.type AS table_type,' +
    ' c.name AS customer_name, c.phone AS customer_phone' +
    ' FROM sessions s' +
    ' JOIN gaming_tables t ON t.id = s.table_id' +
    ' LEFT JOIN customers c ON c.id = s.customer_id' +
    ' ' + where +
    ' ORDER BY s.start_time DESC' +
    ' LIMIT $' + limitIdx + ' OFFSET $' + offsetIdx;

  const countSql =
    'SELECT COUNT(*) FROM sessions s' +
    ' JOIN gaming_tables t ON t.id = s.table_id' +
    ' LEFT JOIN customers c ON c.id = s.customer_id' +
    ' ' + where;

  const [{ rows }, countRes] = await Promise.all([
    db.query(sql, values),
    db.query(countSql, values.slice(0, values.length - 2)),
  ]);
  return { rows, total: countRes.rows[0].count };
}

/**
 * Activate a reserved session (customer arrived).
 */
async function activateReservedSession(id, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `UPDATE sessions
     SET start_time = NOW(),
         status     = 'active'
     WHERE id = $1
     RETURNING id, table_id, customer_id, booking_type, booked_duration,
               discount_type, discount_value, status, start_time,
               scheduled_start, created_at`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Cancel a reserved session — no billing, no payment.
 */
async function cancelReservedSession(id, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `UPDATE sessions
     SET end_time       = NOW(),
         duration       = 0,
         session_amount = '0.00',
         total_amount   = '0.00',
         discount_amount= '0.00',
         net_amount     = '0.00',
         cash_amount    = '0.00',
         online_amount  = '0.00',
         status         = 'cancelled'
     WHERE id = $1
     RETURNING id, table_id, customer_id, status, updated_at`,
    [id]
  );
  return rows[0] || null;
}

async function endSession(
  id,
  { endTime, duration, sessionAmount, totalAmount, discountAmount, netAmount,
    cashAmount, onlineAmount },
  client
) {
  const runner = client || db;
  const { rows } = await runner.query(
    `UPDATE sessions
     SET end_time        = $1,
         duration        = $2,
         session_amount  = $3,
         total_amount    = $4,
         discount_amount = $5,
         net_amount      = $6,
         cash_amount     = $7,
         online_amount   = $8,
         status          = 'ended'
     WHERE id = $9
     RETURNING id, table_id, customer_id, start_time, end_time, duration,
               booking_type, session_amount, total_amount,
               discount_type, discount_value, discount_amount, net_amount,
               cash_amount, online_amount,
               CASE
                 WHEN cash_amount > 0 AND online_amount = 0 THEN 'cash'
                 WHEN cash_amount = 0 AND online_amount > 0 THEN 'online'
                 WHEN cash_amount > 0 AND online_amount > 0 THEN 'split'
                 ELSE NULL
               END AS payment_method,
               status, updated_at`,
    [endTime, duration, sessionAmount, totalAmount, discountAmount, netAmount,
     cashAmount, onlineAmount, id]
  );
  return rows[0] || null;
}

async function pauseSession(id, client) {
  const runner = client || db;
  const { rows: pauseRows } = await runner.query(
    `INSERT INTO session_pauses (session_id) VALUES ($1)
     RETURNING id, session_id, paused_at`,
    [id]
  );
  await runner.query(`UPDATE sessions SET status = 'paused' WHERE id = $1`, [id]);
  return pauseRows[0];
}

async function resumeSession(id, client) {
  const runner = client || db;
  const { rows: pauseRows } = await runner.query(
    `UPDATE session_pauses
     SET resumed_at = NOW()
     WHERE session_id = $1 AND resumed_at IS NULL
     RETURNING id, session_id, paused_at, resumed_at`,
    [id]
  );
  await runner.query(`UPDATE sessions SET status = 'active' WHERE id = $1`, [id]);
  return pauseRows[0] || null;
}

async function findPausesBySessionId(sessionId) {
  const { rows } = await db.query(
    `SELECT id, session_id, paused_at, resumed_at
     FROM session_pauses
     WHERE session_id = $1
     ORDER BY paused_at`,
    [sessionId]
  );
  return rows;
}

module.exports = {
  create,
  findById,
  findAll,
  findActiveByTableId,
  findAllActive,
  activateReservedSession,
  cancelReservedSession,
  endSession,
  pauseSession,
  resumeSession,
  findPausesBySessionId,
};
