/**
 * BottomBar Component - 底部导航栏
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role;
  let tabs = [];

  if (role === 'admin') {
    tabs = [
      { id: 'admin-home', icon: '📊', label: '管理后台', path: '/admin' },
      { id: 'admin-dishes', icon: '🍽', label: '菜品管理', path: '/admin/dishes' },
      { id: 'user-home', icon: '🏠', label: '首页', path: '/home' },
    ];
  } else if (role === 'chef') {
    tabs = [
      { id: 'chef-orders', icon: '👨‍🍳', label: '订单', path: '/chef/orders' },
      { id: 'order-dish', icon: '🍽', label: '点菜', path: '/order' },
      { id: 'user-home', icon: '🏠', label: '首页', path: '/home' },
      { id: 'user-profile', icon: '👤', label: '我的', path: '/profile' },
    ];
  } else {
    tabs = [
      { id: 'user-home', icon: '🏠', label: '首页', path: '/home' },
      { id: 'order-dish', icon: '🍽', label: '点菜', path: '/order' },
      { id: 'user-profile', icon: '👤', label: '我的', path: '/profile' },
    ];
  }

  return (
    <nav className="bottom-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-item ${location.pathname === tab.path ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
