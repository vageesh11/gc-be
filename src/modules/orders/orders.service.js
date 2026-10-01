'use strict';

const db = require('../../config/db');
const ordersRepo = require('./orders.repository');
const sessionsRepo = require('../sessions/sessions.repository');
const inventoryRepo = require('../inventory/inventory.repository');
const AppError = require('../../utils/AppError');

async function createOrder({ session_id, item_id, quantity }) {
  // 1. Validate session exists and is still active
  const session = await sessionsRepo.findById(session_id);
  if (!session) {
    throw new AppError(`Session with id ${session_id} not found.`, 404);
  }
  if (session.end_time) {
    throw new AppError('Cannot add orders to a session that has already ended.', 400);
  }

  // 2. Validate item exists
  const item = await inventoryRepo.findById(item_id);
  if (!item) {
    throw new AppError(`Inventory item with id ${item_id} not found.`, 404);
  }

  // 3. Check stock before entering transaction
  if (item.stock_quantity < quantity) {
    throw new AppError(
      `Insufficient stock for "${item.name}". Available: ${item.stock_quantity}.`,
      400
    );
  }

  // 4. Calculate financials
  const unit_price = item.selling_price ?? item.price;
  const buy_in_price = item.buy_in_price ?? item.price;
  const mrp = item.mrp ?? unit_price;
  const selling_price = unit_price;
  const subtotalPaise =
    Math.round(parseFloat(unit_price) * 100) * quantity;
  const subtotal = (subtotalPaise / 100).toFixed(2);

  // 5. Transaction: insert order + decrement inventory
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const decremented = await inventoryRepo.decrementStock(item_id, quantity, client);
    if (!decremented) {
      throw new AppError(
        `Stock for "${item.name}" is no longer sufficient. Please try again.`,
        409
      );
    }

    const order = await ordersRepo.create(
      { session_id, item_id, quantity, unit_price, buy_in_price, mrp, selling_price, subtotal },
      client
    );

    await client.query('COMMIT');
    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getOrdersBySession(sessionId, filters) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) {
    throw new AppError(`Session with id ${sessionId} not found.`, 404);
  }
  return ordersRepo.findBySessionId(sessionId, filters);
}

async function createSnackOrder({ item_id, quantity, customer_name, customer_phone, snack_order_ref }) {
  const item = await inventoryRepo.findById(item_id);
  if (!item) throw new AppError(`Inventory item with id ${item_id} not found.`, 404);
  if (item.stock_quantity < quantity) {
    throw new AppError(`Insufficient stock for "${item.name}". Available: ${item.stock_quantity}.`, 400);
  }

  const unit_price = item.selling_price ?? item.price;
  const buy_in_price = item.buy_in_price ?? item.price;
  const mrp = item.mrp ?? unit_price;
  const selling_price = unit_price;
  const subtotal = ((Math.round(parseFloat(unit_price) * 100) * quantity) / 100).toFixed(2);

  const dbClient = await db.getClient();
  try {
    await dbClient.query('BEGIN');
    const decremented = await inventoryRepo.decrementStock(item_id, quantity, dbClient);
    if (!decremented) throw new AppError(`Stock for "${item.name}" is no longer sufficient.`, 409);
    const order = await ordersRepo.create({ session_id: null, item_id, quantity, unit_price, buy_in_price, mrp, selling_price, subtotal, customer_name, customer_phone, snack_order_ref }, dbClient);
    await dbClient.query('COMMIT');
    return { ...order, item_name: item.name };
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
}

async function createSnackOrderBatch({ items, customer_name, customer_phone, snack_order_ref }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const { item_id, quantity } of items) {
      const item = await inventoryRepo.findById(item_id, client);
      if (!item) throw new AppError(`Inventory item with id ${item_id} not found.`, 404);
      const sellingPrice = item.selling_price ?? item.price;
      const buyInPrice = item.buy_in_price ?? item.price;
      const mrp = item.mrp ?? sellingPrice;
      const unitPaise = Math.round(parseFloat(sellingPrice) * 100);
      const subtotal = ((unitPaise * quantity) / 100).toFixed(2);
      const decremented = await inventoryRepo.decrementStock(item_id, quantity, client);
      if (!decremented) throw new AppError(`Insufficient stock for "${item.name}".`, 409);
      const order = await ordersRepo.create({ session_id: null, item_id, quantity, unit_price: sellingPrice, buy_in_price: buyInPrice, mrp, selling_price: sellingPrice, subtotal, customer_name, customer_phone, snack_order_ref }, client);
      created.push({ ...order, item_name: item.name });
    }
    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getOpenSnackOrders() {
  return ordersRepo.findOpenSnackOrders();
}

async function closeSnackOrders(orderIds, payment_method) {
  const uniqueIds = [...new Set(orderIds)];
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const openLines = await ordersRepo.findOpenSnackOrderLines(uniqueIds, client);
    if (!openLines.length) {
      throw new AppError('One or more snack orders are already closed or unavailable.', 409);
    }

    const closedOrderIds = new Set(openLines.map((order) => order.id));
    const closed = await ordersRepo.closeSnackOrders([...closedOrderIds], payment_method, client);
    if (closed.length !== openLines.length) {
      throw new AppError('One or more snack orders are already closed or unavailable.', 409);
    }
    await client.query('COMMIT');
    return closed;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createOrder,
  createSnackOrder,
  createSnackOrderBatch,
  getOrdersBySession,
  getOpenSnackOrders,
  closeSnackOrders,
};
