/**
 * MD3 BottomBar Composite (Phase 11 — COMPO-09 / LOGIC-02)
 *
 * 80dp 移动端底部导航栏（MD3 Navigation Bar）：label 始终可见 +
 * 64×32 active indicator pill (secondary-container)。
 * safe-area-inset-bottom 适配。
 *
 * 角色路由 tabs 与现有 BottomBar.jsx 完全一致：保留 admin / chef / user 三组。
 * 现有 logout / navigate(path) / usePendingOrderCount Badge 行为零回归。
 *
 * 公开 API：<BottomBar />（无 props）
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePendingOrderCount } from '../../hooks/usePendingOrderCount';
import Icon from '../primitives/Icon';
import Ripple from '../primitives/Ripple';
import Badge from '../primitives/Badge';
import './BottomBar.css';

export default function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const pendingCount = usePendingOrderCount();

  if (!user) return null;

  const role = user.role;
  let tabs;

  if (role === 'admin') {
    tabs = [
      { id: 'admin-home', icon: 'dashboard', label: '后台', path: '/admin' },
      { id: 'admin-dishes', icon: 'set-meal', label: '菜品', path: '/admin/dishes' },
      { id: 'order-preview', icon: 'ramen-dining', label: '点菜预览', path: '/order' },
      { id: 'admin-ingredients', icon: 'eco', label: '食材', path: '/ingredients' },
      { id: 'admin-wishes', icon: 'lightbulb', label: '愿望', path: '/admin/wishes' },
      { id: 'admin-users', icon: 'group', label: '用户', path: '/admin/users' },
      { id: 'logout', icon: 'logout', label: '退出', action: 'logout' },
    ];
  } else if (role === 'chef') {
    tabs = [
      { id: 'chef-orders', icon: 'chef', label: '订单', path: '/chef/orders' },
      { id: 'order-dish', icon: 'ramen-dining', label: '点菜', path: '/order' },
      { id: 'chef-wishes', icon: 'lightbulb', label: '愿望', path: '/chef/wishes' },
      { id: 'user-home', icon: 'home', label: '首页', path: '/home' },
      { id: 'user-profile', icon: 'person', label: '我的', path: '/profile' },
    ];
  } else {
    tabs = [
      { id: 'user-home', icon: 'home', label: '首页', path: '/home' },
      { id: 'order-dish', icon: 'ramen-dining', label: '点菜', path: '/order' },
      { id: 'user-wishes', icon: 'lightbulb', label: '愿望', path: '/my-wishes' },
      { id: 'user-profile', icon: 'person', label: '我的', path: '/profile' },
    ];
  }

  const isActive = (path) => {
    if (path === '/home' && location.pathname === '/') return true;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="md-bottom-bar">
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <Ripple key={tab.id} style={{ flex: 1 }}>
            <button
              type="button"
              className={`md-tab md-interactive ${active ? 'md-tab--active' : ''}`}
              onClick={() => {
                if (tab.action === 'logout') {
                  logout();
                  navigate('/login');
                } else {
                  navigate(tab.path);
                }
              }}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="md-tab__icon">
                <Icon name={tab.icon} size={24} />
                {tab.id === 'chef-orders' && <Badge count={pendingCount} />}
              </span>
              <span className="md-tab__label">{tab.label}</span>
            </button>
          </Ripple>
        );
      })}
    </nav>
  );
}
