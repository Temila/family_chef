/**
 * 家味 · Family Chef — App Utilities
 * 主题切换、Toast、路由助手、日期格式化
 */

const App = {
  // ─── Theme ─────────────────────────────────────
  initTheme() {
    const saved = localStorage.getItem('fc_theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    // 切换按钮
    const btn = document.querySelector('.theme-toggle');
    if (btn) {
      this.updateThemeIcon(btn);
      btn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('fc_theme', isDark ? 'light' : 'dark');
        this.updateThemeIcon(btn);
      });
    }
  },

  updateThemeIcon(btn) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.title = isDark ? '切换浅色' : '切换深色';
  },

  // ─── Toast ─────────────────────────────────────
  showToast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  // ─── Bottom Nav ─────────────────────────────────────
  initBottomNav(activeTab = 'home') {
    const user = Auth.getUser();
    if (!user) return;

    const role = user.role;
    let tabs = [];

    if (role === 'admin') {
      tabs = [
        { id: 'admin-home', icon: '📊', label: '管理后台' },
        { id: 'admin-dishes', icon: '🍽', label: '菜品管理' },
        { id: 'user-home', icon: '🏠', label: '首页' },
      ];
    } else if (role === 'chef') {
      tabs = [
        { id: 'chef-orders', icon: '👨‍🍳', label: '订单' },
        { id: 'order-dish', icon: '🍽', label: '点菜' },
        { id: 'user-home', icon: '🏠', label: '首页' },
        { id: 'user-profile', icon: '👤', label: '我的' },
      ];
    } else {
      tabs = [
        { id: 'user-home', icon: '🏠', label: '首页' },
        { id: 'order-dish', icon: '🍽', label: '点菜' },
        { id: 'user-profile', icon: '👤', label: '我的' },
      ];
    }

    // 替换或创建 bottom bar
    let bar = document.querySelector('.bottom-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'bottom-bar';
      document.querySelector('.page-container')?.appendChild(bar);
    }

    bar.innerHTML = tabs.map(t => `
      <button class="tab-item ${t.id === activeTab ? 'active' : ''}" onclick="App.navigate('${t.id}')">
        <span class="tab-icon">${t.icon}</span>
        <span class="tab-label">${t.label}</span>
      </button>
    `).join('');
  },

  navigate(pageId) {
    const map = {
      'user-home': '/pages/user-home.html',
      'user-profile': '/pages/user-profile.html',
      'order-dish': '/pages/order-dish.html',
      'dish-detail': '/pages/dish-detail.html',
      'chef-orders': '/pages/chef-orders.html',
      'admin-home': '/pages/admin-home.html',
      'admin-dishes': '/pages/admin-dishes.html',
    };
    if (map[pageId]) window.location.href = map[pageId];
  },

  // ─── Date Format ─────────────────────────────────────
  formatDate(str) {
    if (!str) return '';
    const d = new Date(str);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  // ─── Status Badge ─────────────────────────────────────
  statusBadge(status) {
    const map = {
      pending: { text: '待处理', cls: 'badge-warn' },
      accepted: { text: '已接单', cls: 'badge-info' },
      cooking: { text: '烹饪中', cls: 'badge-accent' },
      completed: { text: '已完成', cls: 'badge-success' },
      cancelled: { text: '已取消', cls: 'badge-danger' },
      published: { text: '已上架', cls: 'badge-success' },
      hidden: { text: '已下架', cls: 'badge-danger' },
      draft: { text: '草稿', cls: 'badge-info' },
    };
    const s = map[status] || { text: status, cls: 'badge-info' };
    return `<span class="badge ${s.cls}">${s.text}</span>`;
  },

  // ─── Empty State ─────────────────────────────────────
  emptyState(icon = '📭', text = '暂无数据') {
    return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-text">${text}</div></div>`;
  },

  // ─── Loading ─────────────────────────────────────
  showLoading(target) {
    target.innerHTML = '<div class="loading"><div class="loading-spinner"></div>加载中...</div>';
  }
};

// 页面加载时初始化主题
document.addEventListener('DOMContentLoaded', () => App.initTheme());
