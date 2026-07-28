import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/primitives/Button';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: '', display_name: '', password: '', role: 'user', is_active: true });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers({ page: 1, page_size: 100 });
      setUsers(res.items || []);
    } catch (err) {
      showToast('加载用户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', display_name: '', password: '', role: 'user', is_active: true });
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      username: u.username || '',
      display_name: u.display_name || '',
      password: '',
      role: u.role || 'user',
      is_active: u.is_active !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        const data = { display_name: form.display_name, role: form.role, is_active: form.is_active };
        if (form.password) {
          data.password = form.password;
        }
        await api.updateUser(editingUser.id, data);
        showToast('更新成功');
      } else {
        if (!form.username.trim()) { showToast('请输入用户名', 'error'); return; }
        if (!form.password || form.password.length < 6) { showToast('密码至少 6 位', 'error'); return; }
        await api.register(form.username, form.password, form.display_name || form.username);
        if (form.role !== 'user') {
          const res = await api.getUsers({ page: 1, page_size: 1, search: form.username });
          const newUser = (res.items || [])[0];
          if (newUser) await api.updateUser(newUser.id, { role: form.role });
        }
        showToast('创建成功');
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      showToast(u.is_active ? '已停用' : '已启用');
      loadUsers();
    } catch (err) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleDelete = async (u) => {
    if (u.username === 'admin') {
      showToast('默认管理员不允许删除', 'error');
      return;
    }
    if (u.id === currentUser.id) {
      showToast('不能删除自己', 'error');
      return;
    }
    if (!window.confirm(`确定删除用户 ${u.display_name || u.username}？`)) return;
    try {
      await api.deleteUser(u.id);
      showToast('删除成功');
      loadUsers();
    } catch (err) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  const filtered = users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (u.username || '').toLowerCase().includes(q) ||
        (u.display_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const roleMap = { admin: '管理员', chef: '厨师', user: '用户' };

  return (
    <div className="page-container">
      <Header
        title="用户管理"
        actions={<Button variant="filled" size="sm" onClick={openCreate}>+ 添加</Button>}
      />

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索用户名..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-chips">
        {['all', 'admin', 'chef', 'user'].map(r => (
          <button
            key={r}
            className={`filter-chip ${filterRole === r ? 'active' : ''}`}
            onClick={() => setFilterRole(r)}
          >
            {r === 'all' ? '全部' : roleMap[r]} ({r === 'all' ? users.length : users.filter(u => u.role === r).length})
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-text">没有找到用户</div>
        </div>
      ) : (
        <section className="section pt-0 pc-content-area">
          <div className="pc-data-table-wrap">
            <table className="pc-data-table">
              <thead>
                <tr>
                  <th>用户信息</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="pc-user-cell">
                        <div className="avatar avatar-sm">
                          {(u.display_name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="pc-user-name">{u.display_name || u.username}</div>
                          <div className="pc-user-sub">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge role-${u.role}`}>{roleMap[u.role] || u.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? '启用' : '停用'}
                      </span>
                    </td>
                    <td>
                      <div className="pc-action-btns">
                        <Button variant="outlined" size="sm" onClick={() => openEdit(u)}>编辑</Button>
                        {u.id !== currentUser.id && (
                          <>
                            <Button variant="tonal" size="sm" onClick={() => handleToggleActive(u)}>
                              {u.is_active ? '停用' : '启用'}
                            </Button>
                            {u.username !== 'admin' && (
                              <Button
                                variant="outlined"
                                size="sm"
                                onClick={() => handleDelete(u)}
                                style={{ borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}
                              >
                                删除
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list">
            {filtered.map(u => (
              <div key={u.id} className="card" style={{ marginBottom: 12 }}>
                <div className="card-body" style={{ padding: 12 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="avatar">
                      {(u.display_name || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{u.display_name || u.username}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)' }}>@{u.username}</div>
                    </div>
                    <span className={`role-badge role-${u.role}`}>{roleMap[u.role] || u.role}</span>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outlined" size="sm" className="flex-1" onClick={() => openEdit(u)}>编辑</Button>
                    {u.id !== currentUser.id && (
                      <>
                        <Button variant="tonal" size="sm" onClick={() => handleToggleActive(u)}>
                          {u.is_active ? '停用' : '启用'}
                        </Button>
                        {u.username !== 'admin' && (
                          <Button
                            variant="outlined"
                            size="sm"
                            onClick={() => handleDelete(u)}
                            style={{ borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}
                          >
                            删除
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? '编辑用户' : '添加用户'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input
                  className="form-input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="请输入用户名"
                  disabled={!!editingUser}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">显示名称</label>
                <input
                  className="form-input"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="请输入显示名称"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{editingUser ? '重置密码（留空不修改）' : '密码'}</label>
                <PasswordInput
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingUser ? '留空不修改' : '至少 6 位'}
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label className="form-label">角色</label>
                <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="user">用户</option>
                  <option value="chef">厨师</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              {editingUser && (
                <div className="form-group">
                  <label className="form-label">状态</label>
                  <select className="form-input" value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                    <option value="true">启用</option>
                    <option value="false">停用</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <Button variant="tonal" onClick={() => setShowModal(false)}>取消</Button>
              <Button variant="filled" onClick={handleSave}>保存</Button>
            </div>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
