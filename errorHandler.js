// ============================================================================
// CAMPUS CANTEEN: CENTRALIZED ERROR HANDLING MIDDLEWARE
// Translates MySQL errors into human-readable REST API responses
// ============================================================================

function errorHandler(err, req, res, next) {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);

  // 1. Foreign Key Deletion/Update Constraint Violation
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    return res.status(409).json({
      success: false,
      error: 'Foreign Key Constraint Violation',
      message: 'This record cannot be deleted because other records depend on it (e.g., active orders, order items, or recipes). Remove or update dependent records first.',
      dbmsRule: 'RESTRICT ON DELETE / Foreign Key Integrity',
      details: err.message
    });
  }

  // 2. Foreign Key Insertion Reference Not Found
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Reference',
      message: 'The referenced foreign key entity (e.g., Category, Student, or Menu Item) does not exist in the database.',
      details: err.message
    });
  }

  // 3. Duplicate Key / Unique Constraint Violation
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate Record Violation',
      message: 'A record with this unique identifier or name already exists in the database.',
      details: err.message
    });
  }

  // 4. Missing Required Field / NOT NULL Constraint
  if (err.code === 'ER_BAD_NULL_ERROR' || err.errno === 1048) {
    return res.status(400).json({
      success: false,
      error: 'Required Field Missing',
      message: 'A required field cannot be null.',
      details: err.message
    });
  }

  // 5. Check Constraint Violated
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 3819) {
    return res.status(400).json({
      success: false,
      error: 'Check Constraint Violation',
      message: 'The submitted value violates a database check constraint (e.g., price or quantity cannot be negative).',
      details: err.message
    });
  }

  // 6. MySQL Server Offline / Connection Refused
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'MySQL Connection Refused',
      message: 'Unable to communicate with MySQL database. Please verify MySQL service is running on the local machine.',
      details: err.message
    });
  }

  // 7. Missing Database / Table
  if (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146) {
    return res.status(500).json({
      success: false,
      error: 'Table Not Found',
      message: 'The requested database table does not exist. Please run schema.sql to initialize the database.',
      details: err.message
    });
  }

  // Default Fallback
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected database or server error occurred.',
    errorCode: err.code || null
  });
}

module.exports = errorHandler;
