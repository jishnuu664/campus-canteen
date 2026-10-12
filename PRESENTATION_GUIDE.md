# Campus Canteen System — Lecturer Viva & Presentation Script
> **Official Demonstration Guide for DBMS Project Evaluation**

This guide provides a professional presentation script, a step-by-step demonstration walkthrough, and answers to high-probability viva examination questions.

---

## 🎤 Part 1: Presentation Script (Opening Statement)

> *"Good morning, Professor. Today I am presenting our College DBMS Project: **Campus Canteen — Food Ordering & Billing Management System**.*
>
> *The primary objective of this project is to demonstrate real-time relational database operations between a modern web user interface and a live MySQL database engine.*
>
> *Rather than using client-side storage or mock arrays, every action in this system triggers an actual parameterized SQL query or transaction against MySQL. We have normalized our schema up to 3rd Normal Form across 13 relational tables, implemented strict foreign key constraints, created abstraction views, and ensured ACID transaction compliance for order settlements.*
>
> *Allow me to walk you through the system and verify the changes directly in MySQL."*

---

## 🎬 Part 2: Step-by-Step Live Viva Demonstration Workflow

Follow this sequence during your practical examination:

### Step 1: Prove Live MySQL Connectivity
1. Open the website at `http://localhost:3000`.
2. Point out the **top navigation bar**:
   - Show the green connection pill: `Connected to MySQL (<5ms)`.
   - Point out that this is tested via `SELECT VERSION(), DATABASE()` on startup and periodically polled.
3. Show the **Dashboard**:
   - Highlight the KPI cards: Total Students, Total Menu Items, Total Orders, Recorded Sales, and Low Stock Alerts.
   - Explain that each number is computed directly using SQL aggregate functions (`COUNT(*)`, `SUM(amount)`).

---

### Step 2: Live CRUD Operations (The Lecturer Demo Tab)
1. In the sidebar, click **"Live Database Demo"**.
2. Point out the **Real-Time MySQL Table Record Counts**:
   - Note the exact count for `MENU_ITEM` (e.g., `15`).
3. Click the green button: **"1. Insert 'Demo Masala Dosa'"**:
   - Watch the activity console: `INSERT INTO MENU_ITEM (item_name, category_id, price, availability) VALUES ('Demo Masala Dosa', 1, 65.00, 1)`.
   - Show that the `MENU_ITEM` count increases from `15` to `16`.
   - Show the new item appearing highlighted in the table with its newly assigned Auto-Increment Primary Key.
4. Click the blue button: **"2. Update Price (₹65 ➔ ₹75)"**:
   - Watch the console: `UPDATE MENU_ITEM SET price = 75.00 WHERE item_id = <ID>`.
   - Show the price updating live in the table to `₹75.00`.
5. Click the red button: **"3. Delete Demo Item"**:
   - Watch the console: `DELETE FROM MENU_ITEM WHERE item_id = <ID>`.
   - Show the row count drop back to `15`.
6. *(Optional verification in terminal)*: Run `SELECT * FROM MENU_ITEM WHERE item_name LIKE '%Demo%';` in MySQL CLI to show zero rows remaining!

---

### Step 3: Demonstrate Multi-Table ACID Transaction (Order Placement)
1. Navigate to **"Cart & POS Order"** in the sidebar.
2. Select a student diner (e.g., *Aarav Sharma*).
3. Click **"Add to Cart"** on *Paneer Butter Masala* (₹140) and *Cold Coffee* (₹65).
4. Click **"Confirm & Place Order (MySQL Transaction)"**:
   - Explain to the lecturer what happened in the database:
     ```sql
     START TRANSACTION;
     -- 1. Insert into ORDERS table -> generated new order_id
     -- 2. Insert line items into ORDER_ITEM table
     -- 3. Decrement raw materials in INGREDIENT according to RECIPE definition
     -- 4. Record consumption in STOCK_USAGE table
     -- 5. Generate corresponding invoice in BILL table with status 'Unpaid'
     COMMIT;
     ```
   - If any step had failed (e.g. invalid item ID or server crash), the entire operation rolls back, preventing orphaned orders or mismatched bills.

---

### Step 4: Settle Bill & Payment
1. Navigate to **"Billing & Payments"**.
2. Find the newly created bill in **Unpaid** status.
3. Click **"Record Payment"**, select **UPI**, and click **"Record Payment (Commit)"**.
4. Show that:
   - A new row is inserted into the `PAYMENT` table.
   - `BILL.bill_status` updates to `Paid`.
   - `ORDERS.status` automatically advances from `Pending` to `Preparing`.

---

### Step 5: Relational Integrity & Foreign Key Protection
1. Navigate to **"Category Management"**.
2. Attempt to delete the category **"Breakfast & South Indian"**.
3. Point out the error alert:
   > *"Cannot delete Category because it currently contains 3 menu items. DBMS Foreign Key Constraint (RESTRICT) protects relational integrity."*
4. Explain: *"The database schema specifies `ON DELETE RESTRICT`, preventing orphan records in `MENU_ITEM`."*

---

### Step 6: Reports & The Interactive "SQL Lab"
1. Navigate to **"Reports & SQL Lab"**.
2. Click **"SQL Lab & Viva Presets"**.
3. Choose a query to show the professor:
   - **Multi-Table Join (4 Tables)**: Traverses `ORDERS` ➔ `STUDENT` ➔ `BILL` ➔ `PAYMENT`.
   - **Subquery with AVG**: Dishes priced higher than the campus average price `WHERE price > (SELECT AVG(price) FROM MENU_ITEM)`.
   - **GROUP BY with HAVING**: Categories with revenue ≥ ₹100.
   - **SQL Views**: Directly querying stored view `v_low_stock_alerts`.
4. Click **"Run Query in MySQL"** to show real execution latency and live result tables!

---

## 🧠 Part 3: High-Yield DBMS Viva Q&A

### Q1: What Normal Form is your database in?
**Answer:**
> *"Our database is normalized up to **3rd Normal Form (3NF)**:*
> - * **1NF**: Every column contains atomic values, each record has a unique primary key, and there are no repeating groups.*
> - * **2NF**: It is in 1NF, and all non-key attributes are fully functionally dependent on the primary key (no partial dependencies on composite keys, as seen in `RECIPE(item_id, ingredient_id)`).*
> - * **3NF**: It is in 2NF, and there are no transitive dependencies (non-key columns do not depend on other non-key columns; for example, dish categories are in their own `CATEGORY` table rather than repeating category descriptions inside `MENU_ITEM`)."*

---

### Q2: How do you guarantee the ACID properties in this system?
**Answer:**
> *"We implement ACID properties primarily in the order placement and payment workflows:*
> - * **Atomicity**: We wrap multi-table operations (`ORDERS`, `ORDER_ITEM`, `BILL`, `STOCK_USAGE`) in a MySQL transaction using `connection.beginTransaction()`, `connection.commit()`, and `connection.rollback()` in the `catch` block. If any step fails, all intermediate changes are undone.*
> - * **Consistency**: MySQL schema constraints (`FOREIGN KEY`, `CHECK (price >= 0)`, `NOT NULL`, `UNIQUE`) ensure the database never enters an invalid state.*
> - * **Isolation**: Handled by MySQL InnoDB's default isolation level (REPEATABLE READ) with row-level locking.*
> - * **Durability**: InnoDB writes committed transactions to the write-ahead redo log (`ib_logfile`), ensuring persistence across system restarts."*

---

### Q3: What is the difference between `ON DELETE RESTRICT` and `ON DELETE CASCADE` in your design?
**Answer:**
> *"We intentionally chose between them based on business domain rules:*
> - * `RESTRICT` is applied on `MENU_ITEM.category_id` and `ORDERS.student_id`. A category or student cannot be deleted if active dishes or orders depend on them, preventing accidental loss of historical records.*
> - * `CASCADE` is applied on child line-items such as `CART_ITEM.cart_id`. If a shopping cart is deleted, all temporary items within that cart are deleted automatically."*

---

### Q4: Why did you create Database Views (`v_menu_catalog`, `v_low_stock_alerts`)?
**Answer:**
> *"Database Views provide three major benefits:*
> 1. * **Simplification & Reusability**: They encapsulate complex multi-table joins and calculations so our backend queries stay clean and DRY.*
> 2. * **Security**: They restrict direct access to underlying base tables while exposing only needed projected columns.*
> 3. * **Data Abstraction**: If the internal table structure evolves, the view interface can remain stable for consuming applications."*

---

### Q5: How do you prevent SQL Injection attacks?
**Answer:**
> *"All SQL statements in our Node.js backend use **parameterized queries** with placeholders (`?`) passed to `mysql2`. User inputs are sent separately through the MySQL binary protocol and never directly concatenated into raw SQL strings. This ensures inputs are treated strictly as data literals and cannot alter the query's abstract syntax tree."*

---

### Q6: Why did you choose MySQL and connection pooling?
**Answer:**
> *"MySQL with the **InnoDB storage engine** offers full ACID compliance, foreign key enforcement, row-level locking, and crash recovery.*
> *We utilize **Connection Pooling** (`mysql.createPool`) rather than opening a new TCP handshake for every HTTP request. The pool maintains 10 persistent worker connections, drastically reducing latency and preventing socket exhaustion under concurrent load."*
