/**
 * 家味 · Family Chef — Auth Manager
 * Token 管理、用户信息、权限检查
 */

const Auth = {
  TOKEN_KEY: 'fc_access_token',
  REFRESH_KEY: 'fc_refresh_token',
  USER_KEY: 'fc_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(this.REFRESH_KEY);
  },

  getUser() {
    const u = localStorage.getItem(this.USER_KEY);
    return u ? JSON.parse(u) : null;
  },

  setTokens(access, refresh, user) {
    localStorage.setItem(this.TOKEN_KEY, access);
    localStorage.setItem(this.REFRESH_KEY, refresh);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
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

  requireAuth(redirectUrl = '/login.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  },

  requireRole(roles, redirectUrl = '/index.html') {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    if (!roles.includes(this.getRole())) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }
};
