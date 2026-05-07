'use strict';

const billingService = require('./billing.service');

async function getBill(req, res, next) {
  try {
    const bill = await billingService.getBill(Number(req.params.sessionId));
    return res.status(200).json({ status: 'success', data: bill });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getBill };
