'use strict';

const db = require('../../config/db');

async function findAll({ include_inactive = false, limit, offset } = {}) {
  const where = include_inactive ? '' : 'WHERE is_active = TRUE';
  const values = [limit, offset];
  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT id, name, code, discount_type, discount_value, scope,
              is_active, valid_from, valid_until, created_at, updated_at
       FROM discounts ${where} ORDER BY name LIMIT $1 OFFSET $2`,
      values
    ),
    db.query(
      `SELECT COUNT(*) FROM discounts ${where}`
    ),
  ]);
  return { rows, total: countRes.rows[0].count };
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT id, name, code, discount_type, discount_value, scope,
            is_active, valid_from, valid_until, created_at, updated_at
     FROM discounts WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByCode(code) {
  const { rows } = await db.query(
    `SELECT id, name, code, discount_type, discount_value, scope, is_active, valid_until
     FROM discounts WHERE LOWER(code) = LOWER($1)`,
    [code]
  );
  return rows[0] || null;
}

async function create({ name, code, discount_type, discount_value, scope, valid_from, valid_until }) {
  const { rows } = await db.query(
    `INSERT INTO discounts (name, code, discount_type, discount_value, scope, valid_from, valid_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, code, discount_type, discount_value, scope,
               is_active, valid_from, valid_until, created_at`,
    [name, code || null, discount_type, discount_value,
     scope || 'session', valid_from || null, valid_until || null]
  );
  return rows[0];
}

async function update(id, fields) {
  const keys = Object.keys(fields);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = [...keys.map(k => fields[k]), id];
  const { rows } = await db.query(
    `UPDATE discounts SET ${setClauses}
     WHERE id = $${values.length}
     RETURNING id, name, code, discount_type, discount_value, scope,
               is_active, valid_from, valid_until, updated_at`,
    values
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await db.query(
    `DELETE FROM discounts WHERE id = $1 RETURNING id, name`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, findByCode, create, update, remove };
