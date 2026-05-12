import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [selectedTastes, setSelectedTastes] = useState([]);
  const [selectedSeasons, setSelectedSeasons] = useState([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name');

  const [categories, setCategories] = useState({ regions: [], cuisines: [], tastes: [], seasons: [] });
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
    loadCategories();
    loadCart();
  }, []);

  useEffect(() => {
    loadDishes(1);
  }, [searchQuery, selectedRegion, selectedCuisine, selectedTastes, selectedSeasons, favoritesOnly, sortBy]);

  useEffect(() => {
    if (page > 1) loadMoreDishes();
  }, [page]);

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

  const buildParams = (pageNum) => {
    const params = { page: pageNum, page_size: 20 };
    if (searchQuery) params.search = searchQuery;
    if (selectedRegion) params.regions = [selectedRegion];
    if (selectedCuisine) params.cuisines = [selectedCuisine];
    if (selectedTastes.length > 0) params.tastes = selectedTastes;
    if (selectedSeasons.length > 0) params.seasons = selectedSeasons;
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
      setShowChefModal(true);
    } catch (err) {
      showToast('加载厨师列表失败', 'error');
    }
  };

  const handleSubmitOrder = async () => {
    try {
      setSubmitting(true);
      await api.createOrder({
        items: cart.map(item => ({
          dish_id: item.dish_id,
          quantity: item.quantity,
        })),
      });
      saveCart([]);
      setShowChefModal(false);
      showToast('订单提交成功！已通知厨师');
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
    ? categories.cuisines.filter(c => c.parent_id === selectedRegion)
    : categories.cuisines;

  const toggleArrayFilter = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  return (
    <div className="page-container">
      <Header title="点菜" />

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
            <div className="filter-section-label">地区</div>
            <div className="filter-chips" style={{ padding: 0, paddingBottom: 4 }}>
              <button
                className={`filter-chip ${!selectedRegion ? 'active' : ''}`}
                onClick={() => { setSelectedRegion(null); setSelectedCuisine(null); }}
              >
                全部
              </button>
              {categories.regions.map(r => (
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
              <div className="filter-section-label">菜系</div>
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

          {categories.tastes.length > 0 && (
            <div className="filter-section">
              <div className="filter-section-label">口味</div>
              <div className="filter-chips" style={{ padding: 0, paddingBottom: 4 }}>
                {categories.tastes.map(t => (
                  <button
                    key={t.id}
                    className={`filter-chip ${selectedTastes.includes(t.id) ? 'active' : ''}`}
                    onClick={() => toggleArrayFilter(selectedTastes, setSelectedTastes, t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {categories.seasons.length > 0 && (
            <div className="filter-section">
              <div className="filter-section-label">季节</div>
              <div className="filter-chips" style={{ padding: 0, paddingBottom: 4 }}>
                {categories.seasons.map(s => (
                  <button
                    key={s.id}
                    className={`filter-chip ${selectedSeasons.includes(s.id) ? 'active' : ''}`}
                    onClick={() => toggleArrayFilter(selectedSeasons, setSelectedSeasons, s.id)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(dish);
                          }}
                        >
                          点菜
                        </button>
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

      {cartCount > 0 && (
        <div className="cart-bar">
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setCartExpanded(!cartExpanded)}>
            <span style={{ fontWeight: 600 }}>已点 {cartCount} 道菜</span>
            <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {cartExpanded ? '收起 ▲' : '展开 ▼'}
            </span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleConfirmOrder}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '确认点菜'}
          </button>
        </div>
      )}

      {cartExpanded && cartCount > 0 && (
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
              <h3>选择厨师</h3>
              <button className="modal-close" onClick={() => setShowChefModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {chefs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                  暂无可用厨师，将直接提交订单
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chefs.map(chef => (
                    <div
                      key={chef.id}
                      className={`chef-select-item ${selectedChef === chef.id ? 'active' : ''}`}
                      onClick={() => setSelectedChef(chef.id)}
                    >
                      <div className="avatar avatar-sm">
                        {(chef.display_name || chef.username).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {chef.display_name || chef.username}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>厨师</div>
                      </div>
                      {selectedChef === chef.id && <span style={{ color: 'var(--accent)' }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
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
