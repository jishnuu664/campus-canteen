# Campus Canteen — Food Ordering & Billing Management System
> **College DBMS Project Showcase | Real-Time MySQL Relational Database Integration**

![Tech Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20MySQL%20%7C%20HTML5%2FVanilla%20JS-06b6d4)
![Database](https://img.shields.io/badge/Database-MySQL%208.0%20(InnoDB)-14b8a6)
![Architecture](https://img.shields.io/badge/Architecture-3--Tier%20Relational%20DBMS-38bdf8)

---

## 📖 1. Project Overview

**Campus Canteen Management System** is a full-stack, database-backed web application built specifically for academic DBMS demonstrations and viva voce examinations. 

Unlike mockup projects that simulate state in browser memory or local storage, this system executes **true relational database operations** against a local MySQL server:
- All dish creations, price edits, and removals are executed via parameterized SQL statements.
- Orders, bills, and stock deductions execute inside atomic **MySQL ACID Transactions**.
- Foreign key constraints (`ON DELETE RESTRICT`, `CASCADE`) guard relational integrity.
- Advanced SQL techniques (**Multi-table JOINs, GROUP BY, HAVING, Subqueries, Aggregate functions, and Database Views**) power analytical reporting.

---

## 🏗️ 2. System Architecture

The application adopts the classic industry-standard **3-Tier Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION TIER (UI)                    │
│   Vanilla JS (ES6) + Responsive CSS3 (Dark Navy & Cyan)     │
│   • Dashboard KPIs         • Point of Sale (POS) Ordering   │
│   • Live Demo Console      • Interactive SQL Lab            │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST API (JSON)
┌──────────────────────────────▼──────────────────────────────┐
│                    APPLICATION TIER (API)                   │
│   Node.js + Express.js Server                               │
│   • Connection Pooling (mysql2/promise)                     │
│   • Transaction Pipeline (BEGIN ... COMMIT / ROLLBACK)      │
│   • Centralized Error Middleware (translates MySQL errno)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Parameterized SQL Queries (TCP 3306)
┌──────────────────────────────▼──────────────────────────────┐
│                     DATA TIER (DATABASE)                    │
│   MySQL Database: campus_canteen (InnoDB, utf8mb4)          │
│   • 13 Relational Tables (Normalized up to 3NF)             │
│   • Stored Views (v_menu_catalog, v_low_stock_alerts, etc.) │
│   • Primary, Foreign Key & Check Constraints                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ 3. Relational Database Schema Design

The database `campus_canteen` contains **13 normalized relational tables**:

| # | Table Name | Purpose / Business Role | Foreign Key Dependencies |
|---|------------|-------------------------|--------------------------|
| 1 | `STUDENT` | Registered student diner profiles | *None (Primary Entity)* |
| 2 | `ADMIN` | Staff accounts & roles (Manager, Clerk, Chef) | *None* |
| 3 | `CATEGORY` | Dish categories (Breakfast, Meals, Snacks, etc.) | *None* |
| 4 | `MENU_ITEM` | Dish offerings, pricing, availability | `category_id` ➔ `CATEGORY` |
| 5 | `CART` | Active student session cart | `student_id` ➔ `STUDENT` |
| 6 | `CART_ITEM` | Items currently staged in a student's cart | `cart_id` ➔ `CART`, `item_id` ➔ `MENU_ITEM` |
| 7 | `ORDERS` | Confirmed meal orders with timestamp & status | `student_id` ➔ `STUDENT` |
| 8 | `ORDER_ITEM` | Ordered dish lines with historic unit price | `order_id` ➔ `ORDERS`, `item_id` ➔ `MENU_ITEM` |
| 9 | `BILL` | Invoice record for each order (1:1 with ORDERS) | `order_id` ➔ `ORDERS` (UNIQUE) |
| 10 | `PAYMENT` | Financial settlement (Cash, UPI, Campus Card) | `bill_id` ➔ `BILL` |
| 11 | `INGREDIENT`| Raw material inventory & safety reorder levels | *None* |
| 12 | `RECIPE` | Bill of materials mapping dishes to raw stock | `item_id` ➔ `MENU_ITEM`, `ingredient_id` ➔ `INGREDIENT` |
| 13 | `STOCK_USAGE`| Audit log of ingredient deductions per order | `ingredient_id` ➔ `INGREDIENT`, `order_id` ➔ `ORDERS` |

### Database Views Included:
- `v_menu_catalog`: Combines dishes with category details and human-friendly stock status.
- `v_order_billing_details`: 4-table join of Orders, Students, Bills, and Payment methods.
- `v_daily_sales_summary`: Aggregates order count, gross sales, and average ticket size.
- `v_low_stock_alerts`: Filters materials currently below their reorder threshold.
- `v_popular_items`: Ranks dishes by total quantity sold.

---

## 💻 4. Step-by-Step macOS Setup Instructions

Follow these exact commands in your macOS Terminal.

### Step 1: Verify / Install Prerequisites

Check if Node.js, npm, and Homebrew are installed:
```bash
node -v
npm -v
brew -v
```

> **If Node.js or MySQL are missing on macOS:**
> ```bash
> # Install Homebrew (if not already installed)
> /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
>
> # Install Node.js & MySQL
> brew install node
> brew install mysql
> ```

### Step 2: Start the Local MySQL Service

Start MySQL as a background macOS service:
```bash
brew services start mysql
```

Verify that MySQL is actively running on port `3306`:
```bash
mysqladmin -u root -p status
# (If you don't have a password set yet, press Enter)
```

### Step 3: Initialize the Database & Run SQL Scripts

Navigate to the project folder:
```bash
cd ~/.gemini/antigravity/scratch/campus-canteen
```

Run the SQL scripts in topological order using the MySQL command line client:
```bash
# 1. Create database schema and tables
mysql -u root -p < database/schema.sql

# 2. Compile database reporting views
mysql -u root -p < database/views.sql

# 3. Insert demonstration seed records
mysql -u root -p < database/seed.sql
```
*(Enter your MySQL root password when prompted)*

### Step 4: Configure Local Environment Variables

Create your local `.env` configuration file from the template:
```bash
cp .env.example .env
```

Open `.env` in VS Code or nano and provide your local MySQL credentials:
```env
PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=campus_canteen
```
> *Note: If your local MySQL root account does not have a password, leave `DB_PASSWORD=` blank.*

### Step 5: Install Dependencies & Launch Backend

Install the required Node.js packages:
```bash
npm install
```

Start the application server:
```bash
npm start
```

You will see:
```text
================================================================
🚀 Campus Canteen Management Server running on port 3000
🌐 Local Web URL: http://localhost:3000
🎯 Target Database: campus_canteen @ 127.0.0.1:3306
================================================================
✅ MySQL Connection Verified: 8.0.35 (DB: campus_canteen)
================================================================
```

### Step 6: Open the Dashboard in your Browser

Open your web browser and navigate to:
```
http://localhost:3000
```

Verify that the top navbar displays a **pulsing green dot** with the status:
`Connected to MySQL (Xms)`.

---

## 🔄 5. Verifying Database Changes Directly in MySQL

To prove to your examiner that operations reflect directly in MySQL:

1. Open a second terminal window.
2. Log into the MySQL interactive shell:
   ```bash
   mysql -u root -p -D campus_canteen
   ```
3. Run verification queries:
   ```sql
   -- View all dishes
   SELECT item_id, item_name, price, availability FROM MENU_ITEM;

   -- Check recent orders
   SELECT order_id, student_id, total_amount, status FROM ORDERS ORDER BY order_id DESC LIMIT 5;

   -- View settled bills
   SELECT bill_id, order_id, total_amount, bill_status FROM BILL;

   -- View live table counts
   SELECT 'STUDENT' AS tbl, COUNT(*) FROM STUDENT
   UNION ALL
   SELECT 'MENU_ITEM', COUNT(*) FROM MENU_ITEM
   UNION ALL
   SELECT 'ORDERS', COUNT(*) FROM ORDERS;
   ```

---

## 🛠️ 6. Troubleshooting Common Issues

| Error Message / Symptom | Root Cause | Solution |
|-------------------------|------------|----------|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL server is stopped | Run `brew services start mysql` |
| `Access denied for user 'root'@'localhost'` | Incorrect MySQL password | Verify password in `.env` or reset root password |
| `Unknown database 'campus_canteen'` | Schema script not executed | Run `mysql -u root -p < database/schema.sql` |
| `EADDRINUSE: address already in use :::3000` | Port 3000 occupied | Change `PORT=3001` in `.env` or kill existing process: `lsof -i :3000` then `kill -9 <PID>` |
| `Cannot delete: foreign key constraint fails` | Relational integrity guard | Normal DBMS behavior! Dependent order/recipe records exist. |

---

## 🎯 7. Stopping and Restarting

- **To Stop the Web Server:** Press `Ctrl + C` in the server terminal window.
- **To Restart:** Run `npm start`.
- **To Stop the MySQL Background Service:** Run `brew services stop mysql`.
