// ============================================================================
// CAMPUS CANTEEN: MAIN FRONTEND CONTROLLER (Vanilla JavaScript ES6)
// Handles state management, UI rendering, CRUD modals, and live demo flows
// ============================================================================

const App = {
  currentView: 'dashboard',
  currentReport: 'daily',
  categoriesCache: [],
  studentsCache: [],
  menuItemsCache: [],
  activeCartStudentId: null,
  activeCartData: { items: [], total: 0 },
  demoItemId: null,

  // Initialize application
  async init() {
    this.bindEvents();
    this.startClock();
    this.setupActivityTerminal();
    
    // Check initial health and load startup data
    await this.checkHealth();
    setInterval(() => this.checkHealth(), 15000);

    // Initial view load
    await this.navigateTo('dashboard');
  },

  // --------------------------------------------------------------------------
  // Navigation & View Routing
  // --------------------------------------------------------------------------
  async navigateTo(viewName) {
    this.currentView = viewName;

    // Update sidebar navigation pills
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewName);
    });

    // Update view panels
    document.querySelectorAll('.view-section').forEach(el => {
      el.classList.toggle('active', el.id === `view-${viewName}`);
    });

    // Update page header
    const headers = {
      dashboard: { title: 'Dashboard & Operations', desc: 'Live synchronized overview of canteen operations from MySQL' },
      menu: { title: 'Menu Item Management', desc: 'Manage dish catalog, pricing, category classification, and availability' },
      categories: { title: 'Category Management', desc: 'Manage menu categories with foreign key dependency protection' },
      students: { title: 'Student Management', desc: 'Enrolled student profiles and meal ordering records' },
      cart: { title: 'Cart & POS Order Placement', desc: 'Select student, add menu items, and execute multi-table atomic transactions' },
      orders: { title: 'Order Management', desc: 'Track real-time order lifecycle statuses and kitchen preparation states' },
      billing: { title: 'Billing & Payments', desc: 'Financial invoices, payment receipts, and settlement history' },
      ingredients: { title: 'Ingredient & Stock Management', desc: 'Raw material inventory, automated recipe consumption, and low-stock alerts' },
      reports: { title: 'Reports & SQL Lab', desc: 'Analytical SQL reporting and interactive DBMS viva demonstrations' },
      'live-demo': { title: 'Live Database Demo (Lecturer Viva)', desc: 'Demonstrate real-time INSERT, SELECT, UPDATE, DELETE directly in MySQL' }
    };

    const header = headers[viewName] || { title: 'Campus Canteen', desc: '' };
    document.getElementById('current-page-title').textContent = header.title;
    document.getElementById('current-page-desc').textContent = header.desc;

    // Load data for the active view
    await this.refreshCurrentView();
  },

  async refreshCurrentView() {
    switch (this.currentView) {
      case 'dashboard':
        await this.loadDashboard();
        break;
      case 'menu':
        await this.loadMenuManagement();
        break;
      case 'categories':
        await this.loadCategoryManagement();
        break;
      case 'students':
        await this.loadStudentManagement();
        break;
      case 'cart':
        await this.loadPosView();
        break;
      case 'orders':
        await this.loadOrderManagement();
        break;
      case 'billing':
        await this.loadBillingManagement();
        break;
      case 'ingredients':
        await this.loadIngredientManagement();
        break;
      case 'reports':
        await this.loadReports();
        break;
      case 'live-demo':
        await this.loadLiveDemoView();
        break;
    }
  },

  // --------------------------------------------------------------------------
  // System Health & Connection Status
  // --------------------------------------------------------------------------
  async checkHealth() {
    const indicator = document.getElementById('mysql-status-indicator');
    const textEl = document.getElementById('mysql-status-text');
    const dbNameEl = document.getElementById('sidebar-db-name');

    try {
      const health = await API.getHealth();
      if (health.connected) {
        indicator.className = 'connection-pill connected';
        indicator.title = `Connected to MySQL v${health.mysqlVersion} on ${health.host}:${health.port} (${health.latencyMs}ms)`;
        textEl.textContent = `Connected to MySQL (${health.latencyMs}ms)`;
        if (dbNameEl) dbNameEl.textContent = health.database;
      } else {
        indicator.className = 'connection-pill disconnected';
        indicator.title = health.troubleshooting || health.error;
        textEl.textContent = 'Disconnected from MySQL';
      }
    } catch (err) {
      indicator.className = 'connection-pill disconnected';
      textEl.textContent = 'Backend Offline';
      indicator.title = 'Cannot reach Express server';
    }
  },

  startClock() {
    const clockEl = document.getElementById('live-clock');
    const update = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }) + ' ' + now.toLocaleTimeString('en-US', { hour12: false });
    };
    update();
    setInterval(update, 1000);
  },

  // --------------------------------------------------------------------------
  // 1. Dashboard View Logic
  // --------------------------------------------------------------------------
  async loadDashboard() {
    try {
      const res = await API.getDashboardStats();
      const stats = res.stats;

      // Update KPI counters
      document.getElementById('stat-students').textContent = stats.totalStudents;
      document.getElementById('stat-menu-total').textContent = stats.totalMenuItems;
      document.getElementById('stat-menu-available').textContent = stats.availableMenuItems;
      document.getElementById('stat-orders-total').textContent = stats.totalOrders;
      document.getElementById('stat-orders-pending').textContent = stats.pendingOrders;
      document.getElementById('stat-revenue').textContent = `₹${parseFloat(stats.totalRevenue).toFixed(2)}`;
      document.getElementById('stat-low-stock').textContent = stats.lowStockIngredients;

      // Render recent orders
      const recentBody = document.getElementById('dashboard-recent-orders-body');
      if (res.recentOrders.length === 0) {
        recentBody.innerHTML = '<tr><td colspan="6" class="empty-state">No orders recorded yet.</td></tr>';
      } else {
        recentBody.innerHTML = res.recentOrders.map(o => `
          <tr>
            <td><strong>#${o.order_id}</strong></td>
            <td>${this.escape(o.student_name)}</td>
            <td><span style="font-size: 12px; color: var(--text-muted);">${this.escape(o.department)}</span></td>
            <td>${this.renderOrderStatusBadge(o.status)}</td>
            <td><strong>₹${parseFloat(o.total_amount).toFixed(2)}</strong></td>
            <td>${this.renderBillStatusBadge(o.bill_status)}</td>
          </tr>
        `).join('');
      }

      // Render popular items
      const popularBody = document.getElementById('dashboard-popular-items-body');
      if (res.popularItems.length === 0) {
        popularBody.innerHTML = '<tr><td colspan="4" class="empty-state">No dish sales recorded yet.</td></tr>';
      } else {
        popularBody.innerHTML = res.popularItems.map(p => `
          <tr>
            <td><strong>${this.escape(p.item_name)}</strong></td>
            <td><span style="color: var(--text-muted); font-size: 12px;">${this.escape(p.category_name)}</span></td>
            <td>₹${parseFloat(p.price).toFixed(2)}</td>
            <td><span class="badge badge-info">${p.total_ordered} ordered</span></td>
          </tr>
        `).join('');
      }

      // Render category-wise sales
      const categoryBody = document.getElementById('dashboard-category-sales-body');
      if (res.categorySales.length === 0) {
        categoryBody.innerHTML = '<tr><td colspan="3" class="empty-state">No category sales recorded.</td></tr>';
      } else {
        categoryBody.innerHTML = res.categorySales.map(c => `
          <tr>
            <td><strong>${this.escape(c.category_name)}</strong></td>
            <td>${c.total_items} dishes</td>
            <td><strong style="color: var(--accent-cyan);">₹${parseFloat(c.category_revenue).toFixed(2)}</strong></td>
          </tr>
        `).join('');
      }

      // Render low stock alerts
      const stockBody = document.getElementById('dashboard-low-stock-body');
      if (res.lowStockItems.length === 0) {
        stockBody.innerHTML = '<tr><td colspan="4" class="empty-state">✅ All inventory materials are well-stocked.</td></tr>';
      } else {
        stockBody.innerHTML = res.lowStockItems.map(i => `
          <tr>
            <td><strong>${this.escape(i.ingredient_name)}</strong></td>
            <td><span style="color: #f87171; font-weight: 700;">${i.stock_quantity} ${i.unit}</span></td>
            <td>${i.reorder_level} ${i.unit}</td>
            <td><span class="badge badge-danger">Low Stock</span></td>
          </tr>
        `).join('');
      }

    } catch (err) {
      this.showToast('Dashboard Sync Error', err.message, 'error');
    }
  },

  // --------------------------------------------------------------------------
  // 2. Menu Management View (CRUD)
  // --------------------------------------------------------------------------
  async loadMenuManagement() {
    try {
      await this.ensureCategoriesLoaded();
      
      const q = document.getElementById('menu-search-input')?.value || '';
      const cat = document.getElementById('menu-category-filter')?.value || '';
      const avail = document.getElementById('menu-availability-filter')?.value || '';

      const res = await API.getMenuItems({ q, category_id: cat, availability: avail });
      this.menuItemsCache = res.data;

      const tbody = document.getElementById('menu-items-table-body');
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No menu items match your criteria.</td></tr>';
        return;
      }

      tbody.innerHTML = res.data.map(item => `
        <tr>
          <td>#${item.item_id}</td>
          <td><strong>${this.escape(item.item_name)}</strong></td>
          <td><span class="badge badge-info">${this.escape(item.category_name)}</span></td>
          <td><strong>₹${parseFloat(item.price).toFixed(2)}</strong></td>
          <td>
            ${item.availability 
              ? '<span class="badge badge-success">Available</span>' 
              : '<span class="badge badge-danger">Sold Out</span>'}
          </td>
          <td style="max-width: 260px; font-size: 12px; color: var(--text-muted);">${this.escape(item.description || '-')}</td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="App.openEditMenuModal(${item.item_id})">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="App.confirmDeleteMenuItem(${item.item_id}, '${this.escape(item.item_name)}')">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast('Menu Load Error', err.message, 'error');
    }
  },

  openAddMenuModal() {
    this.ensureCategoriesLoaded();
    document.getElementById('modal-menu-title').textContent = 'Add Menu Item (MySQL INSERT)';
    document.getElementById('menu-form-id').value = '';
    document.getElementById('menu-form-name').value = '';
    document.getElementById('menu-form-price').value = '';
    document.getElementById('menu-form-desc').value = '';
    document.getElementById('menu-form-avail').value = '1';
    this.openModal('modal-menu-item');
  },

  openEditMenuModal(id) {
    const item = this.menuItemsCache.find(it => it.item_id === id);
    if (!item) return;

    this.ensureCategoriesLoaded();
    document.getElementById('modal-menu-title').textContent = `Edit Menu Item #${id} (MySQL UPDATE)`;
    document.getElementById('menu-form-id').value = item.item_id;
    document.getElementById('menu-form-name').value = item.item_name;
    document.getElementById('menu-form-category').value = item.category_id;
    document.getElementById('menu-form-price').value = item.price;
    document.getElementById('menu-form-desc').value = item.description || '';
    document.getElementById('menu-form-avail').value = item.availability ? '1' : '0';
    this.openModal('modal-menu-item');
  },

  async handleMenuFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('menu-form-id').value;
    const data = {
      item_name: document.getElementById('menu-form-name').value.trim(),
      category_id: parseInt(document.getElementById('menu-form-category').value, 10),
      price: parseFloat(document.getElementById('menu-form-price').value),
      description: document.getElementById('menu-form-desc').value.trim(),
      availability: document.getElementById('menu-form-avail').value === '1'
    };

    try {
      if (id) {
        await API.updateMenuItem(id, data);
        this.showToast('MySQL UPDATE Successful', `Updated dish '${data.item_name}' in database.`, 'success');
      } else {
        const res = await API.createMenuItem(data);
        this.showToast('MySQL INSERT Successful', `Inserted dish '${data.item_name}' (ID: #${res.insertId}).`, 'success');
      }
      this.closeModals();
      await this.loadMenuManagement();
    } catch (err) {
      this.showToast('Database Error', err.message, 'error');
    }
  },

  confirmDeleteMenuItem(id, name) {
    this.showConfirmDialog(
      'Confirm Delete Menu Item',
      `Are you sure you want to delete dish #${id} ('${name}') from MySQL? If this dish is referenced in historical orders, foreign key constraints will protect it.`,
      async () => {
        try {
          await API.deleteMenuItem(id);
          this.showToast('MySQL DELETE Successful', `Dish #${id} deleted from database.`, 'success');
          await this.loadMenuManagement();
        } catch (err) {
          this.showToast('Cannot Delete Item', err.message, 'error');
        }
      }
    );
  },

  // --------------------------------------------------------------------------
  // 3. Category Management View (CRUD)
  // --------------------------------------------------------------------------
  async loadCategoryManagement() {
    try {
      const res = await API.getCategories();
      this.categoriesCache = res.data;

      const tbody = document.getElementById('categories-table-body');
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No categories defined.</td></tr>';
        return;
      }

      tbody.innerHTML = res.data.map(c => `
        <tr>
          <td>#${c.category_id}</td>
          <td><strong>${this.escape(c.category_name)}</strong></td>
          <td style="color: var(--text-muted); font-size: 13px;">${this.escape(c.description || '-')}</td>
          <td><span class="badge badge-info">${c.item_count} menu items</span></td>
          <td style="font-size: 12px; color: var(--text-dim);">${c.created_at ? c.created_at.substring(0, 10) : '-'}</td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="App.openEditCategoryModal(${c.category_id})">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="App.confirmDeleteCategory(${c.category_id}, '${this.escape(c.category_name)}', ${c.item_count})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast('Category Error', err.message, 'error');
    }
  },

  openAddCategoryModal() {
    document.getElementById('modal-category-title').textContent = 'Add Category (MySQL INSERT)';
    document.getElementById('category-form-id').value = '';
    document.getElementById('category-form-name').value = '';
    document.getElementById('category-form-desc').value = '';
    this.openModal('modal-category');
  },

  openEditCategoryModal(id) {
    const cat = this.categoriesCache.find(c => c.category_id === id);
    if (!cat) return;

    document.getElementById('modal-category-title').textContent = `Edit Category #${id} (MySQL UPDATE)`;
    document.getElementById('category-form-id').value = cat.category_id;
    document.getElementById('category-form-name').value = cat.category_name;
    document.getElementById('category-form-desc').value = cat.description || '';
    this.openModal('modal-category');
  },

  async handleCategoryFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('category-form-id').value;
    const data = {
      category_name: document.getElementById('category-form-name').value.trim(),
      description: document.getElementById('category-form-desc').value.trim()
    };

    try {
      if (id) {
        await API.updateCategory(id, data);
        this.showToast('Category Updated', `Category #${id} modified in MySQL.`, 'success');
      } else {
        const res = await API.createCategory(data);
        this.showToast('Category Created', `Category inserted with ID #${res.insertId}.`, 'success');
      }
      this.closeModals();
      await this.loadCategoryManagement();
    } catch (err) {
      this.showToast('Database Error', err.message, 'error');
    }
  },

  confirmDeleteCategory(id, name, itemCount) {
    if (itemCount > 0) {
      this.showToast(
        'Deletion Blocked by DBMS',
        `Cannot delete Category '${name}' because it contains ${itemCount} active dishes. DBMS Foreign Key Constraint (RESTRICT) protects relational integrity.`,
        'error'
      );
      return;
    }

    this.showConfirmDialog(
      'Confirm Category Deletion',
      `Delete Category #${id} ('${name}') from MySQL?`,
      async () => {
        try {
          await API.deleteCategory(id);
          this.showToast('Deleted', `Category #${id} deleted from MySQL.`, 'success');
          await this.loadCategoryManagement();
        } catch (err) {
          this.showToast('Cannot Delete Category', err.message, 'error');
        }
      }
    );
  },

  // --------------------------------------------------------------------------
  // 4. Student Management View (CRUD)
  // --------------------------------------------------------------------------
  async loadStudentManagement() {
    try {
      const q = document.getElementById('student-search-input')?.value || '';
      const res = await API.getStudents({ q });
      this.studentsCache = res.data;

      const tbody = document.getElementById('students-table-body');
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No students match your query.</td></tr>';
        return;
      }

      tbody.innerHTML = res.data.map(s => `
        <tr>
          <td>#${s.student_id}</td>
          <td><strong>${this.escape(s.name)}</strong></td>
          <td><span style="color: var(--accent-blue);">${this.escape(s.email)}</span></td>
          <td>${this.escape(s.phone)}</td>
          <td><span class="badge badge-info">${this.escape(s.department)}</span></td>
          <td style="font-size: 12px; color: var(--text-muted);">${this.escape(s.hostel_block)}</td>
          <td><strong>${s.total_orders}</strong></td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="App.openEditStudentModal(${s.student_id})">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="App.confirmDeleteStudent(${s.student_id}, '${this.escape(s.name)}', ${s.total_orders})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast('Student Load Error', err.message, 'error');
    }
  },

  openAddStudentModal() {
    document.getElementById('modal-student-title').textContent = 'Add Student (MySQL INSERT)';
    document.getElementById('student-form-id').value = '';
    document.getElementById('student-form-name').value = '';
    document.getElementById('student-form-email').value = '';
    document.getElementById('student-form-phone').value = '';
    document.getElementById('student-form-dept').value = '';
    document.getElementById('student-form-hostel').value = '';
    this.openModal('modal-student');
  },

  openEditStudentModal(id) {
    const student = this.studentsCache.find(s => s.student_id === id);
    if (!student) return;

    document.getElementById('modal-student-title').textContent = `Edit Student #${id} (MySQL UPDATE)`;
    document.getElementById('student-form-id').value = student.student_id;
    document.getElementById('student-form-name').value = student.name;
    document.getElementById('student-form-email').value = student.email;
    document.getElementById('student-form-phone').value = student.phone;
    document.getElementById('student-form-dept').value = student.department;
    document.getElementById('student-form-hostel').value = student.hostel_block;
    this.openModal('modal-student');
  },

  async handleStudentFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('student-form-id').value;
    const data = {
      name: document.getElementById('student-form-name').value.trim(),
      email: document.getElementById('student-form-email').value.trim(),
      phone: document.getElementById('student-form-phone').value.trim(),
      department: document.getElementById('student-form-dept').value.trim(),
      hostel_block: document.getElementById('student-form-hostel').value.trim()
    };

    try {
      if (id) {
        await API.updateStudent(id, data);
        this.showToast('Student Updated', `Student #${id} modified in MySQL.`, 'success');
      } else {
        const res = await API.createStudent(data);
        this.showToast('Student Registered', `Student added with ID #${res.insertId}.`, 'success');
      }
      this.closeModals();
      await this.loadStudentManagement();
    } catch (err) {
      this.showToast('Student Save Error', err.message, 'error');
    }
  },

  confirmDeleteStudent(id, name, orderCount) {
    if (orderCount > 0) {
      this.showToast(
        'Deletion Prevented by Foreign Key',
        `Cannot delete Student '${name}' because ${orderCount} order records reference this student ID in MySQL.`,
        'error'
      );
      return;
    }

    this.showConfirmDialog(
      'Confirm Student Deletion',
      `Delete Student #${id} ('${name}') from MySQL?`,
      async () => {
        try {
          await API.deleteStudent(id);
          this.showToast('Student Removed', `Student #${id} removed from MySQL.`, 'success');
          await this.loadStudentManagement();
        } catch (err) {
          this.showToast('Cannot Delete Student', err.message, 'error');
        }
      }
    );
  },

  // --------------------------------------------------------------------------
  // 5. POS / Cart Order Placement View (Transactional Workflow)
  // --------------------------------------------------------------------------
  async loadPosView() {
    try {
      // Ensure students and categories are ready
      const [studentsRes, categoriesRes, menuRes] = await Promise.all([
        API.getStudents(),
        API.getCategories(),
        API.getMenuItems()
      ]);

      this.studentsCache = studentsRes.data;
      this.categoriesCache = categoriesRes.data;
      this.menuItemsCache = menuRes.data;

      // Populate student selector
      const studentSelect = document.getElementById('pos-student-select');
      studentSelect.innerHTML = '<option value="">-- Choose Student Diner --</option>' +
        this.studentsCache.map(s => `
          <option value="${s.student_id}">${this.escape(s.name)} (${this.escape(s.department)})</option>
        `).join('');

      // Auto-select first student if none selected
      if (!this.activeCartStudentId && this.studentsCache.length > 0) {
        this.activeCartStudentId = this.studentsCache[0].student_id;
        studentSelect.value = this.activeCartStudentId;
      } else if (this.activeCartStudentId) {
        studentSelect.value = this.activeCartStudentId;
      }

      // Populate category filter in POS
      const catFilter = document.getElementById('pos-category-filter');
      catFilter.innerHTML = '<option value="">All Categories</option>' +
        this.categoriesCache.map(c => `
          <option value="${c.category_id}">${this.escape(c.category_name)}</option>
        `).join('');

      this.renderPosMenuCards();
      await this.refreshPosCart();
    } catch (err) {
      this.showToast('POS Load Error', err.message, 'error');
    }
  },

  renderPosMenuCards() {
    const selectedCat = document.getElementById('pos-category-filter')?.value;
    const grid = document.getElementById('pos-menu-grid');

    let items = this.menuItemsCache;
    if (selectedCat) {
      items = items.filter(it => it.category_id === parseInt(selectedCat, 10));
    }

    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No dishes available in this category.</div>';
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="food-card ${!item.availability ? 'unavailable' : ''}">
        <div class="food-header">
          <div>
            <div class="food-title">${this.escape(item.item_name)}</div>
            <span class="badge badge-info" style="font-size: 10.5px; margin-top: 3px;">${this.escape(item.category_name)}</span>
          </div>
          <div class="food-price">₹${parseFloat(item.price).toFixed(2)}</div>
        </div>
        <p class="food-desc">${this.escape(item.description || 'Fresh campus preparation')}</p>
        <div>
          ${item.availability 
            ? `<button class="btn btn-primary btn-sm" style="width: 100%;" onclick="App.addItemToCart(${item.item_id})">➕ Add to Cart</button>`
            : `<button class="btn btn-secondary btn-sm" style="width: 100%;" disabled>Sold Out</button>`}
        </div>
      </div>
    `).join('');
  },

  async refreshPosCart() {
    const label = document.getElementById('pos-cart-student-label');
    const container = document.getElementById('pos-cart-items-container');
    const totalEl = document.getElementById('pos-cart-total');

    if (!this.activeCartStudentId) {
      label.textContent = 'Please select a student above';
      container.innerHTML = '<div class="empty-state">Select a student diner to view their cart.</div>';
      totalEl.textContent = '₹0.00';
      return;
    }

    const currentStudent = this.studentsCache.find(s => s.student_id === parseInt(this.activeCartStudentId, 10));
    label.textContent = currentStudent ? `Cart for: ${currentStudent.name} (${currentStudent.department})` : 'Active Cart';

    try {
      const res = await API.getCart(this.activeCartStudentId);
      this.activeCartData = res.data;

      if (!res.data.items || res.data.items.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 24px 10px;">
            <div class="icon">🍽️</div>
            <h4>Cart is Empty</h4>
            <p>Click "Add to Cart" on any available dish.</p>
          </div>
        `;
        totalEl.textContent = '₹0.00';
        return;
      }

      container.innerHTML = res.data.items.map(it => `
        <div class="cart-item-row">
          <div>
            <div style="font-weight: 600; font-size: 13.5px; color: #fff;">${this.escape(it.item_name)}</div>
            <div style="font-size: 11.5px; color: var(--text-muted);">
              ${it.quantity} x ₹${parseFloat(it.unit_price).toFixed(2)}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="color: var(--accent-cyan); font-size: 14px;">₹${parseFloat(it.subtotal).toFixed(2)}</strong>
            <button class="btn btn-danger btn-sm" style="padding: 2px 7px; font-size: 11px;" onclick="App.removeCartItem(${it.item_id})">✕</button>
          </div>
        </div>
      `).join('');

      totalEl.textContent = `₹${parseFloat(res.data.total).toFixed(2)}`;
    } catch (err) {
      container.innerHTML = `<div class="empty-state" style="color: #f87171;">${err.message}</div>`;
    }
  },

  async addItemToCart(itemId) {
    if (!this.activeCartStudentId) {
      this.showToast('Select Student', 'Please select a student from the dropdown first.', 'info');
      return;
    }

    try {
      await API.addToCart(this.activeCartStudentId, itemId, 1);
      await this.refreshPosCart();
    } catch (err) {
      this.showToast('Cart Error', err.message, 'error');
    }
  },

  async removeCartItem(itemId) {
    try {
      await API.removeFromCart(this.activeCartStudentId, itemId);
      await this.refreshPosCart();
    } catch (err) {
      this.showToast('Remove Error', err.message, 'error');
    }
  },

  async clearCart() {
    if (!this.activeCartStudentId) return;
    try {
      await API.clearCart(this.activeCartStudentId);
      await this.refreshPosCart();
      this.showToast('Cart Cleared', 'Active cart was cleared.', 'info');
    } catch (err) {
      this.showToast('Error', err.message, 'error');
    }
  },

  async submitOrder() {
    if (!this.activeCartStudentId) {
      this.showToast('Select Student', 'Please select a student first.', 'info');
      return;
    }
    if (!this.activeCartData.items || this.activeCartData.items.length === 0) {
      this.showToast('Empty Cart', 'Add at least one menu item before placing an order.', 'info');
      return;
    }

    const payload = {
      student_id: parseInt(this.activeCartStudentId, 10),
      items: this.activeCartData.items.map(it => ({
        item_id: it.item_id,
        quantity: it.quantity
      }))
    };

    try {
      const res = await API.createOrder(payload);
      this.showToast(
        'Transaction Committed! 🎉',
        `Order #${res.orderId} created for ₹${parseFloat(res.totalAmount).toFixed(2)}. Generated Bill #${res.billId}. Raw materials deducted from stock.`,
        'success'
      );

      // Clear the local cart
      await API.clearCart(this.activeCartStudentId);
      await this.refreshPosCart();

      // Ask if user wants to view or settle bill immediately
      setTimeout(() => {
        this.navigateTo('billing');
      }, 1200);
    } catch (err) {
      this.showToast('Order Transaction Failed (Rolled Back)', err.message, 'error');
    }
  },

  // --------------------------------------------------------------------------
  // 6. Order Management View
  // --------------------------------------------------------------------------
  async loadOrderManagement() {
    try {
      const status = document.getElementById('orders-status-filter')?.value || '';
      const res = await API.getOrders({ status });

      const tbody = document.getElementById('orders-table-body');
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No orders found.</td></tr>';
        return;
      }

      tbody.innerHTML = res.data.map(o => `
        <tr>
          <td><strong>#${o.order_id}</strong></td>
          <td style="font-size: 12px; color: var(--text-muted);">${o.order_time ? o.order_time.replace('T', ' ').substring(0, 19) : '-'}</td>
          <td>
            <strong>${this.escape(o.student_name)}</strong>
            <div style="font-size: 11px; color: var(--text-dim);">${this.escape(o.department)}</div>
          </td>
          <td><span class="badge badge-info">${o.item_count} items</span></td>
          <td><strong style="color: var(--accent-cyan);">₹${parseFloat(o.total_amount).toFixed(2)}</strong></td>
          <td>${this.renderOrderStatusBadge(o.status)}</td>
          <td>${this.renderBillStatusBadge(o.bill_status)}</td>
          <td style="text-align: right;">
            <select style="font-size: 12px; padding: 4px 8px;" onchange="App.changeOrderStatus(${o.order_id}, this.value)">
              <option value="" disabled selected>Update Status ▾</option>
              <option value="Pending" ${o.status === 'Pending' ? 'disabled' : ''}>Pending</option>
              <option value="Preparing" ${o.status === 'Preparing' ? 'disabled' : ''}>Preparing</option>
              <option value="Ready" ${o.status === 'Ready' ? 'disabled' : ''}>Ready</option>
              <option value="Completed" ${o.status === 'Completed' ? 'disabled' : ''}>Completed</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'disabled' : ''}>Cancel Order</option>
            </select>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast('Orders Load Error', err.message, 'error');
    }
  },

  async changeOrderStatus(orderId, newStatus) {
    if (!newStatus) return;
    try {
      await API.updateOrderStatus(orderId, newStatus);
      this.showToast('Order Status Updated', `Order #${orderId} transitioned to '${newStatus}' in MySQL.`, 'success');
      await this.loadOrderManagement();
    } catch (err) {
      this.showToast('Status Update Failed', err.message, 'error');
    }
  },

  // --------------------------------------------------------------------------
  // 7. Billing & Payments View
  // --------------------------------------------------------------------------
  async loadBillingManagement() {
    try {
      const status = document.getElementById('billing-status-filter')?.value || '';
      const res = await API.getBills({ status });

      const tbody = document.getElementById('billing-table-body');
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No bills recorded.</td></tr>';
        return;
      }

      tbody.innerHTML = res.data.map(b => `
        <tr>
          <td><strong>#${b.bill_id}</strong></td>
          <td><span style="color: var(--accent-cyan);">Order #${b.order_id}</span></td>
          <td>
            <strong>${this.escape(b.student_name)}</strong>
            <div style="font-size: 11px; color: var(--text-dim);">${this.escape(b.department)}</div>
          </td>
          <td><strong>₹${parseFloat(b.total_amount).toFixed(2)}</strong></td>
          <td>${this.renderBillStatusBadge(b.bill_status)}</td>
          <td>${b.payment_method ? `<span class="badge badge-info">${b.payment_method}</span>` : '<span style="color: var(--text-dim);">-</span>'}</td>
          <td style="font-size: 12px; color: var(--text-muted);">${b.paid_at ? b.paid_at.replace('T', ' ').substring(0, 19) : 'Pending'}</td>
          <td style="text-align: right;">
            ${b.bill_status === 'Unpaid' 
              ? `<button class="btn btn-success btn-sm" onclick="App.openPaymentModal(${b.bill_id}, '${this.escape(b.student_name)}', ${b.total_amount})">💳 Record Payment</button>`
              : `<span style="font-size: 12px; color: var(--color-success); font-weight: 600;">✓ Settled</span>`}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast('Billing Load Error', err.message, 'error');
    }
  },

  openPaymentModal(billId, studentName, amount) {
    document.getElementById('pay-form-bill-id').value = billId;
    document.getElementById('pay-modal-bill-id').textContent = `#${billId}`;
    document.getElementById('pay-modal-student').textContent = studentName;
    document.getElementById('pay-modal-amount').textContent = `₹${parseFloat(amount).toFixed(2)}`;
    document.getElementById('pay-form-method').value = 'UPI';
    this.openModal('modal-payment');
  },

  async handlePaymentFormSubmit(e) {
    e.preventDefault();
    const billId = document.getElementById('pay-form-bill-id').value;
    const method = document.getElementById('pay-form-method').value;

    try {
      const res = await API.recordPayment(billId, { payment_method: method });
      this.showToast(
        'Payment Settled! 💳',
        `Payment recorded in MySQL PAYMENT table via ${method}. Bill #${billId} updated to Paid.`,
        'success'
      );
      this.closeModals();
      await this.loadBillingManagement();
    } catch (err) {
      this.showToast('Payment Settlement Failed', err.message, 'error');
    }
  },

  // --------------------------------------------------------------------------
  // 8. Ingredient & Stock Management View (CRUD)
  // --------------------------------------------------------------------------
  async loadIngredientManagement() {
    try {
      const res = await API.getIngredients();

      const tbody = document.getElementById('ingredients-table-body');
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No raw materials listed in inventory.</td></tr>';
        return;
      }

      tbody.innerHTML = res.data.map(i => {
        const isLow = i.is_low_stock;
        return `
          <tr>
            <td>#${i.ingredient_id}</td>
            <td><strong>${this.escape(i.ingredient_name)}</strong></td>
            <td>${this.escape(i.unit)}</td>
            <td>
              <strong style="color: ${isLow ? '#f87171' : 'var(--text-main)'}; font-size: 14px;">
                ${parseFloat(i.stock_quantity).toFixed(2)} ${i.unit}
              </strong>
            </td>
            <td>${parseFloat(i.reorder_level).toFixed(2)} ${i.unit}</td>
            <td>
              ${isLow 
                ? '<span class="badge badge-danger">⚠️ Low Stock Alert</span>' 
                : '<span class="badge badge-success">✓ Stock Adequate</span>'}
            </td>
            <td><span class="badge badge-info">${i.linked_recipes_count} dishes</span></td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm" onclick="App.openEditIngredientModal(${i.ingredient_id}, '${this.escape(i.ingredient_name)}', '${this.escape(i.unit)}', ${i.stock_quantity}, ${i.reorder_level})">✏️ Adjust Stock</button>
              <button class="btn btn-danger btn-sm" onclick="App.confirmDeleteIngredient(${i.ingredient_id}, '${this.escape(i.ingredient_name)}')">🗑️ Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      this.showToast('Ingredient Load Error', err.message, 'error');
    }
  },

  openAddIngredientModal() {
    document.getElementById('modal-ingredient-title').textContent = 'Add Raw Material (MySQL INSERT)';
    document.getElementById('ingredient-form-id').value = '';
    document.getElementById('ingredient-form-name').value = '';
    document.getElementById('ingredient-form-unit').value = 'kg';
    document.getElementById('ingredient-form-stock').value = '';
    document.getElementById('ingredient-form-reorder').value = '10.0';
    this.openModal('modal-ingredient');
  },

  openEditIngredientModal(id, name, unit, stock, reorder) {
    document.getElementById('modal-ingredient-title').textContent = `Adjust Stock #${id} (MySQL UPDATE)`;
    document.getElementById('ingredient-form-id').value = id;
    document.getElementById('ingredient-form-name').value = name;
    document.getElementById('ingredient-form-unit').value = unit;
    document.getElementById('ingredient-form-stock').value = stock;
    document.getElementById('ingredient-form-reorder').value = reorder;
    this.openModal('modal-ingredient');
  },

  async handleIngredientFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('ingredient-form-id').value;
    const data = {
      ingredient_name: document.getElementById('ingredient-form-name').value.trim(),
      unit: document.getElementById('ingredient-form-unit').value.trim(),
      stock_quantity: parseFloat(document.getElementById('ingredient-form-stock').value),
      reorder_level: parseFloat(document.getElementById('ingredient-form-reorder').value)
    };

    try {
      if (id) {
        await API.updateIngredient(id, data);
        this.showToast('Stock Adjusted', `Ingredient #${id} updated in MySQL.`, 'success');
      } else {
        const res = await API.createIngredient(data);
        this.showToast('Ingredient Added', `Material added with ID #${res.insertId}.`, 'success');
      }
      this.closeModals();
      await this.loadIngredientManagement();
    } catch (err) {
      this.showToast('Ingredient Save Error', err.message, 'error');
    }
  },

  confirmDeleteIngredient(id, name) {
    this.showConfirmDialog(
      'Confirm Ingredient Deletion',
      `Delete raw material #${id} ('${name}') from MySQL? Foreign key rules protect ingredients linked to active recipes or consumption audits.`,
      async () => {
        try {
          await API.deleteIngredient(id);
          this.showToast('Material Deleted', `Ingredient #${id} deleted from MySQL.`, 'success');
          await this.loadIngredientManagement();
        } catch (err) {
          this.showToast('Cannot Delete Ingredient', err.message, 'error');
        }
      }
    );
  },

  // --------------------------------------------------------------------------
  // 9. Reports & SQL Lab View
  // --------------------------------------------------------------------------
  async switchReportTab(reportName) {
    this.currentReport = reportName;
    document.querySelectorAll('.report-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.report === reportName);
    });
    await this.loadReports();
  },

  async loadReports() {
    const container = document.getElementById('report-output-container');
    container.innerHTML = '<div class="empty-state">Executing analytical SQL query against MySQL...</div>';

    try {
      if (this.currentReport === 'daily') {
        const res = await API.getDailySalesReport();
        this.renderTableReport('Daily Sales & Velocity Summary', res.data, [
          { key: 'report_date', label: 'Sale Date' },
          { key: 'total_orders', label: 'Total Orders' },
          { key: 'gross_sales', label: 'Gross Sales (₹)', format: v => `₹${parseFloat(v).toFixed(2)}` },
          { key: 'average_order_value', label: 'Avg Ticket (₹)', format: v => `₹${parseFloat(v || 0).toFixed(2)}` },
          { key: 'completed_orders', label: 'Completed' },
          { key: 'cancelled_orders', label: 'Cancelled' }
        ]);
      } else if (this.currentReport === 'popular') {
        const res = await API.getPopularItemsReport();
        this.renderTableReport('Menu Item Popularity & Volume Sold', res.data, [
          { key: 'item_id', label: 'Dish ID' },
          { key: 'item_name', label: 'Dish Name' },
          { key: 'category_name', label: 'Category' },
          { key: 'price', label: 'Price', format: v => `₹${parseFloat(v).toFixed(2)}` },
          { key: 'total_quantity_ordered', label: 'Units Sold' },
          { key: 'total_revenue_generated', label: 'Total Revenue', format: v => `₹${parseFloat(v).toFixed(2)}` }
        ]);
      } else if (this.currentReport === 'category') {
        const res = await API.getCategorySalesReport();
        this.renderTableReport('Category-Wise Sales Breakdown', res.data, [
          { key: 'category_id', label: 'Category ID' },
          { key: 'category_name', label: 'Category' },
          { key: 'total_items_offered', label: 'Dishes Offered' },
          { key: 'units_sold', label: 'Units Sold' },
          { key: 'total_category_sales', label: 'Category Revenue', format: v => `₹${parseFloat(v).toFixed(2)}` }
        ]);
      } else if (this.currentReport === 'pending') {
        const res = await API.getPendingOrdersReport();
        this.renderTableReport('Kitchen Queue: Pending & Preparing Orders', res.data, [
          { key: 'order_id', label: 'Order ID' },
          { key: 'order_time', label: 'Order Time', format: v => v ? v.replace('T', ' ').substring(0, 19) : '-' },
          { key: 'student_name', label: 'Student' },
          { key: 'student_phone', label: 'Phone' },
          { key: 'hostel_block', label: 'Hostel' },
          { key: 'total_amount', label: 'Total', format: v => `₹${parseFloat(v).toFixed(2)}` },
          { key: 'status', label: 'Order Status' }
        ]);
      } else if (this.currentReport === 'ingredient') {
        const res = await API.getIngredientConsumptionReport();
        this.renderTableReport('Raw Material Inventory Consumption Audit', res.data, [
          { key: 'ingredient_id', label: 'Material ID' },
          { key: 'ingredient_name', label: 'Material Name' },
          { key: 'unit', label: 'Unit' },
          { key: 'current_stock', label: 'Current Stock' },
          { key: 'total_quantity_used', label: 'Historical Quantity Used' },
          { key: 'total_deduction_events', label: 'Deduction Count' }
        ]);
      } else if (this.currentReport === 'revenue') {
        const res = await API.getRevenueSummaryReport();
        this.renderTableReport('Settlement Breakdown by Payment Gateway', res.data, [
          { key: 'payment_method', label: 'Payment Gateway / Method' },
          { key: 'total_transactions', label: 'Successful Transactions' },
          { key: 'total_collected', label: 'Total Collected', format: v => `₹${parseFloat(v).toFixed(2)}` },
          { key: 'average_ticket_size', label: 'Avg Ticket Size', format: v => `₹${parseFloat(v || 0).toFixed(2)}` }
        ]);
      } else if (this.currentReport === 'sqllab') {
        await this.renderSqlLab();
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state" style="color: #f87171;">Query Execution Failed: ${err.message}</div>`;
    }
  },

  renderTableReport(title, data, columns) {
    const container = document.getElementById('report-output-container');
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="card">
          <h3 class="card-title">${title}</h3>
          <div class="empty-state">No matching data rows found in MySQL for this report.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${title}</h3>
            <p class="card-subtitle">Live calculated rows from MySQL database (${data.length} records)</p>
          </div>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                ${columns.map(c => `<th>${c.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${columns.map(c => {
                    const val = row[c.key];
                    return `<td>${c.format ? c.format(val, row) : (val !== null && val !== undefined ? this.escape(String(val)) : '-')}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderSqlLab() {
    const container = document.getElementById('report-output-container');
    const presetsRes = await API.getSqlPresets();

    container.innerHTML = `
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <h3 class="card-title">🔬 DBMS Query Demonstration Lab</h3>
            <p class="card-subtitle">Curated set of relational SQL queries covering 2-table joins, multi-table chains, subqueries, HAVING filters, and Views.</p>
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 20px;">
          ${presetsRes.presets.map(p => `
            <div class="sql-card" id="sql-card-${p.id}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
                <div>
                  <h4 style="color: #fff; font-size: 15px; margin-bottom: 4px;">${this.escape(p.title)}</h4>
                  <span class="badge badge-info" style="font-size: 11px;">Concept: ${this.escape(p.concept)}</span>
                </div>
                <button class="btn btn-primary btn-sm" onclick="App.runSqlLabQuery('${p.id}')">
                  ▶️ Run Query in MySQL
                </button>
              </div>
              <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 10px;">${this.escape(p.description)}</p>
              <pre class="sql-code-block">${this.escape(p.sql)}</pre>
              <div id="sql-result-${p.id}" style="margin-top: 14px; display: none;"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  async runSqlLabQuery(queryId) {
    const resultContainer = document.getElementById(`sql-result-${queryId}`);
    if (!resultContainer) return;

    resultContainer.style.display = 'block';
    resultContainer.innerHTML = '<div style="padding: 12px; color: var(--accent-cyan);">Executing query in MySQL engine...</div>';

    try {
      const res = await API.runSqlPreset(queryId);

      if (res.data.length === 0) {
        resultContainer.innerHTML = `
          <div style="padding: 12px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="color: var(--accent-teal); font-size: 12px; font-weight: 600;">✓ Query executed successfully (${res.executionTimeMs}ms) — 0 rows returned</div>
          </div>
        `;
        return;
      }

      const columns = res.columns;
      resultContainer.innerHTML = `
        <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; color: var(--text-muted);">
            <span>Execution Latency: <strong style="color: var(--accent-cyan);">${res.executionTimeMs}ms</strong></span>
            <span>Rows Fetched: <strong>${res.rowCount}</strong></span>
          </div>
          <div class="table-responsive" style="max-height: 280px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  ${columns.map(c => `<th>${c}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${res.data.map(row => `
                  <tr>
                    ${columns.map(col => `<td>${row[col] !== null && row[col] !== undefined ? this.escape(String(row[col])) : '<span style="color: var(--text-dim);">NULL</span>'}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      resultContainer.innerHTML = `<div style="padding: 12px; color: #f87171;">Query Execution Error: ${err.message}</div>`;
    }
  },

  // --------------------------------------------------------------------------
  // 10. Live Database Demonstration View (For Lecturer / Viva)
  // --------------------------------------------------------------------------
  async loadLiveDemoView() {
    await this.refreshTableCounts();
    await this.refreshDemoMenuTable();
  },

  async refreshTableCounts() {
    const container = document.getElementById('live-table-counts-container');
    try {
      const res = await API.getTableCounts();
      const counts = res.tableCounts;

      container.innerHTML = Object.entries(counts).map(([table, count]) => `
        <div class="count-pill">
          <div class="count-pill-title">${table}</div>
          <div class="count-pill-val">${count}</div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div style="color: #f87171;">Cannot fetch table counts: ${err.message}</div>`;
    }
  },

  async refreshDemoMenuTable() {
    const tbody = document.getElementById('demo-menu-table-body');
    try {
      const res = await API.getMenuItems();
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No items found in MENU_ITEM table.</td></tr>';
        return;
      }

      // Check if demo item exists in list
      const demoItem = res.data.find(it => it.item_name.includes('Demo Masala Dosa'));
      if (demoItem) {
        this.demoItemId = demoItem.item_id;
        document.getElementById('btn-demo-insert').disabled = true;
        document.getElementById('btn-demo-update').disabled = false;
        document.getElementById('btn-demo-delete').disabled = false;
      } else {
        this.demoItemId = null;
        document.getElementById('btn-demo-insert').disabled = false;
        document.getElementById('btn-demo-update').disabled = true;
        document.getElementById('btn-demo-delete').disabled = true;
      }

      tbody.innerHTML = res.data.slice(0, 8).map(it => `
        <tr style="${it.item_id === this.demoItemId ? 'background: rgba(6, 182, 212, 0.15); border-left: 3px solid var(--accent-cyan);' : ''}">
          <td>#${it.item_id}</td>
          <td><strong>${this.escape(it.item_name)}</strong></td>
          <td><span class="badge badge-info">${this.escape(it.category_name)}</span></td>
          <td><strong style="color: var(--accent-cyan);">₹${parseFloat(it.price).toFixed(2)}</strong></td>
          <td>${it.availability ? '<span class="badge badge-success">Available</span>' : '<span class="badge badge-danger">Sold Out</span>'}</td>
          <td>${it.item_id === this.demoItemId ? '<span class="badge badge-warning">⚡ Live Demo Record</span>' : '<span style="color: var(--text-dim); font-size: 11px;">Committed</span>'}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="color: #f87171;">Failed to fetch records: ${err.message}</td></tr>`;
    }
  },

  async demoInsert() {
    this.appendTerminalLog('SQL', 'Preparing: INSERT INTO MENU_ITEM (item_name, category_id, price, availability) VALUES (\'Demo Masala Dosa\', 1, 65.00, 1)...');
    try {
      // Ensure category exists
      await this.ensureCategoriesLoaded();
      const catId = this.categoriesCache.length > 0 ? this.categoriesCache[0].category_id : 1;

      const res = await API.createMenuItem({
        item_name: 'Demo Masala Dosa',
        category_id: catId,
        price: 65.00,
        description: 'Demonstration record inserted live during DBMS viva presentation',
        availability: true
      });

      this.demoItemId = res.insertId;
      this.appendTerminalLog('SUCCESS', `MySQL INSERT executed. Primary Key assigned: #${res.insertId}.`);
      this.showToast('MySQL INSERT Confirmed', `Created 'Demo Masala Dosa' with Primary Key #${res.insertId}.`, 'success');

      await this.refreshTableCounts();
      await this.refreshDemoMenuTable();
    } catch (err) {
      this.appendTerminalLog('ERROR', `INSERT Failed: ${err.message}`);
      this.showToast('INSERT Failed', err.message, 'error');
    }
  },

  async demoUpdate() {
    if (!this.demoItemId) return;
    this.appendTerminalLog('SQL', `Preparing: UPDATE MENU_ITEM SET price = 75.00 WHERE item_id = ${this.demoItemId}...`);
    try {
      const catId = this.categoriesCache.length > 0 ? this.categoriesCache[0].category_id : 1;
      await API.updateMenuItem(this.demoItemId, {
        item_name: 'Demo Masala Dosa (Special Ghee Roast)',
        category_id: catId,
        price: 75.00,
        description: 'Updated price to ₹75.00 during live demonstration',
        availability: true
      });

      this.appendTerminalLog('SUCCESS', `MySQL UPDATE executed for item #${this.demoItemId}. Price changed to ₹75.00.`);
      this.showToast('MySQL UPDATE Confirmed', `Item #${this.demoItemId} updated to ₹75.00 in database.`, 'success');

      await this.refreshDemoMenuTable();
    } catch (err) {
      this.appendTerminalLog('ERROR', `UPDATE Failed: ${err.message}`);
      this.showToast('UPDATE Failed', err.message, 'error');
    }
  },

  async demoDelete() {
    if (!this.demoItemId) return;
    this.appendTerminalLog('SQL', `Preparing: DELETE FROM MENU_ITEM WHERE item_id = ${this.demoItemId}...`);
    try {
      await API.deleteMenuItem(this.demoItemId);
      this.appendTerminalLog('SUCCESS', `MySQL DELETE executed. Row #${this.demoItemId} removed from MENU_ITEM table.`);
      this.showToast('MySQL DELETE Confirmed', `Demo item #${this.demoItemId} deleted from database.`, 'success');

      this.demoItemId = null;
      await this.refreshTableCounts();
      await this.refreshDemoMenuTable();
    } catch (err) {
      this.appendTerminalLog('ERROR', `DELETE Failed: ${err.message}`);
      this.showToast('DELETE Failed', err.message, 'error');
    }
  },

  async runFullVivaDemo() {
    this.appendTerminalLog('INIT', '=== Starting Automated Step-by-Step DBMS Viva Demonstration ===');
    
    // Step 1: Insert
    this.appendTerminalLog('STEP 1', 'Step 1: Demonstrating INSERT operation...');
    await this.demoInsert();

    // Step 2: Pause and Update
    setTimeout(async () => {
      this.appendTerminalLog('STEP 2', 'Step 2: Demonstrating UPDATE operation (price revision)...');
      await this.demoUpdate();

      // Step 3: Pause and Delete
      setTimeout(async () => {
        this.appendTerminalLog('STEP 3', 'Step 3: Demonstrating DELETE operation (row cleanup)...');
        await this.demoDelete();
        this.appendTerminalLog('COMPLETE', '=== Full DBMS Viva Demonstration Completed Successfully ===');
      }, 3500);

    }, 3500);
  },

  // --------------------------------------------------------------------------
  // Activity Stream & Terminal Logger
  // --------------------------------------------------------------------------
  setupActivityTerminal() {
    API.onActivity(entry => {
      if (entry.status === 'error') {
        this.appendTerminalLog('ERROR', entry.message);
      } else if (entry.type === 'SUCCESS') {
        this.appendTerminalLog('SUCCESS', entry.message);
      }
    });
  },

  appendTerminalLog(tag, message) {
    const box = document.getElementById('demo-activity-terminal');
    if (!box) return;

    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const tagClass = tag === 'SUCCESS' ? 'tag-success' : (tag === 'ERROR' ? 'tag-error' : 'tag-sql');

    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `<span class="time">[${time}]</span> <span class="${tagClass}">[${tag}]</span> ${this.escape(message)}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  },

  // --------------------------------------------------------------------------
  // Helpers & Modals
  // --------------------------------------------------------------------------
  async ensureCategoriesLoaded() {
    if (this.categoriesCache.length === 0) {
      const res = await API.getCategories();
      this.categoriesCache = res.data;
    }

    // Populate category dropdowns in forms
    const menuSelect = document.getElementById('menu-form-category');
    if (menuSelect) {
      menuSelect.innerHTML = this.categoriesCache.map(c => `
        <option value="${c.category_id}">${this.escape(c.category_name)}</option>
      `).join('');
    }

    const menuFilter = document.getElementById('menu-category-filter');
    if (menuFilter && menuFilter.options.length <= 1) {
      menuFilter.innerHTML = '<option value="">All Categories</option>' +
        this.categoriesCache.map(c => `
          <option value="${c.category_id}">${this.escape(c.category_name)}</option>
        `).join('');
    }
  },

  openModal(modalId) {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
  },

  showConfirmDialog(title, message, onConfirm) {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;

    const btn = document.getElementById('confirm-modal-btn');
    btn.onclick = () => {
      this.closeModals();
      onConfirm();
    };

    this.openModal('modal-confirm');
  },

  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <h4>${this.escape(title)}</h4>
        <p>${this.escape(message)}</p>
      </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 4500);
  },

  renderOrderStatusBadge(status) {
    const map = {
      Pending: 'badge-warning',
      Preparing: 'badge-info',
      Ready: 'badge-info',
      Completed: 'badge-success',
      Cancelled: 'badge-danger'
    };
    return `<span class="badge ${map[status] || 'badge-info'}">${status}</span>`;
  },

  renderBillStatusBadge(status) {
    const map = {
      Unpaid: 'badge-warning',
      Paid: 'badge-success',
      Cancelled: 'badge-danger',
      Refunded: 'badge-info'
    };
    return `<span class="badge ${map[status] || 'badge-warning'}">${status || 'Unpaid'}</span>`;
  },

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // --------------------------------------------------------------------------
  // Event Listeners Binding
  // --------------------------------------------------------------------------
  bindEvents() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.navigateTo(item.dataset.view);
      });
    });

    // Global refresh button
    document.getElementById('btn-global-refresh')?.addEventListener('click', async () => {
      await this.checkHealth();
      await this.refreshCurrentView();
      this.showToast('Refreshed', 'Synchronized fresh data from MySQL.', 'info');
    });

    // Search & Filter debounced bindings
    document.getElementById('menu-search-input')?.addEventListener('input', () => this.loadMenuManagement());
    document.getElementById('menu-category-filter')?.addEventListener('change', () => this.loadMenuManagement());
    document.getElementById('menu-availability-filter')?.addEventListener('change', () => this.loadMenuManagement());
    document.getElementById('btn-add-menu-item')?.addEventListener('click', () => this.openAddMenuModal());
    document.getElementById('form-menu-item')?.addEventListener('submit', e => this.handleMenuFormSubmit(e));

    // Categories
    document.getElementById('btn-add-category')?.addEventListener('click', () => this.openAddCategoryModal());
    document.getElementById('form-category')?.addEventListener('submit', e => this.handleCategoryFormSubmit(e));

    // Students
    document.getElementById('student-search-input')?.addEventListener('input', () => this.loadStudentManagement());
    document.getElementById('btn-add-student')?.addEventListener('click', () => this.openAddStudentModal());
    document.getElementById('form-student')?.addEventListener('submit', e => this.handleStudentFormSubmit(e));

    // POS & Cart
    document.getElementById('pos-student-select')?.addEventListener('change', e => {
      this.activeCartStudentId = e.target.value;
      this.refreshPosCart();
    });
    document.getElementById('pos-category-filter')?.addEventListener('change', () => this.renderPosMenuCards());
    document.getElementById('btn-clear-cart')?.addEventListener('click', () => this.clearCart());
    document.getElementById('btn-submit-order')?.addEventListener('click', () => this.submitOrder());

    // Orders filter
    document.getElementById('orders-status-filter')?.addEventListener('change', () => this.loadOrderManagement());

    // Billing filter
    document.getElementById('billing-status-filter')?.addEventListener('change', () => this.loadBillingManagement());
    document.getElementById('form-payment')?.addEventListener('submit', e => this.handlePaymentFormSubmit(e));

    // Ingredients
    document.getElementById('btn-add-ingredient')?.addEventListener('click', () => this.openAddIngredientModal());
    document.getElementById('form-ingredient')?.addEventListener('submit', e => this.handleIngredientFormSubmit(e));

    // Reports sub-tabs
    document.querySelectorAll('.report-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchReportTab(btn.dataset.report));
    });

    // Live Demo Viva buttons
    document.getElementById('btn-refresh-table-counts')?.addEventListener('click', () => this.refreshTableCounts());
    document.getElementById('btn-demo-insert')?.addEventListener('click', () => this.demoInsert());
    document.getElementById('btn-demo-update')?.addEventListener('click', () => this.demoUpdate());
    document.getElementById('btn-demo-delete')?.addEventListener('click', () => this.demoDelete());
    document.getElementById('btn-run-full-demo')?.addEventListener('click', () => this.runFullVivaDemo());
    document.getElementById('btn-clear-terminal')?.addEventListener('click', () => {
      const box = document.getElementById('demo-activity-terminal');
      if (box) box.innerHTML = '';
    });
  }
};

// Auto-boot application on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
