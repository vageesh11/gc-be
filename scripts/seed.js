'use strict';

/**
 * Cross-platform database seeder.
 * Works on both Linux and Windows.
 * Usage: node scripts/seed.js
 */

require('dotenv').config();
const { Client } = require('pg');
const fs         = require('fs');
const path       = require('path');

const SEEDS = [
  'seed.sql',
  'users.sql',
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

    for (const file of SEEDS) {
      const filePath = path.join(__dirname, '..', 'database', 'seeds', file);
      if (!fs.existsSync(filePath)) {
        console.warn(`[SKIP] ${file} not found, skipping.`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`[RUN]  ${file}`);
      await client.query(sql);
      console.log(`[OK]   ${file}`);
    }

    console.log('\n✓ Seed data inserted successfully.\n');
  } catch (err) {
    console.error('\n✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
