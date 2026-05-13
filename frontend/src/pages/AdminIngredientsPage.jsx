import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../contexts/CategoriesContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function AdminIngredientsPage() {
  const { showToast } = useToast();
  const { getByType } = useCategories();
  const ingredientCategories = getByType('ingredient');

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const [advCategory, setAdvCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', description: '', aliases: '' });

  const [showParseModal, setShowParseModal] = useState(false);
  const [parseText, setParseText] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseStep, setParseStep] = useState('input');
  const [parsedIngredients, setParsedIngredients] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [parseDecisions, setParseDecisions] = useState({});
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, [advCategory]);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      const category = advCategory || null;
      const res = await api.getIngredients(category, searchQuery || null);
      setIngredients(res.items || []);
    } catch (err) {
      showToast('加载食材失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setAdvCategory('');
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

  const openParseModal = () => {
    setParseText('');
    setParseStep('input');
    setParsedIngredients([]);
    setAllIngredients([]);
    setParseDecisions({});
    setShowParseModal(true);
  };

  const handleParse = async () => {
    if (!parseText.trim()) {
      showToast('请输入菜谱文本', 'error');
      return;
    }
    try {
      setParseLoading(true);
      const res = await api.parseIngredientsFromText(parseText);
      setParsedIngredients(res.parsed_ingredients || []);
      setAllIngredients(res.all_ingredients || []);

      const initial = {};
      for (const item of res.parsed_ingredients || []) {
        if (item.matched_ingredient_id) {
          initial[item.name] = { action: 'skip', alias_for_id: null, category: '' };
        } else {
          initial[item.name] = { action: 'new', alias_for_id: null, category: '' };
        }
      }
      setParseDecisions(initial);
      setParseStep('review');
    } catch (err) {
      showToast(err.message || '解析失败', 'error');
    } finally {
      setParseLoading(false);
    }
  };

  const removeParsedItem = (name) => {
    setParsedIngredients(prev => prev.filter(p => p.name !== name));
    setParseDecisions(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const renameParsedItem = (oldName, newName) => {
    setParsedIngredients(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
    setParseDecisions(prev => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (k === oldName) {
          next[newName] = { ...v, editedName: newName };
        } else {
          next[k] = v;
        }
      }
      return next;
    });
  };

  const updateDecision = (name, field, value) => {
    setParseDecisions(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }));
  };

  const handleImport = async () => {
    const items = Object.entries(parseDecisions)
      .filter(([, d]) => d.action !== 'skip')
      .map(([name, d]) => ({
        name: d.editedName || name,
        action: d.action,
        alias_for_id: d.action === 'alias' ? d.alias_for_id : null,
        category: d.action === 'new' ? d.category || null : null,
      }));

    if (items.length === 0) {
      showToast('没有需要导入的食材', 'error');
      return;
    }

    try {
      setImportLoading(true);
      const res = await api.batchImportIngredients(items);
      const errors = (res.results || []).filter(r => r.status === 'error');
      const success = (res.results || []).filter(r => r.status !== 'error');
      if (errors.length > 0) {
        showToast(`${success.length} 项成功，${errors.length} 项失败`, 'error');
      } else {
        showToast(`成功导入 ${success.length} 项`, 'success');
      }
      setShowParseModal(false);
      loadIngredients();
    } catch (err) {
      showToast(err.message || '导入失败', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Header
        title="食材管理"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={openParseModal}>📋 从菜谱解析</button>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ 添加</button>
          </div>
        }
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
        <div style={{ display: 'flex', gap: 4, marginRight: 4 }}>
          <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={loadIngredients}>搜索</button>
          <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => { handleClear(); }}>清空</button>
        </div>
      </div>

      <div style={{ padding: '0 16px 4px' }}>
        <button
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '2px 10px' }}
          onClick={() => setShowAdvFilter(!showAdvFilter)}
        >
          {showAdvFilter ? '收起筛选 ▲' : '高级筛选 ▼'}
        </button>
      </div>

      {showAdvFilter && (
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              className={`filter-chip ${!advCategory ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '2px 10px' }}
              onClick={() => setAdvCategory('')}
            >
              全部
            </button>
            {ingredientCategories.map(c => (
              <button
                key={c.id}
                className={`filter-chip ${advCategory === c.name ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '2px 10px' }}
                onClick={() => setAdvCategory(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
                    <td>{item.category || '-'}</td>
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
                        {item.category || ''}
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
                  {ingredientCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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

      {showParseModal && (
        <div className="modal-overlay" onClick={() => setShowParseModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: parseStep === 'review' ? 700 : 480 }}
          >
            <div className="modal-header">
              <h3>{parseStep === 'input' ? '从菜谱解析食材' : '解析结果 — 选择操作'}</h3>
              <button className="modal-close" onClick={() => setShowParseModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {parseStep === 'input' ? (
                <div className="form-group">
                  <label className="form-label">粘贴菜谱文本</label>
                  <textarea
                    className="form-input"
                    rows={8}
                    value={parseText}
                    onChange={(e) => setParseText(e.target.value)}
                    placeholder={'例如：\n番茄 2个、鸡蛋 3个、盐适量\n土豆 1个、青椒 2个、生抽 1勺'}
                  />
                </div>
              ) : (
                <div>
                  {parsedIngredients.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                      未识别到任何食材
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {parsedIngredients.map((item) => {
                        const decision = parseDecisions[item.name] || { action: 'new', alias_for_id: null, category: '' };
                        const isMatched = !!item.matched_ingredient_id;
                        const displayName = decision.editedName || item.name;
                        return (
                          <div
                            key={item.name}
                            style={{
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-lg)',
                              padding: 12,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <input
                                className="form-input"
                                style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem', padding: '4px 8px' }}
                                value={displayName}
                                onChange={(e) => renameParsedItem(item.name, e.target.value)}
                              />
                              {isMatched && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  background: 'var(--accent)',
                                  color: '#fff',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  whiteSpace: 'nowrap',
                                }}>
                                  已匹配: {item.matched_ingredient_name}
                                </span>
                              )}
                              <button
                                onClick={() => removeParsedItem(item.name)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '1.1rem',
                                  color: 'var(--danger)',
                                  padding: '0 4px',
                                  lineHeight: 1,
                                }}
                                title="移除"
                              >
                                ✕
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                              <select
                                className="form-input"
                                style={{ width: 'auto', minWidth: 120, fontSize: '0.85rem' }}
                                value={decision.action}
                                onChange={(e) => updateDecision(item.name, 'action', e.target.value)}
                              >
                                {isMatched && <option value="skip">跳过（已存在）</option>}
                                <option value="new">添加为新食材</option>
                                <option value="alias">添加为已有食材的别名</option>
                              </select>

                              {decision.action === 'new' && (
                                <select
                                  className="form-input"
                                  style={{ width: 'auto', minWidth: 100, fontSize: '0.85rem' }}
                                  value={decision.category}
                                  onChange={(e) => updateDecision(item.name, 'category', e.target.value)}
                                >
                                  <option value="">选择分类(可选)</option>
                                  {ingredientCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                              )}

                              {decision.action === 'alias' && (
                                <select
                                  className="form-input"
                                  style={{ width: 'auto', minWidth: 140, fontSize: '0.85rem' }}
                                  value={decision.alias_for_id || ''}
                                  onChange={(e) => updateDecision(item.name, 'alias_for_id', Number(e.target.value))}
                                >
                                  <option value="">选择目标食材</option>
                                  {allIngredients.map(ing => (
                                    <option key={ing.id} value={ing.id}>
                                      {ing.name}
                                      {ing.aliases && ing.aliases.length > 0 ? ` (别名: ${ing.aliases.join('、')})` : ''}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                if (parseStep === 'review') {
                  setParseStep('input');
                } else {
                  setShowParseModal(false);
                }
              }}>
                {parseStep === 'review' ? '返回' : '取消'}
              </button>
              {parseStep === 'input' ? (
                <button className="btn btn-primary" onClick={handleParse} disabled={parseLoading}>
                  {parseLoading ? '解析中...' : '开始解析'}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleImport} disabled={importLoading}>
                  {importLoading ? '导入中...' : '确认导入'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
