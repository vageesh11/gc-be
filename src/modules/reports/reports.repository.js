'use strict';

const db = require('../../config/db');

/**
 * Fetch all closed sessions within [from, to] date range.
 * Returns enriched rows for report generation.
 */
async function fetchSessionsInRange(from, to) {
  const { rows } = await db.query(
    `SELECT
       s.id              AS session_id,
       s.start_time,
       s.end_time,
       s.duration        AS duration_min,
       s.booking_type,
       s.discount_type,
       s.discount_value,
       s.discount_amount,
       s.session_amount,
       s.total_amount,
       s.net_amount,
       s.cash_amount,
       s.online_amount,
       CASE
         WHEN s.cash_amount > 0 AND s.online_amount = 0 THEN 'cash'
         WHEN s.cash_amount = 0 AND s.online_amount > 0 THEN 'online'
         WHEN s.cash_amount > 0 AND s.online_amount > 0 THEN 'split'
         ELSE NULL
       END AS payment_method,
       t.name            AS table_name,
       t.type            AS table_type,
       c.name            AS customer_name,
       c.phone           AS customer_phone
     FROM sessions s
     JOIN gaming_tables t ON t.id = s.table_id
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.end_time IS NOT NULL
       AND s.start_time >= $1
       AND s.start_time <  $2
     ORDER BY s.start_time ASC`,
    [from, to]
  );
  return rows;
}

/**
 * Fetch all orders for sessions within [from, to].
 */
async function fetchOrdersInRange(from, to) {
  const { rows } = await db.query(
    `SELECT
       o.session_id,
       i.name       AS item_name,
       o.quantity,
       o.unit_price,
       o.subtotal,
       o.created_at
     FROM orders o
     JOIN sessions s ON s.id = o.session_id
     JOIN inventory i ON i.id = o.item_id
     WHERE s.end_time IS NOT NULL
       AND s.start_time >= $1
       AND s.start_time <  $2
     ORDER BY o.session_id, o.created_at`,
    [from, to]
  );
  return rows;
}

/**
 * Summary aggregates for the date range.
 */
async function fetchSummaryInRange(from, to) {
  const { rows } = await db.query(
    `SELECT
       COUNT(*)                          AS total_sessions,
       COALESCE(SUM(s.duration), 0)     AS total_minutes,
       COALESCE(SUM(s.net_amount), 0)   AS total_revenue,
       COALESCE(SUM(s.discount_amount),0) AS total_discounts,
       COALESCE(SUM(s.session_amount), 0) AS table_revenue,
       (SELECT COALESCE(SUM(o.subtotal),0)
        FROM orders o
        JOIN sessions s2 ON s2.id = o.session_id
        WHERE s2.end_time IS NOT NULL
          AND s2.start_time >= $1
          AND s2.start_time < $2
       )                                 AS orders_revenue,
       COUNT(*) FILTER (WHERE s.booking_type = 'pay_as_you_go') AS payg_count,
       COUNT(*) FILTER (WHERE s.booking_type = 'fixed_slot')    AS fixed_count,
       COUNT(*) FILTER (WHERE s.booking_type = 'pre_booking')   AS prebook_count,
       COUNT(*) FILTER (WHERE s.cash_amount > 0 AND s.online_amount = 0) AS cash_count,
       COUNT(*) FILTER (WHERE s.cash_amount = 0 AND s.online_amount > 0) AS online_count,
       COUNT(*) FILTER (WHERE s.cash_amount > 0 AND s.online_amount > 0) AS split_count,
       COALESCE(SUM(s.cash_amount),   0) AS cash_revenue,
       COALESCE(SUM(s.online_amount), 0) AS online_revenue
     FROM sessions s
     WHERE s.end_time IS NOT NULL
       AND s.start_time >= $1
       AND s.start_time <  $2`,
    [from, to]
  );
  return rows[0];
}

/**
 * Per-table breakdown for the date range.
 */
async function fetchTableBreakdownInRange(from, to) {
  const { rows } = await db.query(
    `SELECT
       t.name                           AS table_name,
       t.type                           AS table_type,
       COUNT(s.id)                      AS sessions,
       COALESCE(SUM(s.duration), 0)     AS total_minutes,
       COALESCE(SUM(s.net_amount), 0)   AS revenue
     FROM sessions s
     JOIN gaming_tables t ON t.id = s.table_id
     WHERE s.end_time IS NOT NULL
       AND s.start_time >= $1
       AND s.start_time <  $2
     GROUP BY t.id, t.name, t.type
     ORDER BY revenue DESC`,
    [from, to]
  );
  return rows;
}

/**
 * Top-selling inventory items for the date range.
 */
async function fetchTopItemsInRange(from, to) {
  const { rows } = await db.query(
    `SELECT
       i.name                        AS item_name,
       SUM(o.quantity)               AS total_qty,
       COALESCE(SUM(o.subtotal), 0)  AS total_revenue
     FROM orders o
     JOIN sessions s ON s.id = o.session_id
     JOIN inventory i ON i.id = o.item_id
     WHERE s.end_time IS NOT NULL
       AND s.start_time >= $1
       AND s.start_time <  $2
     GROUP BY i.id, i.name
     ORDER BY total_revenue DESC
     LIMIT 10`,
    [from, to]
  );
  return rows;
}

module.exports = {
  fetchSessionsInRange,
  fetchOrdersInRange,
  fetchSummaryInRange,
  fetchTableBreakdownInRange,
  fetchTopItemsInRange,
};
