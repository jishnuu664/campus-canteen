// ============================================================================
// CAMPUS CANTEEN: DATABASE CONNECTION & POOLING MANAGER
// Technology: mysql2/promise with connection pooling & transaction helpers
// ============================================================================

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'campus_canteen',
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),
  dateStrings: true,
  decimalNumbers: true
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// In-memory circular log buffer for recent database activity (max 100 entries)
const recentActivity = [];
const MAX_ACTIVITY_LOGS = 100;

function logActivity(entry) {
  const logItem = {
    id: Date.now() + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    ...entry
  };
  recentActivity.unshift(logItem);
  if (recentActivity.length > MAX_ACTIVITY_LOGS) {
    recentActivity.pop();
  }
  return logItem;
}

function getRecentActivity() {
  return recentActivity;
}

/**
 * Execute parameterized query with automatic latency measurement & activity logging
 */
async function query(sql, params = []) {
  const startTime = Date.now();
  try {
    const [rows, fields] = await pool.query(sql, params);
    const durationMs = Date.now() - startTime;

    // Categorize SQL operation
    const trimmed = sql.trim().toUpperCase();
    let opType = 'SELECT';
    if (trimmed.startsWith('INSERT')) opType = 'INSERT';
    else if (trimmed.startsWith('UPDATE')) opType = 'UPDATE';
    else if (trimmed.startsWith('DELETE')) opType = 'DELETE';

    if (opType !== 'SELECT' || sql.includes('v_') || sql.length < 120) {
      logActivity({
        type: opType,
        sql: sql.replace(/\s+/g, ' ').trim(),
        durationMs,
        status: 'SUCCESS',
        affectedRows: rows.affectedRows || (Array.isArray(rows) ? rows.length : 1)
      });
    }

    return rows;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logActivity({
      type: 'ERROR',
      sql: sql.replace(/\s+/g, ' ').trim(),
      durationMs,
      status: 'FAILED',
      errorMessage: error.message,
      errorCode: error.code
    });
    throw error;
  }
}

/**
 * Test connectivity to MySQL and fetch database metadata
 */
async function testConnection() {
  const startTime = Date.now();
  try {
    const connection = await pool.getConnection();
    const [versionRows] = await connection.query('SELECT VERSION() AS version, DATABASE() AS currentDb');
    connection.release();

    const durationMs = Date.now() - startTime;
    return {
      connected: true,
      host: dbConfig.host,
      port: dbConfig.port,
      database: versionRows[0].currentDb || dbConfig.database,
      user: dbConfig.user,
      mysqlVersion: versionRows[0].version,
      latencyMs: durationMs,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    let troubleshooting = 'Verify MySQL is running and credentials in .env are correct.';
    if (error.code === 'ECONNREFUSED') {
      troubleshooting = `Cannot connect to MySQL at ${dbConfig.host}:${dbConfig.port}. Start MySQL service via 'brew services start mysql' or MySQL Workbench.`;
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      troubleshooting = `Access denied for user '${dbConfig.user}'. Check your DB_PASSWORD in .env.`;
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      troubleshooting = `Database '${dbConfig.database}' does not exist. Run 'mysql -u root -p < database/schema.sql'.`;
    }

    return {
      connected: false,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      error: error.message,
      errorCode: error.code,
      troubleshooting,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  logActivity,
  getRecentActivity,
  dbConfig
};
