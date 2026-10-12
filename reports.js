// ============================================================================
// CAMPUS CANTEEN: ADVANCED SQL REPORTS & SQL LAB ROUTES
// Academic DBMS Showcase of Joins, Group By, Aggregates, Subqueries, & Views
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// 1. Daily Sales Report (Uses Aggregate Functions SUM, COUNT, AVG, GROUP BY)
router.get('/daily-sales', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT 
        DATE(o.order_time) AS report_date,
        COUNT(DISTINCT o.order_id) AS total_orders,
        SUM(CASE WHEN o.status != 'Cancelled' THEN o.total_amount ELSE 0 END) AS gross_sales,
        AVG(CASE WHEN o.status != 'Cancelled' THEN o.total_amount ELSE NULL END) AS average_order_value,
        COUNT(CASE WHEN o.status = 'Completed' THEN 1 END) AS completed_orders,
        COUNT(CASE WHEN o.status = 'Cancelled' THEN 1 END) AS cancelled_orders
      FROM ORDERS o
      GROUP BY DATE(o.order_time)
      ORDER BY report_date DESC
      LIMIT 14
    `);
    res.json({ success: true, report: 'Daily Sales & Order Velocity', data: rows });
  } catch (err) {
    next(err);
  }
});

// 2. Popular Menu Items (Uses Multi-table JOIN, SUM, GROUP BY, ORDER BY DESC)
router.get('/popular-items', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT 
        m.item_id,
        m.item_name,
        c.category_name,
        m.price,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity_ordered,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_revenue_generated
      FROM MENU_ITEM m
      JOIN CATEGORY c ON m.category_id = c.category_id
      LEFT JOIN ORDER_ITEM oi ON m.item_id = oi.item_id
      LEFT JOIN ORDERS o ON oi.order_id = o.order_id AND o.status != 'Cancelled'
      GROUP BY m.item_id, m.item_name, c.category_name, m.price
      ORDER BY total_quantity_ordered DESC, total_revenue_generated DESC
    `);
    res.json({ success: true, report: 'Item Popularity & Velocity', data: rows });
  } catch (err) {
    next(err);
  }
});

// 3. Category-Wise Sales (Uses GROUP BY with SUM and COUNT)
router.get('/category-sales', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT 
        c.category_id,
        c.category_name,
        COUNT(DISTINCT m.item_id) AS total_items_offered,
        COALESCE(SUM(oi.quantity), 0) AS units_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_category_sales
      FROM CATEGORY c
      LEFT JOIN MENU_ITEM m ON c.category_id = m.category_id
      LEFT JOIN ORDER_ITEM oi ON m.item_id = oi.item_id
      LEFT JOIN ORDERS o ON oi.order_id = o.order_id AND o.status != 'Cancelled'
      GROUP BY c.category_id, c.category_name
      ORDER BY total_category_sales DESC
    `);
    res.json({ success: true, report: 'Category Revenue Contribution', data: rows });
  } catch (err) {
    next(err);
  }
});

// 4. Pending Orders (Uses WHERE filter on ENUM and JOIN with Student)
router.get('/pending-orders', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT 
        o.order_id,
        o.order_time,
        o.status,
        o.total_amount,
        s.student_id,
        s.name AS student_name,
        s.phone AS student_phone,
        s.hostel_block,
        b.bill_status
      FROM ORDERS o
      JOIN STUDENT s ON o.student_id = s.student_id
      LEFT JOIN BILL b ON o.order_id = b.order_id
      WHERE o.status IN ('Pending', 'Preparing')
      ORDER BY o.order_time ASC
    `);
    res.json({ success: true, report: 'Queue of Pending & Preparing Orders', data: rows });
  } catch (err) {
    next(err);
  }
});

// 5. Ingredient Consumption (Uses SUM, JOIN with INGREDIENT and STOCK_USAGE)
router.get('/ingredient-consumption', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT 
        i.ingredient_id,
        i.ingredient_name,
        i.unit,
        i.stock_quantity AS current_stock,
        i.reorder_level,
        COALESCE(SUM(su.quantity_used), 0.000) AS total_quantity_used,
        COUNT(su.usage_id) AS total_deduction_events
      FROM INGREDIENT i
      LEFT JOIN STOCK_USAGE su ON i.ingredient_id = su.ingredient_id
      GROUP BY i.ingredient_id, i.ingredient_name, i.unit, i.stock_quantity, i.reorder_level
      ORDER BY total_quantity_used DESC
    `);
    res.json({ success: true, report: 'Raw Material Consumption Audit', data: rows });
  } catch (err) {
    next(err);
  }
});

// 6. Cancelled Orders Report
router.get('/cancelled-orders', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT 
        o.order_id,
        o.order_time,
        o.total_amount AS lost_revenue,
        s.name AS student_name,
        s.department,
        b.bill_status
      FROM ORDERS o
      JOIN STUDENT s ON o.student_id = s.student_id
      LEFT JOIN BILL b ON o.order_id = b.order_id
      WHERE o.status = 'Cancelled'
      ORDER BY o.order_time DESC
    `);
    res.json({ success: true, report: 'Cancelled Orders & Revenue Impact', data: rows });
  } catch (err) {
    next(err);
  }
});

// 7. Revenue & Payment Methods Summary (Aggregated by payment_method)
router.get('/revenue-summary', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT 
        p.payment_method,
        COUNT(p.payment_id) AS total_transactions,
        SUM(p.amount) AS total_collected,
        AVG(p.amount) AS average_ticket_size
      FROM PAYMENT p
      WHERE p.payment_status = 'Success'
      GROUP BY p.payment_method
      ORDER BY total_collected DESC
    `);
    res.json({ success: true, report: 'Settlement Breakdown by Payment Gateway/Method', data: rows });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// SQL LAB: Curated Read-Only Demonstrations with DBMS Concept Explanations
// ----------------------------------------------------------------------------
const SQL_LAB_PRESETS = [
  {
    id: 'query-1',
    title: '1. Inner Join with Category (2-Table Relational Join)',
    concept: 'INNER JOIN & Projection',
    description: 'Combines MENU_ITEM with CATEGORY using the foreign key category_id to produce a human-readable catalog without redundant category text.',
    sql: `SELECT m.item_id, m.item_name, c.category_name, m.price, m.availability
FROM MENU_ITEM m
INNER JOIN CATEGORY c ON m.category_id = c.category_id
ORDER BY c.category_name, m.price ASC;`
  },
  {
    id: 'query-2',
    title: '2. Multi-Table Join: Order to Student, Bill, and Payment',
    concept: '4-Table Relational Chain with LEFT JOIN',
    description: 'Traverses relations from ORDERS -> STUDENT, ORDERS -> BILL, and BILL -> PAYMENT to display a complete customer and financial audit trail.',
    sql: `SELECT 
    o.order_id, 
    s.name AS student_name, 
    s.department, 
    o.status AS order_status, 
    b.total_amount, 
    b.bill_status, 
    COALESCE(p.payment_method, 'Unpaid') AS payment_method
FROM ORDERS o
JOIN STUDENT s ON o.student_id = s.student_id
LEFT JOIN BILL b ON o.order_id = b.order_id
LEFT JOIN PAYMENT p ON b.bill_id = p.bill_id
ORDER BY o.order_id DESC;`
  },
  {
    id: 'query-3',
    title: '3. Group By with Aggregates & HAVING Clause',
    concept: 'GROUP BY, SUM, COUNT, HAVING (Post-aggregation filtering)',
    description: 'Groups order line items by menu category and applies a HAVING clause to show only categories that have achieved gross sales of ₹100 or more.',
    sql: `SELECT 
    c.category_name,
    COUNT(DISTINCT oi.order_id) AS orders_count,
    SUM(oi.quantity) AS total_items_sold,
    SUM(oi.quantity * oi.unit_price) AS category_gross_sales
FROM CATEGORY c
JOIN MENU_ITEM m ON c.category_id = m.category_id
JOIN ORDER_ITEM oi ON m.item_id = oi.item_id
GROUP BY c.category_id, c.category_name
HAVING category_gross_sales >= 100.00
ORDER BY category_gross_sales DESC;`
  },
  {
    id: 'query-4',
    title: '4. Subquery in WHERE: Items Priced Above Campus Average',
    concept: 'Non-Correlated Nested Subquery (SELECT AVG)',
    description: 'Calculates the overall average dish price dynamically using an inner query, then filters the outer query to return premium items priced higher than that average.',
    sql: `SELECT 
    item_id, 
    item_name, 
    price,
    ROUND((SELECT AVG(price) FROM MENU_ITEM), 2) AS campus_average_price,
    ROUND(price - (SELECT AVG(price) FROM MENU_ITEM), 2) AS price_difference
FROM MENU_ITEM
WHERE price > (SELECT AVG(price) FROM MENU_ITEM)
ORDER BY price DESC;`
  },
  {
    id: 'query-5',
    title: '5. Correlated Subquery: Frequent Diner Students',
    concept: 'Correlated Subquery (Row-by-Row evaluation)',
    description: 'Finds students whose individual order count evaluated by the inner subquery meets or exceeds 1 order, showing dynamic relational metrics.',
    sql: `SELECT 
    s.student_id, 
    s.name, 
    s.department, 
    s.hostel_block,
    (SELECT COUNT(*) FROM ORDERS o WHERE o.student_id = s.student_id) AS order_count,
    (SELECT COALESCE(SUM(total_amount), 0.00) FROM ORDERS o WHERE o.student_id = s.student_id) AS total_spent
FROM STUDENT s
WHERE (SELECT COUNT(*) FROM ORDERS o WHERE o.student_id = s.student_id) > 0
ORDER BY total_spent DESC;`
  },
  {
    id: 'query-6',
    title: '6. SQL View Demonstration: Low Stock Inventory Alerts',
    concept: 'Database VIEW (Virtual Table Abstraction)',
    description: 'Executes a query directly against the stored MySQL VIEW `v_low_stock_alerts` to retrieve raw materials whose inventory is below their safety reorder threshold.',
    sql: `SELECT * FROM v_low_stock_alerts ORDER BY stock_deficit DESC;`
  },
  {
    id: 'query-7',
    title: '7. SQL View Demonstration: Menu Catalog with Categories',
    concept: 'Database VIEW (Denormalized Presentation View)',
    description: 'Demonstrates reading directly from the compiled view `v_menu_catalog` with user-friendly availability status labeling.',
    sql: `SELECT item_name, category_name, price, availability_status 
FROM v_menu_catalog 
ORDER BY category_name, price ASC;`
  }
];

// GET /api/reports/sql-lab/presets - Return list of pre-configured queries
router.get('/sql-lab/presets', (req, res) => {
  res.json({
    success: true,
    presets: SQL_LAB_PRESETS.map(p => ({
      id: p.id,
      title: p.title,
      concept: p.concept,
      description: p.description,
      sql: p.sql
    }))
  });
});

// POST /api/reports/sql-lab/run - Execute a safe predefined query by ID
router.post('/sql-lab/run', async (req, res, next) => {
  try {
    const { queryId } = req.body;
    const preset = SQL_LAB_PRESETS.find(p => p.id === queryId);

    if (!preset) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query identifier. Please choose one of the predefined academic queries.'
      });
    }

    const startTime = Date.now();
    const rows = await query(preset.sql);
    const durationMs = Date.now() - startTime;

    res.json({
      success: true,
      queryId: preset.id,
      title: preset.title,
      concept: preset.concept,
      description: preset.description,
      sql: preset.sql,
      executionTimeMs: durationMs,
      rowCount: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
