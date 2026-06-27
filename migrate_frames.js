'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  const client = await pool.connect();
  try {
    // 1. Drop old check constraint and add frame_wise
    await client.query(`ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_booking_type_check`);
    await client.query(`ALTER TABLE sessions ADD CONSTRAINT sessions_booking_type_check CHECK (booking_type IN ('pay_as_you_go','fixed_slot','pre_booking','frame_wise'))`);
    console.log('1. booking_type constraint updated');

    // 2. Create session_frames table
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_frames (
        id           SERIAL PRIMARY KEY,
        session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        player_name  VARCHAR(150) NOT NULL,
        started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at     TIMESTAMPTZ,
        duration_min NUMERIC(8,2),
        amount       NUMERIC(10,2),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('2. session_frames table created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sf_sid ON session_frames(session_id)`);
    console.log('3. index created');

    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
