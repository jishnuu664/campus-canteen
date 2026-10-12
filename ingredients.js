// ============================================================================
// CAMPUS CANTEEN: INGREDIENT & INVENTORY MANAGEMENT ROUTES
// Full CRUD with stock monitoring and recipe/usage dependency safeguards
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/ingredients - List all ingredients
router.get('/', async (req, res, next) => {
  try {
    const ingredients = await query(`
      SELECT 
        i.ingredient_id,
        i.ingredient_name,
        i.unit,
        i.stock_quantity,
        i.reorder_level,
        (i.stock_quantity <= i.reorder_level) AS is_low_stock,
        COUNT(DISTINCT r.item_id) AS linked_recipes_count
      FROM INGREDIENT i
      LEFT JOIN RECIPE r ON i.ingredient_id = r.ingredient_id
      GROUP BY i.ingredient_id
      ORDER BY is_low_stock DESC, i.ingredient_name ASC
    `);

    res.json({ success: true, count: ingredients.length, data: ingredients });
  } catch (err) {
    next(err);
  }
});

// GET /api/ingredients/low-stock - List only low stock items
router.get('/low-stock', async (req, res, next) => {
  try {
    const lowStock = await query(`
      SELECT * FROM v_low_stock_alerts
    `);
    res.json({ success: true, count: lowStock.length, data: lowStock });
  } catch (err) {
    next(err);
  }
});

// GET /api/ingredients/:id - Single ingredient
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const items = await query('SELECT * FROM INGREDIENT WHERE ingredient_id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }
    res.json({ success: true, data: items[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/ingredients - Create ingredient
router.post('/', async (req, res, next) => {
  try {
    const { ingredient_name, unit, stock_quantity, reorder_level } = req.body;

    if (!ingredient_name || !ingredient_name.trim()) {
      return res.status(400).json({ success: false, message: 'Ingredient name is required' });
    }
    if (!unit || !unit.trim()) {
      return res.status(400).json({ success: false, message: 'Measurement unit is required' });
    }
    if (stock_quantity === undefined || isNaN(stock_quantity) || parseFloat(stock_quantity) < 0) {
      return res.status(400).json({ success: false, message: 'Valid stock quantity is required (>= 0)' });
    }
    if (reorder_level === undefined || isNaN(reorder_level) || parseFloat(reorder_level) < 0) {
      return res.status(400).json({ success: false, message: 'Valid reorder level is required (>= 0)' });
    }

    const result = await query(
      `INSERT INTO INGREDIENT (ingredient_name, unit, stock_quantity, reorder_level) 
       VALUES (?, ?, ?, ?)`,
      [ingredient_name.trim(), unit.trim(), parseFloat(stock_quantity), parseFloat(reorder_level)]
    );

    const [created] = await query('SELECT * FROM INGREDIENT WHERE ingredient_id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: `Ingredient '${ingredient_name.trim()}' added successfully to MySQL.`,
      insertId: result.insertId,
      data: created
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/ingredients/:id - Update ingredient
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ingredient_name, unit, stock_quantity, reorder_level } = req.body;

    if (!ingredient_name || !ingredient_name.trim()) {
      return res.status(400).json({ success: false, message: 'Ingredient name is required' });
    }
    if (!unit || !unit.trim()) {
      return res.status(400).json({ success: false, message: 'Measurement unit is required' });
    }
    if (stock_quantity === undefined || isNaN(stock_quantity) || parseFloat(stock_quantity) < 0) {
      return res.status(400).json({ success: false, message: 'Valid stock quantity is required (>= 0)' });
    }
    if (reorder_level === undefined || isNaN(reorder_level) || parseFloat(reorder_level) < 0) {
      return res.status(400).json({ success: false, message: 'Valid reorder level is required (>= 0)' });
    }

    const result = await query(
      `UPDATE INGREDIENT 
       SET ingredient_name = ?, unit = ?, stock_quantity = ?, reorder_level = ? 
       WHERE ingredient_id = ?`,
      [ingredient_name.trim(), unit.trim(), parseFloat(stock_quantity), parseFloat(reorder_level), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ingredient not found or unchanged' });
    }

    const [updated] = await query('SELECT * FROM INGREDIENT WHERE ingredient_id = ?', [id]);

    res.json({
      success: true,
      message: `Ingredient #${id} updated successfully in MySQL.`,
      affectedRows: result.affectedRows,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/ingredients/:id - Delete ingredient with safety checks
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check recipe usage
    const [recipeCheck] = await query(
      'SELECT COUNT(*) AS count FROM RECIPE WHERE ingredient_id = ?',
      [id]
    );
    if (recipeCheck.count > 0) {
      return res.status(409).json({
        success: false,
        error: 'Foreign Key Constraint Violation',
        message: `Cannot delete Ingredient #${id} because it is referenced in ${recipeCheck.count} recipe(s). Remove it from all recipes first.`,
        dbmsRule: 'RESTRICT ON DELETE (Referential Integrity Protected)'
      });
    }

    // Check stock usage logs
    const [usageCheck] = await query(
      'SELECT COUNT(*) AS count FROM STOCK_USAGE WHERE ingredient_id = ?',
      [id]
    );
    if (usageCheck.count > 0) {
      return res.status(409).json({
        success: false,
        error: 'Foreign Key Constraint Violation',
        message: `Cannot delete Ingredient #${id} because it has historical stock usage audit records.`,
        dbmsRule: 'RESTRICT ON DELETE (Referential Integrity Protected)'
      });
    }

    const result = await query('DELETE FROM INGREDIENT WHERE ingredient_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }

    res.json({
      success: true,
      message: `Ingredient #${id} deleted successfully from MySQL.`,
      affectedRows: result.affectedRows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
