'use strict';

/**
 * Calculate duration in minutes between two Date objects.
 * Rounds up to the nearest minute (minimum 1 minute).
 */
function calcDurationMinutes(startTime, endTime) {
  const diffMs = new Date(endTime) - new Date(startTime);
  if (diffMs <= 0) return 1;
  return Math.ceil(diffMs / 60000);
}

/**
 * Calculate BILLABLE minutes for a session, excluding all paused intervals.
 *
 * @param {Date}   startTime
 * @param {Date}   endTime
 * @param {Array}  pauses  - array of { paused_at, resumed_at } from session_pauses table
 *                           resumed_at = null means currently paused
 * @returns {number} billable minutes (minimum 1)
 */
function calcBillableMinutes(startTime, endTime, pauses = []) {
  const start = new Date(startTime).getTime();
  const end   = new Date(endTime).getTime();

  // Sum up all paused milliseconds within the session window
  let pausedMs = 0;
  for (const p of pauses) {
    const pausedAt   = new Date(p.paused_at).getTime();
    const resumedAt  = p.resumed_at ? new Date(p.resumed_at).getTime() : end;
    // Clamp to session window
    const pStart = Math.max(pausedAt,  start);
    const pEnd   = Math.min(resumedAt, end);
    if (pEnd > pStart) pausedMs += (pEnd - pStart);
  }

  const billableMs = Math.max(end - start - pausedMs, 0);
  if (billableMs <= 0) return 1;
  return Math.ceil(billableMs / 60000);
}

/**
 * Calculate session cost in Indian Rupees (₹).
 * Works in integer paise (1 Rupee = 100 paise) to avoid floating-point errors.
 */
function calcSessionCost(durationMinutes, pricePerMinute) {
  const priceInPaise = Math.round(parseFloat(pricePerMinute) * 100);
  const totalPaise   = durationMinutes * priceInPaise;
  return (totalPaise / 100).toFixed(2);
}

/**
 * Apply a discount strictly based on its scope.
 *
 * @param {string} sessionAmount  - table time cost e.g. "120.00"
 * @param {string} ordersTotal    - snacks/orders total e.g. "50.00"
 * @param {string} discountType   - 'none' | 'percentage' | 'flat' | 'pass'
 * @param {string|number} discountValue  - percentage (0-100) or flat ₹ amount
 * @param {string} scope          - 'session' | 'order' | 'all'
 *                                  'session' → apply only to table time
 *                                  'order'   → apply only to snacks/orders
 *                                  'all'     → apply to entire gross total
 * @returns {{ discount_amount: string, net_amount: string }}
 */
function applyDiscount(sessionAmount, ordersTotal, discountType, discountValue, scope = 'all') {
  const sessionPaise = Math.round(parseFloat(sessionAmount) * 100);
  const ordersPaise  = Math.round(parseFloat(ordersTotal)   * 100);
  const grossPaise   = sessionPaise + ordersPaise;

  // Determine the base to which the discount applies
  let basePaise;
  if (scope === 'session') basePaise = sessionPaise;
  else if (scope === 'order') basePaise = ordersPaise;
  else basePaise = grossPaise; // 'all'

  let discountPaise = 0;
  if (discountType === 'percentage') {
    const pct = Math.min(parseFloat(discountValue), 100);
    discountPaise = Math.round(basePaise * pct / 100);
  } else if (discountType === 'flat' || discountType === 'pass') {
    discountPaise = Math.min(
      Math.round(parseFloat(discountValue) * 100),
      basePaise
    );
  }

  const netPaise = Math.max(grossPaise - discountPaise, 0);
  return {
    discount_amount: (discountPaise / 100).toFixed(2),
    net_amount:      (netPaise      / 100).toFixed(2),
  };
}

/**
 * Sum order subtotals and return total in Rupees as decimal string.
 */
function calcOrdersTotal(orders) {
  const totalPaise = orders.reduce((acc, o) => {
    return acc + Math.round(parseFloat(o.subtotal) * 100);
  }, 0);
  return (totalPaise / 100).toFixed(2);
}

/**
 * Add two Rupee decimal strings without floating-point error.
 */
function addAmounts(a, b) {
  const total = Math.round(parseFloat(a) * 100) + Math.round(parseFloat(b) * 100);
  return (total / 100).toFixed(2);
}

/**
 * Round a Rupee decimal string to the nearest ₹5.
 * e.g. "13.00" → "15.00", "11.00" → "10.00", "12.50" → "15.00"
 * Uses standard rounding: x.5 rounds up.
 *
 * @param {string} amount - decimal string
 * @returns {string} rounded to nearest ₹5, 2 decimal places
 */
function roundToNearest5(amount) {
  const rupees  = parseFloat(amount);
  const rounded = Math.round(rupees / 5) * 5;
  return rounded.toFixed(2);
}

module.exports = {
  calcDurationMinutes,
  calcBillableMinutes,
  calcSessionCost,
  applyDiscount,
  roundToNearest5,
  calcOrdersTotal,
  addAmounts,
};
