'use strict';

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  min: env.db.poolMin,
  max: env.db.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected idle client error:', err.message);
});

/**
 * Run a query using the shared pool.
 * @param {string} text - SQL query
 * @param {Array}  params - Query parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquire a dedicated client for transaction use.
 * Caller is responsible for calling client.release().
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
