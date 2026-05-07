'use strict';

// Load and validate env first — fail fast on missing vars
const env = require('./config/env');

const http      = require('http');
const createApp = require('./app');
const { pool }  = require('./config/db');

const httpServer = http.createServer();
const app        = createApp(httpServer);

httpServer.on('request', app);

async function start() {
  // Verify DB connectivity before accepting traffic
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connected to PostgreSQL successfully.');
  } catch (err) {
    console.error('[DB] Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }

  httpServer.listen(env.port, () => {
    console.log(`[Server] Gaming Café API running on port ${env.port} (${env.nodeEnv})`);
  });
}

// ── Graceful shutdown ────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  httpServer.close(async () => {
    try {
      await pool.end();
      console.log('[DB] Connection pool closed.');
    } catch (err) {
      console.error('[DB] Error closing pool:', err.message);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
  process.exit(1);
});

start();
