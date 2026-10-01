'use strict';

const db = require('../../config/db');

const PRICE_COLUMNS = 'price, COALESCE(buy_in_price, price) AS buy_in_price, COALESCE(mrp, price) AS mrp, COALESCE(selling_price, price) AS selling_price';

async function findAll({ search, limit, offset } = {}) {
  const conditions = [];
  const filterValues = [];
  if (search) {
    filterValues.push('%' + search + '%');
    conditions.push('LOWER(name) LIKE LOWER($' + filterValues.length + ')');
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const values = filterValues.concat([limit, offset]);
  const limitIdx = filterValues.length + 1;
  const offsetIdx = filterValues.length + 2;
  const [dataRes, countRes] = await Promise.all([
    db.query(`SELECT id, name, ${PRICE_COLUMNS}, stock_quantity, created_at, updated_at FROM inventory ${where} ORDER BY name LIMIT $${limitIdx} OFFSET $${offsetIdx}`, values),
    db.query('SELECT COUNT(*) FROM inventory ' + where, filterValues),
  ]);
  return { rows: dataRes.rows, total: countRes.rows[0].count };
}

async function findById(id, client) {
  const runner = client || db;
  const { rows } = await runner.query(`SELECT id, name, ${PRICE_COLUMNS}, stock_quantity, created_at, updated_at FROM inventory WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({ name, buy_in_price, mrp, selling_price, stock_quantity }) {
  const { rows } = await db.query(
    `INSERT INTO inventory (name, price, buy_in_price, mrp, selling_price, stock_quantity)
     VALUES ($1, $2, $3, $4, $2, $5)
     RETURNING id, name, ${PRICE_COLUMNS}, stock_quantity, created_at, updated_at`,
    [name, selling_price, buy_in_price, mrp, stock_quantity]
  );
  return rows[0];
}

async function update(id, fields) {
  const allowedFields = ['name', 'buy_in_price', 'mrp', 'selling_price', 'stock_quantity'];
  const normalized = Object.fromEntries(Object.entries(fields).filter(([key]) => allowedFields.includes(key)));
  if (Object.prototype.hasOwnProperty.call(normalized, 'selling_price')) normalized.price = normalized.selling_price;
  const keys = Object.keys(normalized);
  const setClauses = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = keys.map((key) => normalized[key]);
  values.push(id);
  const { rows } = await db.query(
    `UPDATE inventory SET ${setClauses} WHERE id = $${values.length}
     RETURNING id, name, ${PRICE_COLUMNS}, stock_quantity, updated_at`,
    values
  );
  return rows[0] || null;
}

async function decrementStock(id, quantity, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `UPDATE inventory SET stock_quantity = stock_quantity - $1
     WHERE id = $2 AND stock_quantity >= $1
     RETURNING id, name, stock_quantity`,
    [quantity, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await db.query('DELETE FROM inventory WHERE id = $1 RETURNING id, name', [id]);
  return rows[0] || null;
}

module.exports = { findAll, findById, create, update, decrementStock, remove };
