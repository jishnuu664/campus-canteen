-- ============================================================================
-- CAMPUS CANTEEN: FOOD ORDERING & BILLING MANAGEMENT SYSTEM
-- Relational Database Schema Definition (DDL)
-- Engine: InnoDB | Character Set: utf8mb4 | Collating: utf8mb4_unicode_ci
-- Normalized up to 3rd Normal Form (3NF)
-- ============================================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS campus_canteen
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE campus_canteen;

-- Disable foreign key checks during drop operations to prevent dependency issues
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS STOCK_USAGE;
DROP TABLE IF EXISTS RECIPE;
DROP TABLE IF EXISTS INGREDIENT;
DROP TABLE IF EXISTS PAYMENT;
DROP TABLE IF EXISTS BILL;
DROP TABLE IF EXISTS ORDER_ITEM;
DROP TABLE IF EXISTS ORDERS;
DROP TABLE IF EXISTS CART_ITEM;
DROP TABLE IF EXISTS CART;
DROP TABLE IF EXISTS MENU_ITEM;
DROP TABLE IF EXISTS CATEGORY;
DROP TABLE IF EXISTS ADMIN;
DROP TABLE IF EXISTS STUDENT;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. STUDENT TABLE
-- Stores enrolled student profiles for authentication and order attribution
-- ----------------------------------------------------------------------------
CREATE TABLE STUDENT (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    department VARCHAR(80) NOT NULL,
    hostel_block VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_email (email),
    INDEX idx_student_dept (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. ADMIN TABLE
-- System administrators, canteen managers, and billing desk staff
-- ----------------------------------------------------------------------------
CREATE TABLE ADMIN (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role ENUM('SuperAdmin', 'CanteenManager', 'BillingClerk', 'Chef') DEFAULT 'CanteenManager',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. CATEGORY TABLE
-- Food categories (Breakfast, Beverages, Lunch, Snacks, Desserts)
-- ----------------------------------------------------------------------------
CREATE TABLE CATEGORY (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(60) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category_name (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. MENU_ITEM TABLE
-- Dishes and food products available for ordering
-- Foreign Key: category_id -> CATEGORY(category_id) RESTRICT ON DELETE
-- ----------------------------------------------------------------------------
CREATE TABLE MENU_ITEM (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    item_name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    price DECIMAL(10, 2) NOT NULL,
    availability BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_category 
        FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_menu_price 
        CHECK (price >= 0.00),
    INDEX idx_menu_category (category_id),
    INDEX idx_menu_avail (availability)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. CART TABLE
-- Active ordering sessions per student (one active cart at a time)
-- ----------------------------------------------------------------------------
CREATE TABLE CART (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Active', 'CheckedOut', 'Abandoned') DEFAULT 'Active',
    CONSTRAINT fk_cart_student 
        FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_cart_student (student_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. CART_ITEM TABLE
-- Individual items placed into a student cart
-- ----------------------------------------------------------------------------
CREATE TABLE CART_ITEM (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_cartitem_cart 
        FOREIGN KEY (cart_id) REFERENCES CART(cart_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cartitem_menu 
        FOREIGN KEY (item_id) REFERENCES MENU_ITEM(item_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_cart_quantity 
        CHECK (quantity > 0),
    CONSTRAINT chk_cart_unit_price 
        CHECK (unit_price >= 0.00),
    UNIQUE KEY uq_cart_item (cart_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. ORDERS TABLE
-- Placed canteen orders
-- Status state machine: Pending -> Preparing -> Ready -> Completed (or Cancelled)
-- ----------------------------------------------------------------------------
CREATE TABLE ORDERS (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_order_student 
        FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_order_total 
        CHECK (total_amount >= 0.00),
    INDEX idx_order_student (student_id),
    INDEX idx_order_status (status),
    INDEX idx_order_time (order_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. ORDER_ITEM TABLE
-- Line items associated with a confirmed order
-- ----------------------------------------------------------------------------
CREATE TABLE ORDER_ITEM (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_orderitem_order 
        FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_orderitem_menu 
        FOREIGN KEY (item_id) REFERENCES MENU_ITEM(item_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_orderitem_qty 
        CHECK (quantity > 0),
    CONSTRAINT chk_orderitem_price 
        CHECK (unit_price >= 0.00),
    INDEX idx_orderitem_order (order_id),
    INDEX idx_orderitem_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. BILL TABLE
-- Invoice record generated for each confirmed order (1-to-1 with ORDERS)
-- ----------------------------------------------------------------------------
CREATE TABLE BILL (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    total_amount DECIMAL(10, 2) NOT NULL,
    bill_status ENUM('Unpaid', 'Paid', 'Refunded', 'Cancelled') DEFAULT 'Unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bill_order 
        FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_bill_amount 
        CHECK (total_amount >= 0.00),
    INDEX idx_bill_status (bill_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. PAYMENT TABLE
-- Financial settlement record for an issued bill
-- ----------------------------------------------------------------------------
CREATE TABLE PAYMENT (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('Cash', 'UPI', 'Campus Card', 'Net Banking') NOT NULL,
    payment_status ENUM('Success', 'Pending', 'Failed', 'Refunded') DEFAULT 'Success',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_bill 
        FOREIGN KEY (bill_id) REFERENCES BILL(bill_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_payment_amount 
        CHECK (amount >= 0.00),
    INDEX idx_payment_bill (bill_id),
    INDEX idx_payment_method (payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. INGREDIENT TABLE
-- Raw materials tracked for stock control and inventory management
-- ----------------------------------------------------------------------------
CREATE TABLE INGREDIENT (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20) NOT NULL,
    stock_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    reorder_level DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    CONSTRAINT chk_stock_qty 
        CHECK (stock_quantity >= 0.00),
    CONSTRAINT chk_reorder_level 
        CHECK (reorder_level >= 0.00),
    INDEX idx_ingr_name (ingredient_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. RECIPE TABLE
-- Many-to-Many associative relationship between MENU_ITEM and INGREDIENT
-- ----------------------------------------------------------------------------
CREATE TABLE RECIPE (
    item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_required DECIMAL(10, 3) NOT NULL,
    PRIMARY KEY (item_id, ingredient_id),
    CONSTRAINT fk_recipe_item 
        FOREIGN KEY (item_id) REFERENCES MENU_ITEM(item_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_recipe_ingredient 
        FOREIGN KEY (ingredient_id) REFERENCES INGREDIENT(ingredient_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_recipe_qty 
        CHECK (quantity_required > 0.000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. STOCK_USAGE TABLE
-- Logs ingredient deductions linked to placed orders or batch prep
-- ----------------------------------------------------------------------------
CREATE TABLE STOCK_USAGE (
    usage_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    order_id INT NULL,
    quantity_used DECIMAL(10, 3) NOT NULL,
    usage_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usage_ingredient 
        FOREIGN KEY (ingredient_id) REFERENCES INGREDIENT(ingredient_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_usage_order 
        FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_usage_qty 
        CHECK (quantity_used > 0.000),
    INDEX idx_usage_ingr (ingredient_id),
    INDEX idx_usage_order (order_id),
    INDEX idx_usage_date (usage_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
