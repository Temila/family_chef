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
import Sheet from '../components/composites/Sheet';
import { createPortal } from 'react-dom';
import Icon from '../components/primitives/Icon';

export default function AdminIngredientsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [openDropdown, setOpenDropdown] = useState(null);
  const triggerRefs = useRef({});
  const [dropdownCoords, setDropdownCoords] = useState(null);

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
    if (openDropdown === null) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-dropdown-id]')) {
        setOpenDropdown(null);
      } else {
        const id = e.target.closest('[data-dropdown-id]').dataset.dropdownId;
        if (id !== String(openDropdown)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

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
          <div className="header-action-bar header-action-bar--split">
            <Button variant="tonal" size="sm" onClick={() => setShowAdvFilter(true)}>高级筛选</Button>
            <div style={{ display: 'flex', gap: 'var(--md-spacing-2)' }}>
              <Button variant="tonal" size="sm" onClick={openParseModal}><Icon name="edit" size={18} /> 解析文本</Button>
              <Button variant="filled" size="sm" onClick={openCreate}>+ 添加</Button>
            </div>
          </div>
        }
      />

      <div className="search-bar">
        <span className="search-icon"><Icon name="search" size={20} /></span>
        <input
          type="text"
          placeholder="搜索食材..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadIngredients()}
        />
        <div style={{ display: 'flex', gap: 'var(--md-spacing-1)', marginRight: 'var(--md-spacing-1)'}}>
          <Button variant="filled" size="sm" className="btn-search" onClick={loadIngredients}>搜索</Button>
          <Button variant="tonal" size="sm" className="btn-search" onClick={() => { handleClear(); }}>清空</Button>
        </div>
      </div>

      {showAdvFilter && (
        <Sheet
          open
          onClose={() => setShowAdvFilter(false)}
          title="高级筛选 — 食材"
          footer={
            <div className="flex gap-3" style={{ width: '100%' }}>
              <Button variant="tonal" className="flex-1" onClick={() => { setAdvCategory(''); }}>清空</Button>
              <Button variant="filled" className="flex-1" onClick={() => setShowAdvFilter(false)}>应用</Button>
            </div>
          }
        >
          <div className="filter-section">
            <div className="filter-section-label">分类</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-1)' }}>
              <Chip variant="filter" selected={!advCategory} onClick={() => setAdvCategory('')}>全部</Chip>
              {ingredientCategories.map(c => (
                <Chip variant="filter" selected={advCategory === c.name} key={c.id} onClick={() => setAdvCategory(c.name)}>{c.name}</Chip>
              ))}
            </div>
          </div>
        </Sheet>
      )}

      {loading ? (
        <Loading />
      ) : ingredients.length === 0 ? (
        <EmptyState icon="eco" text="暂无食材，点击添加" />
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
                        <button
                          type="button"
                          ref={(el) => { if (el) triggerRefs.current[item.id] = el; else delete triggerRefs.current[item.id]; }}
                          data-dropdown-id={item.id}
                          className="compact-interactive-target"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownCoords({ top: rect.bottom + 4, left: rect.left });
                            setOpenDropdown(prev => prev === item.id ? null : item.id);
                          }}
                          style={{
                            marginLeft: '6px', verticalAlign: 'middle',
                            background: 'transparent',
                            color: 'var(--md-color-primary)',
                            border: '1px solid var(--md-color-outline)',
                            borderRadius: 'var(--md-radius-sm)',
                            padding: '1px 6px',
                            fontSize: '0.7rem', cursor: 'pointer',
                          }}
                          aria-label="查看关联菜品"
                          title="查看关联菜品"
                        >
                          ▾
                        </button>
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

          <div className="mobile-card-list mobile-card-list--grid">
            {ingredients.map(item => (
              <Card
                key={item.id}
                variant="elevated"
                style={{ display: 'flex', flexDirection: 'column', marginBottom: 'var(--md-spacing-2)' }}
                footer={
                  <div className="flex gap-3" style={{ width: '100%' }}>
                    <Button variant="outlined" size="sm" className="flex-1" onClick={() => openEdit(item)}>编辑</Button>
                    {(item.dish_count || 0) > 0 ? (
                      <Button variant="outlined" size="sm" className="flex-1" disabled
                        style={{ opacity: 0.4, cursor: 'not-allowed' }}
                        title={`已被 ${item.dish_count} 个菜品关联，无法删除`}>删除</Button>
                    ) : (
                      <Button variant="outlined" size="sm" className="flex-1"
                        onClick={() => handleDelete(item.id)}
                        style={{ borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}>删除</Button>
                    )}
                  </div>
                }
              >
                <div className="flex items-center gap-3 mb-4">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-1)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        <span>{item.category || ''} · 关联 {item.dish_count || 0} 个菜品</span>
                        {(item.linked_dishes || []).length > 0 && (
                          <span data-dropdown-id={item.id} style={{ position: 'relative' }}>
                            <button
                              type="button"
                              ref={(el) => { if (el) triggerRefs.current[item.id] = el; else delete triggerRefs.current[item.id]; }}
                              data-dropdown-id={item.id}
                              className="compact-interactive-target"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownCoords({ top: rect.bottom + 4, left: rect.left });
                                setOpenDropdown(prev => prev === item.id ? null : item.id);
                              }}
                              style={{
                                marginLeft: '6px', verticalAlign: 'middle',
                                background: 'transparent',
                                color: 'var(--md-color-primary)',
                                border: '1px solid var(--md-color-outline)',
                                borderRadius: 'var(--md-radius-sm)',
                                padding: '1px 6px',
                                fontSize: '0.7rem', cursor: 'pointer',
                              }}
                              aria-label="查看关联菜品"
                              title="查看关联菜品"
                            >
                              ▾
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* 别名行：始终渲染占位，保持卡片对齐（规则4） */}
                  <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)', minHeight: '1.2rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {(item.aliases || []).length > 0 ? `别名：${item.aliases.join('、')}` : ''}
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
          <div style={{ marginBottom: 'var(--md-spacing-4)'}}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>分类</label>
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
          title={parseStep === 'input' ? '从文本解析食材' : '解析结果 — 选择操作'}
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
                <div style={{ textAlign: 'center', padding: 'var(--md-spacing-5) 0', color: 'var(--md-color-on-surface-variant)' }}>
                  未识别到任何食材
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--md-spacing-3)'}}>
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
                          padding: 'var(--md-spacing-3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-2)', marginBottom: 'var(--md-spacing-2)'}}>
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
                              padding: '2px var(--md-spacing-2)',
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
                              padding: '0 var(--md-spacing-1)',
                              lineHeight: 1,
                            }}
                            title="移除"
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--md-spacing-3)', alignItems: 'center', flexWrap: 'wrap' }}>
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

      {openDropdown !== null && dropdownCoords && createPortal(
        <div data-dropdown-id={openDropdown} style={{
          position: 'fixed', top: dropdownCoords.top, left: dropdownCoords.left, zIndex: 1000,
          background: 'var(--md-color-surface-container-high)',
          border: '1px solid var(--md-color-outline-variant)',
          borderRadius: 'var(--md-radius-md)', boxShadow: 'var(--md-elevation-2)',
          minWidth: 160, maxHeight: 200, overflowY: 'auto', padding: 'var(--md-spacing-1)',
        }}>
          {(ingredients.find(i => i.id === openDropdown)?.linked_dishes || []).map(d => (
            <div
              key={d.id}
              onClick={() => {
                setOpenDropdown(null);
                const base = user?.role === 'admin' ? '/admin/dishes' : '/chef/dishes';
                navigate(`${base}?edit=${d.id}`);
              }}
              style={{
                padding: 'var(--md-spacing-1) var(--md-spacing-2)', cursor: 'pointer', borderRadius: 'var(--md-radius-xs)',
                fontSize: '0.85rem', color: 'var(--md-color-primary)',
                background: 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--md-color-surface-container)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {d.name}
            </div>
          ))}
        </div>,
        document.body
      )}

      <BottomBar />
    </div>
  );
}
