'use strict';

const framesService = require('./frames.service');

async function startFrame(req, res, next) {
  try {
    const { session_id, player_name } = req.body;
    const frame = await framesService.startFrame(Number(session_id), player_name);
    return res.status(201).json({ status: 'success', data: frame });
  } catch (err) { return next(err); }
}

async function endFrame(req, res, next) {
  try {
    const frame = await framesService.endFrame(Number(req.params.id));
    return res.status(200).json({ status: 'success', data: frame });
  } catch (err) { return next(err); }
}

async function getFrames(req, res, next) {
  try {
    const frames = await framesService.getFrames(Number(req.params.sessionId));
    return res.status(200).json({ status: 'success', data: frames });
  } catch (err) { return next(err); }
}

module.exports = { startFrame, endFrame, getFrames };
