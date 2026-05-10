/**
 * UserProfilePage - 个人中心
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    favoriteDishes: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [ordersRes, favoritesRes] = await Promise.all([
        api.getOrders({ page: 1, page_size: 1 }),
        api.getFavorites({ page: 1, page_size: 1 })
      ]);
      setStats({
        totalOrders: ordersRes.total || 0,
        completedOrders: ordersRes.completed_count || 0,
        favoriteDishes: favoritesRes.total || 0
      });
    } catch (err) {
      showToast('加载统计信息失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      logout();
      showToast('已退出登录');
      navigate('/login');
    }
  };

  const menuItems = [
    {
      icon: '📝',
      title: '我的订单',
      desc: '查看订单历史',
      onClick: () => navigate('/order')
    },
    {
      icon: '❤️',
      title: '我的收藏',
      desc: `${stats.favoriteDishes} 道菜品`,
      onClick: () => navigate('/favorites')
    },
    {
      icon: '⚙️',
      title: '设置',
      desc: '偏好设置',
      onClick: () => showToast('功能开发中')
    },
    {
      icon: '🚪',
      title: '退出登录',
      desc: '安全退出',
      onClick: handleLogout,
      danger: true
    }
  ];

  if (loading && !user) {
    return (
      <div className="page-container">
        <Header title="我的" />
        <Loading />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header title="我的" />

      {/* Profile Card */}
      <div className="profile-card">
        <div className="avatar avatar-lg">
          {user?.display_name?.charAt(0).toUpperCase() ||
           user?.username?.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <div className="profile-name">
            {user?.display_name || user?.username}
          </div>
          <div className="profile-role">
            <Badge status={user?.role || 'user'} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-label">总订单</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completedOrders}</div>
          <div className="stat-label">已完成</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.favoriteDishes}</div>
          <div className="stat-label">收藏</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{user?.credits || 0}</div>
          <div className="stat-label">积分</div>
        </div>
      </div>

      {/* Menu */}
      <div className="menu-list" style={{ marginTop: 16 }}>
        {menuItems.map((item, index) => (
          <div
            key={index}
            className="menu-item"
            onClick={item.onClick}
            style={item.danger ? { color: 'var(--danger)' } : {}}
          >
            <div className="menu-icon">{item.icon}</div>
            <div className="menu-text">
              <div className="menu-title">{item.title}</div>
              <div className="menu-desc">{item.desc}</div>
            </div>
            <span className="menu-arrow">›</span>
          </div>
        ))}
      </div>

      <BottomBar />
    </div>
  );
}
