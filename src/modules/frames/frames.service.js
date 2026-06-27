'use strict';

const framesRepo  = require('./frames.repository');
const sessionsRepo = require('../sessions/sessions.repository');
const AppError    = require('../../utils/AppError');
const { calcSessionCost, roundToNearest5 } = require('../../utils/billing');

async function startFrame(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new AppError(`Session ${sessionId} not found.`, 404);
  if (session.booking_type !== 'frame_wise') throw new AppError('Session is not frame_wise.', 400);
  if (session.end_time) throw new AppError('Session has already ended.', 400);
  if (session.status !== 'active') throw new AppError(`Cannot start frame on a ${session.status} session.`, 400);

  const active = await framesRepo.findActiveFrame(sessionId);
  if (active) throw new AppError('A frame is already running. End it first.', 409);

  return framesRepo.startFrame(sessionId);
}

async function endFrame(frameId, playerName) {
  const frame = await framesRepo.findById(frameId);
  if (!frame) throw new AppError(`Frame ${frameId} not found.`, 404);
  if (frame.ended_at) throw new AppError('Frame has already ended.', 400);
  if (!playerName || !playerName.trim()) throw new AppError('Player name is required.', 400);

  const session = await sessionsRepo.findById(frame.session_id);
  if (!session) throw new AppError('Session not found.', 404);

  const endedAt = new Date();
  const diffMs = endedAt - new Date(frame.started_at);
  const rawMin = Math.ceil(diffMs / 60000);
  const durationMin = Math.max(Math.ceil(rawMin / 5) * 5, 5);
  const rawCost = calcSessionCost(durationMin, session.price_per_minute);
  const amount = parseFloat(roundToNearest5(rawCost));

  return framesRepo.endFrame(frameId, { endedAt, durationMin, amount, playerName: playerName.trim() });
}

async function getFrames(sessionId) {
  return framesRepo.findBySessionId(sessionId);
}

async function getFrameSummary(sessionId) {
  return framesRepo.sumBySessionId(sessionId);
}

module.exports = { startFrame, endFrame, getFrames, getFrameSummary };
