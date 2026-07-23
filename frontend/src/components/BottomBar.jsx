import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePendingOrderCount } from '../hooks/usePendingOrderCount';

function Badge({ count }) {
  if (!count) return null;
  const display = count > 99 ? '99+' : count;
  return <span className="badge-count">{display}</span>;
}

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
      { id: 'admin-home', icon: '📊', label: '后台', path: '/admin' },
      { id: 'admin-dishes', icon: '🍽', label: '菜品', path: '/admin/dishes' },
      { id: 'admin-wishes', icon: '💡', label: '愿望', path: '/admin/wishes' },
      { id: 'admin-users', icon: '👥', label: '用户', path: '/admin/users' },
      { id: 'logout', icon: '🚪', label: '退出', action: 'logout' },
    ];
  } else if (role === 'chef') {
    tabs = [
      { id: 'chef-orders', icon: '👨‍🍳', label: '订单', path: '/chef/orders' },
      { id: 'order-dish', icon: '🍽', label: '点菜', path: '/order' },
      { id: 'chef-wishes', icon: '💡', label: '愿望', path: '/chef/wishes' },
      { id: 'user-home', icon: '🏠', label: '首页', path: '/home' },
      { id: 'user-profile', icon: '👤', label: '我的', path: '/profile' },
    ];
  } else {
    tabs = [
      { id: 'user-home', icon: '🏠', label: '首页', path: '/home' },
      { id: 'order-dish', icon: '🍽', label: '点菜', path: '/order' },
      { id: 'user-wishes', icon: '💡', label: '愿望', path: '/my-wishes' },
      { id: 'user-profile', icon: '👤', label: '我的', path: '/profile' },
    ];
  }

  const isActive = (path) => {
    if (path === '/home' && location.pathname === '/') return true;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="bottom-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-item ${isActive(tab.path) ? 'active' : ''}`}
          onClick={() => {
            if (tab.action === 'logout') {
              logout();
              navigate('/login');
            } else {
              navigate(tab.path);
            }
          }}
        >
          <span className="tab-icon">
            {tab.icon}
            {tab.id === 'chef-orders' && <Badge count={pendingCount} />}
          </span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
