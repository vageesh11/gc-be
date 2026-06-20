'use strict';

const db = require('../../config/db');

async function findAll({ search, limit, offset } = {}) {
  const conditions = [];
  const values     = [];

  if (search) {
    values.push('%' + search + '%');
    conditions.push(
      '(LOWER(name) LIKE LOWER($' + values.length + ') OR phone LIKE $' + values.length + ')'
    );
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  values.push(limit);  const limitIdx  = values.length;
  values.push(offset); const offsetIdx = values.length;

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      'SELECT id, name, phone, created_at FROM customers ' + where +
      ' ORDER BY name LIMIT $' + limitIdx + ' OFFSET $' + offsetIdx,
      values
    ),
    db.query(
      'SELECT COUNT(*) FROM customers ' + where,
      values.slice(0, values.length - 2)
    ),
  ]);
  return { rows, total: countRes.rows[0].count };
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT id, name, phone, created_at FROM customers WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByPhone(phone, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `SELECT id, name, phone FROM customers WHERE phone = $1`,
    [phone]
  );
  return rows[0] || null;
}

async function create({ name, phone }, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `INSERT INTO customers (name, phone)
     VALUES ($1, $2)
     RETURNING id, name, phone, created_at`,
    [name, phone]
  );
  return rows[0];
}

async function findSessionHistory(customerId, { limit, offset } = {}) {
  const values = [customerId];
  values.push(limit);  const limitIdx  = values.length;
  values.push(offset); const offsetIdx = values.length;

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT s.id, s.table_id, s.start_time, s.end_time,
              s.booking_type, s.status, s.net_amount,
              t.name AS table_name, t.type AS table_type
       FROM sessions s
       JOIN gaming_tables t ON t.id = s.table_id
       WHERE s.customer_id = $1
       ORDER BY s.start_time DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values
    ),
    db.query(
      `SELECT COUNT(*) FROM sessions WHERE customer_id = $1`,
      [customerId]
    ),
  ]);
  return { rows, total: countRes.rows[0].count };
}

async function update(id, { name, phone }) {
  const { rows } = await db.query(
    `UPDATE customers SET name = $1, phone = $2 WHERE id = $3
     RETURNING id, name, phone, created_at`,
    [name, phone, id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, findByPhone, create, update, findSessionHistory };
