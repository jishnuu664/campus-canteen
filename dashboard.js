// ============================================================================
// CAMPUS CANTEEN: DASHBOARD ANALYTICS ROUTES
// Computes live metrics from MySQL tables
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/dashboard/stats - Real-time system-wide KPIs
router.get('/stats', async (req, res, next) => {
  try {
    // Parallel SQL execution for optimal throughput
    const [
      studentsCount,
      menuCount,
      availableCount,
      ordersCount,
      pendingCount,
      revenueResult,
      lowStockCount
    ] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM STUDENT'),
      query('SELECT COUNT(*) AS count FROM MENU_ITEM'),
      query('SELECT COUNT(*) AS count FROM MENU_ITEM WHERE availability = 1'),
      query('SELECT COUNT(*) AS count FROM ORDERS'),
      query("SELECT COUNT(*) AS count FROM ORDERS WHERE status = 'Pending'"),
      query("SELECT COALESCE(SUM(amount), 0.00) AS totalRevenue FROM PAYMENT WHERE payment_status = 'Success'"),
      query('SELECT COUNT(*) AS count FROM INGREDIENT WHERE stock_quantity <= reorder_level')
    ]);

    // Recent 5 orders with student names
    const recentOrders = await query(`
      SELECT 
        o.order_id,
        o.order_time,
        o.status,
        o.total_amount,
        s.name AS student_name,
        s.department,
        b.bill_status
      FROM ORDERS o
      JOIN STUDENT s ON o.student_id = s.student_id
      LEFT JOIN BILL b ON o.order_id = b.order_id
      ORDER BY o.order_time DESC
      LIMIT 6
    `);

    // Top 5 popular dishes
    const popularItems = await query(`
      SELECT 
        m.item_id,
        m.item_name,
        c.category_name,
        m.price,
        COALESCE(SUM(oi.quantity), 0) AS total_ordered
      FROM MENU_ITEM m
      JOIN CATEGORY c ON m.category_id = c.category_id
      LEFT JOIN ORDER_ITEM oi ON m.item_id = oi.item_id
      LEFT JOIN ORDERS o ON oi.order_id = o.order_id AND o.status != 'Cancelled'
      GROUP BY m.item_id, m.item_name, c.category_name, m.price
      ORDER BY total_ordered DESC
      LIMIT 5
    `);

    // Category-wise sales
    const categorySales = await query(`
      SELECT 
        c.category_name,
        COUNT(DISTINCT m.item_id) AS total_items,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS category_revenue
      FROM CATEGORY c
      LEFT JOIN MENU_ITEM m ON c.category_id = m.category_id
      LEFT JOIN ORDER_ITEM oi ON m.item_id = oi.item_id
      LEFT JOIN ORDERS o ON oi.order_id = o.order_id AND o.status != 'Cancelled'
      GROUP BY c.category_id, c.category_name
      ORDER BY category_revenue DESC
    `);

    // Low stock alerts
    const lowStockItems = await query(`
      SELECT 
        ingredient_id,
        ingredient_name,
        unit,
        stock_quantity,
        reorder_level
      FROM INGREDIENT
      WHERE stock_quantity <= reorder_level
      ORDER BY (reorder_level - stock_quantity) DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      stats: {
        totalStudents: studentsCount[0].count,
        totalMenuItems: menuCount[0].count,
        availableMenuItems: availableCount[0].count,
        totalOrders: ordersCount[0].count,
        pendingOrders: pendingCount[0].count,
        totalRevenue: parseFloat(revenueResult[0].totalRevenue || 0),
        lowStockIngredients: lowStockCount[0].count
      },
      recentOrders,
      popularItems,
      categorySales,
      lowStockItems
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
