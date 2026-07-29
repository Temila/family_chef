/**
 * 家味 · Family Chef — App Utilities
 * 主题切换、Toast、日期格式化
 */

// ─── Theme ─────────────────────────────────────
export const theme = {
  initTheme() {
    const saved = localStorage.getItem('fc_theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  },

  getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fc_theme', theme);
  },

  toggleTheme() {
    const isDark = this.getTheme() === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  },

  getThemeIcon() {
    // Phase 12 D-EMOJI-01: 返回 Icon 名称字符串供 <Icon name> 渲染（原返回 emoji）
    return this.getTheme() === 'dark' ? 'light-mode' : 'dark-mode';
  }
};

// ─── Date Format ─────────────────────────────────────
export const formatDate = (str) => {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

export const formatDateShort = (str) => {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getMonth()+1}月${d.getDate()}日`;
};

// ─── Status Badge ─────────────────────────────────────
export const statusBadge = (status) => {
  const map = {
    pending: { text: '待处理', cls: 'badge-warn' },
    accepted: { text: '已接单', cls: 'badge-info' },
    cooking: { text: '烹饪中', cls: 'badge-accent' },
    completed: { text: '已完成', cls: 'badge-success' },
    cancelled: { text: '已取消', cls: 'badge-danger' },
    published: { text: '已上架', cls: 'badge-success' },
    hidden: { text: '已下架', cls: 'badge-danger' },
    draft: { text: '草稿', cls: 'badge-info' },
    enabled: { text: '已启用', cls: 'badge-success' },
    disabled: { text: '已禁用', cls: 'badge-danger' },
    active: { text: '活跃', cls: 'badge-success' },
    inactive: { text: '停用', cls: 'badge-danger' },
    used: { text: '已使用', cls: 'badge-muted' },
    expired: { text: '已过期', cls: 'badge-warn' },
    revoked: { text: '已撤销', cls: 'badge-danger' },
    // ── Wish lifecycle (Phase 7) — backend returns raw Chinese statuses (Phase 5 D-11) ──
    '待处理': { text: '待处理', cls: 'badge-warn' },
    '准备中': { text: '准备中', cls: 'badge-info' },
    '已上架': { text: '已上架', cls: 'badge-success' },
    '已拒绝': { text: '已拒绝', cls: 'badge-danger' },
    '已撤销': { text: '已撤销', cls: 'badge-muted' }, // D-16: wish '已撤销' uses muted gray (distinct from English 'revoked')
  };
  const s = map[status] || { text: status, cls: 'badge-info' };
  return { text: s.text, cls: s.cls };
};

// ─── Empty State ─────────────────────────────────────
// Phase 12 D-EMOJI-01: 默认从 inbox emoji 改为 Icon 名称 'mail'（EmptyState 经 <Icon> 渲染）
export const emptyState = (icon = 'mail', text = '暂无数据') => {
  return { icon, text };
};

// ─── Price Format ─────────────────────────────────────
export const formatPrice = (price) => {
  if (price === null || price === undefined) return '0.00';
  return parseFloat(price).toFixed(2);
};

// ─── Modal Focus Trap ─────────────────────────────────────
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export const trapFocusWithin = (event, container) => {
  if (event.key !== 'Tab' || !container) return;

  const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  if (focusable.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault();
    first.focus();
  }
};

// ─── Debounce ─────────────────────────────────────
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// ─── Truncate Text ─────────────────────────────────────
export const truncate = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

export default {
  theme,
  formatDate,
  formatDateShort,
  statusBadge,
  emptyState,
  formatPrice,
  trapFocusWithin,
  debounce,
  truncate
};
