import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/primitives/Button';
import Icon from '../components/primitives/Icon';

export default function ForceChangePasswordPage() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="loading"><div className="loading-spinner"></div>加载中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.force_pwd_change) {
    const role = user.role;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'chef') return <Navigate to="/chef/orders" replace />;
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.new_password || form.new_password.length < 6) {
      showToast('新密码长度至少 6 位', 'error');
      return;
    }
    if (form.new_password !== form.confirm) {
      showToast('两次输入的密码不一致', 'error');
      return;
    }
    if (form.new_password === form.old_password) {
      showToast('新密码不能与旧密码相同', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.updatePassword(user.id, form.old_password, form.new_password);
      showToast('密码修改成功，请重新登录');

      localStorage.removeItem('fc_access_token');
      localStorage.removeItem('fc_refresh_token');
      localStorage.removeItem('fc_user');
      window.location.href = '/login';
    } catch (err) {
      showToast(err.message || '密码修改失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo"><Icon name="lock" size={48} /></div>
        <p className="login-subtitle">首次登录，请修改密码</p>

        <form onSubmit={handleSubmit}>
          <PasswordInput
            label="当前密码"
            value={form.old_password}
            onChange={(e) => setForm({ ...form, old_password: e.target.value })}
            placeholder="请输入当前密码"
            required
            autoComplete="current-password"
          />
          <PasswordInput
            label="新密码"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            placeholder="至少 6 位"
            required
            minLength="6"
            autoComplete="new-password"
          />
          <PasswordInput
            label="确认新密码"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            placeholder="再次输入新密码"
            required
            autoComplete="new-password"
            error={form.new_password !== form.confirm && form.confirm ? '两次输入的密码不一致' : undefined}
          />
          <Button
            type="submit"
            variant="filled"
            size="lg"
            loading={submitting}
            style={{ marginTop: 'var(--md-spacing-2)', width: '100%' }}
          >
            确认修改
          </Button>
        </form>
      </div>
    </div>
  );
}
