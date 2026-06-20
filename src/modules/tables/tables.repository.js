'use strict';

const db = require('../../config/db');

const TABLE_COLS =
  'id, name, type, status,' +
  ' price_per_minute,' +
  ' ROUND(price_per_minute * 60, 2) AS price_per_hour,' +
  ' wiz_ip, wiz_mac,' +
  ' created_at, updated_at';

async function findAll({ type, status, limit, offset } = {}) {
  const conditions = [];
  const values     = [];

  if (type)   { values.push(type);   conditions.push('type = $'   + values.length); }
  if (status) { values.push(status); conditions.push('status = $' + values.length); }

  const where   = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const filterValues = values.slice(); // copy before adding limit/offset

  values.push(limit);  const limitIdx  = values.length;
  values.push(offset); const offsetIdx = values.length;

  const [dataRes, countRes] = await Promise.all([
    db.query(
      'SELECT ' + TABLE_COLS + ' FROM gaming_tables ' + where +
      ' ORDER BY type, name LIMIT $' + limitIdx + ' OFFSET $' + offsetIdx,
      values
    ),
    db.query('SELECT COUNT(*) FROM gaming_tables ' + where, filterValues),
  ]);
  return { rows: dataRes.rows, total: countRes.rows[0].count };
}

async function findById(id) {
  const { rows } = await db.query(
    'SELECT ' + TABLE_COLS + ' FROM gaming_tables WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function create({ name, type, price_per_minute, wiz_ip = null, wiz_mac = null }) {
  const { rows } = await db.query(
    `INSERT INTO gaming_tables (name, type, price_per_minute, wiz_ip, wiz_mac)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, type, status,
               price_per_minute,
               ROUND(price_per_minute * 60, 2) AS price_per_hour,
               wiz_ip, wiz_mac,
               created_at, updated_at`,
    [name, type, price_per_minute, wiz_ip, wiz_mac]
  );
  return rows[0];
}

async function remove(id) {
  const { rows } = await db.query(
    `DELETE FROM gaming_tables WHERE id = $1 RETURNING id, name, type`,
    [id]
  );
  return rows[0] || null;
}

async function findActiveSessionByTableId(tableId) {
  const { rows } = await db.query(
    `SELECT s.id, s.table_id, s.start_time, s.status,
            s.booking_type, s.scheduled_start, s.booked_duration,
            t.name AS table_name, t.type AS table_type,
            t.price_per_minute,
            c.name AS customer_name, c.phone AS customer_phone
     FROM sessions s
     JOIN gaming_tables t ON t.id = s.table_id
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.table_id = $1 AND s.end_time IS NULL
     LIMIT 1`,
    [tableId]
  );
  return rows[0] || null;
}

async function updateStatus(id, status) {
  const { rows } = await db.query(
    `UPDATE gaming_tables
     SET status = $1
     WHERE id = $2
     RETURNING id, name, type, status,
               price_per_minute,
               ROUND(price_per_minute * 60, 2) AS price_per_hour,
               updated_at`,
    [status, id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, create, updateStatus, remove, findActiveSessionByTableId };
