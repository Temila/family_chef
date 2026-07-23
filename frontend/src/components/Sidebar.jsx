import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePendingOrderCount } from '../hooks/usePendingOrderCount';

function Badge({ count }) {
  if (!count) return null;
  const display = count > 99 ? '99+' : count;
  return <span className="badge-count">{display}</span>;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const pendingCount = usePendingOrderCount();

  if (!user) return null;

  const role = user.role;

  let navItems;
  if (role === 'admin') {
    navItems = [
      { icon: '📊', label: '管理后台', path: '/admin' },
      { icon: '🍽️', label: '菜品管理', path: '/admin/dishes' },
      { icon: '🥬', label: '食材管理', path: '/ingredients' },
      { icon: '📂', label: '分类管理', path: '/admin/categories' },
      { icon: '👨‍🍳', label: '厨师管理', path: '/admin/chefs' },
      { icon: '👥', label: '用户管理', path: '/admin/users' },
      { icon: '📈', label: '数据统计', path: '/admin/stats' },
      { icon: '📝', label: '系统日志', path: '/admin/logs' },
      { icon: '🍽', label: '点菜预览', path: '/order' },
      { icon: '💡', label: '愿望总览', path: '/admin/wishes' },
    ];
  } else if (role === 'chef') {
    navItems = [
      { icon: '🏠', label: '首页', path: '/home' },
      { icon: '👨‍🍳', label: '订单管理', path: '/chef/orders' },
      { icon: '🍽️', label: '菜品管理', path: '/chef/dishes' },
      { icon: '🥬', label: '食材管理', path: '/ingredients' },
      { icon: '🍽️', label: '点菜', path: '/order' },
      { icon: '👅', label: '口味偏好', path: '/preferences' },
      { icon: '💡', label: '愿望管理', path: '/chef/wishes' },
      { icon: '👤', label: '我的', path: '/profile' },
    ];
  } else {
    navItems = [
      { icon: '🏠', label: '首页', path: '/home' },
      { icon: '🍽️', label: '点菜', path: '/order' },
      { icon: '👅', label: '口味偏好', path: '/preferences' },
      { icon: '💡', label: '我的愿望', path: '/my-wishes' },
      { icon: '👤', label: '我的', path: '/profile' },
    ];
  }

  return (
    <aside className="pc-sidebar">
      <div className="pc-sidebar-header">
        <div className="pc-sidebar-logo">🍲 家味</div>
        <div className="pc-sidebar-subtitle">Family Chef</div>
      </div>

      <nav className="pc-sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`pc-sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="pc-sidebar-icon">
              {item.icon}
              {item.path === '/chef/orders' && <Badge count={pendingCount} />}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pc-sidebar-footer">
        <div className="pc-sidebar-user">
          <div className="avatar avatar-sm">
            {(user.display_name || user.username).charAt(0).toUpperCase()}
          </div>
          <div className="pc-sidebar-user-info">
            <div className="pc-sidebar-user-name">{user.display_name || user.username}</div>
            <div className="pc-sidebar-user-role">
              {user.role === 'admin' ? '管理员' : user.role === 'chef' ? '厨师' : '用户'}
            </div>
          </div>
        </div>
        <div className="pc-sidebar-footer-actions">
          <button
            className="pc-sidebar-item"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            退出
          </button>
        </div>
      </div>
    </aside>
  );
}
