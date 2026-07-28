import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../contexts/CategoriesContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Button from '../components/primitives/Button';
import Card from '../components/primitives/Card';
import Input from '../components/primitives/Input';
import Chip from '../components/primitives/Chip';
import Modal from '../components/composites/Modal';

export default function AdminIngredientsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getByType } = useCategories();
  const ingredientCategories = getByType('ingredient');
  const dropdownRef = useRef(null);

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const [advCategory, setAdvCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', description: '', aliases: '' });
  const [openDropdown, setOpenDropdown] = useState(null);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  const toggleDropdown = (id) => {
    setOpenDropdown(prev => prev === id ? null : id);
  };

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
            <Button variant="outlined" size="sm" onClick={openParseModal}>📋 从菜谱解析</Button>
            <Button variant="filled" size="sm" onClick={openCreate}>+ 添加</Button>
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
          <Button variant="filled" size="sm" className="btn-search" onClick={loadIngredients}>搜索</Button>
          <Button variant="tonal" size="sm" className="btn-search" onClick={() => { handleClear(); }}>清空</Button>
        </div>
      </div>

      <div style={{ padding: '0 16px 4px' }}>
        <Button
          variant="tonal"
          size="sm"
          className="btn-search"
          onClick={() => setShowAdvFilter(!showAdvFilter)}
        >
          {showAdvFilter ? '收起筛选 ▲' : '高级筛选 ▼'}
        </Button>
      </div>

      {showAdvFilter && (
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--md-color-outline-variant)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Chip variant="filter" selected={!advCategory}
              onClick={() => setAdvCategory('')}
            >
              全部
            </Chip>
            {ingredientCategories.map(c => (
              <Chip variant="filter" selected={advCategory === c.name}
                key={c.id}
                onClick={() => setAdvCategory(c.name)}
              >
                {c.name}
              </Chip>
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
                  <th>关联菜品</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.category || '-'}</td>
                    <td style={{ color: 'var(--md-color-on-surface-variant)', fontSize: '0.8rem' }}>
                      {(item.aliases || []).join('、') || '-'}
                    </td>
                    <td style={{ position: 'relative' }}>
                      <span>{item.dish_count || 0}</span>
                      {(item.linked_dishes || []).length > 0 && (
                        <Button
                          variant="outlined"
                          size="sm"
                          className="btn-search"
                          style={{ marginLeft: 6, verticalAlign: 'middle' }}
                          onClick={(e) => { e.stopPropagation(); toggleDropdown(item.id); }}
                        >
                          ▾
                        </Button>
                      )}
                      {openDropdown === item.id && (item.linked_dishes || []).length > 0 && (
                        <div ref={dropdownRef} style={{
                          position: 'absolute', top: '100%', left: 0, zIndex: 50,
                          background: 'var(--md-color-surface-container-lowest)', border: '1px solid var(--md-color-outline-variant)',
                          borderRadius: 'var(--md-radius-md)', boxShadow: 'var(--md-elevation-2)',
                          minWidth: 160, maxHeight: 200, overflowY: 'auto', padding: 4,
                        }}>
                          {item.linked_dishes.map(d => (
                            <div
                              key={d.id}
                              onClick={() => {
                                setOpenDropdown(null);
                                const base = user?.role === 'admin' ? '/admin/dishes' : '/chef/dishes';
                                navigate(`${base}?edit=${d.id}`);
                              }}
                              style={{
                                      padding: '6px 10px', cursor: 'pointer', borderRadius: 'var(--md-radius-xs)',
                                fontSize: '0.85rem', color: 'var(--md-color-primary)',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--md-color-surface-container)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {d.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="pc-action-btns">
                        <Button variant="outlined" size="sm" onClick={() => openEdit(item)}>编辑</Button>
                        {(item.dish_count || 0) > 0 ? (
                          <Button
                            variant="outlined"
                            size="sm"
                            disabled
                            style={{ opacity: 0.4, cursor: 'not-allowed' }}
                            title={`已被 ${item.dish_count} 个菜品关联，无法删除`}
                          >
                            删除
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            style={{ borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}
                          >
                            删除
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list">
            {ingredients.map(item => (
              <Card key={item.id} variant="elevated" style={{ marginBottom: 10 }}>
                <div className="flex items-center gap-3 mb-4">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{item.category || ''} · 关联 {item.dish_count || 0} 个菜品</span>
                        {(item.linked_dishes || []).length > 0 && (
                          <span style={{ position: 'relative' }}>
                            <Button
                              variant="outlined"
                              size="sm"
                              className="btn-search"
                              onClick={(e) => { e.stopPropagation(); toggleDropdown(item.id); }}
                            >
                              ▾
                            </Button>
                            {openDropdown === item.id && (
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, zIndex: 50,
                                background: 'var(--md-color-surface-container-lowest)', border: '1px solid var(--md-color-outline-variant)',
                                borderRadius: 'var(--md-radius-md)', boxShadow: 'var(--md-elevation-2)',
                                minWidth: 160, maxHeight: 200, overflowY: 'auto', padding: 4,
                              }}>
                                {item.linked_dishes.map(d => (
                                  <div
                                    key={d.id}
                              onClick={() => {
                                setOpenDropdown(null);
                                const base = user?.role === 'admin' ? '/admin/dishes' : '/chef/dishes';
                                navigate(`${base}?edit=${d.id}`);
                              }}
                                    style={{
                                padding: '6px 10px', cursor: 'pointer', borderRadius: 'var(--md-radius-xs)',
                                      fontSize: '0.85rem', color: 'var(--md-color-primary)',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--md-color-surface-container)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    {d.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(item.aliases || []).length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)', marginBottom: 8 }}>
                      别名：{item.aliases.join('、')}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outlined" size="sm" className="flex-1" onClick={() => openEdit(item)}>编辑</Button>
                    {(item.dish_count || 0) > 0 ? (
                      <Button
                        variant="outlined"
                        size="sm"
                        disabled
                        style={{ opacity: 0.4, cursor: 'not-allowed' }}
                        title={`已被 ${item.dish_count} 个菜品关联，无法删除`}
                      >
                        删除
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        style={{ borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}
                      >
                        删除
                      </Button>
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
          title={editingItem ? '编辑食材' : '添加食材'}
          actions={[
            <Button key="cancel" variant="tonal" onClick={() => setShowModal(false)}>取消</Button>,
            <Button key="save" variant="filled" onClick={handleSave}>保存</Button>,
          ]}
        >
          <Input
            label="名称 *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="如：西红柿"
          />
          {/* SC-10: select 保留 .form-input (Phase 11 Select primitive 上线时处理) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 6 }}>分类</label>
            <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">请选择</option>
              {ingredientCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <Input
            multiline
            rows={2}
            label="描述"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="可选描述"
          />
          <Input
            label="别名（逗号分隔）"
            value={form.aliases}
            onChange={(e) => setForm({ ...form, aliases: e.target.value })}
            placeholder="如：番茄, 柿子"
          />
        </Modal>
      )}

      {showParseModal && (
        <Modal
          open
          onClose={() => setShowParseModal(false)}
          title={parseStep === 'input' ? '从菜谱解析食材' : '解析结果 — 选择操作'}
          style={{ maxWidth: parseStep === 'review' ? 700 : 480 }}
          actions={[
            <Button key="back" variant="tonal" onClick={() => {
              if (parseStep === 'review') {
                setParseStep('input');
              } else {
                setShowParseModal(false);
              }
            }}>
              {parseStep === 'review' ? '返回' : '取消'}
            </Button>,
            parseStep === 'input' ? (
              <Button key="parse" variant="filled" onClick={handleParse} loading={parseLoading}>
                开始解析
              </Button>
            ) : (
              <Button key="import" variant="filled" onClick={handleImport} loading={importLoading}>
                确认导入
              </Button>
            ),
          ]}
        >
          {parseStep === 'input' ? (
            <Input
              multiline
              rows={8}
              label="粘贴菜谱文本"
              value={parseText}
              onChange={(e) => setParseText(e.target.value)}
              placeholder={'例如：\n番茄 2个、鸡蛋 3个、盐适量\n土豆 1个、青椒 2个、生抽 1勺'}
            />
          ) : (
            <div>
              {parsedIngredients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--md-color-on-surface-variant)' }}>
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
                          border: '1px solid var(--md-color-outline-variant)',
                          borderRadius: 'var(--md-radius-md)',
                          padding: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          {/* === 10-02-MIGRATION:START === renameParsedItem input → Input primitive === */}
                          <Input
                            aria-label="食材名"
                            value={displayName}
                            onChange={(e) => renameParsedItem(item.name, e.target.value)}
                            style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem' }}
                          />
                          {/* === 10-02-MIGRATION:END === */}
                          {isMatched && (
                            <span style={{
                              fontSize: '0.75rem',
                              background: 'var(--md-color-primary)',
                              color: 'var(--md-color-on-primary)',
                              padding: '2px 8px',
                              borderRadius: 'var(--md-radius-full)',
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
                              color: 'var(--md-color-error)',
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
        </Modal>
      )}

      <BottomBar />
    </div>
  );
}
