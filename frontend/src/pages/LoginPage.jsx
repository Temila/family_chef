/**
 * Login Page - 登录/注册页面
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import { theme } from '../utils';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('login');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({
    username: '',
    display_name: '',
    password: '',
    confirm: ''
  });
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');

    if (registerData.password !== registerData.confirm) {
      setRegisterError('两次输入的密码不一致');
      return;
    }

    if (registerData.password.length < 6) {
      setRegisterError('密码长度至少为 6 位');
      return;
    }

    try {
      await api.register(
        registerData.username,
        registerData.password,
        registerData.display_name
      );
      showToast('注册成功，请登录');
      setActiveTab('login');
      setLoginData({ ...loginData, username: registerData.username });
    } catch (err) {
      setRegisterError(err.message || '注册失败');
    }
  };

  return (
    <div className="login-container">
      <ThemeToggle />

      <div className="login-card">
        <div className="login-logo">🍲 家味</div>
        <p className="login-subtitle">Family Chef · 家的味道</p>

        <div className="tab-switch">
          <button
            className={activeTab === 'login' ? 'active' : ''}
            onClick={() => {
              setActiveTab('login');
              setLoginError('');
            }}
          >
            登录
          </button>
          <button
            className={activeTab === 'register' ? 'active' : ''}
            onClick={() => {
              setActiveTab('register');
              setRegisterError('');
            }}
          >
            注册
          </button>
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">用户名</label>
              <input
                className="form-input"
                type="text"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({ ...loginData, username: e.target.value })
                }
                placeholder="请输入用户名"
                required
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">密码</label>
              <input
                className="form-input"
                type="password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                placeholder="请输入密码"
                required
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <div className="form-error show">{loginError}</div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: '8px' }}
            >
              登 录
            </button>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">用户名</label>
              <input
                className="form-input"
                type="text"
                value={registerData.username}
                onChange={(e) =>
                  setRegisterData({ ...registerData, username: e.target.value })
                }
                placeholder="请输入用户名"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">显示名称</label>
              <input
                className="form-input"
                type="text"
                value={registerData.display_name}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    display_name: e.target.value
                  })
                }
                placeholder="请输入显示名称"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">密码</label>
              <input
                className="form-input"
                type="password"
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({ ...registerData, password: e.target.value })
                }
                placeholder="至少 6 位"
                required
                minLength="6"
              />
            </div>
            <div className="form-group">
              <label className="form-label">确认密码</label>
              <input
                className="form-input"
                type="password"
                value={registerData.confirm}
                onChange={(e) =>
                  setRegisterData({ ...registerData, confirm: e.target.value })
                }
                placeholder="再次输入密码"
                required
              />
            </div>
            {registerError && (
              <div className="form-error show">{registerError}</div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: '8px' }}
            >
              注 册
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
