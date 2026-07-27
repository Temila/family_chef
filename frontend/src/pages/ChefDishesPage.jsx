import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../contexts/CategoriesContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function ChefDishesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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
    name: '', description: '', image_url: '', status: 'enabled',
    category_ids: [], ingredient_ids: [], recipe: '',
    is_semifinished: false, semifinished_dish_ids: [],
  });

  const [allIngredients, setAllIngredients] = useState([]);
  const [semifinishedDishes, setSemifinishedDishes] = useState([]);

  const [showIngDropdown, setShowIngDropdown] = useState(false);
  const [ingSearch, setIngSearch] = useState('');
  const [ingCategoryFilter, setIngCategoryFilter] = useState('');
  const ingDropdownRef = useRef(null);

  const [showSfDropdown, setShowSfDropdown] = useState(false);
  const [sfSearch, setSfSearch] = useState('');
  const sfDropdownRef = useRef(null);

  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [smartMode, setSmartMode] = useState(true);
  const [removedParsedNames, setRemovedParsedNames] = useState([]);

  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const [advCategoryIds, setAdvCategoryIds] = useState([]);
  const [publishFilter, setPublishFilter] = useState('all');
  const [sfFilter, setSfFilter] = useState('all');

  const [showAddIngModal, setShowAddIngModal] = useState(false);
  const [batchItems, setBatchItems] = useState([]);
  const [batchAllIngredients, setBatchAllIngredients] = useState([]);
  const [batchDecisions, setBatchDecisions] = useState({});
  const [batchImporting, setBatchImporting] = useState(false);
  const [aliasSearchTexts, setAliasSearchTexts] = useState({});
  const [aliasDropdownOpen, setAliasDropdownOpen] = useState({});

  useEffect(() => {
    loadIngredients();
  }, []);

  useEffect(() => {
    loadDishes();
  }, [advCategoryIds, user?.role, publishFilter, sfFilter]);

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

  useEffect(() => {
    if (!showSfDropdown) return;
    const handler = (e) => {
      if (sfDropdownRef.current && !sfDropdownRef.current.contains(e.target)) {
        setShowSfDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
}, [showSfDropdown]);

  const loadDishes = async () => {
    try {
      setLoading(true);
      const params = { page: 1, page_size: 100, status: 'enabled' };
      if (publishFilter === 'published') {
        params.chef_filter = 'my-published';
      } else if (publishFilter === 'unpublished') {
        params.chef_filter = 'my-hidden';
      }
      if (sfFilter === 'semifinished') params.is_semifinished = true;
      else if (sfFilter === 'normal') params.is_semifinished = false;
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
      const sfRes = await api.getSemifinishedDishes();
      setSemifinishedDishes(sfRes || []);
    } catch (err) {}
  };

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && dishes.length > 0) {
      const dish = dishes.find(d => d.id === Number(editId));
      if (dish) {
        openEdit(dish);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, dishes]);

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
      name: '', description: '', image_url: '', status: 'enabled',
      category_ids: [], ingredient_ids: [], recipe: '',
      is_semifinished: false, semifinished_dish_ids: [],
      ...prefill,
    });
    setSfSearch('');
    setShowSfDropdown(false);
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
        status: full.status || 'enabled',
        category_ids: (full.categories || []).map(c => c.id),
        ingredient_ids: (full.ingredients || []).map(i => i.id),
        recipe: full.recipe || '',
        is_semifinished: full.is_semifinished || false,
        semifinished_dish_ids: (full.semifinished_ingredients || []).map(s => s.id),
      });
      setSfSearch('');
      setShowSfDropdown(false);
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
        is_semifinished: form.is_semifinished,
        category_ids: form.category_ids.length > 0 ? form.category_ids : null,
        ingredient_ids: form.ingredient_ids.length > 0 ? form.ingredient_ids : null,
        semifinished_dish_ids: form.semifinished_dish_ids.length > 0 ? form.semifinished_dish_ids : null,
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

  const handleTogglePublish = async (dish) => {
    const myChef = dish.chefs?.find(c => c.id === user?.id);
    const isPublished = myChef?.publish_status === 'published';
    try {
      await api.toggleChefPublish(dish.id, !isPublished);
      showToast(!isPublished ? '已上架' : '已下架');
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

  const toggleSemifinishedDish = (dishId) => {
    setForm(prev => ({
      ...prev,
      semifinished_dish_ids: prev.semifinished_dish_ids.includes(dishId)
        ? prev.semifinished_dish_ids.filter(id => id !== dishId)
        : [...prev.semifinished_dish_ids, dishId],
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
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-color-on-surface-variant)', marginBottom: 6 }}>{label}</div>
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

      <div style={{ padding: '0 16px 4px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { key: 'all', label: '全部' },
            { key: 'published', label: '已上架' },
            { key: 'unpublished', label: '未上架' },
          ].map(f => (
            <button
              key={f.key}
              className={`filter-chip ${publishFilter === f.key ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '2px 10px' }}
              onClick={() => setPublishFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '2px 10px' }}
          onClick={() => setShowAdvFilter(!showAdvFilter)}
        >
          {showAdvFilter ? '收起筛选 ▲' : '高级筛选 ▼'}
        </button>
      </div>

      {showAdvFilter && (
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--md-color-outline-variant)' }}>
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
            return <div key={t.key}>{renderCategorySection(t.label, items, advCategoryIds, (id) => {
              setAdvCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            })}</div>;
          })}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-color-on-surface-variant)', marginBottom: 6 }}>半成品</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { key: 'all', label: '全部' },
                { key: 'normal', label: '非半成品' },
                { key: 'semifinished', label: '半成品' },
              ].map(opt => (
                <button
                  key={opt.key}
                  className={`filter-chip ${sfFilter === opt.key ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  onClick={() => setSfFilter(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
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
                    <th>厨师</th>
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
                            <img src={dish.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 'var(--md-radius-xs)', objectFit: 'cover' }} />
                          ) : (
                            <div className="avatar avatar-sm">🍽</div>
                          )}
                          <div>
                            <div className="pc-user-name">
                              {dish.name}
                              {dish.is_semifinished && <span style={{ fontSize: '0.7rem', marginLeft: 6, padding: '1px 6px', borderRadius: 'var(--md-radius-xs)', background: 'var(--md-color-tertiary-container)', color: 'var(--md-color-on-tertiary-container)' }}>半成品</span>}
                            </div>
                            <div className="pc-user-sub">{dish.description ? dish.description.substring(0, 30) + '...' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>{(dish.categories || []).map(c => c.name).join('、') || '-'}</td>
                    <td>
                      {dish.chefs && dish.chefs.filter(c => c.publish_status === 'published').length > 0 ? (
                        <div style={{ display: 'flex' }}>
                          {dish.chefs.filter(c => c.publish_status === 'published').slice(0, 5).map((c, ci) => (
                            <div key={`${dish.id}-${c.id}-${ci}`} style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'var(--md-color-primary)',
                              color: 'var(--md-color-on-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.7rem', fontWeight: 600,
                              border: '2px solid var(--md-color-surface-container-low)',
                              marginLeft: -6,
                            }} title={c.display_name || c.username}>
                              {(c.display_name || c.username).charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {dish.chefs.filter(c => c.publish_status === 'published').length > 5 && (
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'var(--md-color-surface-container)',
                              color: 'var(--md-color-on-surface-variant)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem',
                              border: '2px solid var(--md-color-surface-container-low)',
                              marginLeft: -6,
                            }}>
                              +{dish.chefs.filter(c => c.publish_status === 'published').length - 5}
                            </div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td>{dish.is_semifinished ? <span style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)' }}>-</span> : <Badge status={(() => { const my = dish.chefs?.find(c => c.id === user?.id); return my?.publish_status === 'published' ? 'published' : 'hidden'; })()} />}</td>
                    <td>
                      <div className="pc-action-btns">
                        {!dish.is_semifinished && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleTogglePublish(dish)}>
                            {(() => { const my = dish.chefs?.find(c => c.id === user?.id); return my?.publish_status === 'published' ? '下架' : '上架'; })()}
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(dish)}>编辑</button>
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
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {dish.name}
                        {dish.is_semifinished && <span style={{ fontSize: '0.7rem', marginLeft: 6, padding: '1px 6px', borderRadius: 'var(--md-radius-xs)', background: 'var(--md-color-tertiary-container)', color: 'var(--md-color-on-tertiary-container)' }}>半成品</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)' }}>
                        {(dish.categories || []).map(c => c.name).join(' · ')}
                      </div>
                    </div>
                    {!dish.is_semifinished && <Badge status={(() => { const my = dish.chefs?.find(c => c.id === user?.id); return my?.publish_status === 'published' ? 'published' : 'hidden'; })()} />}
                  </div>
                  {dish.chefs && dish.chefs.filter(c => c.publish_status === 'published').length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)' }}>厨师：</span>
                      <div style={{ display: 'flex' }}>
                        {dish.chefs.filter(c => c.publish_status === 'published').slice(0, 5).map((c, ci) => (
                          <div key={`${dish.id}-${c.id}-${ci}`} style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--md-color-primary)',
                            color: 'var(--md-color-on-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 600,
                            border: '2px solid var(--md-color-surface-container-low)',
                            marginLeft: -4,
                          }} title={c.display_name || c.username}>
                            {(c.display_name || c.username).charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {dish.chefs.filter(c => c.publish_status === 'published').length > 5 && (
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--md-color-surface-container)',
                            color: 'var(--md-color-on-surface-variant)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem',
                            border: '2px solid var(--md-color-surface-container-low)',
                            marginLeft: -4,
                          }}>
                            +{dish.chefs.filter(c => c.publish_status === 'published').length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {!dish.is_semifinished && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleTogglePublish(dish)}>
                        {(() => { const my = dish.chefs?.find(c => c.id === user?.id); return my?.publish_status === 'published' ? '下架' : '上架'; })()}
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm flex-1" onClick={() => openEdit(dish)}>编辑</button>
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
                    <img src={form.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--md-radius-xs)', objectFit: 'cover' }} />
                  )}
                  <input type="file" accept="image/*" onChange={handleUploadImage} style={{ fontSize: '0.8rem' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">分类</label>
              {renderCategorySection(getTypeMeta('region').label, regions, form.category_ids, toggleCategory)}
              {dishCategoryTypes.filter(t => t.key !== 'region').map(t => {
                const items = t.key === 'cuisine' ? filteredCuisines : (dishCatsByType[t.key] || []);
                return <div key={t.key}>{renderCategorySection(t.label, items, form.category_ids, toggleCategory)}</div>;
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
                  style={{ cursor: 'pointer', color: 'var(--md-color-on-surface-variant)', minHeight: 38, display: 'flex', alignItems: 'center' }}
                  onClick={() => setShowIngDropdown(!showIngDropdown)}
                >
                  {showIngDropdown ? '搜索并选择食材...' : '点击选择食材...'}
                </div>

                {showIngDropdown && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 100,
                    background: 'var(--md-color-surface-container-lowest)', border: '1px solid var(--md-color-outline-variant)',
                    borderRadius: 'var(--md-radius-sm)', boxShadow: 'var(--md-elevation-3)',
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
                        <div style={{ padding: 12, textAlign: 'center', color: 'var(--md-color-on-surface-variant)', fontSize: '0.85rem' }}>无匹配食材</div>
                      ) : (
                        filteredIngForDropdown.slice(0, 50).map(ing => (
                          <div
                            key={ing.id}
                            className="preference-search-item"
                            onClick={() => { toggleIngredient(ing.id); }}
                            style={{ cursor: 'pointer' }}
                          >
                            <span>{ing.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--md-color-on-surface-variant)', marginLeft: 'auto' }}>
                              {ingredientCategories.find(c => c.name === ing.category)?.name || ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {semifinishedDishes.length > 0 && (
                <div className="form-group" style={{ position: 'relative' }} ref={sfDropdownRef}>
                  <label className="form-label">半成品食材（已选 {form.semifinished_dish_ids.length}）</label>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {form.semifinished_dish_ids.map(id => {
                      const sf = semifinishedDishes.find(d => d.id === id);
                      return sf ? (
                        <span key={id} className="preference-tag allergy-tag" style={{ cursor: 'pointer' }} onClick={() => toggleSemifinishedDish(id)}>
                          {sf.name} ×
                        </span>
                      ) : null;
                    })}
                  </div>

                  <div
                    className="form-input"
                    style={{ cursor: 'pointer', color: 'var(--md-color-on-surface-variant)', minHeight: 38, display: 'flex', alignItems: 'center' }}
                    onClick={() => setShowSfDropdown(!showSfDropdown)}
                  >
                    {showSfDropdown ? '搜索并选择半成品...' : '点击选择半成品食材...'}
                  </div>

                  {showSfDropdown && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 100,
                      background: 'var(--md-color-surface-container-lowest)', border: '1px solid var(--md-color-outline-variant)',
                      borderRadius: 'var(--md-radius-sm)', boxShadow: 'var(--md-elevation-3)',
                      maxHeight: 280, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    }}>
                      <div style={{ padding: '8px 8px 0' }}>
                        <input
                          className="form-input"
                          placeholder="搜索半成品..."
                          value={sfSearch}
                          onChange={(e) => setSfSearch(e.target.value)}
                          autoFocus
                          style={{ marginBottom: 6 }}
                        />
                      </div>
                      <div style={{ overflowY: 'auto', flex: 1 }}>
                        {semifinishedDishes
                          .filter(d => !form.semifinished_dish_ids.includes(d.id))
                          .filter(d => !sfSearch || d.name.includes(sfSearch))
                          .length === 0 ? (
                          <div style={{ padding: 12, textAlign: 'center', color: 'var(--md-color-on-surface-variant)', fontSize: '0.85rem' }}>无匹配半成品</div>
                        ) : (
                          semifinishedDishes
                            .filter(d => !form.semifinished_dish_ids.includes(d.id))
                            .filter(d => !sfSearch || d.name.includes(sfSearch))
                            .slice(0, 50)
                            .map(d => (
                              <div
                                key={d.id}
                                className="preference-search-item"
                                onClick={() => { toggleSemifinishedDish(d.id); }}
                                style={{ cursor: 'pointer' }}
                              >
                                <span style={{ fontSize: '0.8rem', color: 'var(--md-color-on-tertiary-container)', marginRight: 6 }}>🍳</span>
                                <span>{d.name}</span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">状态</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="enabled">启用</option>
                  <option value="disabled">禁用</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', marginTop: 4 }}>
                  菜品创建后需由厨师上架
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={form.is_semifinished}
                    onChange={(e) => setForm({ ...form, is_semifinished: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  <span className="form-label" style={{ marginBottom: 0 }}>标记为半成品</span>
                </label>
                <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', marginTop: 4 }}>
                  半成品菜品不会出现在用户点菜菜单中，但可作为特殊食材被其他菜品选择
                </div>
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
                    border: '1.5px solid var(--md-color-on-surface-variant)', fontSize: '0.7rem',
                    color: 'var(--md-color-on-surface-variant)', cursor: 'help', position: 'relative',
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
                              fontSize: '0.9rem', color: 'var(--md-color-error)', marginLeft: 4, padding: 0, lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--md-color-on-surface-variant)', fontSize: '0.85rem' }}>未识别到食材</div>
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
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--md-color-on-surface-variant)' }}>
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
                        style={{ border: '1px solid var(--md-color-outline-variant)', borderRadius: 'var(--md-radius-md)', padding: 12 }}
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
                              fontSize: '1.1rem', color: 'var(--md-color-error)', padding: '0 4px', lineHeight: 1,
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
                            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                              <input
                                className="form-input"
                                style={{ fontSize: '0.85rem', width: '100%' }}
                                placeholder="输入食材名称搜索..."
                                value={aliasSearchTexts[item.name] || (decision.alias_for_id ? batchAllIngredients.find(i => i.id === decision.alias_for_id)?.name || '' : '')}
                                onChange={(e) => {
                                  setAliasSearchTexts(prev => ({ ...prev, [item.name]: e.target.value }));
                                  if (!e.target.value) {
                                    updateBatchDecision(item.name, 'alias_for_id', null);
                                  }
                                  setAliasDropdownOpen(prev => ({ ...prev, [item.name]: true }));
                                }}
                                onFocus={() => setAliasDropdownOpen(prev => ({ ...prev, [item.name]: true }))}
                              />
                              {aliasDropdownOpen[item.name] && (aliasSearchTexts[item.name] !== undefined ? aliasSearchTexts[item.name] : !decision.alias_for_id) && (() => {
                                const searchVal = aliasSearchTexts[item.name] || '';
                                const filtered = batchAllIngredients.filter(ing => {
                                  if (!searchVal) return true;
                                  const q = searchVal.toLowerCase();
                                  return ing.name.toLowerCase().includes(q) ||
                                    (ing.aliases || []).some(a => a.toLowerCase().includes(q));
                                });
                                return (
                                  <div style={{
                                    position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 100,
                                    background: 'var(--md-color-surface-container-lowest)', border: '1px solid var(--md-color-outline-variant)',
                                    borderRadius: 'var(--md-radius-sm)', boxShadow: 'var(--md-elevation-3)',
                                    maxHeight: 180, overflowY: 'auto',
                                  }}>
                                    {filtered.length === 0 ? (
                                      <div style={{ padding: 10, textAlign: 'center', color: 'var(--md-color-on-surface-variant)', fontSize: '0.85rem' }}>无匹配</div>
                                    ) : filtered.slice(0, 20).map(ing => (
                                      <div
                                        key={ing.id}
                                        className="preference-search-item"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                          updateBatchDecision(item.name, 'alias_for_id', ing.id);
                                          setAliasSearchTexts(prev => ({ ...prev, [item.name]: ing.name }));
                                          setAliasDropdownOpen(prev => ({ ...prev, [item.name]: false }));
                                        }}
                                      >
                                        <span>{ing.name}</span>
                                        {ing.aliases && ing.aliases.length > 0 && (
                                          <span style={{ fontSize: '0.7rem', color: 'var(--md-color-on-surface-variant)', marginLeft: 6 }}>(别名: {ing.aliases.join('、')})</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
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
