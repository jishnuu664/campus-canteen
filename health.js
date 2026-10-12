// ============================================================================
// CAMPUS CANTEEN: HEALTH & SYSTEM DIAGNOSTICS ROUTES
// Real-time ping test and table row count inspection
// ============================================================================

const express = require('express');
const router = express.Router();
const { testConnection, query, getRecentActivity } = require('../db');

// GET /api/health - Test MySQL connectivity
router.get('/', async (req, res, next) => {
  try {
    const status = await testConnection();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// GET /api/health/table-counts - Live row counts across all schema tables
router.get('/table-counts', async (req, res, next) => {
  try {
    const tableList = [
      'STUDENT',
      'CATEGORY',
      'MENU_ITEM',
      'ORDERS',
      'ORDER_ITEM',
      'BILL',
      'PAYMENT',
      'INGREDIENT',
      'RECIPE',
      'STOCK_USAGE'
    ];

    const counts = {};
    for (const table of tableList) {
      try {
        const rows = await query(`SELECT COUNT(*) AS total FROM \`${table}\``);
        counts[table] = rows[0]?.total || 0;
      } catch (e) {
        counts[table] = 0;
      }
    }

    res.json({
      success: true,
      database: 'campus_canteen',
      tableCounts: counts,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/health/activity - In-memory database activity log
router.get('/activity', (req, res) => {
  res.json({
    success: true,
    activity: getRecentActivity()
  });
});

module.exports = router;
