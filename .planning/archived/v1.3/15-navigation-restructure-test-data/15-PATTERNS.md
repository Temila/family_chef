# Phase 15: Navigation Restructure & Test Data - Pattern Map

**Mapped:** 2026-07-30
**Phase dir:** `/home/temila/family_chef/.planning/phases/15-navigation-restructure-test-data/`
**Files analyzed:** 21 (18 modify + 3 create)
**Analogs found:** 21 / 21 (100% — every file has a real codebase analog; no RESEARCH.md fallback needed)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/components/composites/Header.jsx` *(modify)* | composite | request-response (theme + menu) | itself | **exact** (in-place refactor) |
| `frontend/src/components/composites/Header.css` *(modify)* | config (CSS) | N/A | itself + `Modal.css` | **exact** (additive rules) |
| `frontend/src/components/composites/Sidebar.jsx` *(modify)* | composite | request-response (version text) | itself | **exact** (delete footer buttons) |
| `frontend/src/components/composites/Sidebar.css` *(modify)* | config (CSS) | N/A | itself + `Header.css` | **exact** (additive `.md-sidebar__version`) |
| `frontend/src/components/composites/BottomBar.jsx` *(modify)* | composite | request-response (role tabs) | itself | **exact** (replace 3 tabs arrays) |
| `frontend/src/pages/UserHomePage.jsx` *(modify)* | page | request-response | itself | **exact** (extend `menuEntries`) |
| `frontend/src/pages/AdminHomePage.jsx` *(audit)* | page | request-response | itself | **exact** (no change required — already has dish/ingredient) |
| `frontend/src/pages/OrderPage.jsx` *(modify)* | page | request-response (filter UI) | `AdminDishesPage.jsx` + `AdminIngredientsPage.jsx` (Sheet pattern) | **exact** (Phase 14 Sheet invocation shape) |
| `frontend/src/pages/AdminDishesPage.jsx` *(modify)* | page | request-response | itself | **exact** (wrap actions in `.header-action-bar`) |
| `frontend/src/pages/AdminIngredientsPage.jsx` *(modify)* | page | request-response | itself | **exact** (wrap actions in `.header-action-bar`) |
| `frontend/src/pages/ChefDishesPage.jsx` *(modify)* | page | request-response | `AdminDishesPage.jsx` | **exact** (mirror, same actions payload shape) |
| `frontend/src/pages/AdminUsersPage.jsx` *(modify)* | page | request-response | `AdminCategoriesPage.jsx` | **exact** (single-Button wrapper) |
| `frontend/src/pages/AdminCategoriesPage.jsx` *(modify)* | page | request-response | `AdminUsersPage.jsx` | **exact** (mirror) |
| `frontend/src/pages/OrderDetailPage.jsx` *(modify)* | page | request-response | itself | **exact** (wrap single back Button) |
| `frontend/src/pages/DishDetailPage.jsx` *(modify)* | page | request-response | itself | **exact** (wrap favorite IconButton) |
| `backend/app/initial_data.py` *(modify)* | service | CRUD (startup seed) | itself — `create_preset_ingredients()` | **exact** (append a fourth seed fn) |
| `backend/app/main.py` *(modify)* | middleware | startup orchestration | itself | **exact** (add `await create_seed_test_dishes()`) |
| `frontend/tests/phase15-navigation.spec.js` *(new)* | test | N/A (Playwright) | `phase12-bugfix.spec.js` | **exact** (same fixture pattern) |
| `frontend/tests/phase12-bugfix.spec.js` *(modify)* | test | N/A (Playwright) | itself | **exact** (replace Sidebar footer button assertions) |
| `frontend/tests/md3-compliance.spec.js` *(modify)* | test | N/A (Playwright) | itself | **exact** (footer invariant change) |
| `backend/tests/test_initial_data.py` *(new)* | test | N/A (pytest) | `conftest.py` + `test_guest.py` | **exact** (same async session pattern) |

**Note:** Phase 15 introduces **no new components**. Every file is either an in-place modification of existing code, an additive test, or wiring to a function that already exists in the seed pattern (Phase 11's `create_preset_ingredients()` is the canonical analog for `create_seed_test_dishes()`).

---

## Pattern Assignments

### `frontend/src/components/composites/Header.jsx` (composite, request-response)

**Analog:** itself — in-place refactor of existing structure (Phase 11 — COMPO-09)

**Role:** The Header currently renders `actions` inside `.md-header__right` (lines 88-90). Per D-NAV01-01/02, `actions` is preserved as a prop but no longer rendered inside the main row; instead, the action node is rendered **below** the main row inside a `.header-action-bar` div (or omitted entirely if `actions` is null).

**Existing imports pattern** (Header.jsx:18-24 — keep verbatim):
```jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils';
import Icon from '../primitives/Icon';
import IconButton from '../primitives/IconButton';
import './Header.css';
```

**Required new imports** (per D-NAV02-03 + D-NAV03-03):
```jsx
import Divider from './Divider';  // for menu Divider between Edit Profile and Logout
// IconButton already imported — reused for theme toggle in main row
```

**Header-local theme state pattern** (mirror Sidebar.jsx:28-33 — required because `theme.toggleTheme()` doesn't broadcast a DOM event; the icon must re-render on click):
```jsx
const [currentTheme, setCurrentTheme] = useState(() => theme.getTheme());
const handleToggleTheme = () => {
  setCurrentTheme(theme.toggleTheme());
};
```

**Main row restructure pattern** (replace Header.jsx:88-90):
```jsx
{/* 右：主题切换 + 头像下拉菜单（actions 已下沉至下方 .header-action-bar） */}
<div className="md-header__right" ref={menuRef}>
  <IconButton
    icon={currentTheme === 'dark' ? 'light-mode' : 'dark-mode'}
    ariaLabel={currentTheme === 'dark' ? '切换浅色' : '切换深色'}
    onClick={handleToggleTheme}
  />
  {user && (
    <>
      <button
        type="button"
        className="md-header__avatar"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="用户菜单"
        aria-expanded={menuOpen}
      >
        {(user.display_name || user.username || '?').charAt(0).toUpperCase()}
      </button>
      {menuOpen && (
        <div className="md-header__menu" role="menu">
          {/* info section — UNCHANGED */}
          <div className="md-header__menu-info">
            <div className="md-header__menu-name">{user.display_name || user.username}</div>
            <div className="md-header__menu-role">
              {user.role === 'admin' ? '管理员' : user.role === 'chef' ? '厨师' : '用户'}
            </div>
          </div>
          {/* D-NAV02-02: 编辑资料 */}
          <button
            type="button"
            className="md-header__menu-item"
            role="menuitem"
            onClick={() => { setMenuOpen(false); navigate('/profile'); }}
          >
            <Icon name="edit" size={18} />
            <span>编辑资料</span>
          </button>
          {/* D-NAV02-03: 语义分隔 */}
          <Divider />
          {/* D-NAV02-01: 退出登录（label extends existing 退出 → 退出登录） */}
          <button
            type="button"
            className="md-header__menu-item md-header__menu-item--danger"
            role="menuitem"
            onClick={() => { logout(); navigate('/login'); }}
          >
            <Icon name="logout" size={18} />
            <span>退出登录</span>
          </button>
        </div>
      )}
    </>
  )}
</div>
```

**Action-bar wrapper pattern** (replace Header.jsx:71-149 root `<header>` element):
```jsx
return (
  <>
    <header className="md-header">
      {/* 左 / 中 / 右 columns — actions removed from .md-header__right */}
      ...
    </header>
    {/* D-NAV01-01/02: actions prop rendered BELOW main row; null when unused */}
    {actions && (
      <div className="header-action-bar">
        {actions}
      </div>
    )}
  </>
);
```

**Avatar menu old theme menuitem DELETE** (Header.jsx:116-130 — old code, must be deleted):
```jsx
// DELETE this block entirely — theme toggle moves to Header main row per D-NAV03-03
<button
  type="button"
  className="md-header__menu-item"
  role="menuitem"
  onClick={() => { theme.toggleTheme(); setMenuOpen(false); }}
>
  <Icon name={theme.getTheme() === 'dark' ? 'light-mode' : 'dark-mode'} size={18} />
  <span>切换主题</span>
</button>
```

**Reference lines to copy from analog files:**
- `Sidebar.jsx:28-33` — Header-local theme state pattern (reuse `currentTheme` + `handleToggleTheme`)
- `Header.jsx:102-114` — menu-info section (keep verbatim)
- `Divider.jsx:9-26` — `<Divider />` between two menuitems (single semantic hr separator)
- `Header.jsx:131-142` — old logout menuitem → relabel to "退出登录" + use new icon color rule

---

### `frontend/src/components/composites/Header.css` (CSS, additive)

**Analog:** itself + `Sidebar.css:45-60` (footer-grid pattern) + `BottomBar.css:9-26` (spacing tokens)

**Required new rule** (insert after Header.css:147 — `md-header__menu-item:focus-visible`):
```css
/* ── D-NAV01-03: Header 下方 action-bar (Page actions 由 Header 渲染到主行下方) ── */
.header-action-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--md-spacing-2);
  height: 56px;
  padding: 0 var(--md-spacing-4);
  background: var(--md-color-surface);
  border-top: 1px solid var(--md-color-outline-variant);
}

/* D-NAV02-01: 退出登录 menuitem 用 error 颜色（与现有 destructive 一致） */
.md-header__menu-item--danger {
  color: var(--md-color-error);
}
.md-header__menu-item--danger:hover {
  background: color-mix(in srgb, var(--md-color-error-container), var(--md-color-on-surface) var(--md-state-layer-hover));
}

/* D-NAV03-03: 主题切换 IconButton 紧贴 avatar 左侧 ── */
.md-header__theme-toggle {
  /* none — IconButton 自带状态层与 hover；如需覆盖可在此加 padding-right: 0 */
}
```

**Note on Divider styling:** Divider composite (Phase 11) renders `border-top: 1px solid var(--md-color-outline-variant)` via Divider.css. The avatar menu already has `padding: var(--md-spacing-2) 0` (Header.css:108), so Divider visually flows inside menu without spacing tweaks.

**Reference tokens:**
- `var(--md-spacing-2)` (8px) — Header.css:71, BottomBar.css:34
- `var(--md-spacing-4)` (16px) — Header.css:131, Sidebar.css:30
- `var(--md-color-outline-variant` — Header.css:18, Sidebar.css:22
- `var(--md-color-error)` — already used in Header.css via logout styling

---

### `frontend/src/components/composites/Sidebar.jsx` (composite, request-response)

**Analog:** itself — delete footer buttons, replace with version text (Phase 11 — COMPO-09)

**Imports cleanup** (per D-NAV03-04/05):
```jsx
// DELETE: import { useState } from 'react';          (D-NAV03-04 — no more currentTheme state)
// DELETE: import { theme } from '../../utils';        (D-NAV03-04 — no more handleToggleTheme)
```

**Hook cleanup** (Sidebar.jsx:26-29 — delete theme state, keep logout destructuring unused):
```jsx
// KEEP:
const { user } = useAuth();
// DELETE: const { user, logout } = useAuth();  → only `user` needed
// DELETE: const pendingCount = usePendingOrderCount();  (still needed for chef orders Badge)
// DELETE: const [currentTheme, setCurrentTheme] = useState(...)
// DELETE: const handleToggleTheme = ...
```

**Footer replacement** (replace Sidebar.jsx:103-133):
```jsx
<div className="md-sidebar__footer">
  {/* D-NAV03-01: 显示版本号 (text node) */}
  <div className="md-sidebar__version" aria-label="应用版本">
    v{APP_VERSION}
  </div>
</div>
```

**Version data source pattern** (per UI-SPEC.md §Registry Safety Pre-flight #2):
```jsx
// Resolution order (agent decision per CONTEXT.md discretion):
//   1. Vite build-time injection via import.meta.env.VITE_APP_VERSION (preferred)
//   2. Static literal fallback
//   3. (Do NOT use config.yaml — that's backend only; mismatch noted in RESEARCH Risk 7)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';
```

**Optional Vite config note** (planner may add to `vite.config.js`):
```js
define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version) }
```

**Keep untouched:** logo (lines 76-78), `navItems` arrays (lines 39-72), `usePendingOrderCount()` for chef badge (line 27), `Ripple` wrapper around nav items (lines 84-100).

---

### `frontend/src/components/composites/Sidebar.css` (CSS, additive)

**Analog:** itself — replace footer grid with version text rule

**Required change** (replace Sidebar.css:45-60 — footer block):
```css
/* Footer: 单行版本号（Phase 15 NAV-03）
   原 grid 2 行布局删除（主题切换 + 退出按钮已迁出），
   改为居中 12px / 400 / 1.3 文字节点。 */
.md-sidebar__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--md-color-outline-variant);
  flex-shrink: 0;
}

/* D-NAV03-01: 版本号 — 与原 menu-role sizing 一致 */
.md-sidebar__version {
  padding: var(--md-spacing-3) 0;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.3;
  color: var(--md-color-on-surface-variant);
  text-align: center;
}

/* 删除原 footer grid + 48dp 行规则 (Sidebar.css:48-60) */
```

**Reference tokens:**
- `var(--md-spacing-3)` (12px) — Sidebar.css:30 already uses this in logo padding
- `0.75rem / 400 / 1.3` — matches Header.css:122-125 (`.md-header__menu-role`)

---

### `frontend/src/components/composites/BottomBar.jsx` (composite, request-response)

**Analog:** itself — replace 3 tabs arrays + remove logout (Phase 11 — COMPO-09)

**Imports cleanup** (per D-NAV05-01):
```jsx
// KEEP: useAuth for `user`
// DELETE: `const { user, logout } = useAuth();` → only `user` needed (BottomBar.jsx:25)
```

**Replace role arrays** (replace BottomBar.jsx:33-58):
```jsx
if (role === 'admin') {
  tabs = [
    // D-NAV05-03: Admin 7-tab (首页/后台 first, 我的 last, no logout)
    { id: 'admin-home', icon: 'dashboard', label: '后台', path: '/admin' },
    { id: 'admin-dishes', icon: 'set-meal', label: '菜品', path: '/admin/dishes' },
    { id: 'admin-ingredients', icon: 'eco', label: '食材', path: '/ingredients' },
    { id: 'admin-wishes', icon: 'lightbulb', label: '愿望', path: '/admin/wishes' },
    { id: 'admin-users', icon: 'group', label: '用户', path: '/admin/users' },
    { id: 'order-dish', icon: 'ramen-dining', label: '点菜', path: '/order' },
    { id: 'user-profile', icon: 'person', label: '我的', path: '/profile' },
  ];
} else if (role === 'chef') {
  tabs = [
    // D-NAV05-02: Chef 7-tab (首页 first, 我的 last, no logout)
    { id: 'user-home', icon: 'home', label: '首页', path: '/home' },
    { id: 'chef-orders', icon: 'chef', label: '订单', path: '/chef/orders' },
    { id: 'chef-dishes', icon: 'set-meal', label: '菜品', path: '/chef/dishes' },
    { id: 'admin-ingredients', icon: 'eco', label: '食材', path: '/ingredients' },
    { id: 'chef-wishes', icon: 'lightbulb', label: '愿望', path: '/chef/wishes' },
    { id: 'order-dish', icon: 'ramen-dining', label: '点菜', path: '/order' },
    { id: 'user-profile', icon: 'person', label: '我的', path: '/profile' },
  ];
} else {
  tabs = [
    // D-NAV05-04: User 4-tab (首页 first, 我的 last, no 菜品/食材 — user role lacks access)
    { id: 'user-home', icon: 'home', label: '首页', path: '/home' },
    { id: 'order-dish', icon: 'ramen-dining', label: '点菜', path: '/order' },
    { id: 'user-wishes', icon: 'lightbulb', label: '愿望', path: '/my-wishes' },
    { id: 'user-profile', icon: 'person', label: '我的', path: '/profile' },
  ];
}
```

**Logout branch DELETE** (BottomBar.jsx:75-77 — old code, must be deleted):
```jsx
// DELETE this entire if-branch inside onClick handler:
if (tab.action === 'logout') {
  logout();
  navigate('/login');
} else {
  navigate(tab.path);
}
// REPLACE with simply:
onClick={() => navigate(tab.path)}
```

**Keep untouched:**
- `isActive()` prefix matching (BottomBar.jsx:60-63)
- `chef-orders` Badge — must be preserved on chef tab only (BottomBar.jsx:87)
- `Ripple` wrapper (BottomBar.jsx:70)
- CSS file unchanged (BottomBar.css) — flex:1, active pill, etc. all work as-is

---

### `frontend/src/pages/UserHomePage.jsx` (page, request-response)

**Analog:** itself — extend `menuEntries` array (NAV-04)

**Required edits** (UserHomePage.jsx:27-34):
```jsx
// CURRENT (D-NAV04-01 extension):
if (user?.role === 'chef' || user?.role === 'admin') {
  menuEntries.push({
    icon: 'chef',
    title: '订单管理',
    desc: '查看和处理订单',
    onClick: () => navigate('/chef/orders'),
  });
}

// REPLACE WITH:
if (user?.role === 'chef' || user?.role === 'admin') {
  // 订单管理：chef/admin 都有（admin 视为可处理所有订单）
  menuEntries.push({
    icon: 'chef',
    title: '订单管理',
    desc: '查看和处理订单',
    onClick: () => navigate('/chef/orders'),
  });
  // 菜品管理：chef → /chef/dishes, admin → /admin/dishes
  menuEntries.push({
    icon: 'set-meal',
    title: '菜品管理',
    desc: '管理菜品信息与食谱',
    onClick: () => navigate(user.role === 'admin' ? '/admin/dishes' : '/chef/dishes'),
  });
  // 食材管理：两端都路由到 /ingredients
  menuEntries.push({
    icon: 'eco',
    title: '食材管理',
    desc: '管理食材与库存',
    onClick: () => navigate('/ingredients'),
  });
}
```

**Keep untouched:**
- `menuEntries` initial 2 entries (UserHomePage.jsx:12-25) — `开始点菜` + `口味偏好`
- Grid container (`repeat(${menuEntries.length}, 1fr)` at UserHomePage.jsx:40) — auto-adjusts to 4/5 columns
- `quick-action` class — reused for new entries (no new CSS rule)
- `Header` invocation (line 38) — no actions prop needed; this page has no header buttons

**Note on admin duplicate check:** `AdminHomePage.jsx:61-104` already has `菜品管理` + `食材管理` in its `quickActions` array. However, `/admin` routes to `AdminHomePage`, NOT `UserHomePage` (App.jsx). The current edit only affects `/home` (chef's home route). For admin, `/home` is **not** in their route map (`App.jsx:121-289` shows `/home` is restricted to user/chef). So admin doesn't see UserHomePage at all — these new entries are for chef only. Admin sees dish/ingredient via AdminHomePage.

**Resulting chef menuEntries count:** 5 (开始点菜 / 口味偏好 / 订单管理 / 菜品管理 / 食材管理). Agent may optionally put `订单管理` last (matches BottomBar chef tab order), but the current 3-new-entries-after-original-2 pattern is fine.

---

### `frontend/src/pages/OrderPage.jsx` (page, request-response)

**Analog:** `AdminDishesPage.jsx:553-608` + `AdminIngredientsPage.jsx:270-298` — identical Sheet invocation shape (Phase 14)

**Required imports addition** (OrderPage.jsx:1-19 — append):
```jsx
import Sheet from '../components/composites/Sheet';
// Modal already imported (line 18) — keep for chef picker + order confirmation
```

**Filter trigger replacement** (replace OrderPage.jsx:336-342):
```jsx
{/* D-UI01-01: 高级筛选触发按钮 — tonal Button 替代 Chip */}
<Button
  variant="tonal"
  size="sm"
  onClick={() => setShowFilters(true)}
  startIcon={<Icon name="filter" size={18} />}
>
  高级筛选
</Button>
```

**`tune` icon NOT available — use `filter` (FilterList):**
> Per Icon.jsx:32,103, the project has `FilterList` mapped to `name="filter"`. The `tune` icon (suggested in UI-SPEC.md) is NOT in the Icon.jsx mapping table (verified). Planner must use `<Icon name="filter" />` instead. The `Button` primitive supports `startIcon` prop (Phase 10).

**Filter Sheet** (replace OrderPage.jsx:364-441 inline block):
```jsx
{showFilters && (
  <Sheet
    open
    onClose={() => setShowFilters(false)}
    title="高级筛选"
    footer={
      <div className="flex gap-3" style={{ width: '100%' }}>
        <Button
          variant="tonal"
          className="flex-1"
          onClick={() => {
            setSelectedRegion(null);
            setSelectedCuisine(null);
            setSelectedFilters({});
            // favoritesOnly + sortBy NOT reset (UI-01 决策：它们是 top-level 控件，不是 advanced filter)
          }}
        >
          清空
        </Button>
        <Button variant="filled" className="flex-1" onClick={() => setShowFilters(false)}>
          应用
        </Button>
      </div>
    }
  >
    {/* MOVED VERBATIM from lines 366-440 — preserve all chip logic */}
    <div className="filter-section">
      <div className="filter-section-label">{getTypeMeta('region').label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-2)', padding: '0 0 var(--md-spacing-1)'}}>
        <Chip variant="filter" selected={!selectedRegion}
          onClick={() => { setSelectedRegion(null); setSelectedCuisine(null); }}>
          全部
        </Chip>
        {regions.map(r => (
          <Chip variant="filter" selected={selectedRegion === r.id} key={r.id}
            onClick={() => { setSelectedRegion(r.id); setSelectedCuisine(null); }}>
            {r.name}
          </Chip>
        ))}
      </div>
    </div>
    {/* ... filteredCuisines block (lines 387-408) ... */}
    {/* ... filterTypes.map block (lines 410-439) ... */}
  </Sheet>
)}
```

**State ownership — LOCKED:**
> Per UI-SPEC.md §OrderPage Filter → Sheet Contract: all `useState` stays in OrderPage. The Sheet is **pure UI container**. No state migration. `loadDishes` effect at OrderPage.jsx:75-77 continues to fire on chip toggle (immediate-apply semantics, NOT deferred-apply). The `应用` button is close/confirm only.

**Keep untouched:**
- `selectedRegion`, `selectedCuisine`, `selectedFilters`, `favoritesOnly`, `sortBy`, `searchQuery` (lines 44-49) — all `useState` stay
- `loadDishes` effect dependencies (line 77) — no change
- `favoritesOnly` Chip + `sortBy` select (lines 343-358) — remain inline, they are independent top-level controls
- `cart-bar`, `cart-detail-panel`, `showChefPicker` Modal, `showConfirmModal` Modal — all untouched
- `showFilters` state (line 51) — only its trigger UI changes

**Reference for Sheet pattern:** `AdminDishesPage.jsx:563-608` — identical shape (Sheet → footer with 清空/应用 → children).

---

### `frontend/src/pages/AdminDishesPage.jsx` (page, modify — wrap actions only)

**Analog:** itself — header actions wrapper

**Single edit** (replace AdminDishesPage.jsx:524-536):
```jsx
{/* CURRENT (inline div for header actions) */}
<Header
  title="菜品管理"
  actions={
    <div style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
      <Button variant="tonal" size="sm" onClick={openExtractModal}>
        <Icon name="edit" size={18} /> 解析文本
      </Button>
      <Button variant="filled" size="sm" onClick={() => openCreate()}>
        + 添加
      </Button>
    </div>
  }
/>

{/* REPLACE: add `header-action-bar` className to outer div (per D-NAV01-01) */}
<Header
  title="菜品管理"
  actions={
    <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
      <Button variant="tonal" size="sm" onClick={openExtractModal}>
        <Icon name="edit" size={18} /> 解析文本
      </Button>
      <Button variant="filled" size="sm" onClick={() => openCreate()}>
        + 添加
      </Button>
    </div>
  }
/>
```

**No other edits to this file** — Sheet pattern, dropdowns, mobile cards, dish modal all unchanged.

---

### `frontend/src/pages/AdminIngredientsPage.jsx` (page, modify — wrap actions only)

**Analog:** `AdminDishesPage.jsx:524-536` — identical actions payload shape

**Single edit** (replace AdminIngredientsPage.jsx:247-252):
```jsx
{/* D-NAV01-01: add header-action-bar className */}
actions={
  <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
    <Button variant="outlined" size="sm" onClick={openParseModal}>
      <Icon name="inventory-2" size={18} /> 从菜谱解析
    </Button>
    <Button variant="filled" size="sm" onClick={openCreate}>+ 添加</Button>
  </div>
}
```

---

### `frontend/src/pages/ChefDishesPage.jsx` (page, modify — wrap actions only)

**Analog:** `AdminDishesPage.jsx:524-536` — identical actions payload shape

**Single edit** (replace ChefDishesPage.jsx:498-507):
```jsx
{/* D-NAV01-01: add header-action-bar className */}
actions={
  <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
    <Button variant="tonal" size="sm" onClick={openExtractModal}>
      <Icon name="edit" size={18} /> 解析文本
    </Button>
    <Button variant="filled" size="sm" onClick={() => openCreate()}>
      + 添加
    </Button>
  </div>
}
```

---

### `frontend/src/pages/AdminUsersPage.jsx` (page, modify — wrap single Button)

**Analog:** `AdminCategoriesPage.jsx:113-116` — identical single-Button actions shape

**Single edit** (replace AdminUsersPage.jsx:135):
```jsx
{/* CURRENT: bare single Button */}
actions={<Button variant="filled" size="sm" onClick={openCreate}>+ 添加</Button>}

{/* REPLACE: wrap in header-action-bar div */}
actions={
  <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
    <Button variant="filled" size="sm" onClick={openCreate}>+ 添加</Button>
  </div>
}
```

---

### `frontend/src/pages/AdminCategoriesPage.jsx` (page, modify — wrap single Button)

**Analog:** `AdminUsersPage.jsx:135` — identical single-Button actions shape

**Single edit** (replace AdminCategoriesPage.jsx:115):
```jsx
{/* D-NAV01-01: wrap in header-action-bar div */}
actions={
  <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
    <Button variant="filled" size="sm" onClick={openCreate}>+ 添加</Button>
  </div>
}
```

---

### `frontend/src/pages/OrderDetailPage.jsx` (page, modify — wrap back Button)

**Single edit** (replace OrderDetailPage.jsx:60-62):
```jsx
{/* CURRENT: bare back Button */}
<Header title={`订单 #${order.id}`} actions={
  <Button variant="tonal" size="sm" onClick={() => navigate('/chef/orders')}>← 返回</Button>
} />

{/* REPLACE: wrap in header-action-bar div */}
<Header title={`订单 #${order.id}`} actions={
  <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
    <Button variant="tonal" size="sm" onClick={() => navigate('/chef/orders')}>← 返回</Button>
  </div>
} />
```

---

### `frontend/src/pages/DishDetailPage.jsx` (page, modify — wrap favorite IconButton)

**Single edit** (replace DishDetailPage.jsx:131-138):
```jsx
{/* CURRENT: bare favorite IconButton */}
actions={
  <IconButton
    icon={dish.is_favorite ? 'favorite' : 'favorite-border'}
    ariaLabel={dish.is_favorite ? '取消收藏' : '收藏'}
    onClick={handleFavorite}
    selected={dish.is_favorite}
  />
}

{/* REPLACE: wrap in header-action-bar div */}
actions={
  <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
    <IconButton
      icon={dish.is_favorite ? 'favorite' : 'favorite-border'}
      ariaLabel={dish.is_favorite ? '取消收藏' : '收藏'}
      onClick={handleFavorite}
      selected={dish.is_favorite}
    />
  </div>
}
```

---

### `backend/app/initial_data.py` (service, CRUD — startup seed)

**Analog:** itself — `create_preset_ingredients()` (Phase 11 pattern) — open own session, check existence, insert, commit, log.

**New function to append** (after `create_preset_ingredients()` at initial_data.py:422):
```python
import os
import random
from app.models.dish import Dish, DishCategory
from app.models.category import Category


async def create_seed_test_dishes():
    """
    注入 8 道测试菜品（食谱×介绍×图片 的 2³ = 8 种组合）。

    仅在开发环境生效（通过 ENVIRONMENT=development 或 AUTO_SEED_DEMO_DISHES=1 触发）。
    production 默认跳过。幂等：检测已存在的 [1]..[8] 前缀名称后跳过。
    """
    # D-DATA01-01: 环境变量守卫 — production 默认不注入
    if not (
        os.environ.get("ENVIRONMENT") == "development"
        or os.environ.get("AUTO_SEED_DEMO_DISHES") == "1"
    ):
        return

    # D-DATA01-03: 固定种子 — 保证 dev 环境每次 8 道菜品状态一致（截图可复现）
    rng = random.Random(42)

    from app.models.dish import Dish, DishCategory
    from app.models.category import Category
    from app.models.user import User
    from sqlalchemy import select

    async with async_session_factory() as session:
        # 找到默认 admin (D-DATA01-02)
        admin_res = await session.execute(
            select(User).where(User.username == "admin")
        )
        admin = admin_res.scalar_one_or_none()
        if not admin:
            print("⚠️  默认 admin 不存在，跳过 seed 测试菜品")
            return

        # 找一个 region 分类作为默认分类 (D-DATA01-04)
        region_res = await session.execute(
            select(Category).where(Category.type == "region")
        )
        regions = region_res.scalars().all()
        if not regions:
            print("⚠️  region 分类不存在，跳过 seed 测试菜品")
            return

        # D-DATA01-02: 8 个组合定义（recipe × description × image 的 2³ 矩阵）
        combinations = [
            {"recipe": True,  "description": True,  "image": True},
            {"recipe": True,  "description": True,  "image": False},
            {"recipe": True,  "description": False, "image": True},
            {"recipe": True,  "description": False, "image": False},
            {"recipe": False, "description": True,  "image": True},
            {"recipe": False, "description": True,  "image": False},
            {"recipe": False, "description": False, "image": True},
            {"recipe": False, "description": False, "image": False},
        ]

        # 幂等：检测已存在的 seed 行（按 name 前缀匹配）
        existing_res = await session.execute(
            select(Dish.name).where(Dish.name.like("测试菜品 %"))
        )
        existing_names = {row[0] for row in existing_res.all()}
        if len(existing_names) >= 8:
            print(f"✅ 测试菜品已存在 ({len(existing_names)} 道)，跳过 seed")
            return

        flags = ["有食谱", "无食谱"]
        descs = ["有介绍", "无介绍"]
        imgs = ["有图", "无图"]

        for idx, combo in enumerate(combinations, start=1):
            label = f"测试菜品 {idx} · {flags[0 if combo['recipe'] else 1]}{descs[0 if combo['description'] else 1]}{imgs[0 if combo['image'] else 1]}"
            if label in existing_names:
                continue  # 单条已存在则跳过（partial-failure 兼容）

            dish = Dish(
                name=label,
                description=f"测试菜品 {idx} 的介绍文字" if combo["description"] else None,
                recipe=f"# 食谱 {idx}\n食材：...\n步骤：..." if combo["recipe"] else None,
                image_url="https://via.placeholder.com/400x300?text=Test+Dish+" + str(idx) if combo["image"] else None,
                status=rng.choice(["published", "draft"]),  # D-DATA01-03 — 仅作 admin fixture 可见
                is_popular=rng.choice([True, False]),
                is_semifinished=rng.choice([True, False]),
                created_by=admin.id,
            )
            session.add(dish)
            await session.flush()  # flush to get dish.id

            # 关联随机一个 region 分类
            cat = rng.choice(regions)
            session.add(DishCategory(dish_id=dish.id, category_id=cat.id))

        await session.commit()
        print(f"✅ Seed 测试菜品注入完成（{len(combinations)} 道）")
```

**Reference patterns from existing initial_data.py:**
- `create_preset_ingredients()` (lines 401-422) — session lifecycle, skip-on-existing, commit+log
- `create_initial_data()` (lines 11-57) — admin user lookup pattern (lines 15-22)
- `create_preset_categories()` (lines 60-171) — Category query + select pattern (lines 64-69, 105)

**Important:** Backend `Dish.status` defaults to `"draft"` (dish.py:16). The seed writes `status ∈ {"published", "draft"}` per UI-SPEC.md D-DATA01-03, but these will NOT appear in `/order` (default list requires `enabled` + published `DishChef`). Per UI-SPEC.md §Status Visibility: visual verification target is **`AdminDishesPage` mobile cards** (which uses `status=all` path, bypassing the `enabled` filter at `dish_service.py:72-83`).

---

### `backend/app/main.py` (middleware, startup orchestration)

**Analog:** itself — add `await create_seed_test_dishes()` after preset ingredients

**Required edit** (main.py:237-241):
```python
# CURRENT:
from app.initial_data import create_initial_data, create_preset_categories, create_preset_ingredients

await create_initial_data()
await create_preset_categories()
await create_preset_ingredients()

# REPLACE:
from app.initial_data import (
    create_initial_data,
    create_preset_categories,
    create_preset_ingredients,
    create_seed_test_dishes,  # D-DATA01-05: 新增
)

await create_initial_data()
await create_preset_categories()
await create_preset_ingredients()
await create_seed_test_dishes()  # D-DATA01-05: 顺序在食材之后
```

**No other edits to main.py** — keep `init_db()` (line 235), `os.makedirs` (line 243), `_log` (line 245), `smart_settings.needs_model()` block (lines 249-250) all unchanged.

---

### `frontend/tests/phase15-navigation.spec.js` (new test file)

**Analog:** `phase12-bugfix.spec.js` — same Playwright fixture pattern (`page.goto('/home')` with auth setup).

**Test groups to cover:**

```js
/**
 * NAV-01: Header action bar appears below main row when actions prop is set
 * NAV-02: Avatar menu shows only Edit Profile + Divider + Logout
 * NAV-03: Sidebar footer shows version text + no buttons
 * NAV-04: Chef sees dish + ingredient quick actions on /home (mobile viewport)
 * NAV-05: BottomBar tabs by role (chef 7, admin 7, user 4), no logout
 * UI-01: OrderPage filter trigger opens Sheet
 */

test.describe('Header restructure', () => {
  test('actions prop renders below main row in .header-action-bar', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/dishes');
    await expect(page.locator('.header-action-bar')).toBeVisible();
    await expect(page.locator('.md-header__right .md-header__theme-toggle')).toBeVisible();
  });

  test('avatar menu contains only Edit Profile + Divider + Logout', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/home');
    await page.locator('.md-header__avatar').click();
    await expect(page.locator('.md-header__menu-item')).toHaveCount(2);
    await expect(page.locator('.md-divider[role="separator"]')).toBeVisible();
    // No "切换主题" item
    await expect(page.locator('text=切换主题')).toHaveCount(0);
  });
});

test.describe('Sidebar footer', () => {
  test('shows version text and no buttons', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await expect(page.locator('.md-sidebar__version')).toBeVisible();
    await expect(page.locator('.md-sidebar__footer button')).toHaveCount(0);
  });
});

test.describe('BottomBar role tabs', () => {
  test('chef: 7 tabs (首页 / 订单 / 菜品 / 食材 / 愿望 / 点菜 / 我的)', async ({ page }) => {
    await loginAs(page, 'chef');
    await page.goto('/home');
    const tabs = await page.locator('.md-tab').count();
    expect(tabs).toBe(7);
  });

  test('user: 4 tabs (首页 / 点菜 / 愿望 / 我的), no 菜品/食材', async ({ page }) => {
    await loginAs(page, 'user');
    await page.goto('/home');
    const tabs = await page.locator('.md-tab').count();
    expect(tabs).toBe(4);
    await expect(page.locator('.md-tab__label:has-text("菜品")')).toHaveCount(0);
    await expect(page.locator('.md-tab__label:has-text("食材")')).toHaveCount(0);
  });

  test('all roles: 首页/后台 first, 我的 last, no logout', async ({ page }) => {
    for (const [user, firstLabel, lastLabel] of [
      ['user', '首页', '我的'],
      ['chef', '首页', '我的'],
      ['admin', '后台', '我的'],
    ]) {
      await loginAs(page, user);
      await page.goto('/');
      const first = await page.locator('.md-tab__label').first().textContent();
      const last = await page.locator('.md-tab__label').last().textContent();
      expect(first).toBe(firstLabel);
      expect(last).toBe(lastLabel);
      await expect(page.locator('.md-tab__label:has-text("退出")')).toHaveCount(0);
    }
  });
});

test.describe('UserHomePage quick actions', () => {
  test('chef sees 菜品管理 + 食材管理 quick actions', async ({ page, isMobile }) => {
    await page.setViewportSize({ width: 420, height: 800 });
    await loginAs(page, 'chef');
    await page.goto('/home');
    await expect(page.locator('.quick-action:has-text("菜品管理")')).toBeVisible();
    await expect(page.locator('.quick-action:has-text("食材管理")')).toBeVisible();
  });

  test('user does NOT see 菜品管理 or 食材管理', async ({ page, isMobile }) => {
    await page.setViewportSize({ width: 420, height: 800 });
    await loginAs(page, 'user');
    await page.goto('/home');
    await expect(page.locator('.quick-action:has-text("菜品管理")')).toHaveCount(0);
    await expect(page.locator('.quick-action:has-text("食材管理")')).toHaveCount(0);
  });
});

test.describe('OrderPage filter Sheet', () => {
  test('clicking 高级筛选 opens Sheet', async ({ page, isMobile }) => {
    await page.setViewportSize({ width: 420, height: 800 });
    await loginAs(page, 'user');
    await page.goto('/order');
    await page.locator('button:has-text("高级筛选")').click();
    await expect(page.locator('.md-modal--bottom-sheet')).toBeVisible();
    await expect(page.locator('text=清空')).toBeVisible();
    await expect(page.locator('text=应用')).toBeVisible();
  });
});
```

---

### `frontend/tests/phase12-bugfix.spec.js` (modify — replace Sidebar footer assertions)

**Analog:** itself — same `page.locator('.md-sidebar__footer')` pattern

**Edits required** (replace phase12-bugfix.spec.js:88-110 — D-BUG-02 tests):

The current tests assert Sidebar footer has 2 buttons (theme + logout). After Phase 15, footer has version text + 0 buttons. Replace with:

```js
// ── NAV-03: Sidebar footer 仅版本号 ──

test('Sidebar footer 仅显示版本号，无按钮', async ({ page }) => {
  await page.locator('.md-sidebar__footer').waitFor();
  await expect(page.locator('.md-sidebar__version')).toBeVisible();
  await expect(page.locator('.md-sidebar__footer button')).toHaveCount(0);
});

// ── NAV-03: 主题切换从 Header 触发（迁移后位置） ──

test('Header 主题按钮切换 data-theme（替代原 Sidebar footer 测试）', async ({ page }) => {
  await page.locator('.md-header').waitFor();
  const themeButton = page.locator('.md-header__theme-toggle');

  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await themeButton.click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
});

// DELETE: original Sidebar footer 退出按钮测试 (phase12-bugfix.spec.js:100-110)
```

---

### `frontend/tests/md3-compliance.spec.js` (modify — footer invariant)

**Analog:** itself — replace `.md-sidebar__footer button` count with version text presence

**Edit required** (around md3-compliance.spec.js:104-128 — touch target count tests):

```js
// CURRENT (counts footer buttons as touch targets):
const footerButtons = await page.locator('.md-sidebar__footer button').count();

// REPLACE (footer is now a non-interactive version text node):
const versionText = await page.locator('.md-sidebar__version').textContent();
expect(versionText).toMatch(/^v\d+\.\d+\.\d+$/);
```

**Keep:** the touch target invariant for actual interactive elements (nav items still 48dp+, etc.).

---

### `backend/tests/test_initial_data.py` (new test file)

**Analog:** `backend/tests/conftest.py` (fixtures) + `backend/tests/test_guest.py` (initialization testing pattern)

**Test skeleton:**

```python
"""
家味 · Family Chef - initial_data 注入测试 (Phase 15 DATA-01)
"""
import os
import pytest
from sqlalchemy import select

from app.initial_data import create_seed_test_dishes, create_preset_categories, create_initial_data
from app.models.dish import Dish
from app.models.category import Category
from app.models.user import User


@pytest.fixture(autouse=True)
def enable_seed_env(monkeypatch):
    """自动启用 seed 环境变量"""
    monkeypatch.setenv("ENVIRONMENT", "development")


@pytest.mark.asyncio
async def test_seed_test_dishes_creates_eight_combinations(db):
    """seed 注入 8 道菜品（recipe × description × image 的 2³ 组合）"""
    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    dishes = res.scalars().all()

    assert len(dishes) == 8
    # 验证字段组合的 8 种状态都覆盖
    combinations = set()
    for d in dishes:
        combinations.add((d.recipe is not None, d.description is not None, d.image_url is not None))
    assert len(combinations) == 8  # 2³ = 8


@pytest.mark.asyncio
async def test_seed_test_dishes_is_idempotent(db):
    """二次调用不产生重复（幂等）"""
    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()
    await create_seed_test_dishes()  # 第二次

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    dishes = res.scalars().all()
    assert len(dishes) == 8


@pytest.mark.asyncio
async def test_seed_test_dishes_attaches_to_admin(db):
    """seed 菜品的 created_by 指向默认 admin"""
    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()

    admin_res = await db.execute(select(User).where(User.username == "admin"))
    admin = admin_res.scalar_one()

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    for dish in res.scalars().all():
        assert dish.created_by == admin.id


@pytest.mark.asyncio
async def test_seed_test_dishes_attaches_to_category(db):
    """seed 菜品至少有一个 category 关联（来自 region 分类）"""
    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    dishes = res.scalars().all()

    for dish in dishes:
        assert len(dish.categories) > 0


@pytest.mark.asyncio
async def test_seed_test_dishes_skipped_when_env_not_set(db, monkeypatch):
    """ENVIRONMENT != development 且 AUTO_SEED_DEMO_DISHES != 1 → 跳过"""
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("AUTO_SEED_DEMO_DISHES", raising=False)

    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()  # 应直接 return

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    assert len(res.scalars().all()) == 0


@pytest.mark.asyncio
async def test_seed_test_dishes_skipped_without_admin(db):
    """admin 不存在时跳过（不抛错）"""
    await create_preset_categories()  # 不要 create_initial_data — admin 不存在
    await create_seed_test_dishes()

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    assert len(res.scalars().all()) == 0
```

**Reference patterns from conftest.py:**
- `clean_db` autouse fixture (lines 107-113) — auto-cleans DB before each test
- `test_session_factory` (lines 24-28) — used in fixtures
- `db` fixture (lines 116-121) — direct session access for assertions

**Reference patterns from test_guest.py:**
- `admin_token` setup via direct DB insert (conftest.py:152-175)
- `async with test_session_factory()` for fixture setup

---

## Shared Patterns

### Pattern: Header action-bar wrapper (D-NAV01-01)

**Source:** `Header.jsx` (Phase 15 modification)
**Apply to:** All pages with `<Header actions={...}>` (7 callsites)

```jsx
// WRAPPER PATTERN for Header actions payload:
<Header
  title="..."
  actions={
    <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
      {/* existing buttons */}
    </div>
  }
/>
```

**Audit checklist** (verified via grep):
| File | Line | Current payload |
|------|------|-----------------|
| `AdminDishesPage.jsx` | 524-536 | inline `<div>` with parse/add buttons |
| `AdminIngredientsPage.jsx` | 245-253 | inline `<div>` with parse/add buttons |
| `ChefDishesPage.jsx` | 494-508 | inline `<div>` with parse/add buttons |
| `AdminUsersPage.jsx` | 133-136 | bare `<Button>` |
| `AdminCategoriesPage.jsx` | 113-116 | bare `<Button>` |
| `OrderDetailPage.jsx` | 60-62 | bare back `<Button>` |
| `DishDetailPage.jsx` | 128-139 | bare favorite `<IconButton>` |

---

### Pattern: Sheet for advanced filter (D-UI01-01)

**Source:** `AdminDishesPage.jsx:553-608` + `AdminIngredientsPage.jsx:270-298` (Phase 14 Sheet invocation)
**Apply to:** `OrderPage.jsx` filter block (Phase 15 only remaining sheet migration)

```jsx
// SHEET TRIGGER + CONTAINER PATTERN:
<Button variant="tonal" size="sm" onClick={() => setShowAdvFilter(true)}>
  高级筛选
</Button>

{showAdvFilter && (
  <Sheet
    open
    onClose={() => setShowAdvFilter(false)}
    title="高级筛选 — ..."
    footer={
      <div className="flex gap-3" style={{ width: '100%' }}>
        <Button variant="tonal" className="flex-1" onClick={handleClear}>清空</Button>
        <Button variant="filled" className="flex-1" onClick={() => setShowAdvFilter(false)}>应用</Button>
      </div>
    }
  >
    {/* existing chip block moved verbatim */}
  </Sheet>
)}
```

**Filter state ownership — LOCKED:** state stays in Page. Sheet is pure UI container.

---

### Pattern: Role-branch tab arrays (D-NAV-05)

**Source:** `BottomBar.jsx:33-58` (Phase 11) + locked arrays (CONTEXT.md D-NAV05-02/03/04)
**Apply to:** `BottomBar.jsx` only

```jsx
// ROLE ARRAYS PATTERN:
if (role === 'admin') {
  tabs = [
    { id: '...', icon: 'dashboard', label: '后台', path: '/admin' },  // 首页 first
    // ... middle tabs sorted by workflow ...
    { id: 'user-profile', icon: 'person', label: '我的', path: '/profile' },  // 我的 last
  ];
} else if (role === 'chef') {
  tabs = [
    { id: 'user-home', icon: 'home', label: '首页', path: '/home' },
    // ...
    { id: 'user-profile', icon: 'person', label: '我的', path: '/profile' },
  ];
} else {
  // user role — 4 tabs only (no 菜品 / 食材)
  tabs = [
    { id: 'user-home', icon: 'home', label: '首页', path: '/home' },
    { id: 'order-dish', icon: 'ramen-dining', label: '点菜', path: '/order' },
    { id: 'user-wishes', icon: 'lightbulb', label: '愿望', path: '/my-wishes' },
    { id: 'user-profile', icon: 'person', label: '我的', path: '/profile' },
  ];
}
```

---

### Pattern: Environment-guarded seed (D-DATA01-01)

**Source:** `initial_data.py:11-22` (skip-on-existing pattern)
**Apply to:** `create_seed_test_dishes()` only

```python
# ENV GUARD PATTERN (production default = skip):
if not (
    os.environ.get("ENVIRONMENT") == "development"
    or os.environ.get("AUTO_SEED_DEMO_DISHES") == "1"
):
    return

# Inside function:
async with async_session_factory() as session:
    # ... lookups (admin, regions)
    # ... idempotency check (existing names)
    # ... insert missing only
    await session.commit()
```

**Reference implementation:** `create_preset_ingredients()` (initial_data.py:401-422).

---

### Pattern: Fixed random seed for reproducibility (D-DATA01-03 agent discretion)

**Apply to:** All randomization in seed code

```python
# FIXED SEED PATTERN:
rng = random.Random(42)  # 保证 dev 环境每次 8 道菜品状态一致
status = rng.choice(["published", "draft"])
is_popular = rng.choice([True, False])
```

---

### Pattern: MD3 token reuse (UI-SPEC.md §Design System)

| Token | Value | Used for |
|-------|-------|----------|
| `--md-spacing-2` | 8px | `.header-action-bar` internal gap; avatar menu padding |
| `--md-spacing-3` | 12px | `.md-sidebar__version` vertical padding |
| `--md-spacing-4` | 16px | `.header-action-bar` horizontal padding |
| `--md-spacing-8` | 56px | `.header-action-bar` height (hardcoded literal per D-NAV01-03) |
| `--md-color-outline-variant` | light/dark pairs | `.header-action-bar` border-top, `.md-sidebar__footer` border-top, Divider |
| `--md-color-surface` | light/dark pairs | `.header-action-bar` background |
| `--md-color-on-surface-variant` | 12% emphasis | `.md-sidebar__version` text color |
| `--md-color-error` | error hue | Logout menuitem text + icon color |

All tokens already declared in `frontend/src/css/tokens.css` (verified via existing usage in Header.css, Sidebar.css, Modal.css, Sheet.css). **No new tokens introduced.**

---

## No Analog Found

None. Every file in scope has a direct analog in the codebase. No RESEARCH.md fallback patterns needed.

---

## Important Pre-flight Findings

### Finding 1 — `tune` icon NOT in Icon.jsx mapping table

UI-SPEC.md suggested `<Icon name="tune" />` for the OrderPage filter trigger button (UI-SPEC.md line 378). **Verified via read of Icon.jsx:13-82:** `tune` is NOT in the imports list nor the `ICONS` mapping table. The closest equivalents already available:

- `filter` (FilterList) — line 32, 103 — already used in Header menu
- `sort` (Sort) — line 33, 104

**Recommendation:** Use `<Icon name="filter" size={18} />` for the OrderPage filter trigger button. Avoid adding new icon imports unless necessary.

### Finding 2 — Version source mismatch

`config.yaml:10` has `app.version: "0.1.0"` but `frontend/package.json:4` has `"version": "0.0.0"`. UI-SPEC.md §Pre-flight #2 flags this as RESEARCH Risk 7. Per agent discretion (CONTEXT.md discretion 1), prefer **build-time frontend injection** via Vite:

```js
// vite.config.js (no change needed if Vite already exposes package.json)
define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version) }
```

Then in Sidebar.jsx:
```jsx
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';
```

**Alternative:** Hardcoded literal `"0.0.0"` for this phase only with TODO comment (acceptable per UI-SPEC.md §Registry Safety).

### Finding 3 — Admin home is AdminHomePage, NOT UserHomePage

`/admin` route maps to `AdminHomePage.jsx` (App.jsx:121-129), NOT `UserHomePage.jsx`. **AdminHomePage already has `菜品管理` + `食材管理` in `quickActions`** (AdminHomePage.jsx:63-73). So:

- UserHomePage changes (NAV-04) → chef only (admin doesn't see UserHomePage at all)
- AdminHomePage → no change needed (already complete)
- `/admin` → AdminHomePage (unchanged)
- `/home` → UserHomePage (extended for chef)

**Verification:** `App.jsx:121-289` shows `/home` is restricted to user/chef roles.

### Finding 4 — Seed visibility limited to AdminDishesPage

Backend `dish_service.list_dishes()` (lines 72-83) requires `Dish.status == "enabled"` for default list. Seed writes `status ∈ {"published", "draft"}` per D-DATA01-03, so **seed rows will NOT appear in `/order` even with `DishChef` rows added**. UI-SPEC.md §Status Visibility designates **AdminDishesPage mobile cards** (which uses `status=all` to bypass) as the visual verification target.

**Planning consequence:** if acceptance test requires seeing all 8 cards in `/order`, the planner must either:
- (a) Change seed to write `status = "enabled"` (deviates from D-DATA01-03)
- (b) Add `DishChef(status="published")` AND change visibility logic
- (c) Accept the locked limitation and verify on admin page only

**Recommended:** Option (c) — honor the locked D-DATA01-03 + the locked visibility limitation; verify on AdminDishesPage.

---

## Risk Areas

### Risk 1 — `Header actions` migration may silently drop page actions

**Issue:** 7 pages call `<Header actions={...}>` with various payload shapes (inline divs, bare Buttons, bare IconButtons). If any callsite is missed, the action disappears from the page entirely.

**Mitigation:** Use the audit checklist in "Shared Patterns → Header action-bar wrapper" — every callsite is enumerated with line numbers. Planner should grep `Header.*actions=` to verify zero misses.

### Risk 2 — Theme IconButton lacks re-render trigger

**Issue:** `theme.toggleTheme()` updates DOM + localStorage but does not broadcast an event. A Header IconButton reading `theme.getTheme()` directly will not re-render.

**Mitigation:** Per RESEARCH Finding 4: keep Header-local `currentTheme` state and update from `theme.toggleTheme()`'s return value (same pattern as Sidebar.jsx:28-33 before its removal). The new IconButton's icon prop is derived from this state.

### Risk 3 — BottomBar tab removal breaks chef-orders Badge

**Issue:** BottomBar.jsx:87 has `tab.id === 'chef-orders' && <Badge count={pendingCount} />`. After replacing the chef tab array, `chef-orders` id is preserved (BottomBar pattern assignment above) — verify it's NOT changed to a different id.

**Mitigation:** Locked Chef tab array in pattern assignment explicitly uses `id: 'chef-orders'`. Do NOT rename.

### Risk 4 — OrderPage `tune` icon falls back silently

**Issue:** UI-SPEC.md specifies `tune` icon. If implemented verbatim, Icon.jsx's unknown-name handler (line 84) console-warns and renders null. The trigger button will appear without icon.

**Mitigation:** Use `filter` icon instead (already mapped at Icon.jsx:103). Documented in Finding 1.

### Risk 5 — Seed idempotency on partial failure

**Issue:** If startup is interrupted after 4 of 8 dishes are inserted, the next startup sees `existing_names` of size 4 and inserts the remaining 4. But if the seed changes the combinations in future, partial-failure recovery may produce inconsistent state.

**Mitigation:** Per UI-SPEC.md D-DATA01-01: "skip the whole fixture when all eight stable names already exist; partial recovery should be decided explicitly in the plan." Current implementation: skip-per-row (per-individual-label) for granular recovery. If planner prefers atomic (skip-all-if-any-exists), adjust the check at initial_data.py line ~480 to `len(existing_names) >= 8`.

### Risk 6 — Phase 12 / Phase 14 test fixture breakage

**Issue:** `phase12-bugfix.spec.js:88-110` asserts Sidebar footer has 2 buttons. `md3-compliance.spec.js:104-128` counts footer buttons as touch targets. Both will fail post-Phase 15.

**Mitigation:** Update both files in Wave 0 (before any feature code lands). Replace footer-button assertions with version-text assertions. Already documented in their pattern assignments above.

### Risk 7 — Initial_data.py: missing imports at top

**Issue:** The new `create_seed_test_dishes()` function imports `os` and `random` at the top of the function body. These should be moved to module-level imports for consistency with project convention (initial_data.py:1-8 currently only imports `select`, `async_session_factory`, `User`, `hash_password`).

**Mitigation:** Append `import os` and `import random` to module-level imports. Move model imports (`Dish`, `DishCategory`, `Category`) inside the function — they follow the existing pattern of inline imports inside `create_preset_categories()` (initial_data.py:61) and `create_preset_ingredients()` (line 402) to avoid circular imports.

### Risk 8 — Branch discrepancy

**Issue:** AGENTS.md says development happens on `feature/guest_order` branch. RESEARCH.md notes current checked-out branch is `feature/ui-rebuild`. This is a project-level concern, not a per-file pattern. Planner should verify branch state before committing.

**Mitigation:** `git status --short --branch` — if on wrong branch, switch before any commits. Not a code risk per se.

---

## Recommended Wave Structure

### Wave 0 — Test migration (1 plan, 2 files)
**Goal:** Replace stale Sidebar footer button assertions before any feature work lands.
- `frontend/tests/phase12-bugfix.spec.js` *(replace D-BUG-02 Sidebar footer tests)*
- `frontend/tests/md3-compliance.spec.js` *(replace footer button count)*

**Verification:** `npx playwright test` passes against current Phase 14 code (pre-Phase 15).

### Wave 1 — Header/Sidebar shell (1 plan, 4 files)
**Goal:** Lock the new Header/Sidebar/Header.css/Sidebar.css structure.
- `frontend/src/components/composites/Header.jsx` *(main row restructure + theme IconButton + menu reduction + action-bar wrapper)*
- `frontend/src/components/composites/Header.css` *(`.header-action-bar` + `.md-header__menu-item--danger`)*
- `frontend/src/components/composites/Sidebar.jsx` *(delete footer buttons + version text + cleanup)*
- `frontend/src/components/composites/Sidebar.css` *(`.md-sidebar__version`)*

**Verification:** Manually visit `/admin/dishes` and `/admin` — header shows theme + avatar, action-bar appears below, sidebar footer shows version text only.

### Wave 2 — Header callers + BottomBar + UserHomePage (1 plan, 9 files)
**Goal:** Wrap all 7 `<Header actions>` callsites + replace role tabs + extend chef home.
- `frontend/src/pages/AdminDishesPage.jsx`
- `frontend/src/pages/AdminIngredientsPage.jsx`
- `frontend/src/pages/ChefDishesPage.jsx`
- `frontend/src/pages/AdminUsersPage.jsx`
- `frontend/src/pages/AdminCategoriesPage.jsx`
- `frontend/src/pages/OrderDetailPage.jsx`
- `frontend/src/pages/DishDetailPage.jsx`
- `frontend/src/components/composites/BottomBar.jsx`
- `frontend/src/pages/UserHomePage.jsx`

**Verification:** Each page's actions still functional; chef sees 5 quick actions on mobile; BottomBar has correct tab count per role.

### Wave 3 — OrderPage Sheet migration (1 plan, 1 file)
**Goal:** Migrate inline filter expansion to Sheet.
- `frontend/src/pages/OrderPage.jsx`

**Verification:** Click 高级筛选 → Sheet opens (mobile bottom-sheet / desktop centered); 清空 resets selectedRegion/Cuisine/Filters; 应用 closes; chip selection still triggers immediate API reload (existing semantics).

### Wave 4 — Seed + tests (1 plan, 3 files)
**Goal:** Add dev seed + verify all 8 cards on AdminDishesPage mobile.
- `backend/app/initial_data.py` *(add `create_seed_test_dishes()`)*
- `backend/app/main.py` *(wire up)*
- `frontend/tests/phase15-navigation.spec.js` *(new — covers all NAV/UI/DATA requirements)*
- `backend/tests/test_initial_data.py` *(new — covers seed idempotency/env guard/admin/category relations)*

**Verification:** With `ENVIRONMENT=development`, restart backend → 8 dishes in DB. Login as admin on mobile → `/admin/dishes` shows all 8 cards with mixed content combinations (recipe/description/image presence/absence).

---

## Metadata

**Analog search scope:** `frontend/src/components/{composites,primitives}/`, `frontend/src/pages/`, `frontend/src/css/`, `frontend/src/utils/`, `frontend/src/components/{Header,Sidebar,BottomBar,Divider,Sheet,Modal,Card,DishCard,Icon,IconButton}.jsx`, `backend/app/initial_data.py`, `backend/app/main.py`, `backend/app/models/dish.py`, `backend/app/database.py`, `backend/tests/conftest.py`, `backend/tests/test_guest.py`, `frontend/tests/{phase12-bugfix,md3-compliance}.spec.js`, `config.yaml`, `frontend/package.json`
**Files scanned:** 35+ source files (JSX + CSS + Python + YAML + JSON)
**Pattern extraction date:** 2026-07-30
**Research file:** `15-RESEARCH.md` (comprehensive — Findings 1-9 used to validate Status vocabulary, Sheet patterns, Header callers, Theme toggle, Seed pattern, BottomBar compatibility, OrderPage state, Card visual verification, DATA-01 visibility)
**Phase 14 patterns cross-referenced:** Sheet composite (reused as-is for OrderPage); `phase14-PATTERNS.md` Sidebar footer / dropdown Portal patterns informed Header local-state + action-bar wrapper approach.

---

## Structured Return Summary

```
## PATTERN MAPPING COMPLETE

**Phase:** 15 - Navigation Restructure & Test Data
**Files classified:** 21
**Analogs found:** 21 / 21 (100% — every file has a real codebase analog)

### Coverage
- Files with exact analog: 21
- Files with role-match analog: 0
- Files with no analog: 0

### Key Patterns Identified
- Header `actions` prop preserved; rendered below main row inside `.header-action-bar` div (per D-NAV01-01)
- Theme toggle moves from Sidebar footer to Header main row; requires Header-local `currentTheme` state (mirror Sidebar.jsx:28-33 pre-removal)
- Avatar menu reduced to 2 menuitems + Divider (D-NAV02); `logout()` only path now
- Sidebar footer cleanup: 2 buttons removed, version text node replaces (D-NAV03)
- BottomBar tabs: chef 7 / admin 7 / user 4 arrays; logout branch deleted (D-NAV05)
- UserHomePage: extend chef's `menuEntries` with dish + ingredient management entries (NAV-04)
- OrderPage: Sheet replaces inline filter expansion; filter state stays Page-owned (UI-01, locked)
- Backend seed: 8-dish fixture guarded by `ENVIRONMENT=development` or `AUTO_SEED_DEMO_DISHES=1`; idempotent (DATA-01)
- Visual verification target: AdminDishesPage mobile cards (`status=all` path) — seed rows will NOT appear in `/order` due to status vocabulary conflict (RESEARCH Risk 1)

### Pre-flight Findings (CRITICAL)
- `tune` icon NOT in Icon.jsx mapping — use `filter` (already mapped) instead
- Version source: prefer `import.meta.env.VITE_APP_VERSION` over hardcoded literal
- AdminHomePage (not UserHomePage) handles `/admin` — no duplication needed
- All Header action-bar callers audited (7 callsites enumerated with line numbers)

### Files Created
`/home/temila/family_chef/.planning/phases/15-navigation-restructure-test-data/15-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns + audit checklist in PLAN.md files.
```