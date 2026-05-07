'use strict';

const { Router } = require('express');

const authRouter      = require('../modules/auth/auth.routes');
const tablesRouter    = require('../modules/tables/tables.routes');
const sessionsRouter  = require('../modules/sessions/sessions.routes');
const inventoryRouter = require('../modules/inventory/inventory.routes');
const ordersRouter    = require('../modules/orders/orders.routes');
const billingRouter   = require('../modules/billing/billing.routes');
const customersRouter = require('../modules/customers/customers.routes');
const passesRouter    = require('../modules/passes/passes.routes');
const bookingsRouter   = require('../modules/bookings/bookings.routes');
const discountsRouter  = require('../modules/discounts/discounts.routes');
const reportsRouter    = require('../modules/reports/reports.routes');

const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');

const router = Router();

// Public
router.use('/auth',      authRouter);

// Protected
router.use('/tables',    authenticate, tablesRouter);
router.use('/sessions',  sessionsRouter);   // auth handled inside module
router.use('/inventory', authenticate, inventoryRouter);
router.use('/orders',    authenticate, ordersRouter);
router.use('/billing',   authenticate, billingRouter);
router.use('/customers', customersRouter);  // auth handled inside module
router.use('/passes',    passesRouter);     // auth handled inside module
router.use('/bookings',   bookingsRouter);   // auth handled inside module
router.use('/discounts',  discountsRouter);  // auth handled inside module
router.use('/reports',    reportsRouter);    // auth handled inside module

// Health check (public)
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
