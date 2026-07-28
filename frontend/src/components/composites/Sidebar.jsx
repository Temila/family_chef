/**
 * MD3 Sidebar Composite (Phase 11 — COMPO-09 / LOGIC-01)
 *
 * 80dp 窄边栏（MD3 Navigation Rail）：icon-only + 56×32 active indicator pill。
 * logo / user info / 退出 全部移至 Sidecar Header 与 footer（仅 icon）。
 *
 * 角色路由 navItems 与现有 Sidebar.jsx 完全一致：保留 admin / chef / user 三组。
 * 现有 logout / navigate(path) / usePendingOrderCount Badge 行为零回归。
 *
 * 公开 API：<Sidebar />（无 props）
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePendingOrderCount } from '../../hooks/usePendingOrderCount';
import { theme } from '../../utils';
import Icon from '../primitives/Icon';
import Ripple from '../primitives/Ripple';
import Badge from '../primitives/Badge';
import './Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const pendingCount = usePendingOrderCount();
  // 主题状态：切换后立即重渲染以更新 Icon 与 accessible name（D-BUG-02 Sidebar footer）
  const [currentTheme, setCurrentTheme] = useState(() => theme.getTheme());

  const handleToggleTheme = () => {
    setCurrentTheme(theme.toggleTheme());
  };

  if (!user) return null;

  const role = user.role;

  let navItems;
  if (role === 'admin') {
    navItems = [
      { icon: 'dashboard', label: '管理后台', path: '/admin' },
      { icon: 'restaurant', label: '菜品管理', path: '/admin/dishes' },
      { icon: 'eco', label: '食材管理', path: '/ingredients' },
      { icon: 'folder', label: '分类管理', path: '/admin/categories' },
      { icon: 'chef', label: '厨师管理', path: '/admin/chefs' },
      { icon: 'group', label: '用户管理', path: '/admin/users' },
      { icon: 'bar-chart', label: '数据统计', path: '/admin/stats' },
      { icon: 'description', label: '系统日志', path: '/admin/logs' },
      { icon: 'restaurant', label: '点菜预览', path: '/order' },
      { icon: 'lightbulb', label: '愿望总览', path: '/admin/wishes' },
    ];
  } else if (role === 'chef') {
    navItems = [
      { icon: 'home', label: '首页', path: '/home' },
      { icon: 'chef', label: '订单管理', path: '/chef/orders' },
      { icon: 'restaurant', label: '菜品管理', path: '/chef/dishes' },
      { icon: 'eco', label: '食材管理', path: '/ingredients' },
      { icon: 'restaurant', label: '点菜', path: '/order' },
      { icon: 'spa', label: '口味偏好', path: '/preferences' },
      { icon: 'lightbulb', label: '愿望管理', path: '/chef/wishes' },
      { icon: 'person', label: '我的', path: '/profile' },
    ];
  } else {
    navItems = [
      { icon: 'home', label: '首页', path: '/home' },
      { icon: 'restaurant', label: '点菜', path: '/order' },
      { icon: 'spa', label: '口味偏好', path: '/preferences' },
      { icon: 'lightbulb', label: '我的愿望', path: '/my-wishes' },
      { icon: 'person', label: '我的', path: '/profile' },
    ];
  }

  return (
    <aside className="md-sidebar">
      <div className="md-sidebar__logo">
        <Icon name="restaurant" size={28} />
      </div>

      <nav className="md-sidebar__nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Ripple key={item.path} style={{ width: '100%' }}>
              <button
                type="button"
                className={`md-sidebar__item md-interactive ${isActive ? 'md-sidebar__item--active' : ''}`}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="md-sidebar__item-icon">
                  <Icon name={item.icon} size={24} />
                  {item.path === '/chef/orders' && <Badge count={pendingCount} />}
                </span>
              </button>
            </Ripple>
          );
        })}
      </nav>

      <div className="md-sidebar__footer">
        <Ripple style={{ width: '100%' }}>
          <button
            type="button"
            className="md-sidebar__item md-interactive"
            onClick={handleToggleTheme}
            aria-label={currentTheme === 'dark' ? '切换浅色' : '切换深色'}
            title={currentTheme === 'dark' ? '切换浅色' : '切换深色'}
          >
            <span className="md-sidebar__item-icon">
              <Icon name={currentTheme === 'dark' ? 'light-mode' : 'dark-mode'} size={24} />
            </span>
          </button>
        </Ripple>
        <Ripple style={{ width: '100%' }}>
          <button
            type="button"
            className="md-sidebar__item md-interactive"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="退出"
            title="退出"
          >
            <span className="md-sidebar__item-icon">
              <Icon name="logout" size={24} />
            </span>
          </button>
        </Ripple>
      </div>
    </aside>
  );
}
