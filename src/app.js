'use strict';

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const { Server } = require('socket.io');

const routes       = require('./routes/index');
const notFound     = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const env          = require('./config/env');
const { startFixedSlotScheduler } = require('./jobs/fixedSlotScheduler');

function createApp(httpServer) {
  const app = express();

  // ── Security & logging ────────────────────────────────────────────
  app.use(helmet());
  app.use(cors());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  // ── Body parsing ─────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // ── Socket.IO setup ──────────────────────────────────────────────
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  // ── Fixed-slot auto-end scheduler ────────────────────────────────
  startFixedSlotScheduler(io);

  // Attach io to every request so controllers can emit events
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // ── API routes ───────────────────────────────────────────────────
  app.use('/api', routes);

  // ── 404 & error handling ─────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
