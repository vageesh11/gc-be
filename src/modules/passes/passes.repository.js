'use strict';

const db = require('../../config/db');

// ── Pass definitions ──────────────────────────────────────────────────────────

async function findAllPasses({ limit, offset } = {}) {
  const values = [limit, offset];
  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT id, name, total_minutes, price, is_active, created_at
       FROM passes WHERE is_active = TRUE ORDER BY price LIMIT $1 OFFSET $2`,
      values
    ),
    db.query(`SELECT COUNT(*) FROM passes WHERE is_active = TRUE`),
  ]);
  return { rows, total: countRes.rows[0].count };
}

async function findPassById(id) {
  const { rows } = await db.query(
    `SELECT id, name, total_minutes, price, is_active FROM passes WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function createPass({ name, total_minutes, price }) {
  const { rows } = await db.query(
    `INSERT INTO passes (name, total_minutes, price)
     VALUES ($1, $2, $3)
     RETURNING id, name, total_minutes, price, is_active, created_at`,
    [name, total_minutes, price]
  );
  return rows[0];
}

// ── Customer pass instances ───────────────────────────────────────────────────

async function purchasePass({ customer_id, pass_id, total_minutes, expires_at }) {
  const { rows } = await db.query(
    `INSERT INTO customer_passes (customer_id, pass_id, remaining_minutes, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, customer_id, pass_id, remaining_minutes, expires_at, purchased_at`,
    [customer_id, pass_id, total_minutes, expires_at || null]
  );
  return rows[0];
}

async function findCustomerPasses(customerId, { limit, offset } = {}) {
  const values = [customerId, limit, offset];
  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT cp.id, cp.customer_id, cp.pass_id, cp.remaining_minutes,
              cp.expires_at, cp.purchased_at,
              p.name AS pass_name, p.total_minutes
       FROM customer_passes cp
       JOIN passes p ON p.id = cp.pass_id
       WHERE cp.customer_id = $1
       ORDER BY cp.purchased_at DESC LIMIT $2 OFFSET $3`,
      values
    ),
    db.query(`SELECT COUNT(*) FROM customer_passes WHERE customer_id = $1`, [customerId]),
  ]);
  return { rows, total: countRes.rows[0].count };
}

async function findCustomerPassById(id, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `SELECT cp.id, cp.customer_id, cp.remaining_minutes, cp.expires_at,
            p.name AS pass_name
     FROM customer_passes cp
     JOIN passes p ON p.id = cp.pass_id
     WHERE cp.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function deductPassMinutes(id, minutes, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `UPDATE customer_passes
     SET remaining_minutes = remaining_minutes - $1
     WHERE id = $2 AND remaining_minutes >= $1
     RETURNING id, remaining_minutes`,
    [minutes, id]
  );
  return rows[0] || null; // null = insufficient minutes
}

module.exports = {
  findAllPasses, findPassById, createPass,
  purchasePass, findCustomerPasses, findCustomerPassById, deductPassMinutes,
};
