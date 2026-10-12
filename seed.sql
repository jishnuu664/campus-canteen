-- ============================================================================
-- CAMPUS CANTEEN: FOOD ORDERING & BILLING MANAGEMENT SYSTEM
-- Demonstration Seed Data (DML)
-- Safe & Idempotent: Uses INSERT IGNORE to prevent duplicate key errors on rerun
-- ============================================================================

USE campus_canteen;

-- ----------------------------------------------------------------------------
-- 1. SEED CATEGORIES
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO CATEGORY (category_id, category_name, description) VALUES
(1, 'Breakfast & South Indian', 'Fresh morning South Indian specials, dosas, and idlis'),
(2, 'Main Course & Thali', 'Hearty lunch and dinner meals, curries, and biryanis'),
(3, 'Fast Food & Snacks', 'Quick bites, fried delicacies, wraps, and sandwiches'),
(4, 'Beverages & Shakes', 'Hot teas, filter coffees, chilled shakes, and juices'),
(5, 'Desserts & Sweets', 'Fresh traditional sweets, ice creams, and baked desserts');

-- ----------------------------------------------------------------------------
-- 2. SEED ADMIN USERS
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO ADMIN (admin_id, name, email, role) VALUES
(1, 'Rajesh Kumar', 'canteen.manager@campus.edu', 'CanteenManager'),
(2, 'Sunita Reddy', 'canteen.admin@campus.edu', 'SuperAdmin'),
(3, 'Vikram Singh', 'billing.desk@campus.edu', 'BillingClerk');

-- ----------------------------------------------------------------------------
-- 3. SEED STUDENTS
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO STUDENT (student_id, name, email, phone, department, hostel_block) VALUES
(1, 'Aarav Sharma', 'aarav.sharma@campus.edu', '9876543210', 'Computer Science & Eng', 'Block-A (Aryabhatta)'),
(2, 'Ananya Iyer', 'ananya.iyer@campus.edu', '9876543211', 'Electronics & Comm Eng', 'Block-C (Gargi)'),
(3, 'Rahul Verma', 'rahul.verma@campus.edu', '9876543212', 'Mechanical Engineering', 'Block-B (Bhaskara)'),
(4, 'Priya Patel', 'priya.patel@campus.edu', '9876543213', 'Information Technology', 'Block-C (Gargi)'),
(5, 'Rohan Das', 'rohan.das@campus.edu', '9876543214', 'Civil Engineering', 'Block-A (Aryabhatta)'),
(6, 'Sneha Nair', 'sneha.nair@campus.edu', '9876543215', 'Biotechnology', 'Block-D (Kalpana)'),
(7, 'Vikram Rao', 'vikram.rao@campus.edu', '9876543216', 'AI & Data Science', 'Block-B (Bhaskara)'),
(8, 'Tanya Gupta', 'tanya.gupta@campus.edu', '9876543217', 'Electrical & Electronics', 'Block-D (Kalpana)');

-- ----------------------------------------------------------------------------
-- 4. SEED MENU ITEMS
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO MENU_ITEM (item_id, category_id, item_name, description, price, availability) VALUES
(1, 1, 'Masala Dosa', 'Crispy golden crepe filled with spiced potato masala and served with coconut chutney & sambar', 60.00, TRUE),
(2, 1, 'Idli Vada Combo', '2 steamed rice cakes and 1 crispy medu vada served with piping hot sambar', 50.00, TRUE),
(3, 1, 'Puri Bhaji', '3 puffed wheat puris served with potato masala curry', 55.00, TRUE),
(4, 2, 'Paneer Butter Masala with Naan', 'Rich cottage cheese in tomato cashew gravy served with 2 freshly baked butter naans', 140.00, TRUE),
(5, 2, 'Veg Dum Biryani', 'Fragrant basmati rice layered with seasoned mixed vegetables and aromatic spices', 120.00, TRUE),
(6, 2, 'Chole Bhature', 'Spiced chickpea curry paired with 2 large fluffy bhaturas and pickled onions', 85.00, TRUE),
(7, 3, 'Crispy Samosa (2 pcs)', 'Flaky pastry stuffed with spiced potatoes and green peas, served with mint chutney', 30.00, TRUE),
(8, 3, 'Aloo Veg Grilled Sandwich', 'Toasted bread filled with spiced potatoes, cucumber, cheese, and mint chutney', 55.00, TRUE),
(9, 3, 'Veg Hakka Noodles', 'Wok-tossed noodles with crunchy bell peppers, cabbage, and soy garlic sauce', 90.00, TRUE),
(10, 3, 'Peri Peri French Fries', 'Crispy salted potato fries tossed with zesty peri-peri seasoning', 60.00, TRUE),
(11, 4, 'South Indian Filter Coffee', 'Traditional strong chicory brew frothed with fresh milk', 25.00, TRUE),
(12, 4, 'Chilled Cold Coffee with Ice Cream', 'Creamy blended iced coffee topped with a scoop of vanilla ice cream', 65.00, TRUE),
(13, 4, 'Fresh Lime Soda (Sweet & Salt)', 'Refreshing carbonated lime drink seasoned with cumin and black salt', 35.00, TRUE),
(14, 5, 'Hot Gulab Jamun (2 pcs)', 'Warm milk-solid dumplings soaked in cardamom and rose saffron syrup', 40.00, TRUE),
(15, 5, 'Chocolate Lava Brownie', 'Warm gooey dark chocolate brownie served with chocolate drizzle', 70.00, TRUE);

-- ----------------------------------------------------------------------------
-- 5. SEED INGREDIENTS
-- Note: Paneer and Milk are intentionally seeded below reorder level to demonstrate low-stock alerts
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO INGREDIENT (ingredient_id, ingredient_name, unit, stock_quantity, reorder_level) VALUES
(1, 'Dosa Batter', 'kg', 18.50, 5.00),
(2, 'Potatoes', 'kg', 45.00, 15.00),
(3, 'Cooking Oil', 'liters', 22.00, 8.00),
(4, 'Basmati Rice', 'kg', 35.00, 10.00),
(5, 'Paneer (Cottage Cheese)', 'kg', 4.50, 10.00),  -- LOW STOCK ALERT!
(6, 'Fresh Milk', 'liters', 5.00, 12.00),            -- CRITICAL/LOW STOCK ALERT!
(7, 'Coffee Powder', 'kg', 4.00, 1.50),
(8, 'Bread Loaves', 'packets', 16.00, 5.00),
(9, 'Fresh Vegetables', 'kg', 28.00, 8.00),
(10, 'Sugar', 'kg', 32.00, 10.00),
(11, 'Butter', 'kg', 7.50, 3.00),
(12, 'Spices & Garam Masala', 'kg', 11.00, 3.50);

-- ----------------------------------------------------------------------------
-- 6. SEED RECIPES (Mapping Dishes to Raw Material Consumption)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO RECIPE (item_id, ingredient_id, quantity_required) VALUES
-- Masala Dosa (item_id: 1)
(1, 1, 0.150),  -- 150g Dosa Batter
(1, 2, 0.100),  -- 100g Potatoes
(1, 3, 0.020),  -- 20ml Oil
-- Filter Coffee (item_id: 11)
(11, 6, 0.150), -- 150ml Milk
(11, 7, 0.015), -- 15g Coffee Powder
(11, 10, 0.020),-- 20g Sugar
-- Cold Coffee (item_id: 12)
(12, 6, 0.250), -- 250ml Milk
(12, 7, 0.020), -- 20g Coffee Powder
(12, 10, 0.030),-- 30g Sugar
-- Paneer Butter Masala (item_id: 4)
(4, 5, 0.200),  -- 200g Paneer
(4, 11, 0.040), -- 40g Butter
(4, 12, 0.030), -- 30g Spices
-- Crispy Samosa (item_id: 7)
(7, 2, 0.120),  -- 120g Potatoes
(7, 3, 0.040),  -- 40ml Oil
(7, 12, 0.015), -- 15g Spices
-- Veg Dum Biryani (item_id: 5)
(5, 4, 0.200),  -- 200g Basmati Rice
(5, 9, 0.150),  -- 150g Veggies
(5, 3, 0.030),  -- 30ml Oil
(5, 12, 0.025), -- 25g Spices
-- Aloo Grilled Sandwich (item_id: 8)
(8, 8, 0.100),  -- 0.1 pack bread
(8, 2, 0.080),  -- 80g Potatoes
(8, 11, 0.020); -- 20g Butter

-- ----------------------------------------------------------------------------
-- 7. SEED HISTORICAL ORDERS
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO ORDERS (order_id, student_id, order_time, status, total_amount) VALUES
(1, 1, DATE_SUB(NOW(), INTERVAL 3 HOUR), 'Completed', 145.00),
(2, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR), 'Completed', 85.00),
(3, 3, DATE_SUB(NOW(), INTERVAL 90 MINUTE), 'Ready', 205.00),
(4, 4, DATE_SUB(NOW(), INTERVAL 45 MINUTE), 'Preparing', 95.00),
(5, 5, DATE_SUB(NOW(), INTERVAL 15 MINUTE), 'Pending', 120.00);

-- ----------------------------------------------------------------------------
-- 8. SEED ORDER ITEMS
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO ORDER_ITEM (order_item_id, order_id, item_id, quantity, unit_price) VALUES
-- Order 1 (Total: 60 + 60 + 25 = 145)
(1, 1, 1, 1, 60.00),   -- 1 Masala Dosa
(2, 1, 10, 1, 60.00),  -- 1 French Fries
(3, 1, 11, 1, 25.00),  -- 1 Filter Coffee
-- Order 2 (Total: 60 + 25 = 85)
(4, 2, 1, 1, 60.00),   -- 1 Masala Dosa
(5, 2, 11, 1, 25.00),  -- 1 Filter Coffee
-- Order 3 (Total: 140 + 65 = 205)
(6, 3, 4, 1, 140.00),  -- 1 Paneer Butter Masala
(7, 3, 12, 1, 65.00),  -- 1 Cold Coffee
-- Order 4 (Total: 30 + 65 = 95)
(8, 4, 7, 1, 30.00),   -- 1 Crispy Samosa
(9, 4, 12, 1, 65.00),  -- 1 Cold Coffee
-- Order 5 (Total: 120 = 120)
(10, 5, 5, 1, 120.00); -- 1 Veg Dum Biryani

-- ----------------------------------------------------------------------------
-- 9. SEED BILLS
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO BILL (bill_id, order_id, total_amount, bill_status, created_at) VALUES
(1, 1, 145.00, 'Paid', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 2, 85.00, 'Paid', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(3, 3, 205.00, 'Paid', DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
(4, 4, 95.00, 'Paid', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(5, 5, 120.00, 'Unpaid', DATE_SUB(NOW(), INTERVAL 15 MINUTE));

-- ----------------------------------------------------------------------------
-- 10. SEED PAYMENTS
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO PAYMENT (payment_id, bill_id, amount, payment_method, payment_status, paid_at) VALUES
(1, 1, 145.00, 'UPI', 'Success', DATE_SUB(NOW(), INTERVAL 175 MINUTE)),
(2, 2, 85.00, 'Cash', 'Success', DATE_SUB(NOW(), INTERVAL 115 MINUTE)),
(3, 3, 205.00, 'Campus Card', 'Success', DATE_SUB(NOW(), INTERVAL 85 MINUTE)),
(4, 4, 95.00, 'UPI', 'Success', DATE_SUB(NOW(), INTERVAL 40 MINUTE));

-- ----------------------------------------------------------------------------
-- 11. SEED STOCK USAGE
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO STOCK_USAGE (usage_id, ingredient_id, order_id, quantity_used, usage_date) VALUES
(1, 1, 1, 0.150, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 2, 1, 0.100, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(3, 6, 1, 0.150, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(4, 1, 2, 0.150, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(5, 5, 3, 0.200, DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
(6, 6, 3, 0.250, DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
(7, 2, 4, 0.120, DATE_SUB(NOW(), INTERVAL 45 MINUTE));
