import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../contexts/CategoriesContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import DishCard from '../components/DishCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function OrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { getByType, getTypeMeta, categoryTypes } = useCategories();

  const isAdmin = user?.role === 'admin';

  const regions = getByType('region');
  const cuisines = getByType('cuisine');
  const filterTypes = categoryTypes().filter(t => !['ingredient', 'cuisine'].includes(t.key));

  const [dishes, setDishes] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(false);
  const [showChefModal, setShowChefModal] = useState(false);
  const [chefs, setChefs] = useState([]);
  const [selectedChef, setSelectedChef] = useState(null);
  const [mealDate, setMealDate] = useState('');
  const [mealType, setMealType] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name');

  const [showFilters, setShowFilters] = useState(false);

  const observer = useRef();
  const lastDishRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    loadDishes(1);
  }, [searchQuery, selectedRegion, selectedCuisine, selectedFilters, favoritesOnly, sortBy]);

  useEffect(() => {
    if (page > 1) loadMoreDishes();
  }, [page]);

  const buildParams = (pageNum) => {
    const params = { page: pageNum, page_size: 20 };
    if (searchQuery) params.search = searchQuery;
    if (selectedRegion) params.regions = [selectedRegion];
    if (selectedCuisine) params.cuisines = [selectedCuisine];
    for (const t of filterTypes) {
      const ids = selectedFilters[t.key] || [];
      if (ids.length > 0) params[t.key + 's'] = ids;
    }
    if (favoritesOnly) params.favorites_only = true;
    if (sortBy) params.sort = sortBy;
    return params;
  };

  const loadDishes = async (pageNum) => {
    try {
      setLoading(true);
      setPage(1);
      const res = await api.getDishes(buildParams(1));
      setDishes(res.items || []);
      setTotal(res.total || 0);
      setHasMore((res.items || []).length >= 20);
    } catch (err) {
      showToast('加载菜品失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreDishes = async () => {
    try {
      setLoadingMore(true);
      const res = await api.getDishes(buildParams(page));
      const newItems = res.items || [];
      setDishes(prev => [...prev, ...newItems]);
      setHasMore(newItems.length >= 20);
    } catch (err) {
      showToast('加载更多失败', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const loadCart = () => {
    const saved = localStorage.getItem('fc_cart');
    setCart(saved ? JSON.parse(saved) : []);
  };

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem('fc_cart', JSON.stringify(newCart));
  };

  const addToCart = (dish, quantity = 1) => {
    const newCart = [...cart];
    const existing = newCart.find(item => item.dish_id === dish.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      newCart.push({
        dish_id: dish.id,
        dish_name: dish.name,
        quantity,
      });
    }
    saveCart(newCart);
    showToast(`已添加 ${dish.name}`);
  };

  const removeFromCart = (dishId) => {
    saveCart(cart.filter(item => item.dish_id !== dishId));
  };

  const updateQuantity = (dishId, delta) => {
    const newCart = cart.map(item => {
      if (item.dish_id === dishId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean);
    saveCart(newCart);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getDefaultMeal = () => {
    const now = new Date();
    const h = now.getHours();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (h >= 7 && h < 12) return { date: fmt(now), type: 'lunch' };
    if (h >= 12 && h < 18) return { date: fmt(now), type: 'dinner' };
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { date: fmt(tomorrow), type: 'breakfast' };
  };

  const handleConfirmOrder = async () => {
    if (cart.length === 0) {
      showToast('购物车为空', 'error');
      return;
    }
    try {
      const chefsRes = await api.getChefs();
      const chefList = chefsRes || [];
      setChefs(chefList);
      if (chefList.length === 1) {
        setSelectedChef(chefList[0].id);
      } else {
        setSelectedChef(null);
      }
      const defaultMeal = getDefaultMeal();
      setMealDate(defaultMeal.date);
      setMealType(defaultMeal.type);
      setShowChefModal(true);
    } catch (err) {
      showToast('加载厨师列表失败', 'error');
    }
  };

  const handleSubmitOrder = async () => {
    if (!mealDate || !mealType) {
      showToast('请选择用餐时间', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const orders = await api.createOrder({
        items: cart.map(item => ({
          dish_id: item.dish_id,
          quantity: item.quantity,
        })),
        meal_date: mealDate,
        meal_type: mealType,
      });
      saveCart([]);
      setShowChefModal(false);
      const count = orders.length;
      showToast(`订单提交成功！${count > 1 ? `已拆分为 ${count} 个订单` : ''}，已通知厨师`);
      navigate('/profile');
    } catch (err) {
      showToast('提交订单失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFavorite = async (dish, e) => {
    e.stopPropagation();
    try {
      if (dish.is_favorite) {
        await api.removeFavorite(dish.id);
        showToast('已取消收藏');
      } else {
        await api.addFavorite(dish.id);
        showToast('已收藏');
      }
      setDishes(prev => prev.map(d =>
        d.id === dish.id ? { ...d, is_favorite: !d.is_favorite } : d
      ));
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const getWarningTag = (dish) => {
    if (!dish.dietary_warnings || dish.dietary_warnings.length === 0) return null;
    const hasAllergy = dish.dietary_warnings.some(w => w.type === 'allergy');
    const hasDislike = dish.dietary_warnings.some(w => w.type === 'dislike');
    if (hasAllergy) {
      const names = dish.dietary_warnings.filter(w => w.type === 'allergy').map(w => w.ingredient).join('、');
      return { type: 'allergy', label: `忌口: ${names}`, className: 'dietary-tag-allergy' };
    }
    if (hasDislike) {
      const names = dish.dietary_warnings.filter(w => w.type === 'dislike').map(w => w.ingredient).join('、');
      return { type: 'dislike', label: `不爱吃: ${names}`, className: 'dietary-tag-dislike' };
    }
    return null;
  };

  const filteredCuisines = selectedRegion
    ? cuisines.filter(c => c.parent_id === selectedRegion)
    : cuisines;


  return (
    <div className="page-container">
      <Header title={isAdmin ? '点菜预览' : '点菜'} />

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索菜名或食材..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-chips" style={{ paddingBottom: 4 }}>
        <button
          className="filter-chip"
          onClick={() => setShowFilters(!showFilters)}
          style={{ fontSize: '0.75rem' }}
        >
          {showFilters ? '收起筛选 ▲' : '展开筛选 ▼'}
        </button>
        <button
          className={`filter-chip ${favoritesOnly ? 'active' : ''}`}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
        >
          ❤️ 收藏
        </button>
        <select
          className="filter-chip"
          style={{ appearance: 'none', paddingRight: 20, background: `var(--bg-elevated) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999BAA'/%3E%3C/svg%3E") no-repeat right 8px center` }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">默认排序</option>
          <option value="created">最新添加</option>
          <option value="popular">热门优先</option>
        </select>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '28px' }}>
          共 {total} 道
        </span>
      </div>

      {showFilters && (
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="filter-section">
            <div className="filter-section-label">{getTypeMeta('region').label}</div>
            <div className="filter-chips" style={{ padding: 0, paddingBottom: 4 }}>
              <button
                className={`filter-chip ${!selectedRegion ? 'active' : ''}`}
                onClick={() => { setSelectedRegion(null); setSelectedCuisine(null); }}
              >
                全部
              </button>
              {regions.map(r => (
                <button
                  key={r.id}
                  className={`filter-chip ${selectedRegion === r.id ? 'active' : ''}`}
                  onClick={() => { setSelectedRegion(r.id); setSelectedCuisine(null); }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {filteredCuisines.length > 0 && (
            <div className="filter-section">
              <div className="filter-section-label">{getTypeMeta('cuisine').label}</div>
              <div className="filter-chips" style={{ padding: 0, paddingBottom: 4 }}>
                <button
                  className={`filter-chip ${!selectedCuisine ? 'active' : ''}`}
                  onClick={() => setSelectedCuisine(null)}
                >
                  全部
                </button>
                {filteredCuisines.map(c => (
                  <button
                    key={c.id}
                    className={`filter-chip ${selectedCuisine === c.id ? 'active' : ''}`}
                    onClick={() => setSelectedCuisine(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterTypes.map(t => {
            const items = getByType(t.key);
            if (items.length === 0) return null;
            const meta = getTypeMeta(t.key);
            const selectedArr = selectedFilters[t.key] || [];
            return (
              <div className="filter-section" key={t.key}>
                <div className="filter-section-label">{meta.label}</div>
                <div className="filter-chips" style={{ padding: 0, paddingBottom: 4 }}>
                  {items.map(item => (
                    <button
                      key={item.id}
                      className={`filter-chip ${selectedArr.includes(item.id) ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFilters(prev => {
                          const arr = prev[t.key] || [];
                          return {
                            ...prev,
                            [t.key]: arr.includes(item.id) ? arr.filter(v => v !== item.id) : [...arr, item.id],
                          };
                        });
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : dishes.length === 0 ? (
        <EmptyState icon="🍽️" text="没有找到菜品" />
      ) : (
        <section className="section pt-0" style={{ paddingBottom: cartCount > 0 ? 140 : 80 }}>
          <div className="dish-grid">
            {dishes.map((dish, index) => {
              const warning = getWarningTag(dish);
              const isLast = index === dishes.length - 1;
              return (
                <div
                  key={dish.id}
                  ref={isLast ? lastDishRef : null}
                  className="dish-card-wrapper"
                >
                  <div className="dish-card" onClick={() => navigate(`/dishes/${dish.id}`)}>
                    <div className="dish-card-image">
                      {dish.image_url ? (
                        <img src={dish.image_url} alt={dish.name} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="placeholder-img">🍽️</div>
                      )}
                      <div className="dish-card-badges">
                        {dish.is_popular && <span className="badge badge-gold">推荐</span>}
                      </div>
                      {warning && (
                        <div className={`dietary-tag ${warning.className}`}>
                          {warning.label}
                        </div>
                      )}
                      {dish.chefs && dish.chefs.filter(c => c.publish_status === 'published').length > 0 && (
                        <div style={{
                          position: 'absolute', bottom: 8, right: 8,
                          display: 'flex', gap: -4,
                        }}>
                          {dish.chefs.filter(c => c.publish_status === 'published').slice(0, 3).map(c => (
                            <div key={c.id} style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: 'var(--accent)',
                              color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem', fontWeight: 600,
                              border: '2px solid var(--bg-card)',
                              marginLeft: -8,
                            }} title={c.display_name || c.username}>
                              {(c.display_name || c.username).charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="dish-card-body">
                      <div className="dish-card-name">{dish.name}</div>
                      <div className="dish-card-meta">
                        {dish.categories && dish.categories.map(c => c.name).join(' · ')}
                      </div>
                      <div className="dish-card-footer">
                        <div className="dish-card-actions">
                          <button
                            className="btn-icon btn-sm dish-fav-btn"
                            onClick={(e) => handleToggleFavorite(dish, e)}
                            title={dish.is_favorite ? '取消收藏' : '收藏'}
                          >
                            {dish.is_favorite ? '❤️' : '🤍'}
                          </button>
                        </div>
                        {!isAdmin && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(dish);
                            }}
                          >
                            点菜
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <div className="loading-spinner" style={{ display: 'inline-block', marginRight: 8, width: 16, height: 16, borderWidth: 2 }}></div>
              加载更多...
            </div>
          )}
          {!hasMore && dishes.length > 20 && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              没有更多菜品了
            </div>
          )}
        </section>
      )}

      {!isAdmin && (
        <div className="cart-bar">
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setCartExpanded(!cartExpanded)}>
            <span style={{ fontSize: '1.1rem', marginRight: 6 }}>🛒</span>
            <span style={{ fontWeight: 600 }}>已点 {cartCount} 道菜</span>
            <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {cartExpanded ? '收起 ▲' : '展开 ▼'}
            </span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleConfirmOrder}
            disabled={submitting || cartCount === 0}
          >
            {submitting ? '提交中...' : '确认点菜'}
          </button>
        </div>
      )}

      {!isAdmin && cartExpanded && (
        <div className="cart-detail-panel">
          {cart.map(item => (
            <div key={item.dish_id} className="cart-detail-item">
              <span style={{ flex: 1, fontSize: '0.85rem' }}>{item.dish_name}</span>
              <div className="qty-stepper">
                <button onClick={() => updateQuantity(item.dish_id, -1)}>−</button>
                <span className="qty-value">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.dish_id, 1)}>+</button>
              </div>
              <button
                className="btn-icon btn-sm"
                onClick={() => removeFromCart(item.dish_id)}
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {showChefModal && (
        <div className="modal-overlay" onClick={() => setShowChefModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认订单</h3>
              <button className="modal-close" onClick={() => setShowChefModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">用餐时间</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {(() => {
                    const today = new Date();
                    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const weekday = (d) => ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
                    const dates = Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(today);
                      d.setDate(d.getDate() + i);
                      return { value: fmt(d), label: i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '后天' : `${d.getMonth()+1}/${d.getDate()}`, sub: i === 0 ? '' : weekday(d) };
                    });
                    return dates.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        className={`filter-chip ${mealDate === d.value ? 'active' : ''}`}
                        style={{ flex: 1, minWidth: 0, padding: '6px 4px', textAlign: 'center', flexDirection: 'column', lineHeight: 1.3 }}
                        onClick={() => setMealDate(d.value)}
                      >
                        <span>{d.label}</span>
                        {d.sub && <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{d.sub}</span>}
                      </button>
                    ));
                  })()}
                </div>
                <select
                  className="form-input"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                >
                  <option value="breakfast">早餐</option>
                  <option value="lunch">午餐</option>
                  <option value="dinner">晚餐</option>
                  <option value="now">现在就想吃</option>
                </select>
              </div>
              <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                系统将根据菜品绑定的厨师自动拆单分配订单
              </div>
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  确认订单 ({cartCount} 道菜)
                </div>
                {cart.map(item => (
                  <div key={item.dish_id} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.dish_name}</span>
                    <span>×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowChefModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSubmitOrder} disabled={submitting}>
                {submitting ? '提交中...' : '确认提交'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
