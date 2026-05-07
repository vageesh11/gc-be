'use strict';

const db = require('../../config/db');

async function create({ customer_id, table_id, scheduled_start, booked_duration, notes }, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `INSERT INTO bookings (customer_id, table_id, scheduled_start, booked_duration, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, customer_id, table_id, scheduled_start, booked_duration, status, notes, created_at`,
    [customer_id, table_id, scheduled_start, booked_duration, notes || null]
  );
  return rows[0];
}

async function findAll({ table_id, date, status, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const values     = [];

  if (table_id) { values.push(table_id); conditions.push('b.table_id = $' + values.length); }
  if (date)     { values.push(date);     conditions.push('b.scheduled_start::date = $' + values.length + '::date'); }
  if (status)   { values.push(status);   conditions.push('b.status = $' + values.length); }

  values.push(limit);  const limitIdx  = values.length;
  values.push(offset); const offsetIdx = values.length;

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql =
    'SELECT b.id, b.customer_id, b.table_id, b.scheduled_start,' +
    ' b.booked_duration, b.status, b.notes, b.created_at,' +
    ' c.name AS customer_name, c.phone AS customer_phone,' +
    ' t.name AS table_name, t.type AS table_type' +
    ' FROM bookings b' +
    ' JOIN customers c ON c.id = b.customer_id' +
    ' JOIN gaming_tables t ON t.id = b.table_id' +
    ' ' + where +
    ' ORDER BY b.scheduled_start ASC' +
    ' LIMIT $' + limitIdx + ' OFFSET $' + offsetIdx;

  const { rows } = await db.query(sql, values);
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT b.id, b.customer_id, b.table_id, b.scheduled_start,
            b.booked_duration, b.status, b.notes, b.created_at, b.updated_at,
            c.name AS customer_name, c.phone AS customer_phone,
            t.name AS table_name,    t.type  AS table_type
     FROM bookings b
     JOIN customers c ON c.id = b.customer_id
     JOIN gaming_tables t ON t.id = b.table_id
     WHERE b.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function updateStatus(id, status, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `UPDATE bookings SET status = $1 WHERE id = $2
     RETURNING id, status, updated_at`,
    [status, id]
  );
  return rows[0] || null;
}

module.exports = { create, findAll, findById, updateStatus };
