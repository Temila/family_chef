/**
 * Auth Context - 全局认证状态管理
 */

/* eslint-disable react-refresh/only-export-components -- Context Provider 与 useAuth 同文件导出是 React Context 标准范式；拆分 Hook 需改动所有消费方导入（架构变更，超出 lint 清理范围） */

import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authManager } from '../auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化时从 localStorage 读取用户信息；queueMicrotask 规避 set-state-in-effect
    queueMicrotask(() => {
      const savedUser = authManager.getUser();
      if (savedUser) {
        setUser(savedUser);
      }
      setLoading(false);
    });
  }, []);

  const login = (accessToken, refreshToken, userData) => {
    authManager.setTokens(accessToken, refreshToken, userData);
    setUser(userData);
  };

  const logout = () => {
    authManager.clear();
    setUser(null);
  };

  const updateUser = (userData) => {
    const newUser = { ...user, ...userData };
    authManager.setTokens(
      authManager.getToken(),
      authManager.getRefreshToken(),
      newUser
    );
    setUser(newUser);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    isChef: user?.role === 'chef' || user?.role === 'admin',
    role: user?.role || 'user',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
