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
    favoriteDishes: 0,
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', old_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [ordersRes, favoritesRes] = await Promise.all([
        api.getOrders({ page: 1, page_size: 1 }),
        api.getFavorites({ page: 1, page_size: 1 }),
      ]);
      setStats({
        totalOrders: ordersRes.total || 0,
        completedOrders: ordersRes.completed_count || 0,
        favoriteDishes: favoritesRes.total || 0,
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

  const handleSaveProfile = async () => {
    try {
      if (editForm.new_password) {
        if (editForm.new_password.length < 6) {
          showToast('新密码至少6位', 'error');
          return;
        }
        if (editForm.new_password !== editForm.confirm_password) {
          showToast('两次密码不一致', 'error');
          return;
        }
        if (!editForm.old_password) {
          showToast('请输入旧密码', 'error');
          return;
        }
        await api.updatePassword(user.id, editForm.old_password, editForm.new_password);
      }
      if (editForm.display_name && editForm.display_name !== user.display_name) {
        await api.updateUser(user.id, { display_name: editForm.display_name });
        updateUser({ display_name: editForm.display_name });
      }
      setShowEditModal(false);
      showToast('保存成功');
    } catch (err) {
      showToast(err.message || '保存失败', 'error');
    }
  };

  const menuItems = [
    {
      icon: '🍽️',
      title: '开始点菜',
      desc: '浏览菜品并点菜',
      onClick: () => navigate('/order'),
    },
    {
      icon: '👅',
      title: '口味偏好',
      desc: '管理不爱吃/忌口食材',
      onClick: () => navigate('/preferences'),
    },
    {
      icon: '❤️',
      title: '我的收藏',
      desc: `${stats.favoriteDishes} 道菜品`,
      onClick: () => navigate('/order'),
    },
    {
      icon: '📝',
      title: '我的订单',
      desc: `${stats.totalOrders} 个订单`,
      onClick: () => navigate('/order'),
    },
    {
      icon: '⚙️',
      title: '编辑资料',
      desc: '修改昵称/密码',
      onClick: () => {
        setEditForm({ display_name: user?.display_name || '', old_password: '', new_password: '', confirm_password: '' });
        setShowEditModal(true);
      },
    },
    {
      icon: '🚪',
      title: '退出登录',
      desc: '安全退出',
      onClick: handleLogout,
      danger: true,
    },
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
      </div>

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

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>编辑资料</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">昵称</label>
                <input
                  className="form-input"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  placeholder="输入昵称"
                />
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16 }}>
                <div className="form-label" style={{ marginBottom: 12 }}>修改密码</div>
                <div className="form-group">
                  <label className="form-label">旧密码</label>
                  <input
                    className="form-input"
                    type="password"
                    value={editForm.old_password}
                    onChange={(e) => setEditForm({ ...editForm, old_password: e.target.value })}
                    placeholder="输入旧密码"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">新密码（至少6位）</label>
                  <input
                    className="form-input"
                    type="password"
                    value={editForm.new_password}
                    onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                    placeholder="输入新密码"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">确认新密码</label>
                  <input
                    className="form-input"
                    type="password"
                    value={editForm.confirm_password}
                    onChange={(e) => setEditForm({ ...editForm, confirm_password: e.target.value })}
                    placeholder="再次输入新密码"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveProfile}>保存</button>
            </div>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
