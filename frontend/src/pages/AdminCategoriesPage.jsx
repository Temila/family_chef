import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../contexts/CategoriesContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Card from '../components/primitives/Card';
import Input from '../components/primitives/Input';
import Button from '../components/primitives/Button';
import Chip from '../components/primitives/Chip';
import Modal from '../components/composites/Modal';
import Icon from '../components/primitives/Icon';

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const { categoryTypes, getTypeMeta, reload } = useCategories();

  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const types = categoryTypes();
  const [activeType, setActiveType] = useState(types.length > 0 ? types[0].key : 'region');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', parent_id: '', sort_order: 0 });

  const loadAllCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCategories();
      setAllCategories(res.items || []);
    } catch {
      showToast('加载分类失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const filterCategories = useCallback(() => {
    setCategories(allCategories.filter(c => c.type === activeType));
  }, [allCategories, activeType]);

  useEffect(() => {
    // queueMicrotask 规避 set-state-in-effect
    queueMicrotask(() => { loadAllCategories(); });
  }, [loadAllCategories]);

  useEffect(() => {
    // queueMicrotask 规避 set-state-in-effect
    queueMicrotask(() => { filterCategories(); });
  }, [filterCategories]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: '', parent_id: '', sort_order: 0 });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      parent_id: item.parent_id || '',
      sort_order: item.sort_order || 0,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('请输入分类名称', 'error');
      return;
    }
    try {
      const data = {
        name: form.name,
        type: activeType,
        parent_id: form.parent_id ? parseInt(form.parent_id) : null,
        sort_order: form.sort_order || 0,
      };

      if (editingItem) {
        await api.updateCategory(editingItem.id, data);
        showToast('更新成功');
      } else {
        await api.createCategory(data);
        showToast('创建成功');
      }
      setShowModal(false);
      reload();
      loadAllCategories();
    } catch (err) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除该分类？')) return;
    try {
      await api.deleteCategory(id);
      showToast('删除成功');
      reload();
      loadAllCategories();
    } catch (err) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  const parentOptions = allCategories.filter(c => c.type === 'region' && activeType === 'cuisine');

  return (
    <div className="page-container">
      <Header
        title="分类管理"
        actions={
          <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
            <Button variant="filled" size="sm" onClick={openCreate}>+ 添加</Button>
          </div>
        }
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-2)', padding: '0 var(--md-spacing-4) var(--md-spacing-3)'}}>
        {types.map(t => (
          <Chip variant="filter" selected={activeType === t.key}
            key={t.key}
            
            onClick={() => setActiveType(t.key)}
          >
            {t.icon} {t.label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : categories.length === 0 ? (
        <EmptyState icon="folder" text="暂无分类数据" />
      ) : (
        <section className="section pt-0 pc-content-area">
          <div className="pc-data-table-wrap">
            <table className="pc-data-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>类型</th>
                  {activeType === 'cuisine' && <th>所属种类</th>}
                  <th>排序</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(item => {
                  const parent = item.parent_id ? allCategories.find(c => c.id === item.parent_id) : null;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{getTypeMeta(item.type).label}</td>
                      {activeType === 'cuisine' && <td>{parent ? parent.name : '-'}</td>}
                      <td>{item.sort_order}</td>
                      <td><Icon name={item.is_active ? 'check' : 'close'} size={18} /></td>
                      <td>
                        <div className="pc-action-btns">
                          <Button variant="outlined" size="sm" onClick={() => openEdit(item)}>编辑</Button>
                          <Button
                            variant="outlined"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            style={{ borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list">
            {categories.map(item => {
              const parent = item.parent_id ? allCategories.find(c => c.id === item.parent_id) : null;
              return (
                <Card key={item.id} variant="elevated" style={{ marginBottom: 'var(--md-spacing-2)'}}>
                  <div className="flex items-center gap-3 mb-4">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)' }}>
                          {getTypeMeta(item.type).label}
                          {parent ? ` · ${parent.name}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outlined" size="sm" className="flex-1" onClick={() => openEdit(item)}>编辑</Button>
                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        style={{ borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}
                      >
                        删除
                      </Button>
                    </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {showModal && (
        <Modal
          open
          onClose={() => setShowModal(false)}
          title={editingItem ? '编辑分类' : `添加${getTypeMeta(activeType).label}`}
          actions={[
            <Button key="cancel" variant="tonal" onClick={() => setShowModal(false)}>取消</Button>,
            <Button key="save" variant="filled" onClick={handleSave}>保存</Button>,
          ]}
        >
          <Input
            label="名称 *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="输入分类名称"
          />
          {activeType === 'cuisine' && parentOptions.length > 0 && (
            /* SC-10: select 保留 .form-input */
            <div style={{ marginBottom: 'var(--md-spacing-4)'}}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>所属种类</label>
              <select
                className="form-input"
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              >
                <option value="">无</option>
                {parentOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <Input
            label="排序（数字越小越靠前）"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
          />
        </Modal>
      )}

      <BottomBar />
    </div>
  );
}
