// ============================================================================
// CAMPUS CANTEEN: ORDER MANAGEMENT & TRANSACTION PIPELINE
// Uses MySQL Transactions (ACID properties) for atomic multi-table operations
// ============================================================================

const express = require('express');
const router = express.Router();
const { pool, query, logActivity } = require('../db');

// GET /api/orders - List all orders with student and bill details
router.get('/', async (req, res, next) => {
  try {
    const { status, student_id } = req.query;

    let sql = `
      SELECT 
        o.order_id,
        o.student_id,
        s.name AS student_name,
        s.email AS student_email,
        s.department,
        o.order_time,
        o.status,
        o.total_amount,
        b.bill_id,
        b.bill_status,
        p.payment_method,
        p.payment_status,
        (SELECT COUNT(*) FROM ORDER_ITEM oi WHERE oi.order_id = o.order_id) AS item_count
      FROM ORDERS o
      JOIN STUDENT s ON o.student_id = s.student_id
      LEFT JOIN BILL b ON o.order_id = b.order_id
      LEFT JOIN PAYMENT p ON b.bill_id = p.bill_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (student_id) {
      sql += ' AND o.student_id = ?';
      params.push(student_id);
    }

    sql += ' ORDER BY o.order_time DESC';

    const orders = await query(sql, params);
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id - Get complete order breakdown including line items
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [orderRow] = await query(`
      SELECT 
        o.order_id,
        o.student_id,
        s.name AS student_name,
        s.email AS student_email,
        s.phone AS student_phone,
        s.department,
        s.hostel_block,
        o.order_time,
        o.status,
        o.total_amount,
        b.bill_id,
        b.bill_status,
        b.created_at AS bill_created_at,
        p.payment_id,
        p.payment_method,
        p.payment_status,
        p.paid_at
      FROM ORDERS o
      JOIN STUDENT s ON o.student_id = s.student_id
      LEFT JOIN BILL b ON o.order_id = b.order_id
      LEFT JOIN PAYMENT p ON b.bill_id = p.bill_id
      WHERE o.order_id = ?
    `, [id]);

    if (!orderRow) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const items = await query(`
      SELECT 
        oi.order_item_id,
        oi.item_id,
        m.item_name,
        c.category_name,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price) AS subtotal
      FROM ORDER_ITEM oi
      JOIN MENU_ITEM m ON oi.item_id = m.item_id
      JOIN CATEGORY c ON m.category_id = c.category_id
      WHERE oi.order_id = ?
    `, [id]);

    res.json({
      success: true,
      data: {
        ...orderRow,
        items
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders - Transactional Order Creation
// Atomically performs:
// 1. Validations (Student exists, items available)
// 2. Insert into ORDERS
// 3. Insert line items into ORDER_ITEM
// 4. Update INGREDIENT stock according to RECIPE & log to STOCK_USAGE
// 5. Generate BILL in 'Unpaid' status
router.post('/', async (req, res, next) => {
  const { student_id, items } = req.body;

  if (!student_id) {
    return res.status(400).json({ success: false, message: 'Student ID is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one menu item is required in the order' });
  }

  // Acquire dedicated transaction connection from pool
  const connection = await pool.getConnection();
  const startTime = Date.now();

  try {
    await connection.beginTransaction();

    // Verify student exists
    const [students] = await connection.query('SELECT name FROM STUDENT WHERE student_id = ?', [student_id]);
    if (students.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Student not found in database' });
    }

    // Validate items, availability, calculate verified total from database prices
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: `Invalid quantity for item #${item.item_id}` });
      }

      const [menuRows] = await connection.query(
        'SELECT item_id, item_name, price, availability FROM MENU_ITEM WHERE item_id = ?',
        [item.item_id]
      );

      if (menuRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: `Menu item #${item.item_id} does not exist` });
      }

      const menuItem = menuRows[0];
      if (!menuItem.availability) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Item '${menuItem.item_name}' is currently marked as Sold Out and cannot be ordered.`
        });
      }

      const unitPrice = parseFloat(menuItem.price);
      calculatedTotal += unitPrice * qty;

      validatedItems.push({
        item_id: menuItem.item_id,
        item_name: menuItem.item_name,
        quantity: qty,
        unit_price: unitPrice
      });
    }

    // 1. Insert into ORDERS
    const [orderResult] = await connection.query(
      'INSERT INTO ORDERS (student_id, status, total_amount) VALUES (?, ?, ?)',
      [student_id, 'Pending', calculatedTotal]
    );
    const newOrderId = orderResult.insertId;

    // 2. Insert into ORDER_ITEM and decrement ingredient stock
    for (const vItem of validatedItems) {
      await connection.query(
        'INSERT INTO ORDER_ITEM (order_id, item_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [newOrderId, vItem.item_id, vItem.quantity, vItem.unit_price]
      );

      // Check recipe requirements
      const [recipes] = await connection.query(
        'SELECT ingredient_id, quantity_required FROM RECIPE WHERE item_id = ?',
        [vItem.item_id]
      );

      for (const rec of recipes) {
        const totalUsed = rec.quantity_required * vItem.quantity;

        // Deduct from INGREDIENT stock
        await connection.query(
          'UPDATE INGREDIENT SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE ingredient_id = ?',
          [totalUsed, rec.ingredient_id]
        );

        // Record STOCK_USAGE
        await connection.query(
          'INSERT INTO STOCK_USAGE (ingredient_id, order_id, quantity_used) VALUES (?, ?, ?)',
          [rec.ingredient_id, newOrderId, totalUsed]
        );
      }
    }

    // 3. Generate BILL record
    const [billResult] = await connection.query(
      'INSERT INTO BILL (order_id, total_amount, bill_status) VALUES (?, ?, ?)',
      [newOrderId, calculatedTotal, 'Unpaid']
    );
    const newBillId = billResult.insertId;

    // Commit ACID Transaction
    await connection.commit();

    const durationMs = Date.now() - startTime;
    logActivity({
      type: 'TRANSACTION',
      sql: `BEGIN; INSERT ORDERS (${newOrderId}); INSERT ORDER_ITEMS (${validatedItems.length}); INSERT BILL (${newBillId}); COMMIT;`,
      durationMs,
      status: 'SUCCESS',
      affectedRows: 1 + validatedItems.length + 1
    });

    res.status(201).json({
      success: true,
      message: `Order #${newOrderId} placed successfully with Bill #${newBillId}.`,
      orderId: newOrderId,
      billId: newBillId,
      totalAmount: calculatedTotal,
      studentName: students[0].name,
      itemsCount: validatedItems.length
    });
  } catch (error) {
    await connection.rollback();
    logActivity({
      type: 'ROLLBACK',
      sql: `ROLLBACK TRANSACTION for Student ${student_id}`,
      durationMs: Date.now() - startTime,
      status: 'FAILED',
      errorMessage: error.message
    });
    next(error);
  } finally {
    connection.release();
  }
});

// PATCH /api/orders/:id/status - Update order lifecycle status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const [currentOrder] = await query('SELECT * FROM ORDERS WHERE order_id = ?', [id]);
    if (!currentOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update status
    await query('UPDATE ORDERS SET status = ? WHERE order_id = ?', [status, id]);

    // If order was cancelled, also cancel any unpaid bill
    if (status === 'Cancelled') {
      await query("UPDATE BILL SET bill_status = 'Cancelled' WHERE order_id = ? AND bill_status = 'Unpaid'", [id]);
    }

    res.json({
      success: true,
      message: `Order #${id} status transitioned from '${currentOrder.status}' to '${status}'.`,
      newStatus: status
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
