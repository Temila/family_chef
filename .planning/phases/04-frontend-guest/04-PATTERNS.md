# Phase 4: Frontend Guest - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 4 (2 new, 2 modified)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/pages/GuestOrderPage.jsx` | page | request-response + CRUD | `frontend/src/pages/OrderPage.jsx` | exact |
| `frontend/src/components/GuestDishCard.jsx` | component | presentational | `frontend/src/components/DishCard.jsx` | role-match |
| `frontend/src/App.jsx` | route-config | request-response | `frontend/src/App.jsx` (existing) | self-modification |
| `frontend/src/css/styles.css` | config | — | `frontend/src/css/styles.css` (existing) | self-modification |

## Pattern Assignments

### `frontend/src/pages/GuestOrderPage.jsx` (page, request-response + CRUD)

**Analog:** `frontend/src/pages/OrderPage.jsx`

**Imports pattern** (lines 1-10):
```jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../contexts/CategoriesContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
```

**Guest adaptation** — Replace auth/categories/api imports with direct fetch and useParams:
```jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import GuestDishCard from '../components/GuestDishCard';
```

**Data loading pattern** (lines 89-101):
```jsx
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
```

**Guest adaptation** — Direct fetch instead of ApiClient, with token-based error state routing:
```jsx
// Initial data load — determine page state from token validation
useEffect(() => {
  (async () => {
    try {
      const res = await guestFetch(`/${token}/dishes?page=1&page_size=100`);
      setDishes(res.items || []);
      setChefName(/* extract from first dish's chefs[] */);
      setPageState('browsing');
    } catch (err) {
      if (err.message.includes('已被使用')) {
        try {
          const summary = await guestFetch(`/${token}/summary`);
          setOrderSummary(summary);
          setPageState('used');
        } catch { setPageState('error'); setErrorMsg('获取订单摘要失败'); }
      } else {
        setErrorMsg(err.message);
        setPageState('error');
      }
    }
  })();
}, [token]);
```

**Cart management pattern** (lines 118-183):
```jsx
// OrderPage uses localStorage-based cart
const loadCart = () => {
  const saved = localStorage.getItem('fc_cart');
  setCart(saved ? JSON.parse(saved) : []);
};
const saveCart = (newCart) => {
  setCart(newCart);
  localStorage.setItem('fc_cart', JSON.stringify(newCart));
};
```

**Guest adaptation** — Pure React state, no localStorage, no chef_id (bound to invitation):
```jsx
const [cart, setCart] = useState([]); // [{dish_id, dish_name, quantity}]

const addToCart = (dish) => {
  setCart(prev => {
    const existing = prev.find(item => item.dish_id === dish.id);
    if (existing) {
      return prev.map(item =>
        item.dish_id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    }
    return [...prev, { dish_id: dish.id, dish_name: dish.name, quantity: 1 }];
  });
};
const getQuantity = (dishId) => cart.find(item => item.dish_id === dishId)?.quantity || 0;
const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
```

**Order submission pattern** (lines 206-232):
```jsx
const handleSubmitOrder = async () => {
  try {
    setSubmitting(true);
    const orders = await api.createOrder({
      items: cart.map(item => ({ dish_id: item.dish_id, quantity: item.quantity, chef_id: item.chef_id })),
      meal_date: mealDate,
      meal_type: mealType,
    });
    saveCart([]);
    showToast(`订单提交成功！已通知厨师`);
    navigate('/profile');
  } catch (err) {
    showToast('提交订单失败', 'error');
  } finally {
    setSubmitting(false);
  }
};
```

**Guest adaptation** — Direct fetch to guest endpoint, no chef_id/meal_date, show confirmation instead of navigate:
```jsx
const handleSubmitOrder = async () => {
  try {
    setSubmitting(true);
    const result = await guestFetch(`/${token}/orders`, {
      method: 'POST',
      body: JSON.stringify({ items: cart.map(item => ({ dish_id: item.dish_id, quantity: item.quantity })) }),
    });
    setOrderNo(result.order_no);
    setPageState('confirmed');
  } catch (err) {
    showToast(err.message || '提交订单失败', 'error');
  } finally {
    setSubmitting(false);
  }
};
```

**Cart bar HTML pattern** (lines 510-526):
```jsx
<div className="cart-bar">
  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setCartExpanded(!cartExpanded)}>
    <span style={{ fontSize: '1.1rem', marginRight: 6 }}>🛒</span>
    <span style={{ fontWeight: 600 }}>已点 {cartCount} 道菜</span>
    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
      {cartExpanded ? '收起 ▲' : '展开 ▼'}
    </span>
  </div>
  <button className="btn btn-primary btn-sm" onClick={handleConfirmOrder} disabled={submitting || cartCount === 0}>
    {submitting ? '提交中...' : '确认点菜'}
  </button>
</div>
```

**Cart detail panel HTML pattern** (lines 528-553):
```jsx
{cartExpanded && (
  <div className="cart-detail-panel">
    {cart.map(item => (
      <div key={item.cart_key} className="cart-detail-item">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem' }}>{item.dish_name}</div>
        </div>
        <div className="qty-stepper">
          <button onClick={() => updateQuantity(item.cart_key, -1)}>−</button>
          <span className="qty-value">{item.quantity}</span>
          <button onClick={() => updateQuantity(item.cart_key, 1)}>+</button>
        </div>
        <button className="btn-icon btn-sm" onClick={() => removeFromCart(item.cart_key)}
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>×</button>
      </div>
    ))}
  </div>
)}
```

**Filter chips HTML pattern** (lines 316-422):
```jsx
<div className="filter-chips" style={{ paddingBottom: 4 }}>
  <button className="filter-chip" onClick={() => setShowFilters(!showFilters)}>
    {showFilters ? '收起筛选 ▲' : '展开筛选 ▼'}
  </button>
  {/* ... filter-chip buttons for categories ... */}
</div>

{showFilters && (
  <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border)' }}>
    <div className="filter-section">
      <div className="filter-section-label">{getTypeMeta('region').label}</div>
      <div className="filter-chips" style={{ padding: 0, paddingBottom: 4 }}>
        <button className={`filter-chip ${!selectedRegion ? 'active' : ''}`}>全部</button>
        {regions.map(r => (
          <button key={r.id} className={`filter-chip ${selectedRegion === r.id ? 'active' : ''}`}>{r.name}</button>
        ))}
      </div>
    </div>
  </div>
)}
```

**Direct fetch utility pattern** (from RESEARCH.md, replaces api.getClient):
```jsx
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
```

---

### `frontend/src/components/GuestDishCard.jsx` (component, presentational)

**Analog:** `frontend/src/components/DishCard.jsx`

**Full analog** (lines 1-66):
```jsx
/**
 * DishCard Component - 菜品卡片
 */

import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../utils';

export default function DishCard({ dish, simple }) {
  const navigate = useNavigate();

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextElementSibling.style.display = 'flex';
  };

  return (
    <div className="dish-card" onClick={() => navigate(`/dishes/${dish.id}`)}>
      <div className="dish-card-image">
        {dish.image_url ? (
          <>
            <img src={dish.image_url} alt={dish.name} onError={handleImageError} />
            <div className="placeholder-img" style={{ display: 'none' }}>🍽️</div>
          </>
        ) : (
          <div className="placeholder-img">🍽️</div>
        )}
        {dish.is_featured && (
          <div className="dish-card-badges">
            <span className="badge badge-gold">推荐</span>
          </div>
        )}
      </div>
      <div className="dish-card-body">
        <div className="dish-card-name">{dish.name}</div>
        {!simple && (
          <div className="dish-card-meta">
            {dish.cuisine_name && `${dish.cuisine_name} · `}
            {dish.base_price !== null && `¥${formatPrice(dish.base_price)}`}
          </div>
        )}
        {!simple && (
          <div className="dish-card-footer">
            <span className="badge badge-info">{dish.category_name || '默认'}</span>
            {dish.is_available ? (
              <span className="badge badge-success">可点</span>
            ) : (
              <span className="badge badge-danger">已售罄</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Guest adaptation** — Simplified card with inline stepper, no navigation, no favorites, no badges:
```jsx
/**
 * GuestDishCard Component - 访客菜品卡片
 */

export default function GuestDishCard({ dish, quantity, onAdd, onRemove }) {
  return (
    <div className="dish-card">
      <div className="dish-card-image">
        {dish.image_url ? (
          <img src={dish.image_url} alt={dish.name}
               onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="placeholder-img">🍽️</div>
        )}
      </div>
      <div className="dish-card-body">
        <div className="dish-card-name">{dish.name}</div>
        <div className="dish-card-meta">
          {(dish.categories || []).map(c => c.name).join(' · ')}
        </div>
        <div className="dish-card-footer">
          <span /> {/* spacer */}
          {quantity === 0 ? (
            <button className="btn btn-primary btn-sm guest-add-btn" onClick={() => onAdd(dish)}>+</button>
          ) : (
            <div className="qty-stepper">
              <button onClick={() => onRemove(dish.id)}>−</button>
              <span className="qty-value">{quantity}</span>
              <button onClick={() => onAdd(dish)}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Key differences from DishCard:**
- No `useNavigate` — guest cards are not clickable links
- No favorites button, no dietary warnings, no chef avatars
- Inline stepper replaces "点菜" button — `+` button becomes `- qty +` after first add
- Uses same CSS classes: `dish-card`, `dish-card-image`, `dish-card-body`, `dish-card-name`, `dish-card-meta`, `dish-card-footer`, `qty-stepper`, `qty-value`

---

### `frontend/src/App.jsx` (route-config, self-modification)

**Current structure** (lines 82-247):
```jsx
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CategoriesProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              {/* ... authenticated routes inside PcLayout ... */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**Target modification** — Add guest route BEFORE AuthProvider, with its own ToastProvider:
```jsx
function App() {
  return (
    <BrowserRouter>
      {/* ── Guest Routes (isolated, no auth) ── */}
      <ToastProvider>
        <Routes>
          <Route path="/guest/:token" element={<GuestOrderPage />} />
        </Routes>
      </ToastProvider>

      {/* ── Authenticated Shell ── */}
      <AuthProvider>
        <CategoriesProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              {/* ... existing authenticated routes unchanged ... */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**Import addition** (line 1 area — add after existing page imports):
```jsx
import GuestOrderPage from './pages/GuestOrderPage';
```

**Key constraints:**
- Guest `<Routes>` block appears FIRST so `/guest/:token` matches before the catch-all `*` in authenticated routes
- Guest route is OUTSIDE `AuthProvider` and `CategoriesProvider` — guest has no JWT, no user state
- Guest route has its OWN `ToastProvider` — separate toast context from authenticated shell
- Two `<Routes>` blocks can coexist within one `<BrowserRouter>` — React Router v6+ supports this

---

### `frontend/src/css/styles.css` (config, self-modification)

**Existing CSS classes to reuse as-is** (no modification needed for these):

| Class | Location (line) | Purpose | Guest Usage |
|-------|-----------------|---------|-------------|
| `.dish-card` | 99-100 | Card container | GuestDishCard — same class, same visual |
| `.dish-card-image` | 101-103 | Image container with aspect-ratio 4/3 | GuestDishCard |
| `.dish-card-body` | 105 | Card body with flex column | GuestDishCard |
| `.dish-card-name` | 106 | Dish name styling | GuestDishCard |
| `.dish-card-meta` | 107 | Category text, ellipsis overflow | GuestDishCard |
| `.dish-card-footer` | 108 | Flex row, space-between | GuestDishCard stepper area |
| `.dish-grid` | 177-181 | CSS grid, 1-col mobile, 2-col 480px+ | Guest dish list |
| `.qty-stepper` | 184-187 | Inline flex, rounded border | GuestDishCard stepper |
| `.qty-stepper button` | 185-186 | 30×30px buttons | Guest stepper buttons |
| `.qty-stepper .qty-value` | 187 | 32px wide center text | Guest stepper quantity |
| `.cart-bar` | 245-247 | Fixed bottom bar, max-width 420px | Guest cart bar (needs guest override) |
| `.cart-detail-panel` | 250-252 | Fixed panel above cart-bar | Guest cart detail |
| `.cart-detail-item` | 253-254 | Flex row with gap | Guest cart items |
| `.filter-chips` | 123 | Flex wrap row with gap | Guest filter chips |
| `.filter-chip` | 124-126 | Pill-shaped filter button | Guest filter buttons |
| `.filter-chip.active` | 126 | Active state with gradient | Guest active filter |
| `.search-bar` | 130-134 | Search input container | Guest search |
| `.filter-section` | 397 | Filter group with margin | Guest filter sections |
| `.filter-section-label` | 398 | Uppercase section label | Guest filter labels |
| `.empty-state` | 277-279 | Centered empty state | Guest error/empty states |
| `.loading` | 266-267 | Centered loading spinner | Guest loading state |
| `.page-container` | 55-57 | Full height page wrapper | Guest page wrapper (needs override) |

**New guest-specific CSS to append:**
```css
/* ═══ Guest Page Overrides ═══════════════════ */
.guest-page { max-width: 420px; margin: 0 auto; min-height: 100vh; padding-bottom: 0; }

/* Guest cart bar: no BottomBar offset, so bottom: 0 */
.guest-cart-bar { bottom: 0; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
.guest-cart-bar ~ .cart-detail-panel { bottom: 52px; }

/* Guest dish card: no hover transform (mobile-first) */
.guest-page .dish-card:hover { transform: none; }
.guest-page .dish-card { cursor: default; }

/* Guest add button */
.guest-add-btn { width: 32px; height: 32px; border-radius: var(--radius-full); font-size: 1.1rem; display: flex; align-items: center; justify-content: center; padding: 0; }

/* Guest confirmation page */
.guest-confirm { text-align: center; padding: 60px 24px 24px; }
.guest-confirm-icon { font-size: 4rem; margin-bottom: 16px; }
.guest-confirm-title { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; }
.guest-confirm-subtitle { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 32px; }
.guest-confirm-order-no { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 16px; }
.guest-confirm-list { text-align: left; background: var(--bg-elevated); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 24px; }
.guest-confirm-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.85rem; }
.guest-confirm-footer { color: var(--text-muted); font-size: 0.75rem; margin-top: 24px; }

/* Guest error page */
.guest-error { text-align: center; padding: 80px 24px 24px; }
.guest-error-icon { font-size: 4rem; margin-bottom: 16px; }
.guest-error-title { font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; }
.guest-error-desc { color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; }

/* Guest dark mode: use prefers-color-scheme when no data-theme is set */
@media (prefers-color-scheme: dark) {
  .guest-page:not([data-theme]) {
    --bg-primary: #1E1E1E; --bg-secondary: #252525; --bg-card: #2A2A2A;
    --bg-card-hover: #333333; --bg-elevated: #383838; --bg-input: #2E2E2E;
    --text-primary: #E8EAED; --text-secondary: #9AA0A6; --text-muted: #6B7280;
    --accent: #8AB4F8; --accent-light: rgba(138, 180, 248, 0.12);
    --border: #3C4043; --border-medium: #4A4D52;
  }
}
```

---

## Shared Patterns

### Toast Notifications
**Source:** `frontend/src/contexts/ToastContext.jsx` (lines 9-48)
**Apply to:** `GuestOrderPage.jsx` — uses its own `ToastProvider` wrapper in App.jsx
```jsx
// In GuestOrderPage:
const { showToast } = useToast();

// Usage:
showToast('已添加 宫保鸡丁');       // success (default)
showToast('提交订单失败', 'error'); // error
```

### Loading State
**Source:** `frontend/src/components/Loading.jsx` (lines 5-11)
**Apply to:** `GuestOrderPage.jsx` — initial load state
```jsx
import Loading from '../components/Loading';
// Usage:
if (pageState === 'loading') return <Loading />;
// Or with custom message:
<Loading message="正在加载菜品..." />
```

### Empty/Error State
**Source:** `frontend/src/components/EmptyState.jsx` (lines 5-16)
**Apply to:** `GuestOrderPage.jsx` — empty dishes, error pages
```jsx
import EmptyState from '../components/EmptyState';
// Usage:
<EmptyState icon="📭" text="没有找到菜品" subtext="请尝试其他筛选条件" />
<EmptyState icon="🔗" text="邀请链接已过期" subtext="请联系邀请人获取新的链接" />
```

### API Error Response Handling
**Source:** `backend/app/routers/guest.py` (lines 102-185)
**Apply to:** All guest API calls in GuestOrderPage

Backend returns `HTTPException` with `detail` field containing Chinese error messages:
- `400 — "邀请链接已过期"` → show expired error state
- `400 — "无效的邀请链接"` → show invalid link error state
- `400 — "该邀请链接已被使用"` → load summary via `/{token}/summary`
- `400 — "订单不能为空"` → show toast "购物车为空"

Frontend guestFetch extracts `data.detail` as error message:
```javascript
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
```

### CSS Variables (Design Tokens)
**Source:** `frontend/src/css/styles.css` (lines 9-28, 30-44)
**Apply to:** All guest-specific CSS — use existing variables for consistency
```css
/* Key variables used throughout: */
--bg-primary, --bg-card, --bg-elevated   /* Background layers */
--text-primary, --text-secondary, --text-muted /* Text hierarchy */
--accent, --accent-light, --accent-gradient    /* Primary action color */
--border, --border-medium                      /* Border levels */
--radius-sm, --radius-md, --radius-lg, --radius-full /* Border radii */
--shadow-sm, --shadow-md, --shadow-lg         /* Elevation shadows */
--transition-fast, --transition-normal         /* Animation timing */
--font-display, --font-body                    /* Typography */
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All files have close analogs in the existing codebase |

All 4 files in this phase have direct analogs:
- `GuestOrderPage.jsx` → `OrderPage.jsx` (same role: page with cart, filters, dish grid)
- `GuestDishCard.jsx` → `DishCard.jsx` (same role: dish card component)
- `App.jsx` → Self-modification (adding a route)
- `styles.css` → Self-modification (adding guest overrides)

The novel elements (inline stepper in card, page state machine, direct fetch utility, guest-specific cart bar positioning) are adaptations of existing patterns documented in their respective sections above.

## Metadata

**Analog search scope:** `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/contexts/`, `frontend/src/css/`, `backend/app/routers/`
**Files scanned:** 10
**Pattern extraction date:** 2026-05-26
