// ============================================================================
// CAMPUS CANTEEN: STUDENT MANAGEMENT ROUTES
// Full CRUD with search, department filtering, and FK deletion protection
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/students - List students with search
router.get('/', async (req, res, next) => {
  try {
    const { q, department } = req.query;

    let sql = `
      SELECT 
        s.student_id,
        s.name,
        s.email,
        s.phone,
        s.department,
        s.hostel_block,
        s.created_at,
        COUNT(DISTINCT o.order_id) AS total_orders
      FROM STUDENT s
      LEFT JOIN ORDERS o ON s.student_id = o.student_id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ' AND (s.name LIKE ? OR s.email LIKE ? OR s.phone LIKE ? OR s.hostel_block LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (department) {
      sql += ' AND s.department = ?';
      params.push(department);
    }

    sql += ' GROUP BY s.student_id ORDER BY s.student_id ASC';

    const students = await query(sql, params);
    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    next(err);
  }
});

// GET /api/students/:id - Get student profile with recent orders
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const students = await query('SELECT * FROM STUDENT WHERE student_id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const orders = await query(`
      SELECT o.order_id, o.order_time, o.status, o.total_amount, b.bill_status
      FROM ORDERS o
      LEFT JOIN BILL b ON o.order_id = b.order_id
      WHERE o.student_id = ?
      ORDER BY o.order_time DESC
    `, [id]);

    res.json({ success: true, data: { ...students[0], orders } });
  } catch (err) {
    next(err);
  }
});

// POST /api/students - Register student
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, department, hostel_block } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!email || !email.trim()) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!phone || !phone.trim()) return res.status(400).json({ success: false, message: 'Phone is required' });
    if (!department || !department.trim()) return res.status(400).json({ success: false, message: 'Department is required' });
    if (!hostel_block || !hostel_block.trim()) return res.status(400).json({ success: false, message: 'Hostel block is required' });

    const result = await query(
      `INSERT INTO STUDENT (name, email, phone, department, hostel_block) 
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), email.trim(), phone.trim(), department.trim(), hostel_block.trim()]
    );

    const [created] = await query('SELECT * FROM STUDENT WHERE student_id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: `Student '${name.trim()}' registered successfully in MySQL.`,
      insertId: result.insertId,
      data: created
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, department, hostel_block } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!email || !email.trim()) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!phone || !phone.trim()) return res.status(400).json({ success: false, message: 'Phone is required' });
    if (!department || !department.trim()) return res.status(400).json({ success: false, message: 'Department is required' });
    if (!hostel_block || !hostel_block.trim()) return res.status(400).json({ success: false, message: 'Hostel block is required' });

    const result = await query(
      `UPDATE STUDENT 
       SET name = ?, email = ?, phone = ?, department = ?, hostel_block = ? 
       WHERE student_id = ?`,
      [name.trim(), email.trim(), phone.trim(), department.trim(), hostel_block.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Student not found or unchanged' });
    }

    const [updated] = await query('SELECT * FROM STUDENT WHERE student_id = ?', [id]);

    res.json({
      success: true,
      message: `Student #${id} updated successfully in MySQL.`,
      affectedRows: result.affectedRows,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if student has orders
    const [orderCheck] = await query(
      'SELECT COUNT(*) AS orderCount FROM ORDERS WHERE student_id = ?',
      [id]
    );

    if (orderCheck.orderCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Foreign Key Constraint Violation',
        message: `Cannot delete Student #${id} because they have ${orderCheck.orderCount} placed order(s) in the system. Orders maintain referential integrity.`,
        dbmsRule: 'RESTRICT ON DELETE (Referential Integrity Protected)'
      });
    }

    // Clean up any carts
    await query('DELETE FROM CART WHERE student_id = ?', [id]);

    const result = await query('DELETE FROM STUDENT WHERE student_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      message: `Student #${id} removed successfully from MySQL.`,
      affectedRows: result.affectedRows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
