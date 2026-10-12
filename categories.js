// ============================================================================
// CAMPUS CANTEEN: CATEGORY MANAGEMENT ROUTES
// Full CRUD with Foreign Key Referential Integrity Guard
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/categories - List all categories with count of items
router.get('/', async (req, res, next) => {
  try {
    const categories = await query(`
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        c.created_at,
        COUNT(m.item_id) AS item_count
      FROM CATEGORY c
      LEFT JOIN MENU_ITEM m ON c.category_id = m.category_id
      GROUP BY c.category_id, c.category_name, c.description, c.created_at
      ORDER BY c.category_id ASC
    `);
    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id - Get specific category
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await query('SELECT * FROM CATEGORY WHERE category_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories - Create category
router.post('/', async (req, res, next) => {
  try {
    const { category_name, description } = req.body;
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const result = await query(
      'INSERT INTO CATEGORY (category_name, description) VALUES (?, ?)',
      [category_name.trim(), description ? description.trim() : null]
    );

    res.status(201).json({
      success: true,
      message: `Category '${category_name.trim()}' created successfully in MySQL.`,
      insertId: result.insertId,
      data: {
        category_id: result.insertId,
        category_name: category_name.trim(),
        description: description ? description.trim() : null
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_name, description } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const result = await query(
      'UPDATE CATEGORY SET category_name = ?, description = ? WHERE category_id = ?',
      [category_name.trim(), description ? description.trim() : null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found or no changes made' });
    }

    res.json({
      success: true,
      message: `Category #${id} updated successfully in MySQL.`,
      affectedRows: result.affectedRows
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id - Delete category with dependency check
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if category is used by any menu items
    const [countRow] = await query(
      'SELECT COUNT(*) AS itemCount FROM MENU_ITEM WHERE category_id = ?',
      [id]
    );

    if (countRow.itemCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Foreign Key Constraint Violation',
        message: `Cannot delete Category #${id} because it currently contains ${countRow.itemCount} menu item(s). Reassign or delete those items first.`,
        dbmsRule: 'RESTRICT ON DELETE (Referential Integrity Protected)'
      });
    }

    const result = await query('DELETE FROM CATEGORY WHERE category_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      message: `Category #${id} deleted successfully from MySQL.`,
      affectedRows: result.affectedRows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
