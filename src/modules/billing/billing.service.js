'use strict';

const sessionsRepo = require('../sessions/sessions.repository');
const ordersRepo   = require('../orders/orders.repository');
const AppError     = require('../../utils/AppError');
const {
  calcBillableMinutes,
  calcSessionCost,
  applyDiscount,
  calcOrdersTotal,
  addAmounts,
} = require('../../utils/billing');

async function getBill(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new AppError(`Session with id ${sessionId} not found.`, 404);

  const orders      = await ordersRepo.findBySessionId(sessionId);
  const ordersTotal = calcOrdersTotal(orders);
  const pauses      = await sessionsRepo.findPausesBySessionId(sessionId);

  // Closed session — return stored final values
  if (session.end_time) {
    return {
      session_id:       session.id,
      customer_name:    session.customer_name,
      customer_phone:   session.customer_phone,
      table_name:       session.table_name,
      table_type:       session.table_type,
      price_per_minute: session.price_per_minute,
      booking_type:     session.booking_type,
      start_time:       session.start_time,
      end_time:         session.end_time,
      duration_min:     session.duration,
      session_amount:   session.session_amount,
      orders_total:     ordersTotal,
      total_amount:     session.total_amount,
      discount_type:    session.discount_type,
      discount_value:   session.discount_value,
      discount_amount:  session.discount_amount,
      net_amount:       session.net_amount,
      cash_amount:      session.cash_amount,
      online_amount:    session.online_amount,
      payment_method:   session.payment_method,
      status:           'CLOSED',
      pauses,
      orders,
    };
  }

  // Active or paused session — live estimate
  const now        = new Date();
  const billable   = calcBillableMinutes(session.start_time, now, pauses);
  const sessionAmt = calcSessionCost(billable, session.price_per_minute);
  const totalAmt   = addAmounts(sessionAmt, ordersTotal);
  const { discount_amount, net_amount } = applyDiscount(
    totalAmt, session.discount_type, session.discount_value
  );

  return {
    session_id:       session.id,
    customer_name:    session.customer_name,
    customer_phone:   session.customer_phone,
    table_name:       session.table_name,
    table_type:       session.table_type,
    price_per_minute: session.price_per_minute,
    booking_type:     session.booking_type,
    start_time:       session.start_time,
    end_time:         null,
    duration_min:     billable,
    session_amount:   sessionAmt,
    orders_total:     ordersTotal,
    total_amount:     totalAmt,
    discount_type:    session.discount_type,
    discount_value:   session.discount_value,
    discount_amount,
    net_amount,
    cash_amount:      null,
    online_amount:    null,
    payment_method:   null,
    status:           session.status === 'paused' ? 'PAUSED' : 'ACTIVE',
    pauses,
    orders,
  };
}

module.exports = { getBill };
