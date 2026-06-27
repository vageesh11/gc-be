'use strict';

const sessionsRepo = require('../sessions/sessions.repository');
const ordersRepo   = require('../orders/orders.repository');
const framesRepo   = require('../frames/frames.repository');
const AppError     = require('../../utils/AppError');
const {
  calcBillableMinutes,
  calcSessionCost,
  applyDiscount,
  calcOrdersTotal,
  addAmounts,
  roundToNearest5,
} = require('../../utils/billing');

async function getBill(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new AppError(`Session with id ${sessionId} not found.`, 404);

  const orders      = await ordersRepo.findBySessionId(sessionId);
  const ordersTotal = calcOrdersTotal(orders);
  const pauses      = await sessionsRepo.findPausesBySessionId(sessionId);
  const isFrameWise = session.booking_type === 'frame_wise';

  // Always fetch frames for frame_wise sessions
  const frames = isFrameWise ? await framesRepo.findBySessionId(sessionId) : [];

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
      frames,
    };
  }

  // Active session — live estimate
  let sessionAmt;
  let billable;

  if (isFrameWise) {
    // For frame_wise: sum all completed frames
    const summary = await framesRepo.sumBySessionId(sessionId);
    billable   = Math.ceil(parseFloat(summary.total_duration_min) || 0);
    sessionAmt = parseFloat(summary.total_amount || '0').toFixed(2);
  } else {
    billable   = calcBillableMinutes(session.start_time, new Date(), pauses);
    sessionAmt = calcSessionCost(billable, session.price_per_minute);
  }

  const totalAmt = addAmounts(sessionAmt, ordersTotal);

  // applyDiscount handles 'none' discount_type — returns full amount as net
  const { discount_amount, net_amount: rawNet } = applyDiscount(
    sessionAmt, ordersTotal,
    session.discount_type || 'none', session.discount_value || 0, session.discount_scope || 'all'
  );
  const net_amount = roundToNearest5(rawNet);

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
    frames,
  };
}

module.exports = { getBill };
