'use strict';

const db = require('../../config/db');

async function findByUsername(username) {
  const { rows } = await db.query(
    `SELECT id, username, password_hash, role, is_active
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [username]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT id, username, role, is_active, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ username, password_hash, role }) {
  const { rows } = await db.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, username, role, is_active, created_at`,
    [username, password_hash, role]
  );
  return rows[0];
}

module.exports = { findByUsername, findById, create };
