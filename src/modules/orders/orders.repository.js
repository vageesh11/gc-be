'use strict';

const db = require('../../config/db');

async function create({ session_id, item_id, quantity, unit_price, subtotal }, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `INSERT INTO orders (session_id, item_id, quantity, unit_price, subtotal)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, session_id, item_id, quantity, unit_price, subtotal, created_at`,
    [session_id, item_id, quantity, unit_price, subtotal]
  );
  return rows[0];
}

async function findBySessionId(sessionId, { limit, offset } = {}) {
  // When called without pagination (e.g. from billing service), return all rows
  if (limit === undefined) {
    const { rows } = await db.query(
      `SELECT o.id, o.session_id, o.item_id, o.quantity,
              o.unit_price, o.subtotal, o.created_at,
              i.name AS item_name
       FROM orders o
       JOIN inventory i ON i.id = o.item_id
       WHERE o.session_id = $1
       ORDER BY o.created_at`,
      [sessionId]
    );
    return rows;
  }

  const values = [sessionId, limit, offset];
  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT o.id, o.session_id, o.item_id, o.quantity,
              o.unit_price, o.subtotal, o.created_at,
              i.name AS item_name
       FROM orders o
       JOIN inventory i ON i.id = o.item_id
       WHERE o.session_id = $1
       ORDER BY o.created_at LIMIT $2 OFFSET $3`,
      values
    ),
    db.query(
      `SELECT COUNT(*) FROM orders WHERE session_id = $1`,
      [sessionId]
    ),
  ]);
  return { rows, total: countRes.rows[0].count };
}

module.exports = { create, findBySessionId };
