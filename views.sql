-- ============================================================================
-- CAMPUS CANTEEN: FOOD ORDERING & BILLING MANAGEMENT SYSTEM
-- Relational Database Views (Abstraction & Reporting Layer)
-- ============================================================================

USE campus_canteen;

-- ----------------------------------------------------------------------------
-- View 1: v_menu_catalog
-- Enriched Menu View joining MENU_ITEM with CATEGORY
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_menu_catalog AS
SELECT 
    m.item_id,
    m.item_name,
    m.description AS item_description,
    m.price,
    m.availability,
    c.category_id,
    c.category_name,
    c.description AS category_description,
    CASE 
        WHEN m.availability = 1 THEN 'Available'
        ELSE 'Sold Out'
    END AS availability_status,
    m.created_at
FROM MENU_ITEM m
JOIN CATEGORY c ON m.category_id = c.category_id;

-- ----------------------------------------------------------------------------
-- View 2: v_order_billing_details
-- Comprehensive view combining Orders, Students, Bills, and Payments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_order_billing_details AS
SELECT 
    o.order_id,
    o.order_time,
    o.status AS order_status,
    o.total_amount,
    s.student_id,
    s.name AS student_name,
    s.email AS student_email,
    s.department,
    s.hostel_block,
    b.bill_id,
    b.bill_status,
    p.payment_id,
    p.payment_method,
    p.payment_status,
    p.paid_at,
    (SELECT COUNT(*) FROM ORDER_ITEM oi WHERE oi.order_id = o.order_id) AS total_items_count
FROM ORDERS o
JOIN STUDENT s ON o.student_id = s.student_id
LEFT JOIN BILL b ON o.order_id = b.order_id
LEFT JOIN PAYMENT p ON b.bill_id = p.bill_id;

-- ----------------------------------------------------------------------------
-- View 3: v_daily_sales_summary
-- Aggregated daily sales and average ticket metrics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_daily_sales_summary AS
SELECT 
    DATE(o.order_time) AS sale_date,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(CASE WHEN o.status != 'Cancelled' THEN o.total_amount ELSE 0 END) AS total_revenue,
    AVG(CASE WHEN o.status != 'Cancelled' THEN o.total_amount ELSE NULL END) AS average_order_value,
    COUNT(CASE WHEN o.status = 'Completed' THEN 1 END) AS completed_orders,
    COUNT(CASE WHEN o.status = 'Cancelled' THEN 1 END) AS cancelled_orders
FROM ORDERS o
GROUP BY DATE(o.order_time);

-- ----------------------------------------------------------------------------
-- View 4: v_low_stock_alerts
-- Highlights raw materials running below their defined threshold
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_low_stock_alerts AS
SELECT 
    i.ingredient_id,
    i.ingredient_name,
    i.unit,
    i.stock_quantity,
    i.reorder_level,
    (i.reorder_level - i.stock_quantity) AS stock_deficit,
    CASE 
        WHEN i.stock_quantity = 0 THEN 'CRITICAL (OUT OF STOCK)'
        WHEN i.stock_quantity <= (i.reorder_level * 0.5) THEN 'HIGH ALERT'
        ELSE 'LOW STOCK'
    END AS alert_severity
FROM INGREDIENT i
WHERE i.stock_quantity <= i.reorder_level;

-- ----------------------------------------------------------------------------
-- View 5: v_popular_items
-- Ranks items by order volume and total revenue generated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_popular_items AS
SELECT 
    m.item_id,
    m.item_name,
    c.category_name,
    m.price,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_sales_volume
FROM MENU_ITEM m
JOIN CATEGORY c ON m.category_id = c.category_id
LEFT JOIN ORDER_ITEM oi ON m.item_id = oi.item_id
LEFT JOIN ORDERS o ON oi.order_id = o.order_id AND o.status != 'Cancelled'
GROUP BY m.item_id, m.item_name, c.category_name, m.price
ORDER BY total_units_sold DESC;
