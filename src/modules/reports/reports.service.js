'use strict';

const ExcelJS  = require('exceljs');
const repo     = require('./reports.repository');
const AppError = require('../../utils/AppError');

// ── Date range helpers ──────────────────────────────────────────────────────

function getDayRange(dateStr) {
  let base;
  if (dateStr) {
    base = new Date(dateStr);
    if (isNaN(base.getTime())) throw new AppError('Invalid date format. Use YYYY-MM-DD.', 400);
  } else {
    base = new Date();
  }
  const from = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const to   = new Date(from);
  to.setUTCDate(from.getUTCDate() + 1);
  return { from, to };
}

function getWeekRange(weekStartStr) {
  let base;
  if (weekStartStr) {
    base = new Date(weekStartStr);
    if (isNaN(base.getTime())) throw new AppError('Invalid date format. Use YYYY-MM-DD.', 400);
  } else {
    base = new Date();
  }
  const day    = base.getUTCDay();
  const diff   = (day === 0) ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 7);
  return { from: monday, to: sunday };
}

function getMonthRange(yearMonth) {
  let year, month;
  if (yearMonth) {
    const parts = yearMonth.split('-');
    if (parts.length !== 2) throw new AppError('Invalid month format. Use YYYY-MM.', 400);
    year  = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1; // 0-based
    if (isNaN(year) || isNaN(month)) throw new AppError('Invalid month format. Use YYYY-MM.', 400);
  } else {
    const now = new Date();
    year  = now.getUTCFullYear();
    month = now.getUTCMonth();
  }
  const from = new Date(Date.UTC(year, month, 1));
  const to   = new Date(Date.UTC(year, month + 1, 1));
  return { from, to };
}

// ── Summary builder ─────────────────────────────────────────────────────────

function buildSummary(raw, minutes) {
  return {
    total_sessions:  Number(raw.total_sessions),
    total_minutes:   Number(minutes || raw.total_minutes),
    total_hours:     parseFloat((Number(minutes || raw.total_minutes) / 60).toFixed(2)),
    total_revenue:   parseFloat(raw.total_revenue).toFixed(2),
    table_revenue:   parseFloat(raw.table_revenue).toFixed(2),
    orders_revenue:  parseFloat(raw.orders_revenue).toFixed(2),
    total_discounts: parseFloat(raw.total_discounts).toFixed(2),
    // booking types
    payg_count:    Number(raw.payg_count),
    fixed_count:   Number(raw.fixed_count),
    prebook_count: Number(raw.prebook_count),
    // payment methods
    cash_count:     Number(raw.cash_count),
    online_count:   Number(raw.online_count),
    split_count:    Number(raw.split_count || 0),
    cash_revenue:   parseFloat(raw.cash_revenue).toFixed(2),
    online_revenue: parseFloat(raw.online_revenue).toFixed(2),
  };
}

// ── Excel helpers ────────────────────────────────────────────────────────────

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const TITLE_FONT  = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } };
const ALT_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FA' } };
const BORDER      = {
  top:    { style: 'thin', color: { argb: 'FFCCCCCC' } },
  left:   { style: 'thin', color: { argb: 'FFCCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  right:  { style: 'thin', color: { argb: 'FFCCCCCC' } },
};

function addHeaders(ws, cols) {
  const row = ws.addRow(cols.map(c => c.header));
  row.eachCell(cell => {
    cell.fill      = HEADER_FILL;
    cell.font      = HEADER_FONT;
    cell.border    = BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  ws.columns = cols.map(c => ({ key: c.key, width: c.width || 18 }));
}

function styleDataRows(ws, startRow) {
  let idx = 0;
  for (let r = startRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    row.eachCell({ includeEmpty: true }, cell => {
      cell.border    = BORDER;
      cell.alignment = { vertical: 'middle' };
    });
    if (idx % 2 === 1) row.eachCell({ includeEmpty: true }, cell => { cell.fill = ALT_FILL; });
    idx++;
  }
}

/**
 * Build the 5-sheet sessions workbook for any date-range label.
 */
async function buildExcelWorkbook(label, summary, sessions, tableBreakdown, topItems, orders) {
  const wb    = new ExcelJS.Workbook();
  wb.creator  = 'Gaming Café System';
  wb.created  = new Date();

  // ── Sheet 1: Summary ──────────────────────────────────────────
  const wsSummary = wb.addWorksheet('Summary');
  wsSummary.mergeCells('A1:B1');
  const titleCell      = wsSummary.getCell('A1');
  titleCell.value      = label;
  titleCell.font       = TITLE_FONT;
  titleCell.alignment  = { horizontal: 'center' };
  wsSummary.addRow([]);

  const summaryData = [
    ['Total Sessions',          summary.total_sessions],
    ['Total Billable Minutes',  summary.total_minutes],
    ['Total Billable Hours',    summary.total_hours],
    ['Gross Revenue (₹)',       parseFloat(summary.total_revenue).toFixed(2)],
    ['Table Revenue (₹)',       parseFloat(summary.table_revenue).toFixed(2)],
    ['Snacks & Drinks (₹)',     parseFloat(summary.orders_revenue).toFixed(2)],
    ['Total Discounts (₹)',     parseFloat(summary.total_discounts).toFixed(2)],
    ['', ''],
    ['Payment Method — Cash',   summary.cash_count + ' sessions  ₹' + parseFloat(summary.cash_revenue).toFixed(2)],
    ['Payment Method — Online', summary.online_count + ' sessions  ₹' + parseFloat(summary.online_revenue).toFixed(2)],
    ['Payment Method — Split',  summary.split_count  + ' sessions  (cash + online)'],
    ['', ''],
    ['Pay-as-you-go Sessions',  summary.payg_count],
    ['Fixed Slot Sessions',     summary.fixed_count],
    ['Pre-booked Sessions',     summary.prebook_count],
  ];

  summaryData.forEach(([lbl, val]) => {
    const row = wsSummary.addRow([lbl, val]);
    row.getCell(1).font = { bold: true };
    if (lbl) row.eachCell(cell => { cell.border = BORDER; });
  });
  wsSummary.getColumn(1).width = 32;
  wsSummary.getColumn(2).width = 28;

  // ── Sheet 2: Sessions ─────────────────────────────────────────
  const wsSessions = wb.addWorksheet('Sessions');
  addHeaders(wsSessions, [
    { header: 'Session ID',       key: 'session_id',      width: 12 },
    { header: 'Customer',         key: 'customer_name',   width: 20 },
    { header: 'Phone',            key: 'customer_phone',  width: 16 },
    { header: 'Table',            key: 'table_name',      width: 18 },
    { header: 'Type',             key: 'table_type',      width: 12 },
    { header: 'Booking Type',     key: 'booking_type',    width: 16 },
    { header: 'Payment Method',   key: 'payment_method',  width: 14 },
    { header: 'Cash Amt (₹)',      key: 'cash_amount',     width: 14 },
    { header: 'Online Amt (₹)',    key: 'online_amount',   width: 14 },
    { header: 'Start Time',       key: 'start_time',      width: 22 },
    { header: 'End Time',         key: 'end_time',        width: 22 },
    { header: 'Duration (min)',   key: 'duration_min',    width: 16 },
    { header: 'Session Amt (₹)',  key: 'session_amount',  width: 16 },
    { header: 'Total Amt (₹)',    key: 'total_amount',    width: 16 },
    { header: 'Discount (₹)',     key: 'discount_amount', width: 14 },
    { header: 'Net Amount (₹)',   key: 'net_amount',      width: 14 },
    { header: 'Discount Type',    key: 'discount_type',   width: 14 },
  ]);

  sessions.forEach(s => {
    wsSessions.addRow({
      session_id:     s.session_id,
      customer_name:  s.customer_name  || '-',
      customer_phone: s.customer_phone || '-',
      table_name:     s.table_name,
      table_type:     s.table_type,
      booking_type:   s.booking_type,
      payment_method: s.payment_method || '-',
      cash_amount:    parseFloat(s.cash_amount   || 0).toFixed(2),
      online_amount:  parseFloat(s.online_amount || 0).toFixed(2),
      start_time:     new Date(s.start_time).toLocaleString('en-IN'),
      end_time:       s.end_time ? new Date(s.end_time).toLocaleString('en-IN') : '-',
      duration_min:   s.duration_min,
      session_amount: parseFloat(s.session_amount  || 0).toFixed(2),
      total_amount:   parseFloat(s.total_amount    || 0).toFixed(2),
      discount_amount: parseFloat(s.discount_amount || 0).toFixed(2),
      net_amount:     parseFloat(s.net_amount      || 0).toFixed(2),
      discount_type:  s.discount_type,
    });
  });
  styleDataRows(wsSessions, 2);

  // ── Sheet 3: Table Breakdown ──────────────────────────────────
  const wsTable = wb.addWorksheet('Table Breakdown');
  addHeaders(wsTable, [
    { header: 'Table Name',   key: 'table_name',    width: 22 },
    { header: 'Type',         key: 'table_type',    width: 12 },
    { header: 'Sessions',     key: 'sessions',      width: 12 },
    { header: 'Total Min',    key: 'total_minutes', width: 14 },
    { header: 'Total Hours',  key: 'total_hours',   width: 14 },
    { header: 'Revenue (₹)',  key: 'revenue',       width: 16 },
  ]);
  tableBreakdown.forEach(r => {
    wsTable.addRow({
      table_name:    r.table_name,
      table_type:    r.table_type,
      sessions:      Number(r.sessions),
      total_minutes: Number(r.total_minutes),
      total_hours:   parseFloat((Number(r.total_minutes) / 60).toFixed(2)),
      revenue:       parseFloat(r.revenue).toFixed(2),
    });
  });
  styleDataRows(wsTable, 2);

  // ── Sheet 4: Top Items ────────────────────────────────────────
  const wsItems = wb.addWorksheet('Top Items');
  addHeaders(wsItems, [
    { header: 'Item',         key: 'item_name',     width: 26 },
    { header: 'Qty Sold',     key: 'total_qty',     width: 12 },
    { header: 'Revenue (₹)',  key: 'total_revenue', width: 16 },
  ]);
  topItems.forEach(r => {
    wsItems.addRow({
      item_name:     r.item_name,
      total_qty:     Number(r.total_qty),
      total_revenue: parseFloat(r.total_revenue).toFixed(2),
    });
  });
  styleDataRows(wsItems, 2);

  // ── Sheet 5: Orders Detail ────────────────────────────────────
  const wsOrders = wb.addWorksheet('Orders Detail');
  addHeaders(wsOrders, [
    { header: 'Session ID',     key: 'session_id', width: 12 },
    { header: 'Item',           key: 'item_name',  width: 26 },
    { header: 'Qty',            key: 'quantity',   width: 8 },
    { header: 'Unit Price (₹)', key: 'unit_price', width: 14 },
    { header: 'Subtotal (₹)',   key: 'subtotal',   width: 14 },
    { header: 'Time',           key: 'created_at', width: 22 },
  ]);
  orders.forEach(o => {
    wsOrders.addRow({
      session_id: o.session_id,
      item_name:  o.item_name,
      quantity:   Number(o.quantity),
      unit_price: parseFloat(o.unit_price).toFixed(2),
      subtotal:   parseFloat(o.subtotal).toFixed(2),
      created_at: new Date(o.created_at).toLocaleString('en-IN'),
    });
  });
  styleDataRows(wsOrders, 2);

  return wb.xlsx.writeBuffer();
}

// ── Public report functions ─────────────────────────────────────────────────

async function getDailyReport(dateStr) {
  const { from, to } = getDayRange(dateStr);

  const [summary, sessions, tableBreakdown, topItems] = await Promise.all([
    repo.fetchSummaryInRange(from, to),
    repo.fetchSessionsInRange(from, to),
    repo.fetchTableBreakdownInRange(from, to),
    repo.fetchTopItemsInRange(from, to),
  ]);

  return {
    date: from.toISOString().slice(0, 10),
    summary: buildSummary(summary),
    table_breakdown: tableBreakdown.map(r => ({
      table_name:    r.table_name,
      table_type:    r.table_type,
      sessions:      Number(r.sessions),
      total_minutes: Number(r.total_minutes),
      total_hours:   parseFloat((Number(r.total_minutes) / 60).toFixed(2)),
      revenue:       parseFloat(r.revenue).toFixed(2),
    })),
    top_items: topItems.map(r => ({
      item_name:     r.item_name,
      total_qty:     Number(r.total_qty),
      total_revenue: parseFloat(r.total_revenue).toFixed(2),
    })),
    sessions,
  };
}

async function generateDailyExcel(dateStr) {
  const { from, to } = getDayRange(dateStr);
  const label = 'Daily Report — ' + from.toISOString().slice(0, 10);

  const [summary, sessions, tableBreakdown, topItems, orders] = await Promise.all([
    repo.fetchSummaryInRange(from, to),
    repo.fetchSessionsInRange(from, to),
    repo.fetchTableBreakdownInRange(from, to),
    repo.fetchTopItemsInRange(from, to),
    repo.fetchOrdersInRange(from, to),
  ]);

  return buildExcelWorkbook(label, buildSummary(summary), sessions, tableBreakdown, topItems, orders);
}

async function getWeeklyReport(weekStartStr) {
  const { from, to } = getWeekRange(weekStartStr);
  const label = from.toISOString().slice(0, 10) + ' to ' + new Date(to.getTime() - 1).toISOString().slice(0, 10);

  const [summary, sessions, tableBreakdown, topItems] = await Promise.all([
    repo.fetchSummaryInRange(from, to),
    repo.fetchSessionsInRange(from, to),
    repo.fetchTableBreakdownInRange(from, to),
    repo.fetchTopItemsInRange(from, to),
  ]);

  return {
    week_start: from.toISOString().slice(0, 10),
    week_end:   new Date(to.getTime() - 1).toISOString().slice(0, 10),
    summary:    buildSummary(summary),
    table_breakdown: tableBreakdown.map(r => ({
      table_name:    r.table_name,
      table_type:    r.table_type,
      sessions:      Number(r.sessions),
      total_minutes: Number(r.total_minutes),
      total_hours:   parseFloat((Number(r.total_minutes) / 60).toFixed(2)),
      revenue:       parseFloat(r.revenue).toFixed(2),
    })),
    top_items: topItems.map(r => ({
      item_name:     r.item_name,
      total_qty:     Number(r.total_qty),
      total_revenue: parseFloat(r.total_revenue).toFixed(2),
    })),
    sessions,
  };
}

async function generateWeeklyExcel(weekStartStr) {
  const { from, to } = getWeekRange(weekStartStr);
  const label = 'Weekly Report — ' + from.toISOString().slice(0, 10) + ' to ' + new Date(to.getTime() - 1).toISOString().slice(0, 10);

  const [summary, sessions, tableBreakdown, topItems, orders] = await Promise.all([
    repo.fetchSummaryInRange(from, to),
    repo.fetchSessionsInRange(from, to),
    repo.fetchTableBreakdownInRange(from, to),
    repo.fetchTopItemsInRange(from, to),
    repo.fetchOrdersInRange(from, to),
  ]);

  return buildExcelWorkbook(label, buildSummary(summary), sessions, tableBreakdown, topItems, orders);
}

async function getMonthlyReport(yearMonth) {
  const { from, to } = getMonthRange(yearMonth);

  const [summary, sessions, tableBreakdown, topItems] = await Promise.all([
    repo.fetchSummaryInRange(from, to),
    repo.fetchSessionsInRange(from, to),
    repo.fetchTableBreakdownInRange(from, to),
    repo.fetchTopItemsInRange(from, to),
  ]);

  return {
    month:   from.toISOString().slice(0, 7),   // "YYYY-MM"
    from:    from.toISOString().slice(0, 10),
    to:      new Date(to.getTime() - 1).toISOString().slice(0, 10),
    summary: buildSummary(summary),
    table_breakdown: tableBreakdown.map(r => ({
      table_name:    r.table_name,
      table_type:    r.table_type,
      sessions:      Number(r.sessions),
      total_minutes: Number(r.total_minutes),
      total_hours:   parseFloat((Number(r.total_minutes) / 60).toFixed(2)),
      revenue:       parseFloat(r.revenue).toFixed(2),
    })),
    top_items: topItems.map(r => ({
      item_name:     r.item_name,
      total_qty:     Number(r.total_qty),
      total_revenue: parseFloat(r.total_revenue).toFixed(2),
    })),
    sessions,
  };
}

async function generateMonthlyExcel(yearMonth) {
  const { from, to } = getMonthRange(yearMonth);
  const label = 'Monthly Report — ' + from.toISOString().slice(0, 7);

  const [summary, sessions, tableBreakdown, topItems, orders] = await Promise.all([
    repo.fetchSummaryInRange(from, to),
    repo.fetchSessionsInRange(from, to),
    repo.fetchTableBreakdownInRange(from, to),
    repo.fetchTopItemsInRange(from, to),
    repo.fetchOrdersInRange(from, to),
  ]);

  return buildExcelWorkbook(label, buildSummary(summary), sessions, tableBreakdown, topItems, orders);
}

module.exports = {
  getDailyReport,   generateDailyExcel,
  getWeeklyReport,  generateWeeklyExcel,
  getMonthlyReport, generateMonthlyExcel,
};
