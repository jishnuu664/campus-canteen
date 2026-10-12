// ============================================================================
// CAMPUS CANTEEN: API CLIENT & ACTIVITY LOGGER
// Interacts with backend REST endpoints & monitors MySQL operations
// ============================================================================

const API = {
  baseUrl: '/api',

  // Event listeners for activity stream
  activityListeners: [],

  onActivity(listener) {
    this.activityListeners.push(listener);
  },

  notifyActivity(logEntry) {
    this.activityListeners.forEach(fn => fn(logEntry));
  },

  // Centralized request wrapper
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();
    const method = options.method || 'GET';

    this.notifyActivity({
      timestamp: new Date(),
      type: 'DISPATCH',
      message: `[API -> MySQL] Executing ${method} ${endpoint}...`,
      status: 'pending'
    });

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const durationMs = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || `HTTP error ${response.status}`;
        this.notifyActivity({
          timestamp: new Date(),
          type: 'ERROR',
          message: `[MySQL ERROR ${response.status}] ${data.error || 'Failed'}: ${errorMsg}`,
          durationMs,
          status: 'error',
          details: data
        });

        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      this.notifyActivity({
        timestamp: new Date(),
        type: 'SUCCESS',
        message: `[MySQL SUCCESS] ${method} ${endpoint} completed in ${durationMs}ms`,
        durationMs,
        status: 'success',
        data
      });

      return data;
    } catch (err) {
      if (!err.data) {
        this.notifyActivity({
          timestamp: new Date(),
          type: 'OFFLINE',
          message: `[Network Failure] Server or MySQL is currently unreachable: ${err.message}`,
          durationMs: Date.now() - startTime,
          status: 'error'
        });
      }
      throw err;
    }
  },

  // Health & System
  getHealth() { return this.request('/health'); },
  getTableCounts() { return this.request('/health/table-counts'); },
  getRecentActivity() { return this.request('/health/activity'); },

  // Dashboard
  getDashboardStats() { return this.request('/dashboard/stats'); },

  // Menu Items (CRUD)
  getMenuItems(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/menu-items${query ? '?' + query : ''}`);
  },
  getMenuItem(id) { return this.request(`/menu-items/${id}`); },
  createMenuItem(data) {
    return this.request('/menu-items', { method: 'POST', body: JSON.stringify(data) });
  },
  updateMenuItem(id, data) {
    return this.request(`/menu-items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteMenuItem(id) {
    return this.request(`/menu-items/${id}`, { method: 'DELETE' });
  },

  // Categories (CRUD)
  getCategories() { return this.request('/categories'); },
  createCategory(data) {
    return this.request('/categories', { method: 'POST', body: JSON.stringify(data) });
  },
  updateCategory(id, data) {
    return this.request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteCategory(id) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  },

  // Students (CRUD)
  getStudents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/students${query ? '?' + query : ''}`);
  },
  getStudent(id) { return this.request(`/students/${id}`); },
  createStudent(data) {
    return this.request('/students', { method: 'POST', body: JSON.stringify(data) });
  },
  updateStudent(id, data) {
    return this.request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteStudent(id) {
    return this.request(`/students/${id}`, { method: 'DELETE' });
  },

  // Ingredients (CRUD)
  getIngredients() { return this.request('/ingredients'); },
  getLowStockIngredients() { return this.request('/ingredients/low-stock'); },
  createIngredient(data) {
    return this.request('/ingredients', { method: 'POST', body: JSON.stringify(data) });
  },
  updateIngredient(id, data) {
    return this.request(`/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteIngredient(id) {
    return this.request(`/ingredients/${id}`, { method: 'DELETE' });
  },

  // Orders & Cart
  getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/orders${query ? '?' + query : ''}`);
  },
  getOrder(id) { return this.request(`/orders/${id}`); },
  createOrder(data) {
    return this.request('/orders', { method: 'POST', body: JSON.stringify(data) });
  },
  updateOrderStatus(id, status) {
    return this.request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  // Cart
  getCart(studentId) { return this.request(`/cart/${studentId}`); },
  addToCart(studentId, itemId, quantity = 1) {
    return this.request(`/cart/${studentId}/items`, {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, quantity })
    });
  },
  removeFromCart(studentId, itemId) {
    return this.request(`/cart/${studentId}/items/${itemId}`, { method: 'DELETE' });
  },
  clearCart(studentId) {
    return this.request(`/cart/${studentId}`, { method: 'DELETE' });
  },

  // Bills & Payments
  getBills(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/bills${query ? '?' + query : ''}`);
  },
  getBill(id) { return this.request(`/bills/${id}`); },
  recordPayment(billId, data) {
    return this.request(`/bills/${billId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Reports
  getDailySalesReport() { return this.request('/reports/daily-sales'); },
  getPopularItemsReport() { return this.request('/reports/popular-items'); },
  getCategorySalesReport() { return this.request('/reports/category-sales'); },
  getPendingOrdersReport() { return this.request('/reports/pending-orders'); },
  getIngredientConsumptionReport() { return this.request('/reports/ingredient-consumption'); },
  getCancelledOrdersReport() { return this.request('/reports/cancelled-orders'); },
  getRevenueSummaryReport() { return this.request('/reports/revenue-summary'); },

  // SQL Lab Presets & Runner
  getSqlPresets() { return this.request('/reports/sql-lab/presets'); },
  runSqlPreset(queryId) {
    return this.request('/reports/sql-lab/run', {
      method: 'POST',
      body: JSON.stringify({ queryId })
    });
  }
};
