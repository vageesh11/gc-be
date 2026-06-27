'use strict';

const db = require('../../config/db');

async function startFrame(sessionId, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `INSERT INTO session_frames (session_id)
     VALUES ($1)
     RETURNING id, session_id, player_name, started_at, ended_at, duration_min, amount`,
    [sessionId]
  );
  return rows[0];
}

async function endFrame(frameId, { endedAt, durationMin, amount, playerName }, client) {
  const runner = client || db;
  const { rows } = await runner.query(
    `UPDATE session_frames
     SET ended_at     = $1,
         duration_min = $2,
         amount       = $3,
         player_name  = $4
     WHERE id = $5
     RETURNING id, session_id, player_name, started_at, ended_at, duration_min, amount`,
    [endedAt, durationMin, amount, playerName, frameId]
  );
  return rows[0] || null;
}

async function findBySessionId(sessionId) {
  const { rows } = await db.query(
    `SELECT id, session_id, player_name, started_at, ended_at, duration_min, amount, created_at
     FROM session_frames
     WHERE session_id = $1
     ORDER BY started_at`,
    [sessionId]
  );
  return rows;
}

async function findById(frameId) {
  const { rows } = await db.query(
    `SELECT id, session_id, player_name, started_at, ended_at, duration_min, amount, created_at
     FROM session_frames WHERE id = $1`,
    [frameId]
  );
  return rows[0] || null;
}

async function findActiveFrame(sessionId) {
  const { rows } = await db.query(
    `SELECT id, session_id, player_name, started_at
     FROM session_frames
     WHERE session_id = $1 AND ended_at IS NULL
     ORDER BY started_at DESC LIMIT 1`,
    [sessionId]
  );
  return rows[0] || null;
}

async function sumBySessionId(sessionId) {
  const { rows } = await db.query(
    `SELECT
       COUNT(*)                               AS frame_count,
       COALESCE(SUM(duration_min), 0)         AS total_duration_min,
       COALESCE(SUM(amount), 0)               AS total_amount
     FROM session_frames
     WHERE session_id = $1 AND ended_at IS NOT NULL`,
    [sessionId]
  );
  return rows[0];
}

module.exports = { startFrame, endFrame, findBySessionId, findById, findActiveFrame, sumBySessionId };
