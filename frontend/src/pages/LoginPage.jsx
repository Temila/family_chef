import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/primitives/Button';
import Input from '../components/primitives/Input';
import Icon from '../components/primitives/Icon';
import { theme } from '../utils';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    theme.initTheme();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await api.login(loginData.username, loginData.password);
      login(res.access_token, res.refresh_token, res.user);
      showToast('登录成功');
      navigate('/home');
    } catch (err) {
      setLoginError(err.message || '登录失败，请检查用户名和密码');
    }
  };

  return (
    <div className="login-container">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="login-card">
        <div className="login-logo"><Icon name="ramen-dining" size={48} /> 家味</div>
        <p className="login-subtitle">Family Chef · 家的味道</p>

        <form onSubmit={handleLogin}>
          <Input
            label="用户名"
            type="text"
            value={loginData.username}
            onChange={(e) =>
              setLoginData({ ...loginData, username: e.target.value })
            }
            placeholder="请输入用户名"
            required
            autoComplete="username"
          />
          <PasswordInput
            label="密码"
            value={loginData.password}
            onChange={(e) =>
              setLoginData({ ...loginData, password: e.target.value })
            }
            placeholder="请输入密码"
            required
            autoComplete="current-password"
            error={loginError || undefined}
          />
          <Button
            type="submit"
            variant="filled"
            size="lg"
            style={{ marginTop: 'var(--md-spacing-2)', width: '100%' }}
          >
            登 录
          </Button>
        </form>
      </div>
    </div>
  );
}
