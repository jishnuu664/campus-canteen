// ============================================================================
// CAMPUS CANTEEN: STUDENT CART MANAGEMENT ROUTES
// Handles active cart sessions, item additions, and checkout to orders
// ============================================================================

const express = require('express');
const router = express.Router();
const { pool, query } = require('../db');

// Helper to get or create active cart for student
async function getOrCreateActiveCart(connection, studentId) {
  const [existing] = await connection.query(
    "SELECT * FROM CART WHERE student_id = ? AND status = 'Active' LIMIT 1",
    [studentId]
  );
  if (existing.length > 0) return existing[0];

  const [created] = await connection.query(
    "INSERT INTO CART (student_id, status) VALUES (?, 'Active')",
    [studentId]
  );
  return { cart_id: created.insertId, student_id: studentId, status: 'Active' };
}

// GET /api/cart/:studentId - Get active cart for a student
router.get('/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const [cart] = await query(
      "SELECT * FROM CART WHERE student_id = ? AND status = 'Active' LIMIT 1",
      [studentId]
    );

    if (!cart) {
      return res.json({
        success: true,
        data: {
          cart_id: null,
          student_id: parseInt(studentId, 10),
          items: [],
          total: 0.00
        }
      });
    }

    const items = await query(`
      SELECT 
        ci.cart_item_id,
        ci.cart_id,
        ci.item_id,
        m.item_name,
        c.category_name,
        ci.quantity,
        ci.unit_price,
        (ci.quantity * ci.unit_price) AS subtotal,
        m.availability
      FROM CART_ITEM ci
      JOIN MENU_ITEM m ON ci.item_id = m.item_id
      JOIN CATEGORY c ON m.category_id = c.category_id
      WHERE ci.cart_id = ?
    `, [cart.cart_id]);

    const total = items.reduce((sum, it) => sum + parseFloat(it.subtotal), 0);

    res.json({
      success: true,
      data: {
        cart_id: cart.cart_id,
        student_id: parseInt(studentId, 10),
        items,
        total: parseFloat(total.toFixed(2))
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cart/:studentId/items - Add or update item in active cart
router.post('/:studentId/items', async (req, res, next) => {
  const { studentId } = req.params;
  const { item_id, quantity } = req.body;

  const qty = parseInt(quantity || 1, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify item and availability
    const [menuRows] = await connection.query(
      'SELECT item_id, item_name, price, availability FROM MENU_ITEM WHERE item_id = ?',
      [item_id]
    );
    if (menuRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }
    const menuItem = menuRows[0];
    if (!menuItem.availability) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Item '${menuItem.item_name}' is currently unavailable.` });
    }

    const cart = await getOrCreateActiveCart(connection, studentId);

    // Upsert into CART_ITEM
    await connection.query(`
      INSERT INTO CART_ITEM (cart_id, item_id, quantity, unit_price)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        quantity = quantity + VALUES(quantity),
        unit_price = VALUES(unit_price)
    `, [cart.cart_id, item_id, qty, menuItem.price]);

    await connection.commit();

    res.json({
      success: true,
      message: `Added ${qty}x '${menuItem.item_name}' to cart.`,
      cart_id: cart.cart_id
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// DELETE /api/cart/:studentId/items/:itemId - Remove item from cart
router.delete('/:studentId/items/:itemId', async (req, res, next) => {
  try {
    const { studentId, itemId } = req.params;

    const [cart] = await query(
      "SELECT cart_id FROM CART WHERE student_id = ? AND status = 'Active' LIMIT 1",
      [studentId]
    );
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Active cart not found.' });
    }

    await query('DELETE FROM CART_ITEM WHERE cart_id = ? AND item_id = ?', [cart.cart_id, itemId]);

    res.json({ success: true, message: 'Item removed from cart.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/:studentId - Clear active cart
router.delete('/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const [cart] = await query(
      "SELECT cart_id FROM CART WHERE student_id = ? AND status = 'Active' LIMIT 1",
      [studentId]
    );
    if (cart) {
      await query('DELETE FROM CART_ITEM WHERE cart_id = ?', [cart.cart_id]);
      await query("UPDATE CART SET status = 'Abandoned' WHERE cart_id = ?", [cart.cart_id]);
    }

    res.json({ success: true, message: 'Cart cleared.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
