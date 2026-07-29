import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import PasswordInput from '../components/PasswordInput';
import Card from '../components/primitives/Card';
import Input from '../components/primitives/Input';
import Button from '../components/primitives/Button';
import Badge from '../components/primitives/Badge';
import Chip from '../components/primitives/Chip';
import Modal from '../components/composites/Modal';
import Icon from '../components/primitives/Icon';

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
        <span className="search-icon"><Icon name="search" size={20} /></span>
        <input
          type="text"
          placeholder="搜索用户名..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-2)', padding: '0 var(--md-spacing-4) var(--md-spacing-3)'}}>
        {['all', 'admin', 'chef', 'user'].map(r => (
          <Chip variant="filter" selected={filterRole === r}
            key={r}
            
            onClick={() => setFilterRole(r)}
          >
            {r === 'all' ? '全部' : roleMap[r]} ({r === 'all' ? users.length : users.filter(u => u.role === r).length})
          </Chip>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="group" size={48} /></div>
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
                      <Badge tone={u.is_active ? 'success' : 'error'}>
                        {u.is_active ? '启用' : '停用'}
                      </Badge>
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
              <Card key={u.id} variant="elevated" style={{ marginBottom: 'var(--md-spacing-3)'}}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="avatar">
                      {(u.display_name || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{u.display_name || u.username}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)' }}>@{u.username}</div>
                    </div>
                    <span className={`role-badge role-${u.role}`}>{roleMap[u.role] || u.role}</span>
                    <Badge tone={u.is_active ? 'success' : 'error'}>
                      {u.is_active ? '启用' : '停用'}
                    </Badge>
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
              </Card>
            ))}
          </div>
        </section>
      )}

      {showModal && (
        <Modal
          open
          onClose={() => setShowModal(false)}
          title={editingUser ? '编辑用户' : '添加用户'}
          actions={[
            <Button key="cancel" variant="tonal" onClick={() => setShowModal(false)}>取消</Button>,
            <Button key="save" variant="filled" onClick={handleSave}>保存</Button>,
          ]}
        >
          <Input
            label="用户名"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="请输入用户名"
            disabled={!!editingUser}
            required
          />
          <Input
            label="显示名称"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="请输入显示名称"
          />
          <PasswordInput
            label={editingUser ? '重置密码（留空不修改）' : '密码'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editingUser ? '留空不修改' : '至少 6 位'}
            minLength="6"
          />
          {/* SC-10: select 保留 .form-input */}
          <div style={{ marginBottom: 'var(--md-spacing-4)'}}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>角色</label>
            <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">用户</option>
              <option value="chef">厨师</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          {editingUser && (
            <div style={{ marginBottom: 'var(--md-spacing-4)'}}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>状态</label>
              <select className="form-input" value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                <option value="true">启用</option>
                <option value="false">停用</option>
              </select>
            </div>
          )}
        </Modal>
      )}

      <BottomBar />
    </div>
  );
}
