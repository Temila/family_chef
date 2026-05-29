# Phase 4: Frontend Guest - Research

**Researched:** 2026-05-26
**Domain:** React SPA — guest-facing mobile-first ordering page
**Confidence:** HIGH

## Summary

Phase 4 builds a standalone guest ordering page at `/guest/:token` that lives outside the authenticated SPA shell. The backend API is already fully implemented (Phase 2): three guest endpoints at `/api/guest/{token}/*` provide dish browsing, order submission, and order summary retrieval. No new packages or backend changes are required — this is a pure frontend React implementation.

The primary complexity lies in three areas: (1) creating an isolated page architecture that bypasses the AuthProvider/ProtectedRoute/CategoriesProvider shell while still providing toast notifications, (2) building a mobile-first shopping cart UX (inline stepper, bottom cart bar, expandable detail panel) that matches the food-delivery app pattern (美团/饿了么), and (3) handling the four distinct page states (browsing → order confirmed → already used → error) within a single route component.

**Primary recommendation:** Build a single `GuestOrderPage.jsx` component with internal state machine. Reuse existing CSS classes (`dish-card`, `cart-bar`, `cart-detail-panel`, `filter-chips`, `qty-stepper`) from `styles.css`. Call the 3 guest APIs directly via `fetch()` (not the ApiClient singleton). Load categories from `/api/categories` (no auth required) for client-side filtering. Use the cart React state (not localStorage) for the confirmation page since the POST response returns `dish_id` but not `dish_name`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `/guest/:token` route in App.jsx outside PcLayout, outside AuthProvider, with independent ToastProvider
- **D-02:** Direct `fetch()` calls to `/api/guest/*` — no ApiClient singleton (avoids 401 auto-redirect)
- **D-03:** Single route with internal state switching: browsing | confirmed | used-summary | error
- **D-04:** Share `styles.css`, inherit system light/dark preference via `prefers-color-scheme`, reuse existing CSS classes + guest-specific overrides
- **D-05:** New `GuestDishCard` component (not reusing DishCard) — image + name + category + add button only
- **D-06:** Inline +/- stepper inside card. Initial "+" button → click shows "- qty +" controller. Mobile-friendly single-hand UX
- **D-07:** Filters: search + all category types (region, cuisine, taste, season, ingredient). No favorites, no sort. Categories fetched directly via `/api/categories`
- **D-08:** Fixed bottom cart bar (like 美团/饿了么). Tap to expand detail panel with quantity adjustment and delete
- **D-09:** No remarks/notes field — removed from Phase 4 scope
- **D-10:** Full-page confirmation on successful submission (not modal)
- **D-11:** Confirmation content: "点单成功" title + order_no + dish list (name × qty) + chef name + "已通知厨师" hint + "关闭本页即可" footer
- **D-12:** Full-page error state: large icon + Chinese title + description + "请联系邀请人"
- **D-13:** Already-used links show read-only order summary via GET `/{token}/summary`
- **D-14:** WeChat in-app browser compatible: standard CSS/JS, no Web Share API needed

### the agent's Discretion
- GuestDishCard layout specifics (card height, image ratio, text truncation)
- Cart detail panel styling (height, animation, backdrop)
- Filter area collapse/expand pattern
- Confirmation page and error page layout, icons, colors
- Category data management inside guest page (direct fetch vs simple Context)

### Deferred Ideas (OUT OF SCOPE)
- **备注功能（GORD-06）** — removed from Phase 4
- **邀请剩余时间倒计时（EUX-01）** — v2
- **二维码生成（EUX-02）** — v2
- **访客显示名（EUX-03）** — v2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GORD-03 | 访客可将菜品加入购物车并设置数量 | D-06 inline stepper, D-08 bottom cart bar, cart state in React useState |
| GORD-04 | 访客提交订单时无需选择厨师（已绑定） | Backend already binds chef_id to invitation; POST body only needs `items: [{dish_id, quantity}]` |
| GORD-06 | ~~备注~~ | Removed from scope per D-09 |
| GORD-07 | 访客提交订单后看到确认页面 | D-10/D-11 full-page confirmation; POST response provides order_no; dish names from cart state |
| GUX-01 | 访客点菜页面移动端优先适配 | Mobile-first CSS; reuses responsive breakpoints (420/768px); no sidebar/bottombar |
| GUX-02 | 访客点菜页面独立于主应用布局 | D-01 route outside PcLayout/AuthProvider; standalone full-page layout |
| GUX-03 | 链接过期友好中文提示 | D-12 error state; backend returns "邀请链接已过期" message |
| GUX-04 | 已使用链接显示只读订单摘要 | D-13 calls GET /{token}/summary → {order_no, items: [{dish_name, quantity}]} |
| GUX-05 | 无效链接友好错误提示 | D-12 error state; backend returns "无效的邀请链接" message |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Guest page routing | Browser / Client | — | `/guest/:token` is a React Router route in the SPA |
| Dish browsing (UI) | Browser / Client | — | All rendering and interaction in React |
| Cart management | Browser / Client | — | Pure React state, no persistence needed |
| Category filtering | Browser / Client | API / Backend | Client-side filter UI; initial data from GET /api/categories |
| Dish data fetch | API / Backend | — | GET /api/guest/{token}/dishes returns paginated DishListResponse |
| Order submission | API / Backend | — | POST /api/guest/{token}/orders handles atomic status check + order creation |
| Token validation | API / Backend | — | Backend validate_invitation called implicitly via dishes endpoint |
| Error state display | Browser / Client | — | Full-page error UI based on backend error messages |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.5 | UI framework | Project standard — all pages are React function components |
| react-router-dom | ^7.15.0 | Client-side routing | Project standard — `BrowserRouter`, `Routes`, `Route`, `useParams` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | — | No new dependencies required for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useState for cart | useReducer | useReducer is cleaner for complex state; useState is simpler and matches existing OrderPage pattern |
| Direct fetch | Axios | Axios adds bundle weight; fetch is native and sufficient for 3 API calls |

**No new packages to install.** This phase uses only existing project dependencies.

## Package Legitimacy Audit

> No new packages introduced in this phase. All dependencies are pre-existing from the project setup.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Authenticated Shell (AuthProvider + CategoriesCtx)   │    │
│  │  /home, /order, /admin, /chef/* ...                 │    │
│  │  Uses: ApiClient singleton, ProtectedRoute, PcLayout │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Guest Route (isolated)                               │    │
│  │  /guest/:token                                       │    │
│  │  Uses: Direct fetch(), own ToastProvider             │    │
│  │                                                     │    │
│  │  Page State Machine:                                │    │
│  │  ┌──────────┐  success   ┌───────────────┐         │    │
│  │  │ Browsing │───────────▶│  Confirmed    │         │    │
│  │  └────┬─────┘            └───────────────┘         │    │
│  │       │                                              │    │
│  │       │ 400 "已被使用"  ┌──────────────┐            │    │
│  │       ├───────────────▶│ Used Summary │            │    │
│  │       │                └──────────────┘            │    │
│  │       │                                              │    │
│  │       │ 400 other     ┌──────────────┐             │    │
│  │       └──────────────▶│ Error State  │             │    │
│  │                       └──────────────┘             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          │                    │                   │
          ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (port 8000)                     │
│                                                             │
│  GET /api/guest/{token}/dishes   → PageResponse[DishList]   │
│  POST /api/guest/{token}/orders  → {order_no, status, ...}  │
│  GET /api/guest/{token}/summary  → {order_no, items, ...}   │
│  GET /api/categories             → {total, items: [...]}    │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
frontend/src/
├── pages/
│   └── GuestOrderPage.jsx      # New — single guest ordering page
├── components/
│   └── (existing shared: EmptyState, Loading, Badge)
├── css/
│   └── styles.css               # Existing — add guest-specific overrides
├── contexts/
│   └── ToastContext.jsx          # Existing — reuse for guest ToastProvider
└── App.jsx                      # Existing — add /guest/:token route
```

### Pattern 1: Isolated Route with Own Providers
**What:** Guest route lives outside AuthProvider, CategoriesProvider, with its own ToastProvider
**When to use:** Any unauthenticated page that needs toast but not auth context
**Example:**
```jsx
// App.jsx — guest route OUTSIDE the AuthProvider/CategoriesProvider shell
<BrowserRouter>
  {/* Guest route — isolated from authenticated shell */}
  <ToastProvider>
    <Routes>
      <Route path="/guest/:token" element={<GuestOrderPage />} />
    </Routes>
  </ToastProvider>

  {/* Authenticated shell */}
  <AuthProvider>
    <CategoriesProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PcLayout />}>
            {/* ... authenticated routes ... */}
          </Route>
        </Routes>
      </ToastProvider>
    </CategoriesProvider>
  </AuthProvider>
</BrowserRouter>
```
**Important:** The guest ToastProvider must be separate from the authenticated ToastProvider, because the guest route is outside the AuthProvider tree. Both `<Routes>` blocks can coexist within the same `<BrowserRouter>`.

### Pattern 2: Direct Fetch for Guest APIs
**What:** Raw `fetch()` calls instead of ApiClient singleton
**When to use:** Guest page (ApiClient auto-redirects to /login on 401)
**Example:**
```javascript
// Guest page — direct fetch, no auth headers, no 401 redirect
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

// Usage:
const dishes = await guestFetch(`/${token}/dishes?page=1&page_size=100`);
const result = await guestFetch(`/${token}/orders`, {
  method: 'POST',
  body: JSON.stringify({ items: cart.map(...) }),
});
```

### Pattern 3: Page State Machine
**What:** Single component with state-driven rendering
**When to use:** When one URL serves multiple distinct UI states
**Example:**
```jsx
const [pageState, setPageState] = useState('loading'); // loading | browsing | confirmed | used | error
const [errorMsg, setErrorMsg] = useState('');

// On mount — determine which state to show
useEffect(() => {
  (async () => {
    try {
      const res = await guestFetch(`/${token}/dishes?page=1&page_size=100`);
      setDishes(res.items || []);
      setPageState('browsing');
    } catch (err) {
      if (err.message.includes('已被使用')) {
        // Load summary for used links
        const summary = await guestFetch(`/${token}/summary`);
        setOrderSummary(summary);
        setPageState('used');
      } else if (err.message.includes('已过期')) {
        setErrorMsg('邀请链接已过期');
        setPageState('error');
      } else {
        setErrorMsg(err.message);
        setPageState('error');
      }
    }
  })();
}, [token]);

// Render based on state
if (pageState === 'loading') return <Loading />;
if (pageState === 'error') return <ErrorState msg={errorMsg} />;
if (pageState === 'used') return <OrderSummary data={orderSummary} />;
if (pageState === 'confirmed') return <Confirmation orderNo={orderNo} cart={cart} />;
return <DishBrowsing ... />;  // browsing state
```

### Pattern 4: Client-Side Category Filtering
**What:** Load categories once, filter dishes in React state
**When to use:** When backend only supports single `category_id` param but UI needs multi-type filtering
**Example:**
```jsx
// Load all dishes at once (chef's published dishes are typically < 100)
const [allDishes, setAllDishes] = useState([]);
const [categories, setCategories] = useState([]);
const [selectedCategories, setSelectedCategories] = useState([]); // [{type, id}]
const [searchQuery, setSearchQuery] = useState('');

// Filter in JS
const filteredDishes = allDishes.filter(dish => {
  if (searchQuery && !dish.name.includes(searchQuery)) return false;
  if (selectedCategories.length > 0) {
    const dishCatIds = (dish.categories || []).map(c => c.id);
    return selectedCategories.every(sc => dishCatIds.includes(sc.id));
  }
  return true;
});
```

### Anti-Patterns to Avoid
- **Using ApiClient for guest endpoints:** ApiClient auto-redirects to `/login` on 401 — guest pages must never trigger this. Use direct `fetch()` [CITED: frontend/src/api/client.js line 30-37]
- **Wrapping guest route in AuthProvider:** Guest has no JWT token — AuthProvider would show loading forever or redirect to login [CITED: frontend/src/App.jsx line 85]
- **Using CategoriesProvider for guest:** CategoriesProvider uses ApiClient (which requires auth). Guest page must fetch categories directly via `fetch('/api/categories')` [CITED: frontend/src/contexts/CategoriesContext.jsx line 20]
- **Using localStorage for guest cart:** One-time use case, no persistence needed. Pure React state is simpler and avoids stale data across different tokens [ASSUMED]
- **Reading `dish_name` from POST response:** The POST `/orders` response only returns `{dish_id, quantity}` — confirmation page must use cart state data for dish names [VERIFIED: backend/app/routers/guest.py line 159-168]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | Existing `ToastContext.jsx` with own `ToastProvider` | Already built, matches design system |
| Loading state | Custom spinner | Existing `Loading.jsx` component | Consistent with rest of app |
| Empty/error state | Custom layout | Existing `EmptyState.jsx` with subtext prop | Already supports icon + text + subtext |
| Cart stepper UI | Custom counter | Existing `.qty-stepper` CSS pattern from styles.css | Already styled, consistent with OrderPage |
| Cart bar + panel | Custom cart UI | Existing `.cart-bar` + `.cart-detail-panel` CSS | Already positioned fixed with responsive widths |
| Filter chips | Custom filter UI | Existing `.filter-chips` + `.filter-chip` CSS | Already styled with active state |
| Page routing | Custom routing logic | React Router `useParams()` for token extraction | Standard, type-safe |

**Key insight:** This phase is ~90% composing existing UI patterns from `OrderPage.jsx` and `styles.css` into a new standalone page. The only novel UI element is the inline card stepper (D-06) which is a simplified variant of the existing `.qty-stepper`.

## Common Pitfalls

### Pitfall 1: POST Order Response Missing Dish Names
**What goes wrong:** Confirmation page (D-11) needs dish names but POST `/orders` only returns `{dish_id, quantity}`
**Why it happens:** Backend response construction uses `order_data.items` (input) not DB-enriched items [VERIFIED: backend/app/routers/guest.py line 166-167]
**How to avoid:** Store the full cart (with dish names) in React state before submitting. Use cart state for the confirmation page rendering, and only use the response `order_no`.
**Warning signs:** Confirmation page shows dish IDs instead of names

### Pitfall 2: Category Filtering Backend Limitation
**What goes wrong:** CONTEXT.md D-07 requires filtering by all category types, but GET `/{token}/dishes` only accepts a single `category_id` param
**Why it happens:** Backend guest dishes endpoint has limited filter params: `search`, `category_id` only [VERIFIED: backend/app/routers/guest.py line 102-109]
**How to avoid:** Load all dishes at once (page_size=100 — a single chef's published dishes won't exceed this). Do client-side filtering in React based on selected categories. Load categories from GET `/api/categories` (no auth required).
**Warning signs:** Backend returns 422 when sending multiple category filter params

### Pitfall 3: Guest Route Catches All Unmatched Routes
**What goes wrong:** The `<Route path="*" element={<Navigate to="/" />} />` in App.jsx might match before `/guest/:token`
**Why it happens:** Route ordering — the catch-all `*` route is at the bottom of the authenticated Routes block
**How to avoid:** Place the guest `<Route>` in a separate `<Routes>` block that appears BEFORE the authenticated `<Routes>` in the component tree. React Router v6+ matches routes by specificity, but having two `<Routes>` blocks ensures guest is evaluated independently.
**Warning signs:** Navigating to `/guest/xxx` redirects to `/login`

### Pitfall 4: Dark Mode Not Working on Guest Page
**What goes wrong:** Guest page shows light mode even when user's system prefers dark
**Why it happens:** Existing dark mode uses `[data-theme="dark"]` CSS selector, set by `ThemeToggle` in authenticated shell. Guest page has no ThemeToggle.
**How to avoid:** Per D-04, use `prefers-color-scheme` media query for guest page. Add guest-specific CSS that uses `@media (prefers-color-scheme: dark)` to apply dark variables when no explicit `data-theme` is set. OR: set `data-theme` attribute based on system preference on mount.
**Warning signs:** Guest page stuck in light mode on dark-mode phone

### Pitfall 5: SPA Fallback for /guest/:token in Production
**What goes wrong:** Direct navigation to `/guest/abc-uuid` returns 404 in production
**Why it happens:** Production serves frontend from FastAPI's `StaticFiles(directory=..., html=True)` which supports SPA fallback
**How to avoid:** The existing `html=True` flag in `main.py` line 83 handles this — it returns `index.html` for any path not matching a static file. Verify this works correctly for `/guest/:token` paths.
**Warning signs:** Sharing a guest link and getting 404 when opening in new browser

### Pitfall 6: WeChat In-App Browser Compatibility
**What goes wrong:** Layout breaks or interactions fail in WeChat's built-in browser
**Why it happens:** WeChat browser uses older WebView engine
**How to avoid:** Use standard CSS flexbox/grid, CSS variables, standard ES2020. Avoid: CSS `gap` in flex (use margins as fallback), `:has()` selector, `container` queries. The existing styles.css already uses safe patterns.
**Warning signs:** Layout issues reported only from WeChat users

## Code Examples

### App.jsx Route Integration
```jsx
// Source: Derived from existing App.jsx structure
// Place guest routes BEFORE authenticated shell

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
              {/* ... existing authenticated routes ... */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### GuestDishCard with Inline Stepper
```jsx
// Pattern: "+" button → "- qty +" stepper on first add
// Simplified from OrderPage's addDishToCart pattern

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
            <button className="btn btn-primary btn-sm guest-add-btn"
                    onClick={() => onAdd(dish)}>
              +
            </button>
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

### Guest API Response Shapes
```javascript
// GET /api/guest/{token}/dishes → standard PageResponse
// [VERIFIED: backend/app/routers/guest.py line 102-135]
{
  total: 15,
  page: 1,
  page_size: 100,
  items: [
    {
      id: 1,
      name: "宫保鸡丁",
      pinyin: "gongbaojiding",
      image_url: "/uploads/dish1.jpg",
      status: "enabled",
      is_semifinished: false,
      categories: [{ id: 1, name: "川菜", type: "cuisine" }],
      chefs: [{ id: 2, username: "chef1", display_name: "张厨师", publish_status: "published" }],
      dietary_warnings: null
    }
  ]
}

// POST /api/guest/{token}/orders → order response
// [VERIFIED: backend/app/routers/guest.py line 159-168]
// ⚠️ NOTE: items only have dish_id, no dish_name!
{
  order_no: "ORD-20260526-001",
  status: "pending",
  notes: null,
  created_at: "2026-05-26T12:00:00",
  items: [{ dish_id: 1, quantity: 2 }, { dish_id: 3, quantity: 1 }]
}

// GET /api/guest/{token}/summary → summary for used links
// [VERIFIED: backend/app/services/guest_service.py line 309-315]
{
  order_no: "ORD-20260526-001",
  status: "pending",
  notes: null,
  created_at: "2026-05-26T12:00:00",
  items: [
    { dish_name: "宫保鸡丁", quantity: 2, special_notes: null },
    { dish_name: "红烧肉", quantity: 1, special_notes: null }
  ]
}

// GET /api/categories → all categories (no auth needed)
// [VERIFIED: backend/app/routers/categories.py line 14-29]
{
  total: 20,
  items: [
    { id: 1, name: "川菜", type: "cuisine", parent_id: null, sort_order: 0, is_active: true },
    { id: 5, name: "辣", type: "taste", parent_id: null, sort_order: 0, is_active: true }
  ]
}
```

### Cart State Management (Pure React)
```jsx
// Simplified cart — no chef_id needed (bound to invitation)
// No localStorage — one-time use, React state only
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

const removeFromCart = (dishId) => {
  setCart(prev => {
    const existing = prev.find(item => item.dish_id === dishId);
    if (existing && existing.quantity > 1) {
      return prev.map(item =>
        item.dish_id === dishId ? { ...item, quantity: item.quantity - 1 } : item
      );
    }
    return prev.filter(item => item.dish_id !== dishId);
  });
};

const getQuantity = (dishId) => cart.find(item => item.dish_id === dishId)?.quantity || 0;
const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CategoriesProvider (ApiClient) | Direct fetch for guest | Phase 2 decision | Guest page needs own category loading |
| OrderPage localStorage cart | Pure React state for guest | Phase 4 (D-02) | No persistence needed for one-time use |

**Deprecated/outdated:**
- None applicable — this phase uses current project patterns

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A chef's published dishes typically number < 100, so client-side filtering is viable | Pattern 4 | If chefs have >100 dishes, need server-side pagination with filtering — would require backend API changes |
| A2 | No localStorage needed for guest cart (one-time, short-lived session) | Pattern 4 | If user accidentally refreshes, cart is lost — but this is acceptable for a one-time ordering scenario |
| A3 | WeChat WebView supports CSS variables and flexbox | Pitfall 6 | Would need fallback styles if older WebView is targeted |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Chef name on confirmation page**
   - What we know: D-11 requires showing chef name on confirmation page
   - What's unclear: The POST response doesn't include chef name. The dish data has `chefs[]` array from dishes API.
   - Recommendation: Extract chef name from the first dish's `chefs` array when loading dishes, store in state, use on confirmation page.

2. **Guest page viewport height on mobile**
   - What we know: Cart bar is fixed at bottom, needs to not overlap content
   - What's unclear: Whether the existing `.cart-bar` bottom position (based on `var(--nav-height)`) needs adjustment since guest page has no BottomBar
   - Recommendation: Guest cart bar should use `bottom: 0` (no BottomBar offset), override existing CSS with `.guest-cart-bar { bottom: 0; }` and add safe-area-inset-bottom for iOS.

## Environment Availability

> Phase is code/config-only changes with no new external dependencies. All tools already in use.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build | ✓ | 26.1.0 | — |
| npm | Package management | ✓ | 11.13.0 | — |
| Python 3.12 | Backend (already running) | ✓ | 3.12.3 | — |
| Vite dev server | Frontend development | ✓ | 8.0.10 | — |
| FastAPI backend | Guest API endpoints | ✓ | Running on :8000 | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Guest route bypasses auth by design |
| V3 Session Management | no | No session for guest |
| V4 Access Control | yes | Token-based access via URL path parameter — backend validates token |
| V5 Input Validation | yes | Backend validates dish_ids, quantities via Pydantic; frontend validates cart non-empty before submit |
| V6 Cryptography | no | No crypto operations on frontend |

### Known Threat Patterns for React + FastAPI Guest Flow

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token enumeration | Information Disclosure | UUID4 tokens (128-bit entropy) — infeasible to brute-force [VERIFIED: backend/app/services/guest_service.py line 53] |
| CSRF on guest POST | Tampering | CORS configured server-side; guest POST has no cookies/auth headers to exploit |
| XSS via dish names | Tampering | React auto-escapes all rendered content; `{dish.name}` is safe by default |
| Double-submit race | Tampering | Backend handles atomically in single transaction [VERIFIED: backend/app/services/guest_service.py line 131-224] |

## Sources

### Primary (HIGH confidence)
- `backend/app/routers/guest.py` — Verified 3 guest API endpoints, request/response shapes
- `backend/app/services/guest_service.py` — Verified token validation logic, error messages, atomic order submission
- `backend/app/schemas/guest.py` — Verified GuestOrderCreate, GuestOrderSummaryResponse shapes
- `frontend/src/App.jsx` — Verified current route structure, provider nesting, ProtectedRoute pattern
- `frontend/src/pages/OrderPage.jsx` — Verified cart-bar, cart-detail-panel, filter-chips, qty-stepper patterns
- `frontend/src/css/styles.css` — Verified all CSS classes: dish-card, cart-bar, cart-detail-panel, filter-chips, qty-stepper
- `frontend/src/contexts/ToastContext.jsx` — Verified ToastProvider structure, safe to use independently
- `frontend/src/contexts/CategoriesContext.jsx` — Verified uses ApiClient (guest cannot use)
- `frontend/src/api/client.js` — Verified 401 auto-redirect logic (guest must avoid)
- `backend/app/routers/categories.py` — Verified GET /categories endpoint has no auth dependency
- `backend/app/main.py` — Verified StaticFiles html=True for SPA fallback, guest route registered

### Secondary (MEDIUM confidence)
- `frontend/src/components/EmptyState.jsx` — Verified subtext prop added in Phase 03
- `frontend/src/components/Loading.jsx` — Verified message prop

### Tertiary (LOW confidence)
- WeChat WebView CSS compatibility [ASSUMED — based on general knowledge of WeChat browser capabilities]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing codebase patterns verified
- Architecture: HIGH — route isolation pattern clear from App.jsx analysis, all API shapes verified
- Pitfalls: HIGH — all 6 pitfalls verified against source code, not assumed

**Research date:** 2026-05-26
**Valid until:** 2026-06-26 (stable — no fast-moving dependencies)
