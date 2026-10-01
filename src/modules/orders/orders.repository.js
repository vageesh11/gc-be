'use strict';

const db = require('../../config/db');

async function create({ session_id, item_id, quantity, unit_price, buy_in_price, mrp, selling_price, subtotal, customer_name, customer_phone, snack_order_ref }, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `INSERT INTO orders (session_id, item_id, quantity, unit_price, buy_in_price, mrp, selling_price, subtotal, customer_name, customer_phone, snack_order_ref)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, session_id, item_id, quantity, unit_price, buy_in_price, mrp, selling_price, subtotal, customer_name, customer_phone, snack_order_ref, created_at`,
    [session_id, item_id, quantity, unit_price, buy_in_price, mrp, selling_price, subtotal, customer_name || null, customer_phone || null, snack_order_ref || null]
  );
  return rows[0];
}

async function findBySessionId(sessionId, { limit, offset } = {}) {
  // When called without pagination (e.g. from billing service), return all rows
  if (limit === undefined) {
    const { rows } = await db.query(
      `SELECT o.id, o.session_id, o.item_id, o.quantity,
              o.unit_price, o.buy_in_price, o.mrp, o.selling_price, o.subtotal, o.created_at,
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
              o.unit_price, o.buy_in_price, o.mrp, o.selling_price, o.subtotal, o.created_at,
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

async function findOpenSnackOrders() {
  const { rows } = await db.query(
    `SELECT o.id, o.session_id, o.item_id, o.quantity,
            o.unit_price, o.buy_in_price, o.mrp, o.selling_price, o.subtotal, o.customer_name, o.customer_phone,
            o.snack_order_ref, o.created_at, o.closed_at,
            i.name AS item_name
     FROM orders o
     JOIN inventory i ON i.id = o.item_id
     WHERE o.session_id IS NULL AND o.closed_at IS NULL
     ORDER BY o.created_at DESC`
  );
  return rows;
}

async function findOpenSnackOrderLines(orderIds, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `SELECT id, item_id, quantity, snack_order_ref
       FROM orders
      WHERE session_id IS NULL
        AND closed_at IS NULL
        AND (id = ANY($1::int[]) OR snack_order_ref IN (
          SELECT snack_order_ref FROM orders
          WHERE id = ANY($1::int[]) AND snack_order_ref IS NOT NULL
        ))
      ORDER BY item_id, id
      FOR UPDATE`,
    [orderIds]
  );
  return rows;
}

async function closeSnackOrders(orderIds, paymentMethod, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `UPDATE orders
        SET closed_at = NOW(), paid_at = NOW(), payment_method = $2
      WHERE session_id IS NULL
        AND closed_at IS NULL
        AND (id = ANY($1::int[]) OR snack_order_ref IN (
          SELECT snack_order_ref FROM orders
          WHERE id = ANY($1::int[]) AND snack_order_ref IS NOT NULL
        ))
      RETURNING id, closed_at, snack_order_ref, payment_method`,
    [orderIds, paymentMethod]
  );
  return rows;
}

module.exports = { create, findBySessionId, findOpenSnackOrders, findOpenSnackOrderLines, closeSnackOrders };
