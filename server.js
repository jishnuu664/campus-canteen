// ============================================================================
// CAMPUS CANTEEN: BACKEND APPLICATION SERVER
// Express.js with MySQL Connection Pooling & RESTful API Endpoints
// ============================================================================

const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { testConnection, dbConfig } = require('./db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const healthRoutes = require('./routes/health');
const dashboardRoutes = require('./routes/dashboard');
const categoriesRoutes = require('./routes/categories');
const menuItemsRoutes = require('./routes/menuItems');
const studentsRoutes = require('./routes/students');
const ingredientsRoutes = require('./routes/ingredients');
const ordersRoutes = require('./routes/orders');
const billsRoutes = require('./routes/bills');
const cartRoutes = require('./routes/cart');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Serve frontend static assets
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// API Route Mounts
app.use('/api/health', healthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/menu-items', menuItemsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reports', reportsRoutes);

// Fallback for Single Page Application
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Centralized error handling
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log('================================================================');
  console.log(`🚀 Campus Canteen Management Server running on port ${PORT}`);
  console.log(`🌐 Local Web URL: http://localhost:${PORT}`);
  console.log(`🎯 Target Database: ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}`);
  console.log('================================================================');

  // Verify MySQL connection on startup
  const dbHealth = await testConnection();
  if (dbHealth.connected) {
    console.log(`✅ MySQL Connection Verified: ${dbHealth.mysqlVersion} (DB: ${dbHealth.database})`);
  } else {
    console.log(`⚠️ MySQL Connection Pending / Offline:`);
    console.log(`   Error: ${dbHealth.error}`);
    console.log(`   💡 Action: ${dbHealth.troubleshooting}`);
    console.log('   (The server is active. Once MySQL is running, the app reconnects automatically.)');
  }
  console.log('================================================================');
});

module.exports = app;
