'use strict';

/**
 * Cross-platform database migration runner.
 * Works on both Linux and Windows.
 * Usage: node scripts/migrate.js
 */

const path       = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Client } = require('pg');
const fs         = require('fs');

const MIGRATIONS = [
  '001_initial_schema.sql',
  '002_feature_additions.sql',
  '003_table_pricing_and_discounts.sql',
  '004_reserved_status.sql',
  '005_payment_method.sql',
  '006_cash_online_amounts.sql',
];

async function run() {
  const client = new Client({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log(`[DB] Connected to ${process.env.DB_NAME} on ${process.env.DB_HOST}`);

    for (const file of MIGRATIONS) {
      const filePath = path.join(__dirname, '..', 'database', 'migrations', file);
      if (!fs.existsSync(filePath)) {
        console.warn(`[SKIP] ${file} not found, skipping.`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`[RUN]  ${file}`);
      await client.query(sql);
      console.log(`[OK]   ${file}`);
    }

    console.log('\n✓ All migrations applied successfully.\n');
  } catch (err) {
    console.error('\n✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
