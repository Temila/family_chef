import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function AdminIngredientsPage() {
  const { showToast } = useToast();

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', description: '', aliases: '' });

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      const res = await api.getIngredients(null, searchQuery || null);
      setIngredients(res.items || []);
    } catch (err) {
      showToast('加载食材失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: '', category: '', description: '', aliases: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || '',
      category: item.category || '',
      description: item.description || '',
      aliases: (item.aliases || []).join(', '),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('请输入食材名称', 'error');
      return;
    }
    try {
      const data = {
        name: form.name,
        category: form.category || null,
        description: form.description || null,
        aliases: form.aliases ? form.aliases.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
      };

      if (editingItem) {
        await api.updateIngredient(editingItem.id, data);
        showToast('更新成功');
      } else {
        await api.createIngredient(data);
        showToast('创建成功');
      }
      setShowModal(false);
      loadIngredients();
    } catch (err) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除该食材？')) return;
    try {
      await api.deleteIngredient(id);
      showToast('删除成功');
      loadIngredients();
    } catch (err) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  const categoryMap = { meat: '肉类', vegetable: '蔬菜', seafood: '海鲜', fruit: '水果', seasoning: '调味品', other: '其他' };

  return (
    <div className="page-container">
      <Header
        title="食材管理"
        actions={<button className="btn btn-primary btn-sm" onClick={openCreate}>+ 添加</button>}
      />

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索食材..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadIngredients()}
        />
      </div>

      {loading ? (
        <Loading />
      ) : ingredients.length === 0 ? (
        <EmptyState icon="🥬" text="暂无食材，点击添加" />
      ) : (
        <section className="section pt-0 pc-content-area">
          <div className="pc-data-table-wrap">
            <table className="pc-data-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>分类</th>
                  <th>别名</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{categoryMap[item.category] || item.category || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {(item.aliases || []).join('、') || '-'}
                    </td>
                    <td><Badge status={item.is_active ? 'published' : 'hidden'} /></td>
                    <td>
                      <div className="pc-action-btns">
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}>编辑</button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleDelete(item.id)}
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list">
            {ingredients.map(item => (
              <div key={item.id} className="card" style={{ marginBottom: 10 }}>
                <div className="card-body" style={{ padding: 12 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {categoryMap[item.category] || item.category || ''}
                      </div>
                    </div>
                    <Badge status={item.is_active ? 'published' : 'hidden'} />
                  </div>
                  {(item.aliases || []).length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                      别名：{item.aliases.join('、')}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button className="btn btn-outline btn-sm flex-1" onClick={() => openEdit(item)}>编辑</button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDelete(item.id)}
                      style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    >
                      删除
                    </button>
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
              <h3>{editingItem ? '编辑食材' : '添加食材'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">名称 *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：西红柿" />
              </div>
              <div className="form-group">
                <label className="form-label">分类</label>
                <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">请选择</option>
                  <option value="meat">肉类</option>
                  <option value="vegetable">蔬菜</option>
                  <option value="seafood">海鲜</option>
                  <option value="fruit">水果</option>
                  <option value="seasoning">调味品</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">描述</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="可选描述" />
              </div>
              <div className="form-group">
                <label className="form-label">别名（逗号分隔）</label>
                <input className="form-input" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="如：番茄, 柿子" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
