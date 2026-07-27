/**
 * 家味 · Family Chef — API Client
 * 封装所有后端 API 调用
 */

class ApiClient {
  constructor() {
    this.baseURL = '/api';
  }

  async getAuthHeader() {
    const token = localStorage.getItem('fc_access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async request(method, url, body = null, isFormData = false) {
    const headers = await this.getAuthHeader();

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const options = { method, headers };
    if (body) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    const res = await fetch(this.baseURL + url, options);

    if (res.status === 401) {
      localStorage.removeItem('fc_access_token');
      localStorage.removeItem('fc_refresh_token');
      localStorage.removeItem('fc_user');
      if (!url.includes('/auth/')) {
        window.location.href = '/login';
      }
      throw new Error('未认证');
    }

    if (res.status === 204) return null;

    const text = await res.text();
    if (!text) {
      if (!res.ok) throw new Error(`请求失败 (${res.status})`);
      return null;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(`请求失败 (${res.status}): ${text}`);
      return null;
    }

    if (!res.ok) {
      throw new Error(data.detail || '请求失败');
    }

    return data;
  }

  // ─── Auth ─────────────────────────────────────
  async login(username, password) {
    return this.post('/auth/login', { username, password });
  }

  async register(username, password, display_name) {
    return this.post('/auth/register', { username, password, display_name });
  }

  async refreshToken(refresh_token) {
    return this.post('/auth/refresh', { refresh_token });
  }

  // ─── Dishes ─────────────────────────────────────
  async getDishes(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.page_size) qs.set('page_size', params.page_size);
    if (params.search) qs.set('search', params.search);
    if (params.regions) params.regions.forEach(v => qs.append('regions', v));
    if (params.cuisines) params.cuisines.forEach(v => qs.append('cuisines', v));
    if (params.tastes) params.tastes.forEach(v => qs.append('tastes', v));
    if (params.seasons) params.seasons.forEach(v => qs.append('seasons', v));
    if (params.favorites_only) qs.set('favorites_only', 'true');
    if (params.sort) qs.set('sort', params.sort);
    if (params.status) qs.set('status', params.status);
    if (params.chef_filter) qs.set('chef_filter', params.chef_filter);
    if (params.is_semifinished !== undefined && params.is_semifinished !== null) qs.set('is_semifinished', String(params.is_semifinished));
    return this.get(`/dishes?${qs}`);
  }

  async getDish(id) {
    return this.get(`/dishes/${id}`);
  }

  async createDish(data) {
    return this.post('/dishes', data);
  }

  async updateDish(id, data) {
    return this.put(`/dishes/${id}`, data);
  }

  async deleteDish(id) {
    return this.del(`/dishes/${id}`);
  }

  async updateDishStatus(id, status) {
    return this.put(`/dishes/${id}/status`, { status });
  }

  async toggleChefPublish(dishId, publish) {
    return this.put(`/dishes/${dishId}/chef-publish`, { publish });
  }

  async getDietaryWarning(dishId) {
    return this.get(`/dishes/${dishId}/dietary_warning`);
  }

  async getSemifinishedDishes() {
    return this.get('/dishes/semifinished/list');
  }

  // ─── Orders ─────────────────────────────────────
  async createOrder(data) {
    const res = await this.post('/orders', data);
    return Array.isArray(res) ? res : [res];
  }

  async getOrders(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.page_size) qs.set('page_size', params.page_size);
    if (params.status) qs.set('status', params.status);
    return this.get(`/orders?${qs}`);
  }

  async getOrder(id) {
    return this.get(`/orders/${id}`);
  }

  async updateOrderStatus(id, status) {
    return this.put(`/orders/${id}/status`, { status });
  }

  async cancelOrder(id) {
    return this.del(`/orders/${id}`);
  }

  async getOrderStats() {
    return this.get('/orders/stats');
  }

  // ─── Wishes ─────────────────────────────────────
  async getWishes(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.page_size) qs.set('page_size', params.page_size);
    // CRITICAL: backend param name is `status_filter` (not `status`)
    // per backend/app/routers/wishes.py:63-82
    if (params.status) qs.set('status_filter', params.status);
    if (params.claimed_by_chef_id !== undefined && params.claimed_by_chef_id !== null) {
      qs.set('claimed_by_chef_id', params.claimed_by_chef_id);
    }
    if (params.mine) qs.set('mine', 'true');
    const query = qs.toString();
    return this.get(`/wishes${query ? '?' + query : ''}`);
  }

  async getWish(id) {
    return this.get(`/wishes/${id}`);
  }

  async createWish(data) {
    return this.post('/wishes', data);
  }

  async updateWish(id, data) {
    return this.put(`/wishes/${id}`, data);
  }

  async cancelWish(id) {
    return this.del(`/wishes/${id}`);
  }

  async claimWish(id) {
    return this.post(`/wishes/${id}/claim`);
  }

  async advanceWish(id, related_dish_id) {
    return this.post(`/wishes/${id}/advance`, { related_dish_id });
  }

  async rejectWish(id, reject_reason) {
    return this.post(`/wishes/${id}/reject`, { reject_reason });
  }

  // ─── Categories ─────────────────────────────────────
  async getCategories(type = null, tree = false) {
    const qs = new URLSearchParams();
    if (type) qs.set('type', type);
    if (tree) qs.set('tree', 'true');
    return this.get(`/categories?${qs}`);
  }

  async createCategory(data) {
    return this.post('/categories', data);
  }

  async updateCategory(id, data) {
    return this.put(`/categories/${id}`, data);
  }

  async deleteCategory(id) {
    return this.del(`/categories/${id}`);
  }

  // ─── Ingredients ─────────────────────────────────────
  async getIngredients(category = null, search = null) {
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (search) qs.set('search', search);
    return this.get(`/ingredients?${qs}`);
  }

  async createIngredient(data) {
    return this.post('/ingredients', data);
  }

  async updateIngredient(id, data) {
    return this.put(`/ingredients/${id}`, data);
  }

  async deleteIngredient(id) {
    return this.del(`/ingredients/${id}`);
  }

  async parseIngredientsFromText(text, smartMode = true) {
    return this.post('/ingredients/parse', { text, smart_mode: smartMode });
  }

  async batchImportIngredients(items) {
    return this.post('/ingredients/batch-import', { items });
  }

  // ─── Favorites ─────────────────────────────────────
  async addFavorite(dish_id) {
    return this.post('/favorites', { dish_id });
  }

  async removeFavorite(dish_id) {
    return this.del(`/favorites/${dish_id}`);
  }

  async getFavorites(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.page_size) qs.set('page_size', params.page_size);
    return this.get(`/favorites?${qs}`);
  }

  // ─── Preferences ─────────────────────────────────────
  async getPreferences() {
    return this.get('/preferences');
  }

  async updatePreferences(data) {
    return this.put('/preferences', data);
  }

  // ─── Users ─────────────────────────────────────
  async getUsers(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.page_size) qs.set('page_size', params.page_size);
    if (params.role) qs.set('role', params.role);
    if (params.search) qs.set('search', params.search);
    return this.get(`/users?${qs}`);
  }

  async getUser(id) {
    return this.get(`/users/${id}`);
  }

  async updateUser(id, data) {
    return this.put(`/users/${id}`, data);
  }

  async updatePassword(userId, old_password, new_password) {
    return this.put(`/users/${userId}/password`, { old_password, new_password });
  }

  async deleteUser(id) {
    return this.del(`/users/${id}`);
  }

  // ─── Chefs ─────────────────────────────────────
  async getChefs() {
    return this.get('/chefs');
  }

  async getSchedules(params = {}) {
    const qs = new URLSearchParams();
    if (params.schedule_date) qs.set('schedule_date', params.schedule_date);
    if (params.chef_id) qs.set('chef_id', params.chef_id);
    return this.get(`/chefs/schedules?${qs}`);
  }

  async updateSchedule(data) {
    return this.put('/chefs/schedules', data);
  }

  // ─── Admin ─────────────────────────────────────
  async getAdminLogs(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.page_size) qs.set('page_size', params.page_size);
    if (params.action) qs.set('action', params.action);
    if (params.target_type) qs.set('target_type', params.target_type);
    if (params.start_date) qs.set('start_date', params.start_date);
    if (params.end_date) qs.set('end_date', params.end_date);
    return this.get(`/admin/logs?${qs}`);
  }

  async getAdminStats() {
    return this.get('/admin/stats');
  }

  async getDashboard() {
    return this.get('/admin/dashboard');
  }

  // ─── Upload ─────────────────────────────────────
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.post('/upload/image', formData, true);
  }

  // ─── Guest Invitations ─────────────────────────────────────
  async getInvitations(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.page_size) qs.set('page_size', params.page_size);
    return this.get(`/guest/invitations?${qs}`);
  }

  async createInvitation(chefId) {
    const body = chefId ? { chef_id: chefId } : undefined;
    return this.post('/guest/invitations', body);
  }

  async revokeInvitation(id) {
    return this.put(`/guest/invitations/${id}/revoke`);
  }

  // ─── Tools ─────────────────────────────────────
  async extractIngredients(text) {
    return this.post('/tools/extract-ingredients', { text });
  }

  // ─── Core HTTP Methods ─────────────────────────────────────
  async get(url) {
    return this.request('GET', url);
  }

  async post(url, body, isFormData = false) {
    return this.request('POST', url, body, isFormData);
  }

  async put(url, body, isFormData = false) {
    return this.request('PUT', url, body, isFormData);
  }

  async del(url) {
    return this.request('DELETE', url);
  }
}

export const api = new ApiClient();
export default api;
