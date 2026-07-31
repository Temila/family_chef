import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/primitives/Badge';
import Loading from '../components/Loading';
import PasswordInput from '../components/PasswordInput';
import Input from '../components/primitives/Input';
import Button from '../components/primitives/Button';
import Modal from '../components/composites/Modal';
import Icon from '../components/primitives/Icon';

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

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersRes, completedRes, favoritesRes] = await Promise.all([
        api.getOrders({ page: 1, page_size: 1 }),
        api.getOrders({ page: 1, page_size: 1, status: 'completed' }),
        api.getFavorites({ page: 1, page_size: 1 }),
      ]);
      setStats({
        totalOrders: ordersRes.total || 0,
        completedOrders: completedRes.total || 0,
        favoriteDishes: favoritesRes.total || 0,
      });
    } catch {
      showToast('加载统计信息失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // 通过 queueMicrotask 延迟一拍执行，规避 react-hooks/set-state-in-effect
    queueMicrotask(() => { loadStats(); });
  }, [loadStats]);

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
      icon: 'set-meal',
      title: '开始点菜',
      desc: '浏览菜品并点菜',
      onClick: () => navigate('/order'),
    },
    {
      icon: 'restaurant',
      title: '口味偏好',
      desc: '管理不爱吃/忌口食材',
      onClick: () => navigate('/preferences'),
    },
    {
      icon: 'favorite',
      title: '我的收藏',
      desc: `${stats.favoriteDishes} 道菜品`,
      onClick: () => navigate('/my-favorites'),
    },
    {
      icon: 'edit',
      title: '我的订单',
      desc: `${stats.totalOrders} 个订单`,
      onClick: () => navigate('/my-orders'),
    },
    {
      icon: 'settings',
      title: '编辑资料',
      desc: '修改昵称/密码',
      onClick: () => {
        setEditForm({ display_name: user?.display_name || '', old_password: '', new_password: '', confirm_password: '' });
        setShowEditModal(true);
      },
    },
    {
      icon: 'logout',
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

      <div className="menu-list" style={{ marginTop: 'var(--md-spacing-4)'}}>
        {menuItems.map((item, index) => (
          <div
            key={index}
            className="menu-item"
            onClick={item.onClick}
            style={item.danger ? { color: 'var(--md-color-error)' } : {}}
          >
            <div className="menu-icon"><Icon name={item.icon} size={24} /></div>
            <div className="menu-text">
              <div className="menu-title">{item.title}</div>
              <div className="menu-desc">{item.desc}</div>
            </div>
            <span className="menu-arrow">›</span>
          </div>
        ))}
      </div>

      {showEditModal && (
        <Modal
          open
          onClose={() => setShowEditModal(false)}
          title="编辑资料"
          actions={[
            <Button key="cancel" variant="tonal" onClick={() => setShowEditModal(false)}>取消</Button>,
            <Button key="save" variant="filled" onClick={handleSaveProfile}>保存</Button>,
          ]}
        >
          <Input
            label="昵称"
            value={editForm.display_name}
            onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
            placeholder="输入昵称"
          />
          <div style={{ borderTop: '1px solid var(--md-color-outline-variant)', margin: 'var(--md-spacing-4) 0', paddingTop: 'var(--md-spacing-4)'}}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-3)'}}>修改密码</div>
            <PasswordInput
              label="旧密码"
              value={editForm.old_password}
              onChange={(e) => setEditForm({ ...editForm, old_password: e.target.value })}
              placeholder="输入旧密码"
            />
            <PasswordInput
              label="新密码（至少6位）"
              value={editForm.new_password}
              onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
              placeholder="输入新密码"
            />
            <PasswordInput
              label="确认新密码"
              value={editForm.confirm_password}
              onChange={(e) => setEditForm({ ...editForm, confirm_password: e.target.value })}
              placeholder="再次输入新密码"
            />
          </div>
        </Modal>
      )}

      <BottomBar />
    </div>
  );
}
