import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../contexts/CategoriesContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Card from '../components/primitives/Card';
import Input from '../components/primitives/Input';
import Badge from '../components/primitives/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Button from '../components/primitives/Button';
import Chip from '../components/primitives/Chip';
import Modal from '../components/composites/Modal';
import Sheet from '../components/composites/Sheet';
import Icon from '../components/primitives/Icon';

export default function AdminDishesPage() {
  const { user, isAdmin, isChef } = useAuth();
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
  const [sfDropdownCoords, setSfDropdownCoords] = useState(null);
  const [ingDropdownCoords, setIngDropdownCoords] = useState(null);

  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [smartMode, setSmartMode] = useState(true);
  const [removedParsedNames, setRemovedParsedNames] = useState([]);

  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const [advCategoryIds, setAdvCategoryIds] = useState([]);
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
  }, [advCategoryIds, user?.role, sfFilter]);

  useEffect(() => {
    if (!showIngDropdown) return;
    const handler = (e) => {
      if (ingDropdownRef.current && !ingDropdownRef.current.contains(e.target)) {
        // BUG-04: 如果点击在 Portal'd 菜单内，不关闭（让 onClick 先执行）
        if (e.target.closest('[data-ing-dropdown]')) return;
        setShowIngDropdown(false);
      }
    };
    // WR-01/WR-06: dropdown 打开期间任何 scroll/resize/orientationchange 触发立即关闭
    // capture: true 确保捕获 Modal body 内部 overflow-y:auto 的滚动事件
    const closeOnScroll = (e) => {
      if (e.target?.closest?.('[data-ing-dropdown]')) return;
      setShowIngDropdown(false);
      setIngDropdownCoords(null);
    };
    document.addEventListener('click', handler, true);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    window.addEventListener('orientationchange', closeOnScroll);
    return () => {
      document.removeEventListener('click', handler, true);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
      window.removeEventListener('orientationchange', closeOnScroll);
    };
  }, [showIngDropdown]);

  useEffect(() => {
    if (!showSfDropdown) return;
    const handler = (e) => {
      if (sfDropdownRef.current && !sfDropdownRef.current.contains(e.target)) {
        // BUG-04: 如果点击在 Portal'd 菜单内，不关闭（让 onClick 先执行）
        if (e.target.closest('[data-sf-dropdown]')) return;
        setShowSfDropdown(false);
      }
    };
    // WR-01/WR-06: dropdown 打开期间任何 scroll/resize/orientationchange 触发立即关闭
    // capture: true 确保捕获 Modal body 内部 overflow-y:auto 的滚动事件
    const closeOnScroll = (e) => {
      if (e.target?.closest?.('[data-sf-dropdown]')) return;
      setShowSfDropdown(false);
      setSfDropdownCoords(null);
    };
    document.addEventListener('click', handler, true);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    window.addEventListener('orientationchange', closeOnScroll);
    return () => {
      document.removeEventListener('click', handler, true);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
      window.removeEventListener('orientationchange', closeOnScroll);
    };
  }, [showSfDropdown]);

  const loadDishes = async () => {
    try {
      setLoading(true);
      const params = { page: 1, page_size: 100 };
      params.status = "all";
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

  // CR-01: opener 同时被 onClick 和 onKeyDown 调用，确保键盘激活也捕获 coords（Portal 才能渲染）
  const openIngDropdown = () => {
    if (showIngDropdown) {
      setShowIngDropdown(false);
      return;
    }
    if (ingDropdownRef.current) {
      const rect = ingDropdownRef.current.getBoundingClientRect();
      setIngDropdownCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      setShowIngDropdown(true);
    }
  };

  const openSfDropdown = () => {
    if (showSfDropdown) {
      setShowSfDropdown(false);
      return;
    }
    if (sfDropdownRef.current) {
      const rect = sfDropdownRef.current.getBoundingClientRect();
      setSfDropdownCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      setShowSfDropdown(true);
    }
  };

  const closeDishModal = () => {
    setShowDishModal(false);
    setShowIngDropdown(false);
    setIngDropdownCoords(null);
    setShowSfDropdown(false);
    setSfDropdownCoords(null);
  };

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
      setShowIngDropdown(false);
      setIngDropdownCoords(null);
      setShowSfDropdown(false);
      setSfDropdownCoords(null);
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

  const handleToggleEnabled = async (dish) => {
    const newStatus = dish.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await api.updateDishStatus(dish.id, newStatus);
      showToast(newStatus === 'enabled' ? '已启用' : '已禁用');
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
      <div style={{ marginBottom: 'var(--md-spacing-3)'}}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>{label}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-1)'}}>
          {items.map(c => (
            <Chip variant="filter" selected={selectedIds.includes(c.id)}
              key={c.id}
              onClick={() => onToggle(c.id)}
            >
              {c.name}
            </Chip>
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
          <div className="header-action-bar header-action-bar--split">
            <Button variant="tonal" size="sm" onClick={() => setShowAdvFilter(true)}>高级筛选</Button>
            <div style={{ display: 'flex', gap: 'var(--md-spacing-2)' }}>
              <Button variant="tonal" size="sm" onClick={openExtractModal}>
                <Icon name="edit" size={18} /> 解析文本
              </Button>
              <Button variant="filled" size="sm" onClick={() => openCreate()}>
                + 添加
              </Button>
            </div>
          </div>
        }
      />

      <div className="search-bar">
        <span className="search-icon"><Icon name="search" size={20} /></span>
        <input
          type="text"
          placeholder="搜索菜品名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadDishes()}
        />
        <div style={{ display: 'flex', gap: 'var(--md-spacing-1)', marginRight: 'var(--md-spacing-1)'}}>
          <Button variant="filled" size="sm" className="btn-search" onClick={loadDishes}>搜索</Button>
          <Button variant="tonal" size="sm" className="btn-search" onClick={() => { setSearchQuery(''); setAdvCategoryIds([]); }}>清空</Button>
        </div>
      </div>

      {showAdvFilter && (
        <Sheet
          open
          onClose={() => setShowAdvFilter(false)}
          title="高级筛选 — 菜品"
          footer={
            <div className="flex gap-3" style={{ width: '100%' }}>
              <Button variant="tonal" className="flex-1" onClick={() => { setAdvCategoryIds([]); setSfFilter('all'); }}>清空</Button>
              <Button variant="filled" className="flex-1" onClick={() => setShowAdvFilter(false)}>应用</Button>
            </div>
          }
        >
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
          <div className="filter-section">
            <div className="filter-section-label">半成品</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-1)' }}>
              {[
                { key: 'all', label: '全部' },
                { key: 'normal', label: '非半成品' },
                { key: 'semifinished', label: '半成品' },
              ].map(opt => (
                <Chip variant="filter" selected={sfFilter === opt.key}
                  key={opt.key}
                  onClick={() => setSfFilter(opt.key)}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </div>
        </Sheet>
      )}

      {loading ? (
        <Loading />
      ) : dishes.length === 0 ? (
        <EmptyState icon="set-meal" text="没有找到菜品" />
      ) : (
        <section className="section pt-0 pc-content-area">
          <div className="pc-data-table-wrap">
            <table className="pc-data-table pc-data-table--with-leading">
              <thead>
                  <tr>
                    <th style={{ width: '30%' }}>菜品</th>
                    <th style={{ width: '22%' }}>分类</th>
                    <th style={{ width: '10%' }}>厨师</th>
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
                            <div className="avatar avatar-sm"><Icon name="set-meal" size={20} /></div>
                          )}
                          <div>
                            <div className="pc-user-name">
                              {dish.name}
                              {dish.is_semifinished && <span style={{ fontSize: '0.7rem', marginLeft: 'var(--md-spacing-1)', padding: '1px var(--md-spacing-1)', borderRadius: 'var(--md-radius-xs)', background: 'var(--md-color-tertiary-container)', color: 'var(--md-color-on-tertiary-container)' }}>半成品</span>}
                            </div>
                            <div className="pc-user-sub">{dish.description ? dish.description.substring(0, 30) + '...' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>{(dish.categories || []).map(c => c.name).join('、') || '-'}</td>
                    <td>
                      {dish.chefs && dish.chefs.length > 0 ? (
                        <div style={{ display: 'flex' }}>
                          {dish.chefs.filter(c => c.publish_status === "published").slice(0, 5).map((c, ci) => (
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
                          {dish.chefs.filter(c => c.publish_status === "published").length > 5 && (
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'var(--md-color-surface-container)',
                              color: 'var(--md-color-on-surface-variant)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem',
                              border: '2px solid var(--md-color-surface-container-low)',
                              marginLeft: -6,
                            }}>
                              +{dish.chefs.filter(c => c.publish_status === "published").length - 5}
                            </div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td><Badge status={dish.status} /></td>
                    <td>
                      <div className="pc-action-btns">
                        <Button variant="tonal" size="sm" onClick={() => handleToggleEnabled(dish)}>
                          {dish.status === 'enabled' ? '禁用' : '启用'}
                        </Button>
                        <Button variant="outlined" size="sm" onClick={() => openEdit(dish)}>编辑</Button>
                        <Button variant="outlined" size="sm" onClick={() => handleDelete(dish.id)} style={{ borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}>
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list mobile-card-list--grid">
            {dishes.map(dish => (
              <Card
                key={dish.id}
                variant="elevated"
                style={{ marginBottom: 'var(--md-spacing-3)' }}
                footer={
                  <div className="flex gap-3" style={{ width: '100%' }}>
                    <Button variant="tonal" size="sm" className="flex-1" onClick={() => handleToggleEnabled(dish)}>
                      {dish.status === 'enabled' ? '禁用' : '启用'}
                    </Button>
                    <Button variant="outlined" size="sm" className="flex-1" onClick={() => openEdit(dish)}>编辑</Button>
                    <Button variant="outlined" size="sm" className="flex-1" onClick={() => handleDelete(dish.id)} style={{ borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}>
                      删除
                    </Button>
                  </div>
                }
              >
                <div className="flex items-center gap-3 mb-4">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 'var(--md-spacing-1)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {dish.name}
                        {dish.is_semifinished && <span style={{ fontSize: '0.7rem', marginLeft: 'var(--md-spacing-1)', padding: '1px var(--md-spacing-1)', borderRadius: 'var(--md-radius-xs)', background: 'var(--md-color-tertiary-container)', color: 'var(--md-color-on-tertiary-container)' }}>半成品</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {(dish.categories || []).map(c => c.name).join(' · ')}
                      </div>
                    </div>
                    <Badge status={dish.status} />
                  </div>
                  {/* 厨师信息：有数据时显示，无数据时占位保持卡片对齐 */}
                  <div style={{ minHeight: '28px', display: 'flex', alignItems: 'center', marginBottom: 'var(--md-spacing-2)' }}>
                    {dish.chefs && dish.chefs.filter(c => c.publish_status === 'published').length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-1)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)' }}>厨师：</span>
                        <div style={{ display: 'flex' }}>
                          {dish.chefs.filter(c => c.publish_status === "published").slice(0, 5).map((c, ci) => (
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
                          {dish.chefs.filter(c => c.publish_status === "published").length > 5 && (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: 'var(--md-color-surface-container)',
                              color: 'var(--md-color-on-surface-variant)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.6rem',
                              border: '2px solid var(--md-color-surface-container-low)',
                              marginLeft: -4,
                            }}>
                              +{dish.chefs.filter(c => c.publish_status === "published").length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : <span style={{ fontSize: '0.75rem', color: 'transparent' }}>占位</span>}
                  </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {showDishModal && (
        <Modal
          open
          onClose={closeDishModal}
          title={editingDish ? '编辑菜品' : '添加菜品'}
          style={{ maxWidth: 600 }}
          actions={[
            <Button key="cancel" variant="tonal" onClick={closeDishModal}>取消</Button>,
            <Button key="save" variant="filled" onClick={handleSave}>保存</Button>,
          ]}
        >
          <Input
            label="菜名 *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="输入菜品名称"
          />

              <Input
                multiline
                rows={2}
                label="描述"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="菜品描述"
              />

              <Input
                multiline
                rows={5}
                label="食谱"
                value={form.recipe}
                onChange={(e) => setForm({ ...form, recipe: e.target.value })}
                placeholder="食材用量、制作步骤等"
              />

              <div style={{ marginBottom: 'var(--md-spacing-4)'}}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>封面图</label>
                <div style={{ display: 'flex', gap: 'var(--md-spacing-2)', alignItems: 'center' }}>
                  {form.image_url && (
                    <img src={form.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--md-radius-xs)', objectFit: 'cover' }} />
                  )}
                  <input type="file" accept="image/*" onChange={handleUploadImage} style={{ fontSize: '0.8rem' }} />
                </div>
              </div>

              <div style={{ marginBottom: 'var(--md-spacing-4)'}}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>分类</label>
              {renderCategorySection(getTypeMeta('region').label, regions, form.category_ids, toggleCategory)}
              {dishCategoryTypes.filter(t => t.key !== 'region').map(t => {
                const items = t.key === 'cuisine' ? filteredCuisines : (dishCatsByType[t.key] || []);
                return <div key={t.key}>{renderCategorySection(t.label, items, form.category_ids, toggleCategory)}</div>;
              })}
              </div>

              <div style={{ marginBottom: 'var(--md-spacing-4)', position: 'relative' }} ref={ingDropdownRef}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>食材（已选 {form.ingredient_ids.length}）</label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-1)', marginBottom: 'var(--md-spacing-2)'}}>
                  {form.ingredient_ids.map(id => {
                    const ing = allIngredients.find(i => i.id === id);
                    return ing ? (
                      <span key={id} className="preference-tag dislike-tag" style={{ cursor: 'pointer' }} onClick={() => toggleIngredient(id)}>
                        {ing.name} ×
                      </span>
                    ) : null;
                  })}
                </div>

                {/* === 10-02-MIGRATION:START === div form-input trigger → .field-trigger (10-03 may also touch this file) === */}
                <div
                  className="field-trigger compact-interactive-target"
                  role="button"
                  tabIndex={0}
                  onClick={openIngDropdown}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIngDropdown(); } }}
                >
                  {showIngDropdown ? '搜索并选择食材...' : '点击选择食材...'}
                </div>
                {/* === 10-02-MIGRATION:END === */}
              </div>

              {semifinishedDishes.length > 0 && (
                <div style={{ marginBottom: 'var(--md-spacing-4)', position: 'relative' }} ref={sfDropdownRef}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>半成品食材（已选 {form.semifinished_dish_ids.length}）</label>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-1)', marginBottom: 'var(--md-spacing-2)'}}>
                    {form.semifinished_dish_ids.map(id => {
                      const sf = semifinishedDishes.find(d => d.id === id);
                      return sf ? (
                        <span key={id} className="preference-tag allergy-tag" style={{ cursor: 'pointer' }} onClick={() => toggleSemifinishedDish(id)}>
                          {sf.name} ×
                        </span>
                      ) : null;
                    })}
                  </div>

                  {/* === 10-02-MIGRATION:START === semifinished trigger div → .field-trigger === */}
                  <div
                    className="field-trigger compact-interactive-target"
                    role="button"
                    tabIndex={0}
                    onClick={openSfDropdown}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSfDropdown(); } }}
                  >
                    {showSfDropdown ? '搜索并选择半成品...' : '点击选择半成品食材...'}
                  </div>
                  {/* === 10-02-MIGRATION:END === */}
                </div>
              )}

              {/* SC-10: select 保留 .form-input */}
              <div style={{ marginBottom: 'var(--md-spacing-4)'}}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>状态</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="enabled">启用</option>
                  <option value="disabled">禁用</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', marginTop: 'var(--md-spacing-1)'}}>
                  {isAdmin ? '管理员创建的菜品默认为启用状态，需由厨师上架' : '选择菜品状态'}
                </div>
              </div>

              <div style={{ marginBottom: 'var(--md-spacing-4)'}}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-2)', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={form.is_semifinished}
                    onChange={(e) => setForm({ ...form, is_semifinished: e.target.checked })}
                    style={{ width: '0.85rem', height: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)' }}>标记为半成品</span>
                </label>
                <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', marginTop: 'var(--md-spacing-1)'}}>
                  半成品菜品不会出现在用户点菜菜单中，但可作为特殊食材被其他菜品选择
                </div>
              </div>
        </Modal>
      )}

      {showExtractModal && (
        <Modal
          open
          onClose={() => setShowExtractModal(false)}
          title="解析菜谱"
          style={{ maxWidth: 640 }}
        >
              <Input
                multiline
                rows={6}
                label="粘贴菜谱或文本内容"
                value={extractText}
                onChange={(e) => setExtractText(e.target.value)}
                placeholder="将菜谱文章、食材列表等文本粘贴到这里，系统会自动识别其中的食材..."
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-2)', marginBottom: 'var(--md-spacing-3)'}}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-1)', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={smartMode}
                    onChange={(e) => setSmartMode(e.target.checked)}
                    style={{ width: '0.85rem', height: '0.85rem' }}
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
              <Button
                variant="filled"
                loading={extracting}
                style={{ width: '100%' }}
                onClick={handleExtract}
              >
                开始解析
              </Button>

              {parseResult && (
                <div style={{ marginTop: 'var(--md-spacing-4)'}}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>
                    解析结果（{activeParsedIngredients.length} 个食材）
                  </div>
                  {activeParsedIngredients.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-1)', marginBottom: 'var(--md-spacing-3)'}}>
                      {activeParsedIngredients.map((p) => (
                        <Chip
                          key={p.name}
                          variant="input"
                          onRemove={() => removeParsedIngredient(p.name)}
                          style={{ opacity: p.matched_ingredient_id ? 1 : 0.6 }}
                        >
                          <Icon name={p.matched_ingredient_id ? 'check' : 'new-label'} size={16} /> {p.name}
                          {p.matched_ingredient_name && p.matched_ingredient_name !== p.name && ` → ${p.matched_ingredient_name}`}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--md-color-on-surface-variant)', fontSize: '0.85rem' }}>未识别到食材</div>
                  )}

                  {hasNewIngredients && (
                    <div style={{ display: 'flex', gap: 'var(--md-spacing-2)', marginTop: 'var(--md-spacing-2)'}}>
                      <Button variant="outlined" size="sm" onClick={handleGoToAddIngredient}>
                        <Icon name="add" size={18} /> 去添加新食材
                      </Button>
                    </div>
                  )}

                  {hasAnyIngredients && (
                    <div style={{ marginTop: 'var(--md-spacing-2)'}}>
                      <Button variant="filled" size="sm" onClick={handleNextStepFromExtract}>
                        下一步 → 创建菜品
                      </Button>
                    </div>
                  )}
                </div>
              )}
        </Modal>
      )}

      {showAddIngModal && (
        <Modal
          open
          onClose={() => setShowAddIngModal(false)}
          title={`添加新食材（${(batchItems || []).length} 个）`}
          style={{ maxWidth: 700 }}
          actions={[
            <Button key="cancel" variant="tonal" onClick={() => setShowAddIngModal(false)}>取消</Button>,
            <Button key="import" variant="filled" onClick={handleBatchImport} loading={batchImporting}>
              确认导入
            </Button>,
          ]}
        >
          {batchItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--md-spacing-5) 0', color: 'var(--md-color-on-surface-variant)' }}>
                  没有需要添加的新食材
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--md-spacing-3)'}}>
                  {batchItems.map((item) => {
                    const decision = batchDecisions[item.name] || { action: 'new', alias_for_id: null, category: '' };
                    const displayName = decision.editedName || item.name;
                    return (
                      <div
                        key={item.name}
                        style={{ border: '1px solid var(--md-color-outline-variant)', borderRadius: 'var(--md-radius-md)', padding: 'var(--md-spacing-3)'}}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-2)', marginBottom: 'var(--md-spacing-2)'}}>
                          {/* === 10-02-MIGRATION:START === renameBatchItem input → Input primitive === */}
                          <Input
                            aria-label="食材名"
                            value={displayName}
                            onChange={(e) => renameBatchItem(item.name, e.target.value)}
                            style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem' }}
                          />
                          {/* === 10-02-MIGRATION:END === */}
                          <button
                            onClick={() => removeBatchItem(item.name)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '1.1rem', color: 'var(--md-color-error)', padding: '0 var(--md-spacing-1)', lineHeight: 1,
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
                              {/* === 10-02-MIGRATION:START === alias search input → Input primitive === */}
                              <Input
                                aria-label="搜索别名目标食材"
                                style={{ fontSize: '0.85rem' }}
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
                              {/* === 10-02-MIGRATION:END === */}
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
                                      <div style={{ padding: 'var(--md-spacing-2)', textAlign: 'center', color: 'var(--md-color-on-surface-variant)', fontSize: '0.85rem' }}>无匹配</div>
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
                                          <span style={{ fontSize: '0.7rem', color: 'var(--md-color-on-surface-variant)', marginLeft: 'var(--md-spacing-1)'}}>(别名: {ing.aliases.join('、')})</span>
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
        </Modal>
      )}

      {showIngDropdown && ingDropdownCoords && createPortal(
        <div data-ing-dropdown style={{
          position: 'fixed', top: ingDropdownCoords.top, left: ingDropdownCoords.left, width: ingDropdownCoords.width, zIndex: 1000,
          background: 'var(--md-color-surface-container-lowest)', border: '1px solid var(--md-color-outline-variant)',
          borderRadius: 'var(--md-radius-md)', boxShadow: 'var(--md-elevation-2)',
          maxHeight: 280, overflowY: 'auto', padding: 'var(--md-spacing-1)',
        }}>
          <div style={{ padding: 'var(--md-spacing-2) var(--md-spacing-2) 0'}}>
            <Input
              placeholder="搜索食材..."
              value={ingSearch}
              onChange={(e) => setIngSearch(e.target.value)}
              autoFocus
              className=""
            />
            <div style={{ display: 'flex', gap: 'var(--md-spacing-1)', flexWrap: 'wrap', marginBottom: 'var(--md-spacing-1)'}}>
              <Chip variant="filter" selected={!ingCategoryFilter}
                onClick={() => setIngCategoryFilter('')}
                style={{ minBlockSize: 24, fontSize: '0.7rem', padding: '0 6px', lineHeight: '14px' }}
              >
                全部
              </Chip>
              {ingredientCategories.map(c => (
                <Chip variant="filter" selected={ingCategoryFilter === c.name}
                  key={c.id}
                  onClick={() => setIngCategoryFilter(c.name)}
                  style={{ minBlockSize: 24, fontSize: '0.7rem', padding: '0 6px', lineHeight: '14px' }}
                >
                  {c.name}
                </Chip>
              ))}
            </div>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {filteredIngForDropdown.length === 0 ? (
              <div style={{ padding: 'var(--md-spacing-3)', textAlign: 'center', color: 'var(--md-color-on-surface-variant)', fontSize: '0.85rem' }}>无匹配食材</div>
            ) : (
              filteredIngForDropdown.slice(0, 50).map(ing => (
                <div
                  key={ing.id}
                  className="preference-search-item"
                  onClick={() => { toggleIngredient(ing.id); }}
                  style={{ cursor: 'pointer' }}
                >
                  <span>{ing.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--md-color-on-surface-variant)', marginLeft: 'auto'}}>
                    {ingredientCategories.find(c => c.name === ing.category)?.name || ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

      {showSfDropdown && sfDropdownCoords && createPortal(
        <div data-sf-dropdown style={{
          position: 'fixed', top: sfDropdownCoords.top, left: sfDropdownCoords.left, width: sfDropdownCoords.width, zIndex: 1000,
          background: 'var(--md-color-surface-container-lowest)', border: '1px solid var(--md-color-outline-variant)',
          borderRadius: 'var(--md-radius-md)', boxShadow: 'var(--md-elevation-2)',
          maxHeight: 280, overflowY: 'auto', padding: 'var(--md-spacing-1)',
        }}>
          <div style={{ padding: 'var(--md-spacing-2) var(--md-spacing-2) 0'}}>
            <Input
              placeholder="搜索半成品..."
              value={sfSearch}
              onChange={(e) => setSfSearch(e.target.value)}
              autoFocus
              className=""
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            {semifinishedDishes
              .filter(d => !form.semifinished_dish_ids.includes(d.id))
              .filter(d => !sfSearch || d.name.includes(sfSearch))
              .length === 0 ? (
              <div style={{ padding: 'var(--md-spacing-3)', textAlign: 'center', color: 'var(--md-color-on-surface-variant)', fontSize: '0.85rem' }}>无匹配半成品</div>
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
                    <span style={{ fontSize: '0.8rem', color: 'var(--md-color-on-tertiary-container)', marginRight: 'var(--md-spacing-1)'}}><Icon name="ramen-dining" size={16} /></span>
                    <span>{d.name}</span>
                  </div>
                ))
            )}
          </div>
        </div>,
        document.body
      )}

      <BottomBar />
    </div>
  );
}
