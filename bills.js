// ============================================================================
// CAMPUS CANTEEN: BILLING & PAYMENT SETTLEMENT ROUTES
// Financial transaction recording and invoice settlement
// ============================================================================

const express = require('express');
const router = express.Router();
const { pool, query, logActivity } = require('../db');

// GET /api/bills - List bills
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT 
        b.bill_id,
        b.order_id,
        b.total_amount,
        b.bill_status,
        b.created_at,
        o.order_time,
        o.status AS order_status,
        s.student_id,
        s.name AS student_name,
        s.department,
        p.payment_id,
        p.payment_method,
        p.payment_status,
        p.paid_at
      FROM BILL b
      JOIN ORDERS o ON b.order_id = o.order_id
      JOIN STUDENT s ON o.student_id = s.student_id
      LEFT JOIN PAYMENT p ON b.bill_id = p.bill_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND b.bill_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.bill_id DESC';

    const bills = await query(sql, params);
    res.json({ success: true, count: bills.length, data: bills });
  } catch (err) {
    next(err);
  }
});

// GET /api/bills/:id - Bill details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [bill] = await query(`
      SELECT 
        b.bill_id,
        b.order_id,
        b.total_amount,
        b.bill_status,
        b.created_at,
        s.name AS student_name,
        s.email AS student_email,
        s.phone AS student_phone,
        s.department,
        o.status AS order_status
      FROM BILL b
      JOIN ORDERS o ON b.order_id = o.order_id
      JOIN STUDENT s ON o.student_id = s.student_id
      WHERE b.bill_id = ?
    `, [id]);

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const items = await query(`
      SELECT 
        oi.item_id,
        m.item_name,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price) AS subtotal
      FROM ORDER_ITEM oi
      JOIN MENU_ITEM m ON oi.item_id = m.item_id
      WHERE oi.order_id = ?
    `, [bill.order_id]);

    const payments = await query(`
      SELECT * FROM PAYMENT WHERE bill_id = ?
    `, [id]);

    res.json({
      success: true,
      data: {
        ...bill,
        items,
        payments
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bills/:id/pay - Settle Bill with Payment Transaction
router.post('/:id/pay', async (req, res, next) => {
  const { id } = req.params;
  const { payment_method, amount } = req.body;

  const validMethods = ['Cash', 'UPI', 'Campus Card', 'Net Banking'];
  if (!payment_method || !validMethods.includes(payment_method)) {
    return res.status(400).json({
      success: false,
      message: `Invalid payment method. Allowed: ${validMethods.join(', ')}`
    });
  }

  const connection = await pool.getConnection();
  const startTime = Date.now();

  try {
    await connection.beginTransaction();

    const [bills] = await connection.query(
      'SELECT * FROM BILL WHERE bill_id = ? FOR UPDATE',
      [id]
    );

    if (bills.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const bill = bills[0];
    if (bill.bill_status === 'Paid') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'This bill is already settled and marked as Paid.' });
    }
    if (bill.bill_status === 'Cancelled') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cannot accept payment for a cancelled bill.' });
    }

    const settleAmount = amount ? parseFloat(amount) : parseFloat(bill.total_amount);

    // 1. Insert PAYMENT record
    const [payResult] = await connection.query(
      `INSERT INTO PAYMENT (bill_id, amount, payment_method, payment_status) 
       VALUES (?, ?, ?, 'Success')`,
      [id, settleAmount, payment_method]
    );

    // 2. Update BILL status
    await connection.query(
      "UPDATE BILL SET bill_status = 'Paid' WHERE bill_id = ?",
      [id]
    );

    // 3. Progress ORDER status to 'Preparing' if it was 'Pending'
    await connection.query(
      "UPDATE ORDERS SET status = 'Preparing' WHERE order_id = ? AND status = 'Pending'",
      [bill.order_id]
    );

    await connection.commit();

    logActivity({
      type: 'PAYMENT',
      sql: `INSERT INTO PAYMENT (bill_id: ${id}, amount: ₹${settleAmount}, method: ${payment_method}); UPDATE BILL SET bill_status='Paid';`,
      durationMs: Date.now() - startTime,
      status: 'SUCCESS',
      affectedRows: 2
    });

    res.json({
      success: true,
      message: `Payment of ₹${settleAmount.toFixed(2)} recorded via ${payment_method}. Bill #${id} marked as Paid.`,
      paymentId: payResult.insertId,
      billId: parseInt(id, 10),
      orderId: bill.order_id,
      billStatus: 'Paid'
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

module.exports = router;
