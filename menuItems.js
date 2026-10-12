// ============================================================================
// CAMPUS CANTEEN: MENU ITEM MANAGEMENT ROUTES
// Full CRUD with JOIN on CATEGORY, search, filter, and constraint handling
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/menu-items - List items with optional search & filter
router.get('/', async (req, res, next) => {
  try {
    const { q, category_id, availability } = req.query;

    let sql = `
      SELECT 
        m.item_id,
        m.item_name,
        m.description,
        m.price,
        m.availability,
        m.created_at,
        c.category_id,
        c.category_name
      FROM MENU_ITEM m
      JOIN CATEGORY c ON m.category_id = c.category_id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ' AND (m.item_name LIKE ? OR m.description LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    if (category_id) {
      sql += ' AND m.category_id = ?';
      params.push(category_id);
    }

    if (availability !== undefined && availability !== '') {
      sql += ' AND m.availability = ?';
      params.push(availability === 'true' || availability === '1' ? 1 : 0);
    }

    sql += ' ORDER BY m.item_id DESC';

    const items = await query(sql, params);
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
});

// GET /api/menu-items/:id - Get specific menu item
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const items = await query(`
      SELECT 
        m.item_id,
        m.item_name,
        m.description,
        m.price,
        m.availability,
        m.created_at,
        c.category_id,
        c.category_name
      FROM MENU_ITEM m
      JOIN CATEGORY c ON m.category_id = c.category_id
      WHERE m.item_id = ?
    `, [id]);

    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, data: items[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/menu-items - Insert menu item
router.post('/', async (req, res, next) => {
  try {
    const { item_name, category_id, description, price, availability } = req.body;

    if (!item_name || !item_name.trim()) {
      return res.status(400).json({ success: false, message: 'Item name is required' });
    }
    if (!category_id) {
      return res.status(400).json({ success: false, message: 'Category selection is required' });
    }
    if (price === undefined || isNaN(price) || parseFloat(price) < 0) {
      return res.status(400).json({ success: false, message: 'A valid non-negative price is required' });
    }

    const isAvailable = availability === undefined ? true : Boolean(availability);

    const result = await query(
      `INSERT INTO MENU_ITEM (item_name, category_id, description, price, availability) 
       VALUES (?, ?, ?, ?, ?)`,
      [item_name.trim(), category_id, description ? description.trim() : null, parseFloat(price), isAvailable ? 1 : 0]
    );

    // Fetch the inserted record with category name
    const [inserted] = await query(`
      SELECT m.*, c.category_name 
      FROM MENU_ITEM m
      JOIN CATEGORY c ON m.category_id = c.category_id
      WHERE m.item_id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: `Menu item '${item_name.trim()}' inserted successfully into MySQL.`,
      insertId: result.insertId,
      data: inserted
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/menu-items/:id - Update menu item
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { item_name, category_id, description, price, availability } = req.body;

    if (!item_name || !item_name.trim()) {
      return res.status(400).json({ success: false, message: 'Item name is required' });
    }
    if (!category_id) {
      return res.status(400).json({ success: false, message: 'Category selection is required' });
    }
    if (price === undefined || isNaN(price) || parseFloat(price) < 0) {
      return res.status(400).json({ success: false, message: 'A valid non-negative price is required' });
    }

    const isAvailable = Boolean(availability);

    const result = await query(
      `UPDATE MENU_ITEM 
       SET item_name = ?, category_id = ?, description = ?, price = ?, availability = ? 
       WHERE item_id = ?`,
      [item_name.trim(), category_id, description ? description.trim() : null, parseFloat(price), isAvailable ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found or no changes made' });
    }

    const [updated] = await query(`
      SELECT m.*, c.category_name 
      FROM MENU_ITEM m
      JOIN CATEGORY c ON m.category_id = c.category_id
      WHERE m.item_id = ?
    `, [id]);

    res.json({
      success: true,
      message: `Menu item #${id} updated successfully in MySQL.`,
      affectedRows: result.affectedRows,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/menu-items/:id - Delete menu item
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if item is referenced in any order items
    const [orderCheck] = await query(
      'SELECT COUNT(*) AS orderCount FROM ORDER_ITEM WHERE item_id = ?',
      [id]
    );

    if (orderCheck.orderCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Foreign Key Constraint Violation',
        message: `Cannot delete Menu Item #${id} because it is referenced in ${orderCheck.orderCount} historical order(s). Consider marking availability as 'Sold Out' instead of deleting.`,
        dbmsRule: 'RESTRICT ON DELETE (Referential Integrity Protected)'
      });
    }

    // Delete any recipe associations first (or foreign key CASCADE takes care of it)
    await query('DELETE FROM RECIPE WHERE item_id = ?', [id]);
    await query('DELETE FROM CART_ITEM WHERE item_id = ?', [id]);

    const result = await query('DELETE FROM MENU_ITEM WHERE item_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({
      success: true,
      message: `Menu item #${id} deleted successfully from MySQL.`,
      affectedRows: result.affectedRows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
