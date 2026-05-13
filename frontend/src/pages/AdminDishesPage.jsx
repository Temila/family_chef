import { useState, useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../contexts/CategoriesContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function AdminDishesPage() {
  const { showToast } = useToast();
  const { getByType, getTypeMeta, categoryTypes, allCategories: contextCategories, reload: reloadCategories } = useCategories();

  const dishCategoryTypes = categoryTypes().filter(t => t.key !== 'ingredient');
  const ingredientCategories = getByType('ingredient');
  const allCategories = contextCategories;

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showDishModal, setShowDishModal] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', image_url: '', status: 'draft',
    category_ids: [], ingredient_ids: [], recipe: '',
  });

  const [allIngredients, setAllIngredients] = useState([]);

  const [showIngDropdown, setShowIngDropdown] = useState(false);
  const [ingSearch, setIngSearch] = useState('');
  const [ingCategoryFilter, setIngCategoryFilter] = useState('');
  const ingDropdownRef = useRef(null);

  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [smartMode, setSmartMode] = useState(true);
  const [removedParsedNames, setRemovedParsedNames] = useState([]);

  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const [advCategoryIds, setAdvCategoryIds] = useState([]);

  const [showAddIngModal, setShowAddIngModal] = useState(false);
  const [batchItems, setBatchItems] = useState([]);
  const [batchAllIngredients, setBatchAllIngredients] = useState([]);
  const [batchDecisions, setBatchDecisions] = useState({});
  const [batchImporting, setBatchImporting] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  useEffect(() => {
    loadDishes();
  }, [advCategoryIds]);

  useEffect(() => {
    if (!showIngDropdown) return;
    const handler = (e) => {
      if (ingDropdownRef.current && !ingDropdownRef.current.contains(e.target)) {
        setShowIngDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showIngDropdown]);

  const loadDishes = async () => {
    try {
      setLoading(true);
      const params = { page: 1, page_size: 100, status: 'all' };
      if (searchQuery) params.search = searchQuery;
      if (advCategoryIds.length > 0) {
        for (const t of dishCategoryTypes) {
          const typeCats = getByType(t.key);
          const ids = advCategoryIds.filter(id => typeCats.some(c => c.id === id));
          if (ids.length) params[t.key + 's'] = ids;
        }
      }
      const res = await api.getDishes(params);
      setDishes(res.items || []);
    } catch (err) {
      showToast('加载菜品失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadIngredients = async () => {
    try {
      const ingRes = await api.getIngredients();
      setAllIngredients(ingRes.items || []);
    } catch (err) {}
  };

  const regions = allCategories.filter(c => c.type === 'region');
  const dishCatsByType = {};
  for (const t of dishCategoryTypes) {
    if (t.key !== 'region') {
      dishCatsByType[t.key] = allCategories.filter(c => c.type === t.key);
    }
  }

  const cuisines = allCategories.filter(c => c.type === 'cuisine');

  const selectedRegionIds = form.category_ids.filter(id => regions.some(r => r.id === id));
  const filteredCuisines = selectedRegionIds.length > 0
    ? cuisines.filter(c => selectedRegionIds.includes(c.parent_id))
    : cuisines;

  const advSelectedRegionIds = advCategoryIds.filter(id => regions.some(r => r.id === id));
  const advFilteredCuisines = advSelectedRegionIds.length > 0
    ? cuisines.filter(c => advSelectedRegionIds.includes(c.parent_id))
    : cuisines;

  const filteredIngForDropdown = allIngredients
    .filter(i => !form.ingredient_ids.includes(i.id))
    .filter(i => !ingCategoryFilter || i.category === ingCategoryFilter)
    .filter(i => !ingSearch || i.name.includes(ingSearch) || (i.aliases || []).some(a => a.includes(ingSearch)));

  const openCreate = (prefill = {}) => {
    setEditingDish(null);
    setForm({
      name: '', description: '', image_url: '', status: 'draft',
      category_ids: [], ingredient_ids: [], recipe: '',
      ...prefill,
    });
    setShowDishModal(true);
  };

  const openEdit = async (dish) => {
    try {
      const full = await api.getDish(dish.id);
      setEditingDish(full);
      setForm({
        name: full.name || '',
        description: full.description || '',
        image_url: full.image_url || '',
        status: full.status || 'draft',
        category_ids: (full.categories || []).map(c => c.id),
        ingredient_ids: (full.ingredients || []).map(i => i.id),
        recipe: full.recipe || '',
      });
      setShowDishModal(true);
    } catch (err) {
      showToast('加载菜品详情失败', 'error');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('请输入菜名', 'error');
      return;
    }
    try {
      const data = {
        name: form.name,
        description: form.description || null,
        recipe: form.recipe || null,
        image_url: form.image_url || null,
        status: form.status,
        category_ids: form.category_ids.length > 0 ? form.category_ids : null,
        ingredient_ids: form.ingredient_ids.length > 0 ? form.ingredient_ids : null,
      };

      if (editingDish) {
        await api.updateDish(editingDish.id, data);
        showToast('更新成功');
      } else {
        await api.createDish(data);
        showToast('创建成功');
      }
      setShowDishModal(false);
      loadDishes();
    } catch (err) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleDelete = async (dishId) => {
    if (!window.confirm('确定要删除这道菜品吗？')) return;
    try {
      await api.deleteDish(dishId);
      showToast('删除成功');
      loadDishes();
    } catch (err) {
      showToast('删除失败', 'error');
    }
  };

  const handleToggleStatus = async (dish) => {
    const newStatus = dish.status === 'published' ? 'hidden' : 'published';
    try {
      await api.updateDishStatus(dish.id, newStatus);
      showToast(newStatus === 'published' ? '已上架' : '已下架');
      loadDishes();
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const toggleCategory = (catId) => {
    setForm(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(catId)
        ? prev.category_ids.filter(id => id !== catId)
        : [...prev.category_ids, catId],
    }));
  };

  const toggleIngredient = (ingId) => {
    setForm(prev => ({
      ...prev,
      ingredient_ids: prev.ingredient_ids.includes(ingId)
        ? prev.ingredient_ids.filter(id => id !== ingId)
        : [...prev.ingredient_ids, ingId],
    }));
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadImage(file);
      setForm(prev => ({ ...prev, image_url: res.url }));
      showToast('上传成功');
    } catch (err) {
      showToast('上传失败', 'error');
    }
  };

  const openExtractModal = () => {
    setExtractText('');
    setParseResult(null);
    setRemovedParsedNames([]);
    setShowExtractModal(true);
  };

  const handleExtract = async () => {
    if (!extractText.trim()) {
      showToast('请输入文本内容', 'error');
      return;
    }
    try {
      setExtracting(true);
      setRemovedParsedNames([]);
      const res = await api.parseIngredientsFromText(extractText, smartMode);
      setParseResult(res);
      showToast(`解析完成，识别到 ${(res.parsed_ingredients || []).length} 个食材`);
    } catch (err) {
      showToast(err.message || '解析失败', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const removeParsedIngredient = (name) => {
    setRemovedParsedNames(prev => [...prev, name]);
  };

  const activeParsedIngredients = (parseResult?.parsed_ingredients || []).filter(
    p => !removedParsedNames.includes(p.name)
  );

  const hasNewIngredients = activeParsedIngredients.some(p => !p.matched_ingredient_id);
  const hasAnyIngredients = activeParsedIngredients.length > 0;

  const handleGoToAddIngredient = () => {
    const newItems = activeParsedIngredients.filter(p => !p.matched_ingredient_id);
    const initial = {};
    for (const item of newItems) {
      initial[item.name] = { action: 'new', alias_for_id: null, category: '' };
    }
    setBatchItems(newItems);
    setBatchAllIngredients(parseResult?.all_ingredients || []);
    setBatchDecisions(initial);
    setShowAddIngModal(true);
  };

  const updateBatchDecision = (name, field, value) => {
    setBatchDecisions(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }));
  };

  const removeBatchItem = (name) => {
    setBatchItems(prev => prev.filter(p => p.name !== name));
    setBatchDecisions(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const renameBatchItem = (oldName, newName) => {
    setBatchItems(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
    setBatchDecisions(prev => {
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

  const handleBatchImport = async () => {
    const items = Object.entries(batchDecisions)
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
      setBatchImporting(true);
      const res = await api.batchImportIngredients(items);
      const errors = (res.results || []).filter(r => r.status === 'error');
      const success = (res.results || []).filter(r => r.status !== 'error');
      if (errors.length > 0) {
        showToast(`${success.length} 项成功，${errors.length} 项失败`, 'error');
      } else {
        showToast(`成功导入 ${success.length} 项食材`);
      }
      setShowAddIngModal(false);
      const ingRes = await api.getIngredients();
      setAllIngredients(ingRes.items || []);
      const newParseRes = await api.parseIngredientsFromText(extractText, smartMode);
      setParseResult(newParseRes);
      setRemovedParsedNames([]);
    } catch (err) {
      showToast(err.message || '导入失败', 'error');
    } finally {
      setBatchImporting(false);
    }
  };

  const handleNextStepFromExtract = () => {
    const matchedIds = activeParsedIngredients
      .map(p => p.matched_ingredient_id)
      .filter(Boolean);
    setShowExtractModal(false);
    openCreate({
      recipe: extractText,
      ingredient_ids: matchedIds,
    });
  };

  const renderCategorySection = (label, items, selectedIds, onToggle) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map(c => (
            <button
              key={c.id}
              type="button"
              className={`filter-chip ${selectedIds.includes(c.id) ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => onToggle(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <Header
        title="菜品管理"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={openExtractModal}>
              📝 解析文本
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => openCreate()}>
              + 添加
            </button>
          </div>
        }
      />

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索菜品名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadDishes()}
        />
        <div style={{ display: 'flex', gap: 4, marginRight: 4 }}>
          <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={loadDishes}>搜索</button>
          <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => { setSearchQuery(''); setAdvCategoryIds([]); }}>清空</button>
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
          {renderCategorySection(getTypeMeta('region').label, regions, advCategoryIds, (id) => {
            setAdvCategoryIds(prev => {
              if (prev.includes(id)) {
                const childCuisineIds = cuisines.filter(c => c.parent_id === id).map(c => c.id);
                return prev.filter(x => x !== id && !childCuisineIds.includes(x));
              }
              return [...prev, id];
            });
          })}
          {dishCategoryTypes.filter(t => t.key !== 'region').map(t => {
            const items = t.key === 'cuisine' ? advFilteredCuisines : (dishCatsByType[t.key] || []);
            return renderCategorySection(t.label, items, advCategoryIds, (id) => {
              setAdvCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            });
          })}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : dishes.length === 0 ? (
        <EmptyState icon="🍽️" text="没有找到菜品" />
      ) : (
        <section className="section pt-0 pc-content-area">
          <div className="pc-data-table-wrap">
            <table className="pc-data-table">
              <thead>
                <tr>
                  <th>菜品</th>
                  <th>分类</th>
                  <th>食材数</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {dishes.map(dish => (
                  <tr key={dish.id}>
                    <td>
                      <div className="pc-user-cell">
                        {dish.image_url ? (
                          <img src={dish.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                        ) : (
                          <div className="avatar avatar-sm">🍽</div>
                        )}
                        <div>
                          <div className="pc-user-name">{dish.name}</div>
                          <div className="pc-user-sub">{dish.description ? dish.description.substring(0, 30) + '...' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>{(dish.categories || []).map(c => c.name).join('、') || '-'}</td>
                    <td>{(dish.ingredients || []).length}</td>
                    <td><Badge status={dish.status === 'published' ? 'published' : 'hidden'} /></td>
                    <td>
                      <div className="pc-action-btns">
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(dish)}>编辑</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleToggleStatus(dish)}>
                          {dish.status === 'published' ? '下架' : '上架'}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleDelete(dish.id)} style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
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
            {dishes.map(dish => (
              <div key={dish.id} className="card" style={{ marginBottom: 12 }}>
                <div className="card-body" style={{ padding: 12 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{dish.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {(dish.categories || []).map(c => c.name).join(' · ')}
                        {dish.ingredients && ` · ${dish.ingredients.length}种食材`}
                      </div>
                    </div>
                    <Badge status={dish.status === 'published' ? 'published' : 'hidden'} />
                  </div>
                  <div className="flex gap-3">
                    <button className="btn btn-outline btn-sm flex-1" onClick={() => openEdit(dish)}>编辑</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleToggleStatus(dish)}>
                      {dish.status === 'published' ? '下架' : '上架'}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(dish.id)} style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showDishModal && (
        <div className="modal-overlay" onClick={() => setShowDishModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{editingDish ? '编辑菜品' : '添加菜品'}</h3>
              <button className="modal-close" onClick={() => setShowDishModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">菜名 *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="输入菜品名称" />
              </div>

              <div className="form-group">
                <label className="form-label">描述</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="菜品描述" />
              </div>

              <div className="form-group">
                <label className="form-label">食谱</label>
                <textarea className="form-input" rows={5} value={form.recipe} onChange={(e) => setForm({ ...form, recipe: e.target.value })} placeholder="食材用量、制作步骤等" />
              </div>

              <div className="form-group">
                <label className="form-label">封面图</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {form.image_url && (
                    <img src={form.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                  )}
                  <input type="file" accept="image/*" onChange={handleUploadImage} style={{ fontSize: '0.8rem' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">分类</label>
              {renderCategorySection(getTypeMeta('region').label, regions, form.category_ids, toggleCategory)}
              {dishCategoryTypes.filter(t => t.key !== 'region').map(t => {
                const items = t.key === 'cuisine' ? filteredCuisines : (dishCatsByType[t.key] || []);
                return renderCategorySection(t.label, items, form.category_ids, toggleCategory);
              })}
              </div>

              <div className="form-group" style={{ position: 'relative' }} ref={ingDropdownRef}>
                <label className="form-label">食材（已选 {form.ingredient_ids.length}）</label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {form.ingredient_ids.map(id => {
                    const ing = allIngredients.find(i => i.id === id);
                    return ing ? (
                      <span key={id} className="preference-tag dislike-tag" style={{ cursor: 'pointer' }} onClick={() => toggleIngredient(id)}>
                        {ing.name} ×
                      </span>
                    ) : null;
                  })}
                </div>

                <div
                  className="form-input"
                  style={{ cursor: 'pointer', color: 'var(--text-muted)', minHeight: 38, display: 'flex', alignItems: 'center' }}
                  onClick={() => setShowIngDropdown(!showIngDropdown)}
                >
                  {showIngDropdown ? '搜索并选择食材...' : '点击选择食材...'}
                </div>

                {showIngDropdown && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 100,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                    maxHeight: 280, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ padding: '8px 8px 0' }}>
                      <input
                        className="form-input"
                        placeholder="搜索食材..."
                        value={ingSearch}
                        onChange={(e) => setIngSearch(e.target.value)}
                        autoFocus
                        style={{ marginBottom: 6 }}
                      />
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                        <button
                          className={`filter-chip ${!ingCategoryFilter ? 'active' : ''}`}
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                          onClick={() => setIngCategoryFilter('')}
                        >
                          全部
                        </button>
                        {ingredientCategories.map(c => (
                          <button
                            key={c.id}
                            className={`filter-chip ${ingCategoryFilter === c.name ? 'active' : ''}`}
                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                            onClick={() => setIngCategoryFilter(c.name)}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {filteredIngForDropdown.length === 0 ? (
                        <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>无匹配食材</div>
                      ) : (
                        filteredIngForDropdown.slice(0, 50).map(ing => (
                          <div
                            key={ing.id}
                            className="preference-search-item"
                            onClick={() => { toggleIngredient(ing.id); }}
                            style={{ cursor: 'pointer' }}
                          >
                            <input type="checkbox" checked readOnly style={{ marginRight: 6, pointerEvents: 'none' }} />
                            <span>{ing.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                              {ingredientCategories.find(c => c.name === ing.category)?.name || ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">状态</label>
                <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">草稿</option>
                  <option value="published">上架</option>
                  <option value="hidden">下架</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDishModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showExtractModal && (
        <div className="modal-overlay" onClick={() => setShowExtractModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>解析菜谱</h3>
              <button className="modal-close" onClick={() => setShowExtractModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">粘贴菜谱或文本内容</label>
                <textarea
                  className="form-input"
                  rows={6}
                  value={extractText}
                  onChange={(e) => setExtractText(e.target.value)}
                  placeholder="将菜谱文章、食材列表等文本粘贴到这里，系统会自动识别其中的食材..."
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={smartMode}
                    onChange={(e) => setSmartMode(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  智能解析
                </label>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 18, height: 18, borderRadius: '50%',
                    border: '1.5px solid var(--text-muted)', fontSize: '0.7rem',
                    color: 'var(--text-muted)', cursor: 'help', position: 'relative',
                  }}
                  title="开启后使用AI模型智能识别食材名称和用量；关闭后仅通过食材库中的已有名称进行文本匹配，速度更快但不识别新食材名称"
                >
                  !
                </span>
              </div>
              <button
                className="btn btn-primary btn-block"
                onClick={handleExtract}
                disabled={extracting}
              >
                {extracting ? '解析中...' : '开始解析'}
              </button>

              {parseResult && (
                <div style={{ marginTop: 16 }}>
                  <div className="form-label">
                    解析结果（{activeParsedIngredients.length} 个食材）
                  </div>
                  {activeParsedIngredients.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {activeParsedIngredients.map((p) => (
                        <span
                          key={p.name}
                          className="filter-chip"
                          style={{ opacity: p.matched_ingredient_id ? 1 : 0.6, paddingRight: 4 }}
                        >
                          {p.matched_ingredient_id ? '✅' : '🆕'} {p.name}
                          {p.matched_ingredient_name && p.matched_ingredient_name !== p.name && (
                            <span style={{ fontSize: '0.7rem', marginLeft: 4 }}>→ {p.matched_ingredient_name}</span>
                          )}
                          <button
                            onClick={() => removeParsedIngredient(p.name)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '0.9rem', color: 'var(--danger)', marginLeft: 4, padding: 0, lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>未识别到食材</div>
                  )}

                  {hasNewIngredients && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={handleGoToAddIngredient}>
                        ➕ 去添加新食材
                      </button>
                    </div>
                  )}

                  {hasAnyIngredients && (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={handleNextStepFromExtract}>
                        下一步 → 创建菜品
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowExtractModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {showAddIngModal && (
        <div className="modal-overlay" onClick={() => setShowAddIngModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>添加新食材（{(batchItems || []).length} 个）</h3>
              <button className="modal-close" onClick={() => setShowAddIngModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {batchItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  没有需要添加的新食材
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {batchItems.map((item) => {
                    const decision = batchDecisions[item.name] || { action: 'new', alias_for_id: null, category: '' };
                    const displayName = decision.editedName || item.name;
                    return (
                      <div
                        key={item.name}
                        style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <input
                            className="form-input"
                            style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem', padding: '4px 8px' }}
                            value={displayName}
                            onChange={(e) => renameBatchItem(item.name, e.target.value)}
                          />
                          <button
                            onClick={() => removeBatchItem(item.name)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '1.1rem', color: 'var(--danger)', padding: '0 4px', lineHeight: 1,
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
                            onChange={(e) => updateBatchDecision(item.name, 'action', e.target.value)}
                          >
                            <option value="new">添加为新食材</option>
                            <option value="alias">添加为已有食材的别名</option>
                          </select>

                          {decision.action === 'new' && (
                            <select
                              className="form-input"
                              style={{ width: 'auto', minWidth: 100, fontSize: '0.85rem' }}
                              value={decision.category}
                              onChange={(e) => updateBatchDecision(item.name, 'category', e.target.value)}
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
                              onChange={(e) => updateBatchDecision(item.name, 'alias_for_id', Number(e.target.value))}
                            >
                              <option value="">选择目标食材</option>
                              {batchAllIngredients.map(ing => (
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
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddIngModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleBatchImport} disabled={batchImporting}>
                {batchImporting ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
