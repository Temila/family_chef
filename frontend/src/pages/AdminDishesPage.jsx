import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function AdminDishesPage() {
  const { showToast } = useToast();

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', image_url: '', status: 'draft',
    category_ids: [], ingredient_ids: [], recipe: '',
  });
  const [categories, setCategories] = useState({ regions: [], cuisines: [], tastes: [], seasons: [] });
  const [ingredients, setIngredients] = useState([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientResults, setIngredientResults] = useState([]);

  const [extractText, setExtractText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null);

  useEffect(() => {
    loadDishes();
    loadCategories();
    loadIngredients();
  }, []);

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

  const loadCategories = async () => {
    try {
      const [regionsRes, cuisinesRes, tastesRes, seasonsRes] = await Promise.all([
        api.getCategories('region'),
        api.getCategories('cuisine'),
        api.getCategories('taste'),
        api.getCategories('season'),
      ]);
      setCategories({
        regions: regionsRes.items || [],
        cuisines: cuisinesRes.items || [],
        tastes: tastesRes.items || [],
        seasons: seasonsRes.items || [],
      });
    } catch (err) {}
  };

  const loadIngredients = async () => {
    try {
      const res = await api.getIngredients();
      setIngredients(res.items || []);
    } catch (err) {}
  };

  const searchIngredients = async (query) => {
    setIngredientSearch(query);
    if (query.length < 1) {
      setIngredientResults([]);
      return;
    }
    try {
      const res = await api.getIngredients(null, query);
      setIngredientResults(res.items || []);
    } catch (err) {
      setIngredientResults([]);
    }
  };

  const openCreate = () => {
    setEditingDish(null);
    setForm({ name: '', description: '', image_url: '', status: 'draft', category_ids: [], ingredient_ids: [], recipe: '' });
    setShowModal(true);
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
    setShowModal(true);
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
      setShowModal(false);
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

  const handleExtract = async () => {
    if (!extractText.trim()) {
      showToast('请输入文本内容', 'error');
      return;
    }
    try {
      setExtracting(true);
      const res = await api.extractIngredients(extractText);
      setExtractResult(res);
      if (res.ingredients && res.ingredients.length > 0) {
        const newIngredientIds = res.ingredients
          .filter(name => {
            const found = ingredients.find(i => i.name === name);
            return found && !form.ingredient_ids.includes(found.id);
          })
          .map(name => ingredients.find(i => i.name === name)?.id)
          .filter(Boolean);
        if (newIngredientIds.length > 0) {
          setForm(prev => ({
            ...prev,
            ingredient_ids: [...prev.ingredient_ids, ...newIngredientIds],
          }));
        }
      }
      showToast(`解析完成，识别到 ${res.ingredients?.length || 0} 个食材`);
    } catch (err) {
      showToast('解析失败', 'error');
    } finally {
      setExtracting(false);
    }
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

  return (
    <div className="page-container">
      <Header
        title="菜品管理"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setExtractText(''); setExtractResult(null); setShowExtractModal(true); }}>
              📝 解析文本
            </button>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>{editingDish ? '编辑菜品' : '添加菜品'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[...categories.regions, ...categories.cuisines, ...categories.tastes, ...categories.seasons].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`filter-chip ${form.category_ids.includes(c.id) ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={() => toggleCategory(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">食材（已选 {form.ingredient_ids.length}）</label>
                <input
                  className="form-input"
                  placeholder="搜索食材添加..."
                  value={ingredientSearch}
                  onChange={(e) => searchIngredients(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {form.ingredient_ids.map(id => {
                    const ing = ingredients.find(i => i.id === id);
                    return ing ? (
                      <span key={id} className="preference-tag dislike-tag" style={{ cursor: 'pointer' }} onClick={() => toggleIngredient(id)}>
                        {ing.name} ×
                      </span>
                    ) : null;
                  })}
                </div>
                {ingredientResults.length > 0 && (
                  <div className="preference-search-results" style={{ maxHeight: 150 }}>
                    {ingredientResults.filter(i => !form.ingredient_ids.includes(i.id)).slice(0, 10).map(ing => (
                      <div key={ing.id} className="preference-search-item" onClick={() => { toggleIngredient(ing.id); setIngredientSearch(''); setIngredientResults([]); }}>
                        <span>{ing.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>+ 添加</span>
                      </div>
                    ))}
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
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showExtractModal && (
        <div className="modal-overlay" onClick={() => setShowExtractModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>从文本解析食材</h3>
              <button className="modal-close" onClick={() => setShowExtractModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">粘贴菜谱或文本内容</label>
                <textarea
                  className="form-input"
                  rows={8}
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

              {extractResult && (
                <div style={{ marginTop: 16 }}>
                  <div className="form-label">解析结果</div>
                  {extractResult.ingredients && extractResult.ingredients.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {extractResult.ingredients.map((name, i) => {
                        const existing = ingredients.find(ing => ing.name === name);
                        return (
                          <span
                            key={i}
                            className="filter-chip"
                            style={{ cursor: existing ? 'default' : 'pointer', opacity: existing ? 1 : 0.6 }}
                          >
                            {existing ? '✅' : '🆕'} {name}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>未识别到食材</div>
                  )}
                  {extractResult.steps && extractResult.steps.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div className="form-label">识别的制作步骤</div>
                      {extractResult.steps.map((step, i) => (
                        <div key={i} style={{ fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          {i + 1}. {step}
                        </div>
                      ))}
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

      <BottomBar />
    </div>
  );
}
