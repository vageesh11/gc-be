'use strict';

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const authRepo = require('./auth.repository');
const env      = require('../../config/env');
const AppError = require('../../utils/AppError');

async function login(username, password) {
  const user = await authRepo.findByUsername(username);
  if (!user) {
    throw new AppError('Invalid username or password.', 401);
  }
  if (!user.is_active) {
    throw new AppError('This account has been deactivated.', 403);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Invalid username or password.', 401);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role },
  };
}

module.exports = { login };
