'use strict';

const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login };
