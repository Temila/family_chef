import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import GuestDishCard from '../components/GuestDishCard';
import Button from '../components/primitives/Button';

async function guestFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(`/api/guest${url}`, { ...options, headers });
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`请求失败 (${res.status})`);
    return null;
  }
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(data.detail || '请求失败');
  return data;
}

export default function GuestOrderPage() {
  const { token } = useParams();
  const { showToast } = useToast();

  const [pageState, setPageState] = useState('loading');
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [orderSummary, setOrderSummary] = useState(null);
  const [chefName, setChefName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const catRes = await fetch('/api/categories?page=1&page_size=100');
        const catText = await catRes.text();
        if (catText) {
          const catData = JSON.parse(catText);
          setCategories(catData.items || []);
        }
      } catch { /* categories optional */ }

      try {
        const res = await guestFetch(`/${token}/dishes?page=1&page_size=100`);
        setDishes(res.items || []);
        const firstDish = (res.items || [])[0];
        if (firstDish && firstDish.chefs) {
          const pub = firstDish.chefs.find(c => c.publish_status === 'published');
          if (pub) setChefName(pub.display_name || pub.username);
        }
        setPageState('browsing');
      } catch (err) {
        if (err.message.includes('已被使用')) {
          try {
            const summary = await guestFetch(`/${token}/summary`);
            setOrderSummary(summary);
            setPageState('used');
          } catch {
            setErrorMsg('获取订单摘要失败');
            setPageState('error');
          }
        } else {
          setErrorMsg(err.message);
          setPageState('error');
        }
      }
    })();
  }, [token]);

  const addToCart = useCallback((dish) => {
    setCart(prev => {
      const existing = prev.find(item => item.dish_id === dish.id);
      if (existing) {
        return prev.map(item =>
          item.dish_id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { dish_id: dish.id, dish_name: dish.name, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((dishId) => {
    setCart(prev => {
      const existing = prev.find(item => item.dish_id === dishId);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map(item =>
          item.dish_id === dishId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.dish_id !== dishId);
    });
  }, []);

  const getQuantity = useCallback((dishId) => {
    return cart.find(item => item.dish_id === dishId)?.quantity || 0;
  }, [cart]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categoryTypes = {};
  for (const cat of categories) {
    const type = cat.type || 'other';
    if (!categoryTypes[type]) categoryTypes[type] = [];
    categoryTypes[type].push(cat);
  }

  const regions = categoryTypes.region || [];
  const cuisines = categoryTypes.cuisine || [];
  const filteredCuisines = selectedRegion
    ? cuisines.filter(c => c.parent_id === selectedRegion)
    : cuisines;
  const filterTypes = Object.keys(categoryTypes).filter(t => !['region', 'cuisine', 'ingredient'].includes(t));

  const typeLabels = { region: '种类', cuisine: '菜系', taste: '口味', season: '季节', ingredient: '食材', other: '其他' };

  const filteredDishes = dishes.filter(dish => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = dish.name && dish.name.toLowerCase().includes(q);
      const pinyinMatch = dish.pinyin && dish.pinyin.toLowerCase().includes(q);
      if (!nameMatch && !pinyinMatch) return false;
    }
    const dishCatIds = (dish.categories || []).map(c => c.id);
    if (selectedRegion && !dishCatIds.includes(selectedRegion)) return false;
    if (selectedCuisine && !dishCatIds.includes(selectedCuisine)) return false;
    for (const t of filterTypes) {
      const ids = selectedFilters[t] || [];
      if (ids.length > 0 && !ids.some(id => dishCatIds.includes(id))) return false;
    }
    return true;
  });

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showToast('购物车为空', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const result = await guestFetch(`/${token}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(item => ({ dish_id: item.dish_id, quantity: item.quantity })),
        }),
      });
      setOrderNo(result.order_no);
      setPageState('confirmed');
    } catch (err) {
      showToast(err.message || '提交订单失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="guest-page">
        <Loading message="正在加载菜品..." />
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="guest-page">
        <div className="guest-error">
          <div className="guest-error-icon">😔</div>
          <div className="guest-error-title">{errorMsg}</div>
          <div className="guest-error-desc">请联系邀请人获取新的链接</div>
        </div>
      </div>
    );
  }

  if (pageState === 'used') {
    return (
      <div className="guest-page">
        <div className="guest-confirm">
          <div className="guest-confirm-icon">📋</div>
          <div className="guest-confirm-title">已提交的订单</div>
          {orderSummary && orderSummary.order_no && (
            <div className="guest-confirm-order-no">订单号: {orderSummary.order_no}</div>
          )}
          {orderSummary && orderSummary.items && orderSummary.items.length > 0 && (
            <div className="guest-confirm-list">
              {orderSummary.items.map((item, idx) => (
                <div key={idx} className="guest-confirm-item">
                  <span>{item.dish_name}</span>
                  <span>×{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
          <div className="guest-confirm-footer">订单已提交，请耐心等待</div>
        </div>
      </div>
    );
  }

  if (pageState === 'confirmed') {
    return (
      <div className="guest-page">
        <div className="guest-confirm">
          <div className="guest-confirm-icon">✅</div>
          <div className="guest-confirm-title">点单成功</div>
          <div className="guest-confirm-subtitle">已通知厨师，请耐心等待</div>
          <div className="guest-confirm-order-no">订单号: {orderNo}</div>
          <div className="guest-confirm-list">
            {cart.map(item => (
              <div key={item.dish_id} className="guest-confirm-item">
                <span>{item.dish_name}</span>
                <span>×{item.quantity}</span>
              </div>
            ))}
          </div>
          {chefName && (
            <div style={{ fontSize: '0.85rem', color: 'var(--md-color-on-surface-variant)', marginBottom: 16 }}>
              👨‍🍳 {chefName}
            </div>
          )}
          <div className="guest-confirm-footer">关闭本页即可</div>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-page">
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索菜品..."
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
        <span style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', lineHeight: '28px' }}>
          共 {filteredDishes.length} 道
        </span>
      </div>

      {showFilters && (
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--md-color-outline-variant)' }}>
          {regions.length > 0 && (
            <div className="filter-section">
              <div className="filter-section-label">{typeLabels.region}</div>
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
          )}

          {filteredCuisines.length > 0 && (
            <div className="filter-section">
              <div className="filter-section-label">{typeLabels.cuisine}</div>
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
            const items = categoryTypes[t] || [];
            if (items.length === 0) return null;
            const selectedArr = selectedFilters[t] || [];
            return (
              <div className="filter-section" key={t}>
                <div className="filter-section-label">{typeLabels[t] || t}</div>
                <div className="filter-chips" style={{ padding: 0, paddingBottom: 4 }}>
                  {items.map(item => (
                    <button
                      key={item.id}
                      className={`filter-chip ${selectedArr.includes(item.id) ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFilters(prev => {
                          const arr = prev[t] || [];
                          return {
                            ...prev,
                            [t]: arr.includes(item.id) ? arr.filter(v => v !== item.id) : [...arr, item.id],
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

      {filteredDishes.length === 0 ? (
        <EmptyState icon="🍽️" text="没有找到菜品" subtext="请尝试其他筛选条件" />
      ) : (
        <div className="dish-grid" style={{ paddingBottom: cartCount > 0 ? 140 : 80 }}>
          {filteredDishes.map(dish => (
            <GuestDishCard
              key={dish.id}
              dish={dish}
              quantity={getQuantity(dish.id)}
              onAdd={addToCart}
              onRemove={removeFromCart}
            />
          ))}
        </div>
      )}

      <div className="cart-bar guest-cart-bar">
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setCartExpanded(!cartExpanded)}>
          <span style={{ fontSize: '1.1rem', marginRight: 6 }}>🛒</span>
          <span style={{ fontWeight: 600 }}>已选 {cartCount} 道菜</span>
          <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)' }}>
            {cartExpanded ? '收起 ▲' : '展开 ▼'}
          </span>
        </div>
        <Button
          variant="filled"
          size="sm"
          loading={submitting}
          onClick={handleSubmitOrder}
          disabled={cartCount === 0}
        >
          提交订单
        </Button>
      </div>

      {cartExpanded && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0, background: 'var(--md-color-scrim)',
              zIndex: 148,
            }}
            onClick={() => setCartExpanded(false)}
          />
          <div className="cart-detail-panel">
            {cart.map(item => (
              <div key={item.dish_id} className="cart-detail-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem' }}>{item.dish_name}</div>
                </div>
                <div className="qty-stepper">
                  <button onClick={() => removeFromCart(item.dish_id)}>−</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button onClick={() => {
                    const dish = dishes.find(d => d.id === item.dish_id);
                    if (dish) addToCart(dish);
                  }}>+</button>
                </div>
                <button
                  className="btn-icon btn-sm"
                  onClick={() => setCart(prev => prev.filter(c => c.dish_id !== item.dish_id))}
                  style={{ color: 'var(--md-color-error)', borderColor: 'var(--md-color-error)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
