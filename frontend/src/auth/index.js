/**
 * 家味 · Family Chef — Auth Manager
 * Token 管理、用户信息、权限检查
 */

const TOKEN_KEY = 'fc_access_token';
const REFRESH_KEY = 'fc_refresh_token';
const USER_KEY = 'fc_user';

export const auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  },

  getUser() {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
  },

  setTokens(access, refresh, user) {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isAdmin() {
    const u = this.getUser();
    return u && u.role === 'admin';
  },

  isChef() {
    const u = this.getUser();
    return u && (u.role === 'chef' || u.role === 'admin');
  },

  getRole() {
    return this.getUser()?.role || 'user';
  },

  getRoleLabel() {
    const map = { admin: '管理员', chef: '厨师', user: '用户' };
    return map[this.getRole()] || '用户';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      return false;
    }
    return true;
  },

  requireRole(roles) {
    if (!this.isLoggedIn()) {
      return false;
    }
    if (!roles.includes(this.getRole())) {
      return false;
    }
    return true;
  }
};

export default auth;
