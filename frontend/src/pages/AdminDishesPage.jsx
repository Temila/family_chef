import { useState, useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

const CATEGORY_OPTIONS = [
  { value: 'meat', label: '肉类' },
  { value: 'vegetable', label: '蔬菜' },
  { value: 'seafood', label: '海鲜' },
  { value: 'fruit', label: '水果' },
  { value: 'seasoning', label: '调味品' },
  { value: 'other', label: '其他' },
];

export default function AdminDishesPage() {
  const { showToast } = useToast();

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showDishModal, setShowDishModal] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', image_url: '', status: 'draft',
    category_ids: [], ingredient_ids: [], recipe: '',
  });

  const [allCategories, setAllCategories] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);

  const [showIngDropdown, setShowIngDropdown] = useState(false);
  const [ingSearch, setIngSearch] = useState('');
  const [ingCategoryFilter, setIngCategoryFilter] = useState('');
  const ingDropdownRef = useRef(null);

  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [parseResult, setParseResult] = useState(null);

  const [showAddIngModal, setShowAddIngModal] = useState(false);
  const [addIngForm, setAddIngForm] = useState({ name: '', category: '', description: '', aliases: '' });

  useEffect(() => {
    loadDishes();
    loadAllData();
  }, []);

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
      const params = { page: 1, page_size: 100 };
      if (searchQuery) params.search = searchQuery;
      const res = await api.getDishes(params);
      setDishes(res.items || []);
    } catch (err) {
      showToast('加载菜品失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      const [catRes, ingRes] = await Promise.all([
        api.getCategories(),
        api.getIngredients(),
      ]);
      setAllCategories(catRes.items || []);
      setAllIngredients(ingRes.items || []);
    } catch (err) {}
  };

  const regions = allCategories.filter(c => c.type === 'region');
  const cuisines = allCategories.filter(c => c.type === 'cuisine');
  const tastes = allCategories.filter(c => c.type === 'taste');
  const seasons = allCategories.filter(c => c.type === 'season');

  const selectedRegionIds = form.category_ids.filter(id => regions.some(r => r.id === id));
  const filteredCuisines = selectedRegionIds.length > 0
    ? cuisines.filter(c => selectedRegionIds.includes(c.parent_id))
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

  const openEdit = (dish) => {
    setEditingDish(dish);
    setForm({
      name: dish.name || '',
      description: dish.description || '',
      image_url: dish.image_url || '',
      status: dish.status || 'draft',
      category_ids: (dish.categories || []).map(c => c.id),
      ingredient_ids: (dish.ingredients || []).map(i => i.id),
      recipe: dish.recipe || '',
    });
    setShowDishModal(true);
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
    setShowExtractModal(true);
  };

  const handleExtract = async () => {
    if (!extractText.trim()) {
      showToast('请输入文本内容', 'error');
      return;
    }
    try {
      setExtracting(true);
      const res = await api.parseIngredientsFromText(extractText);
      setParseResult(res);
      showToast(`解析完成，识别到 ${(res.parsed_ingredients || []).length} 个食材`);
    } catch (err) {
      showToast(err.message || '解析失败', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const hasNewIngredients = (parseResult?.parsed_ingredients || []).some(p => !p.matched_ingredient_id);
  const allIngredientsExist = (parseResult?.parsed_ingredients || []).length > 0 && !hasNewIngredients;

  const handleGoToAddIngredient = () => {
    setAddIngForm({ name: '', category: '', description: '', aliases: '' });
    setShowAddIngModal(true);
  };

  const handleAddIngredient = async () => {
    if (!addIngForm.name.trim()) {
      showToast('请输入食材名称', 'error');
      return;
    }
    try {
      await api.createIngredient({
        name: addIngForm.name,
        category: addIngForm.category || null,
        description: addIngForm.description || null,
        aliases: addIngForm.aliases ? addIngForm.aliases.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
      });
      showToast('食材添加成功');
      setShowAddIngModal(false);
      const ingRes = await api.getIngredients();
      setAllIngredients(ingRes.items || []);
      const newRes = await api.parseIngredientsFromText(extractText);
      setParseResult(newRes);
    } catch (err) {
      showToast(err.message || '添加失败', 'error');
    }
  };

  const handleNextStepFromExtract = () => {
    const matchedIds = (parseResult?.parsed_ingredients || [])
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
      </div>

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
                {renderCategorySection('地区', regions, form.category_ids, toggleCategory)}
                {renderCategorySection('菜系', filteredCuisines, form.category_ids, toggleCategory)}
                {renderCategorySection('口味', tastes, form.category_ids, toggleCategory)}
                {renderCategorySection('季节', seasons, form.category_ids, toggleCategory)}
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
                        {CATEGORY_OPTIONS.map(c => (
                          <button
                            key={c.value}
                            className={`filter-chip ${ingCategoryFilter === c.value ? 'active' : ''}`}
                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                            onClick={() => setIngCategoryFilter(c.value)}
                          >
                            {c.label}
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
                              {CATEGORY_OPTIONS.find(c => c.value === ing.category)?.label || ''}
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
              <h3>从文本解析食材</h3>
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
                    解析结果（{(parseResult.parsed_ingredients || []).length} 个食材）
                  </div>
                  {(parseResult.parsed_ingredients || []).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {parseResult.parsed_ingredients.map((p) => (
                        <span
                          key={p.name}
                          className="filter-chip"
                          style={{ opacity: p.matched_ingredient_id ? 1 : 0.6 }}
                        >
                          {p.matched_ingredient_id ? '✅' : '🆕'} {p.name}
                          {p.matched_ingredient_name && p.matched_ingredient_name !== p.name && (
                            <span style={{ fontSize: '0.7rem', marginLeft: 4 }}>→ {p.matched_ingredient_name}</span>
                          )}
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

                  {allIngredientsExist && (
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加食材</h3>
              <button className="modal-close" onClick={() => setShowAddIngModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">名称 *</label>
                <input className="form-input" value={addIngForm.name} onChange={(e) => setAddIngForm({ ...addIngForm, name: e.target.value })} placeholder="如：西红柿" />
              </div>
              <div className="form-group">
                <label className="form-label">分类</label>
                <select className="form-input" value={addIngForm.category} onChange={(e) => setAddIngForm({ ...addIngForm, category: e.target.value })}>
                  <option value="">请选择</option>
                  {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">描述</label>
                <textarea className="form-input" rows={2} value={addIngForm.description} onChange={(e) => setAddIngForm({ ...addIngForm, description: e.target.value })} placeholder="可选描述" />
              </div>
              <div className="form-group">
                <label className="form-label">别名（逗号分隔）</label>
                <input className="form-input" value={addIngForm.aliases} onChange={(e) => setAddIngForm({ ...addIngForm, aliases: e.target.value })} placeholder="如：番茄, 柿子" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddIngModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleAddIngredient}>保存</button>
            </div>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
