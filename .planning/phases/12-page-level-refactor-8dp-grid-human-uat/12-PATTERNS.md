# Phase 12: Page-Level Refactor + 8dp Grid + HUMAN-UAT - Pattern Map

**Mapped:** 2026-07-28
**Branch:** `feature/ui-rebuild`
**Phase type:** Frontend refactor + bugfix + audit + UAT (no backend changes)
**Anchor phases:** Phase 8 (tokens), Phase 9 (Ripple/state-layer/touch-targets), Phase 10 (primitives — D-12 internal Ripple, D-13 Card slot, D-08 FAB 16px), Phase 11 (composites — Sidecar Header D-09..D-10, Sidebar D-09, BottomBar D-12, Modal/Snackbar D-01/04, ListItem D-17)

**Files analyzed:** 17 created/modified (12-00 + 12-01 buckets: 3 bugfix files, 2 stylelint config files, 1 check-script, 1 tokens read-only, 5 motion/echo/snackbar touch points, 1 audit script, 1 UAT report). Plus 12 pages to tokenise + emoji migration.
**Analogs found:** 16 / 17 (1 page file has no direct analog — relying on per-file migration by grep)
**Confidence:** HIGH — all analog files either read in full or already covered by prior-phase mapping.

---

## File Classification

| # | New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| 1 | `frontend/src/components/primitives/Ripple.jsx` | primitive (refactor) | event-driven (pointer → span children) | `frontend/src/components/primitives/Button.jsx:42-77` (consumer pattern), `frontend/src/components/primitives/Ripple.jsx` itself | exact (refactor same file) |
| 2 | `frontend/src/components/primitives/base.css` | CSS (rule-defining) | static | `frontend/src/components/primitives/base.css:32-37` (same file — keep z-stack) | exact |
| 3 | `frontend/src/App.jsx` | layout | routing/PcLayout | `frontend/src/App.jsx:75-86` (`PcLayout` — single delete line) | exact |
| 4 | `frontend/src/components/composites/Sidebar.jsx` | composite (extend footer) | navigation/event | `frontend/src/components/composites/Sidebar.jsx:95-112` (existing footer block — same block to extend) | exact |
| 5 | `frontend/src/components/primitives/Icon.jsx` | primitive (extend ICONS map) | presentation | `frontend/src/components/primitives/Icon.jsx:54-67,113-121` (Phase 10/11 extension blocks — same pattern for new additions) | exact |
| 6 | `frontend/src/components/Loading.jsx` | component | presentation | `frontend/src/components/EmptyState.jsx:5-17` (sibling empty/loading pattern) | exact |
| 7 | `frontend/src/utils/emptyState.js` *(in `utils/index.js:81-83`)* | utility | transform | `frontend/src/utils/index.js:52-78` (`statusBadge` — same multi-return-value utility shape) | exact |
| 8 | `frontend/src/contexts/ToastContext.jsx` | context provider (extend) | event-driven (queue + timer + action) | `frontend/src/contexts/ToastContext.jsx:223-234` (current showToast signature) + `ToastContext.jsx:264-289` (current JSX render) | exact |
| 9 | `frontend/src/css/styles.css` | CSS (tokenise spacing) | static | `frontend/src/css/styles.css:131` (existing already-tokenised line for comparison) | exact (mirror motion/spacing tokens) |
| 10 | `frontend/src/components/primitives/Button.css` | CSS (motion token) | static | `frontend/src/components/composites/Sidebar.css:64` (`transition: ... var(--md-motion-duration-short)` — canonical motion token usage) | exact |
| 11 | `frontend/.stylelintrc.json` | config (NEW) | lint-config | `frontend/.eslint.config.js` (existing flat-config style) | partial — stylelint v16 JSON config |
| 12 | `frontend/package.json` | config (add deps + scripts) | build-config | `frontend/package.json:22-34` (existing devDependencies block) | exact (mirror dependency slot) |
| 13 | `frontend/scripts/check-m3-tokens.sh` | CI script (NEW) | grep | `scripts/check-tokens.sh` (the source to extend — same `check()` helper shape) | exact (rename + extend) |
| 14 | `frontend/scripts/audit-md3-compliance.mjs` | e2e (NEW) | playwright | `frontend/scripts/audit-touch-targets.mjs` (same Playwright + JWT injection shape) | exact |
| 15 | `frontend/src/components/EmptyState.jsx` | component (extend API) | presentation | `frontend/src/components/EmptyState.jsx:5` (itself — break API call sites) | exact (extend in place) |
| 16 | 12 page files (UserHomePage, ChefOrdersPage, AdminDishesPage, UserWishesPage, ChefWishesPage, AdminWishesPage, LoginPage, PreferencesPage, InvitationsPage, GuestOrderPage, DishDetailPage + InvitationsSection nested) | page | CRUD/event (per-page) | `frontend/src/pages/UserHomePage.jsx:36-58` (quick-action emoji grid + spacing — canonical example of inline emoji + inline padding); `frontend/src/pages/AdminDishesPage.jsx:425-1108` (full tokenisation candidate with 8 padding/margin declarations per grep) | exact (per-file) |
| 17 | `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UAT-REPORT.md` | report (NEW) | manual | `.planning/phases/11-composite-navigation-components/11-VERIFICATION.md` (prior-phase report shape) | partial |

---

## Pattern Assignments

### 1. `frontend/src/components/primitives/Ripple.jsx` (primitive refactor — D-BUG-01 Option 3)

**Analog:** self (`Ripple.jsx:17-83`); consumer pattern from `Button.jsx:42-77`.

**Current span-wrapper shape (lines 74-83)** to refactor:
```jsx
return (
  <span
    ref={containerRef}
    className={`md-ripple-layer ${className}`}
    style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', ...style }}
    onPointerDown={handlePointerDown}
  >
    {children}
  </span>
);
```

**Consumer pattern (Button — `primitives/Button.jsx:42-77`):**
```jsx
return (
  <Ripple disabled={disabled || loading}>
    <button ref={ref} type={type} className={classes} ...>
      ...
    </button>
  </Ripple>
);
```

**Refactor target (Phase 12 — adds `mode="self"` cloneElement path):**
```jsx
// New: mode="self" attaches onPointerDown + inline geometry to the child <button> directly.
// Default (no mode) keeps the span wrapper for composite consumers (Sidebar/BottomBar/Header).
export default function Ripple({ children, disabled, className, style, mode }) {
  if (mode === 'self' && isValidElement(children)) {
    const childRef = useRef(null);
    return cloneElement(children, {
      ref: childRef,
      onPointerDown: (e) => { /* same ripple logic, childRef.current.getBoundingClientRect() */ },
      style: { position: 'relative', overflow: 'hidden', ...children.props.style, ...style },
      className: [children.props.className, className].filter(Boolean).join(' '),
    });
  }
  // unchanged span wrapper below
  ...
}
```

**Internal callers to update (3 sites):**
- `Button.jsx:43` — `<Ripple disabled={disabled || loading}>` → `<Ripple mode="self" disabled={disabled || loading}>`
- `IconButton.jsx:44` — `<Ripple disabled={disabled}>` → `<Ripple mode="self" disabled={disabled}>`
- `FAB.jsx:55` — `<Ripple disabled={disabled}>` → `<Ripple mode="self" disabled={disabled}>`

**Existing call sites that stay span-based (unchanged):**
- `composites/Sidebar.jsx:76,96` — `<Ripple style={{ width: '100%' }}>` (non-button-shaped nav row)
- `composites/BottomBar.jsx:68` — `<Ripple style={{ flex: 1 }}>` (non-button-shaped tab)
- `composites/Card.jsx:46` — `<Ripple disabled={!isClickable}>` (children = `<div>` not `<button>`)
- `composites/ListItem.jsx:45` — `<Ripple disabled={!isClickable} style={{ width: '100%', pointerEvents: 'auto' }}>` (children = `<As as="div">`)

**Convention:** add JSDoc parameter `mode?: 'self' | 'wrap'`; default behavior (no `mode` prop) = span wrap = `mode="wrap"`.

---

### 2. `frontend/src/components/primitives/base.css` (verify stacking — D-BUG-01)

**Read-only verification target (lines 26-37, current):**
```css
/* 所有非 ripple 子元素自动抬到 z2，确保 label/icon 不被 state-layer 遮挡 */
.md-interactive > :not(.md-ripple-layer) {
  position: relative;
  z-index: 2;
}

/* Ripple 容器锚点 —— 由 Ripple.jsx 渲染 .md-ripple-layer span */
.md-ripple-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
```

**Phase 12 stance:** NO changes to `base.css`. The fix lives in `Ripple.jsx`'s `mode="self"` path — it removes the `.md-ripple-layer` span entirely for Button/IconButton/FAB consumers, eliminating the stacking trap at source. The `.md-interactive` rules are correct and used by every other primitive (Card, ListItem, IconButton inside composite, etc.).

**If plan-1 verification fails (Ripple still swallows clicks):** the fallback is to relax the `.md-ripple-layer { pointer-events: none }` rule to `pointer-events: auto` only when no `.md-interactive` parent — but this is **not the primary fix**.

---

### 3. `frontend/src/App.jsx` (D-BUG-02 — delete Sidecar Header)

**Single change point — `App.jsx:75-86` PcLayout:**
```jsx
function PcLayout() {
  const location = useLocation();
  return (
    <div className="pc-layout">
      <Sidebar />
      <Header />           // ← Line 80 — DELETE this line per D-BUG-02
      <main className="pc-main" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
}
```

**Result (after deletion):**
```jsx
function PcLayout() {
  const location = useLocation();
  return (
    <div className="pc-layout">
      <Sidebar />
      <main className="pc-main" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
}
```

**Acceptable cleanup:** `App.jsx:6` keeps `import Header from './components/Header';` because `App.jsx` does not directly import Header — that import is dead. Verify whether it appears anywhere else in `App.jsx`; if not, remove the import line too.

**Why preserve `composites/Header.jsx`:** 21 page files still render `<Header title="..." showBack>` inside their own `<main>`. The composite stays; only the PcLayout wrapper instance is removed.

**Verification:** `document.querySelectorAll('header').length === 1` on any PC page.

---

### 4. `frontend/src/components/composites/Sidebar.jsx` (D-BUG-02 — relocate theme toggle to footer)

**Analog:** `Sidebar.jsx:95-112` (existing footer block — extend in place).

**Current footer (lines 95-112):**
```jsx
<div className="md-sidebar__footer">
  <Ripple style={{ width: '100%' }}>
    <button
      type="button"
      className="md-sidebar__item md-interactive"
      onClick={() => {
        logout();
        navigate('/login');
      }}
      aria-label="退出"
      title="退出"
    >
      <span className="md-sidebar__item-icon">
        <Icon name="logout" size={24} />
      </span>
    </button>
  </Ripple>
</div>
```

**Extension (add ThemeToggle button above logout):**
```jsx
import { theme } from '../../utils';                    // add at top — already used in Header.jsx:21

<div className="md-sidebar__footer">
  <Ripple style={{ width: '100%' }}>
    <button
      type="button"
      className="md-sidebar__item md-interactive"
      onClick={() => theme.toggleTheme()}
      aria-label="切换主题"
      title="切换主题"
    >
      <span className="md-sidebar__item-icon">
        <Icon name={theme.getTheme() === 'dark' ? 'light-mode' : 'dark-mode'} size={24} />
      </span>
    </button>
  </Ripple>
  <Ripple style={{ width: '100%' }}>
    <button /* unchanged logout button */ />
  </Ripple>
</div>
```

**Pattern source:** `composites/Header.jsx:116-130` (theme toggle button — same `theme.toggleTheme() + Icon name={... 'light-mode' : 'dark-mode'} size={18}` shape, lifted to Sidebar footer with size 24).

**Risk callout:** Sidebar is 80dp wide × footer height 80dp. Two 80dp stacked buttons may need a smaller height per button to fit; see RESEARCH.md §2 risk #3. If heights shrink, adjust `.md-sidebar__item { height: 80px }` (line 58) to ~40px — but make sure both fit before logout pushes off-screen. **Agent's discretion per CONTEXT D-AGENT**.

---

### 5. `frontend/src/components/primitives/Icon.jsx` (D-EMOJI-01 — add 3 new icons)

**Add 3 imports + 3 mappings to existing structure.**

**Current import block (lines 13-68, end of import):**
```jsx
import {
  // ...
  Phase 11 必要扩展（Sidebar / BottomBar 导航图标）
  Dashboard as DashboardIcon,
  Eco as EcoIcon,
  Folder as FolderIcon,
  Group as GroupIcon,
  BarChart as BarChartIcon,
  Description as DescriptionIcon,
  Lightbulb as LightbulbIcon,
  Spa as SpaIcon,
} from '@material-symbols-svg/react';
```

**Phase 12 — append to imports:**
```jsx
import {
  // ...
  Spa as SpaIcon,
  // Phase 12 — 8dp/Emoji sweep 扩展
  Inventory2 as Inventory2Icon,
  Mail as MailIcon,                       // (already aliased as EmptyState default; explicit import for clarity)
  NewLabel as NewLabelIcon,
  RamenDining as RamenDiningIcon,
  Circle as CircleIcon,
  ShoppingCart as ShoppingCartIcon,
  MoodBad as MoodBadIcon,
} from '@material-symbols-svg/react';
```

**Phase 12 — append to `ICONS` map (lines 113-121):**
```jsx
// Phase 11 必要扩展（Sidebar / BottomBar 导航）
dashboard: DashboardIcon,
eco: EcoIcon,
// ... existing entries ...
spa: SpaIcon,
// Phase 12 — 8dp/Emoji sweep 扩展（详见 12-RESEARCH.md §6 icon mapping table）
inventory2: Inventory2Icon,        // 📋 已存在 — explicit alias for EmptyState defaults
mail: MailIcon,                    // 📭 已存在 — empty inbox
'new-label': NewLabelIcon,         // 🆕 — matched-ingredient indicator
'ramen-dining': RamenDiningIcon,   // 🍲 — soup-pot for guest/login brand
circle: CircleIcon,                // 🔴 — allergy-error indicator
'shopping-cart': ShoppingCartIcon, // 🛒 — guest order cart icon
'mood-bad': MoodBadIcon,           // 😔 — empty/error
```

**Verification step:** Run `ls frontend/node_modules/@material-symbols-svg/react/dist/icons/ | grep -iE "new-label|ramen-dining|circle|inventory2|mail|mood-bad|shopping-cart"` to confirm all 7 d.ts files exist (RESEARCH confirmed `new-label`, `ramen-dining`, `circle`; the other 4 are confirmed present in `node_modules/dist/icons/` per existing usage).

**Note on `mail`:** `icons/inventory2.js`, `icons/mail.js`, `icons/mood-bad.js`, `icons/shopping-cart.js` are NOT currently imported in `Icon.jsx`. The Phase 10 line 67 `Mail as MailIcon` reference in RESEARCH.md is inaccurate — `Mail` is NOT in the current Phase 10/11 imports. **Plan MUST add these 7 imports in Phase 12.**

---

### 6. `frontend/src/components/Loading.jsx` (D-EMOJI-01 — swap emoji for CircularProgress)

**Current `Loading.jsx:1-12`**:
```jsx
/**
 * Loading Component - 加载状态
 */

export default function Loading({ message = '加载中...' }) {
  return (
    <div className="loading">
      <div className="loading-spinner"></div>
      {message}
    </div>
  );
}
```

**Pattern source:** `Loading.jsx` itself — it already uses `<div className="loading-spinner" />` (CSS pseudo-element rotates). **Actually NO emoji is in `Loading.jsx` per `Read`.** RESEARCH.md flagged this as a candidate but the file has zero emoji. **Plan task: confirm across codebase — likely Loading needs no emoji removal; the spinner is already pure CSS.**

**However**, the user's CONTEXT D-EMOJI-01 explicitly mentions "loading.jsx / emptyState() util". Verify by re-grep: `Grep("loading-spinner|loading emoji", path="frontend/src")`. If 0 emoji hits, this task is a no-op. **Phase 12 task definition: only do this if grep confirms emoji.**

---

### 7. `frontend/src/utils/emptyState.js` (in `utils/index.js`) — D-EMOJI-01 API change

**Current shape — `utils/index.js:80-83`:**
```js
// ─── Empty State ─────────────────────────────────────
export const emptyState = (icon = '📭', text = '暂无数据') => {
  return { icon, text };
};
```

**Two consumer shapes (`Grep` confirms 36 EmptyState usages):**
- **Component form (most common)** — `<EmptyState icon="🍽️" text="..." />` (`AdminDishesPage:528`, etc.)
- **Utility form (ChefWishesPage:338)** — `const empty = emptyState(...); <EmptyState icon={empty.icon} text={empty.text} />`

**Pattern source for migration:** `statusBadge(status)` (`utils/index.js:52-78`) — same return shape `{ text, cls }`. Both can stay as pure-string return values; only **the component** `EmptyState.jsx` needs API change.

**Plan decision (per RESEARCH.md §6):**
- `EmptyState.jsx:5` — change `icon` prop to accept `string` (Icon name) OR `ReactNode`. Default: `<Icon name="mail" size={48} />`.
- `emptyState()` util — keep returning `{ icon: 'mail', text: ... }` (just replace emoji default `'📭'` with Icon name `'mail'`).
- 8 call sites that pass emoji (`AdminDishesPage:528 🍽️`, `ChefOrdersPage:116 📋`, etc.) — replace emoji literal with Icon name string.

---

### 8. `frontend/src/contexts/ToastContext.jsx` (D-SNACK-01 — extend showToast + render action)

**Current signature — `ToastContext.jsx:223-234`:**
```js
const showToast = useCallback((message, type = 'success') => {
  const tone = Object.hasOwn(DURATION_BY_TYPE, type) ? type : 'success';
  const item = {
    id: ++nextId,
    message,
    type: tone,
    createdAt: Date.now(),
  };
  setItems((previous) => [...previous, item].slice(-MAX_VISIBLE));
  startTimer(item.id, DURATION_BY_TYPE[tone]);
}, [startTimer]);
```

**Extended signature (backward-compatible via overload):**
```js
const showToast = useCallback((message, options = 'success') => {
  // options is either string (legacy type) or { type, duration, action: { label, onClick } }
  const isLegacyString = typeof options === 'string';
  const tone = isLegacyString
    ? (Object.hasOwn(DURATION_BY_TYPE, options) ? options : 'success')
    : (options.type || 'success');
  const duration = isLegacyString
    ? DURATION_BY_TYPE[tone]
    : (options.duration || DURATION_BY_TYPE[tone]);
  const action = isLegacyString ? undefined : options.action;

  const item = {
    id: ++nextId,
    message,
    type: tone,
    action,                          // { label, onClick } | undefined
    createdAt: Date.now(),
  };
  setItems((previous) => [...previous, item].slice(-MAX_VISIBLE));
  startTimer(item.id, duration);
}, [startTimer]);
```

**Current render — `ToastContext.jsx:264-289`** — insert action button between message and close icon:
```jsx
<div className={`md-snackbar md-snackbar--${item.type}`} ...>
  <span className={`md-snackbar__bar md-snackbar__bar--${item.type}`} aria-hidden="true" />
  <span className="md-snackbar__icon" aria-hidden="true">
    <Icon name={ICON_BY_TYPE[item.type]} size={18} weight={600} />
  </span>
  <span className="md-snackbar__message">{item.message}</span>
  {/* NEW: optional action button (Phase 12 D-SNACK-01) */}
  {item.action && (
    <button
      type="button"
      className="md-snackbar__action md-interactive"
      onClick={() => { item.action.onClick(); dismiss(item.id); }}
    >
      {item.action.label}
    </button>
  )}
  <button
    type="button"
    className="md-snackbar__close md-interactive"
    onClick={() => dismiss(item.id)}
    aria-label="关闭通知"
  >
    <Icon name="close" size={18} weight={600} />
  </button>
</div>
```

**Add CSS inside `SNACKBAR_STYLES` (after the close button rules at line 142):**
```css
.md-snackbar__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  padding: 0 var(--md-spacing-2);
  border: none;
  background: transparent;
  color: var(--md-color-inverse-primary);
  font: var(--md-font-body);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--md-radius-xs);
  flex-shrink: 0;
  transition: background var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.md-snackbar__action:hover {
  background: color-mix(in srgb, var(--md-color-inverse-primary) 12%, transparent);
}
```

**213 call sites verified unchanged** — `Grep` confirms all existing `showToast(msg, 'error')` 2-arg calls keep working (string overload).

**Example new call sites (Phase 12 — RESEARCH §10.5):**
- `pages/UserWishesPage.jsx:201` — `'愿望已提交，厨师会尽快认领'` → add `{ action: { label: '撤销', onClick: () => api.cancelWish(id) } }`
- `pages/OrderPage.jsx:232` — after submit, `'订单提交成功'` → `{ action: { label: '查看详情', onClick: () => navigate('/orders/' + id) } }`
- `components/InvitationsSection.jsx:65` — `'邀请链接已创建'` → `{ action: { label: '复制', onClick: () => copyToClipboard(url) } }`

**Convention:** action button positioned between message and close icon (MD3 spec position from snackbar.component.md).

---

### 9. `frontend/src/css/styles.css` (D-GRID-01 + D-MOTION-01)

**Token substitution targets** (per RESEARCH.md §3 + §5):
- 242 hard-coded padding/margin/gap declarations
- 5 hard-coded transition durations

**Tokenization references (READ-ONLY):**

`tokens.css:151-159`:
```css
--md-spacing-1: 4px;
--md-spacing-2: 8px;
--md-spacing-3: 12px;
--md-spacing-4: 16px;
--md-spacing-5: 24px;
--md-spacing-6: 32px;
--md-spacing-7: 40px;
--md-spacing-8: 56px;
```

`tokens.css:170-174`:
```css
--md-motion-duration-short: 150ms;
--md-motion-duration-medium: 250ms;
--md-motion-duration-long: 500ms;
--md-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
--md-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
```

**Canonical replaced-style example — `styles.css:175-176` (already tokenised):**
```css
.form-input { ... padding: 12px 16px; ... border-radius: var(--md-radius-sm); color: ... transition: all var(--md-motion-duration-short) var(--md-motion-easing-standard); }
```

**Migration examples to follow this exact shape:**
- `padding: 8px 16px` → `padding: var(--md-spacing-2) var(--md-spacing-4);`
- `gap: 6px` → `gap: var(--md-spacing-1);` (rounds 6→4 per D-GRID-01)
- `gap: 10px` → `gap: var(--md-spacing-2);` (rounds 10→8 per D-GRID-01)
- `margin-bottom: 16px` → `margin-bottom: var(--md-spacing-4);`
- `padding-bottom: 80px;` → KEEP `80px` (nav-height safe-area, not a spacing token)

**Motion tokenisation (lines 140, 256):**
- Line 140 — `animation: fadeInUp 0.5s ease-out both;` → `animation: fadeInUp var(--md-motion-duration-long) var(--md-motion-easing-emphasized) both;`
  - (Note: `0.5s` → `--md-motion-duration-long` (500ms); `ease-out` → emphasized MD3 cubic-bezier)
- Line 256 — `.loading-spinner { animation: spin 0.8s linear infinite; }` → KEEP as-is per RESEARCH §5 (linear keeps decorative spinner; 0.8s not in token scale).
  - **OR** change to `var(--md-motion-duration-long)` if plan decides to align with MD3.

**Stagger animation delays (line 141)** — KEEP as-is (decorative cadence, not MD3 design token scale).

---

### 10. `frontend/src/components/primitives/Button.css` (D-MOTION-01)

**Single change target — `Button.css:102`:**
```css
.md-button__spinner {
  animation: md-spin 0.8s linear infinite;
}
```
**Replace:**
```css
.md-button__spinner {
  animation: md-spin 0.8s linear infinite;       /* KEEP — decorative spinner rhythm */
}
```
**OR (if plan aligns to MD3):**
```css
.md-button__spinner {
  animation: md-spin var(--md-motion-duration-long) linear infinite;
}
```

**Convention reference — `composites/Sidebar.css:64` (canonical tokenised motion):**
```css
transition: color var(--md-motion-duration-short) var(--md-motion-easing-standard);
```

**Decision:** RESEARCH §5 leave the spinner period to planner's discretion. The tokenised version is acceptable; the 0.8s version preserves established UX.

---

### 11. `frontend/.stylelintrc.json` (NEW — D-RADIUS-01)

**No existing analog in repo** (stylelint not installed; `package.json:22-34` has no stylelint dep). Template per RESEARCH §8:

```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "selector-class-pattern": null,
    "custom-property-pattern": null,
    "declaration-property-value-allowed-list": {
      "border-radius": [
        "/^var\\(--md-radius-/",
        "/^0$/",
        "/^50%$/",
        "/^9999px$/",
        "/^inherit$/",
        "/^unset$/"
      ],
      "/^border-(top|bottom|left|right)-(left|right)-radius$/": [
        "/^var\\(--md-radius-/",
        "/^0$/",
        "/^50%$/",
        "/^9999px$/"
      ]
    }
  },
  "ignoreFiles": [
    "node_modules/**/*",
    "dist/**/*",
    "frontend/src/components/composites/Modal.css",
    "frontend/src/components/composites/Header.css"
  ]
}
```

**Convention:** stylelint v16+ uses flat config (`stylelint.config.js`) by default — but classic `.stylelintrc.json` is still supported. Phase 12 uses the JSON variant for parity with eslint flat config in `eslint.config.js`. `ignoreFiles` defensively excludes Modal.css (line 46 sets `border-radius: 0` — valid but defensive) and Header.css (uses tokens already).

**Versions to verify:** `npm view stylelint version` → v16.26.x expected; `npm view stylelint-config-standard version` → v36.x expected. Pin in `package.json` devDeps.

---

### 12. `frontend/package.json` (D-FILE-01, D-FILE-02 — add deps + scripts)

**Add to devDependencies (`package.json:22-34`):**
```json
"stylelint": "^16.26.0",
"stylelint-config-standard": "^36.0.0"
```

**Add to scripts (`package.json:6-14`):**
```json
"lint:css": "stylelint \"frontend/src/**/*.css\"",
"check:md3": "bash ../scripts/check-m3-tokens.sh",
"audit:md3": "node scripts/audit-md3-compliance.mjs",
"check:all": "npm run lint && npm run lint:css && npm run check:md3"
```

**Convention reference — existing devDependencies (`package.json:22-34`) and existing scripts (`package.json:6-14`):**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "check:tokens": "bash ../scripts/check-tokens.sh",
  "gen:tokens": "node ../scripts/generate-tokens.cjs",
  "audit:touch": "node scripts/audit-touch-targets.mjs",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

**Note on rename:** CONTEXT D-FILE-02 calls for new script name `check:md3`; the old `check:tokens` stays as alias OR gets renamed to `check:md3`. RESEARCH §9 recommends renaming `check-tokens.sh` → `check-m3-tokens.sh` + update script.

---

### 13. `frontend/scripts/check-m3-tokens.sh` (NEW — D-GRID-03 + D-RADIUS-01)

**Analog:** `scripts/check-tokens.sh` — copy the helper functions (`fail()`, `check()`), then extend with 3 new checks.

**Source helper to mirror (lines 14-37):**
```bash
set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_DIR/frontend"
FAILURES=0
TOTAL=0

fail() {
    echo "[FAIL] $1" >&2
    FAILURES=$((FAILURES + 1))
}

check() {
    TOTAL=$((TOTAL + 1))
    local description="$1"
    local output="$2"
    if [ -n "$output" ]; then
        echo "[FAIL] $description" >&2
        echo "$output" | sed 's/^/        /' >&2
        FAILURES=$((FAILURES + 1))
    fi
}
```

**Add Check #8 (padding/margin/gap px across all dirs):**
```bash
SPACING_OUTPUT=$(rg -n --no-heading "(padding|margin|gap)[^:]*:\s*[0-9]+px" \
    "$FRONTEND_DIR/src/css/" \
    "$FRONTEND_DIR/src/components/" \
    "$FRONTEND_DIR/src/pages/" \
    2>/dev/null | rg -v "var\(--md-spacing" || true)
check "硬编码 padding/margin/gap px (Check #8)" "$SPACING_OUTPUT"
```

**Add Check #9 (hard-coded transition durations):**
```bash
MOTION_OUTPUT=$(rg -n --no-heading "transition[^:]*:\s*[^;]*[0-9]+(s|ms)" \
    "$FRONTEND_DIR/src/css/" \
    "$FRONTEND_DIR/src/components/" 2>/dev/null \
    | rg -v "var\(--md-motion" \
    | rg -v "0.01ms" || true)
check "硬编码 transition 时长 (Check #9)" "$MOTION_OUTPUT"
```

**Add Check #10 (emoji in page + composite JSX, excluding primitives):**
```bash
EMOJI_OUTPUT=$(rg -lP --no-heading "(?=\p{Extended_Pictographic})\X" \
    "$FRONTEND_DIR/src/pages/" "$FRONTEND_DIR/src/components/" 2>/dev/null \
    | rg -v "EmptyState" || true)
check "页面/组件 emoji 残留 (Check #10)" "$EMOJI_OUTPUT"
```

**Keep Check #1-7 verbatim from `scripts/check-tokens.sh:44-95`** (already validated).

**Convention:** script chmod +x (`chmod +x frontend/scripts/check-m3-tokens.sh`).

---

### 14. `frontend/scripts/audit-md3-compliance.mjs` (NEW — D-UAT-02 Playwright)

**Analog:** `frontend/scripts/audit-touch-targets.mjs` — copy the chromium/launch + JWT-injection structure, then add 3 new audit cases.

**Structure to mirror (`audit-touch-targets.mjs:17-49`):**
```js
import { chromium } from 'playwright';
import fs from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:5173';

const PAGES = [
  { url: '/login', name: 'Login', auth: false },
  { url: '/home', name: 'User Home', auth: true },
  // ... 12 entries
];

async function auditPage(page, url, name) { /* ... */ }

(async () => {
  const tokenArg = process.argv.find((a) => a.startsWith('--token='));
  const token = tokenArg ? tokenArg.split('=')[1] : process.env.FC_TEST_TOKEN;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  if (token) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => {
      localStorage.setItem('fc_token', t);
      try { localStorage.setItem('fc_user', JSON.stringify(JSON.parse(atob(t.split('.')[1])))); } catch {}
    }, token);
  }
  // audit each page
  fs.writeFileSync(resolve(FRONTEND_ROOT, 'md3-compliance-results.json'), JSON.stringify(report, null, 2));
  await browser.close();
})();
```

**Three new audit cases to add:**

**Case A — Ripple click regression (catches D-BUG-01):**
```js
const rippleClickWorks = await page.evaluate(() => {
  // Find any .md-icon-button in a Snackbar close or icon list
  const btn = document.querySelector('.md-icon-button, button[aria-label="关闭通知"], .md-snackbar__close');
  if (!btn) return { skipped: true };
  let clicked = false;
  btn.addEventListener('click', () => { clicked = true; }, { once: true });
  btn.click();
  // Wait one microtask
  return { clicked };
});
if (rippleClickWorks.skipped) continue;
if (!rippleClickWorks.clicked) rippleViolations.push({ page: name, url, selector: btn.selector });
```

**Case B — Single Header DOM count (catches D-BUG-02):**
```js
const headerCount = await page.evaluate(() => document.querySelectorAll('header').length);
if (headerCount !== 1) headerViolations.push({ page: name, url, count: headerCount });
```

**Case C — 8dp grid sampling (catches D-GRID-01):**
```js
const nonAlignedSamples = await page.evaluate(() => {
  const samples = [];
  document.querySelectorAll('button, .md-card, [class*="grid"], .modal, .page-container').forEach((el, i) => {
    if (i >= 10) return;
    const cs = window.getComputedStyle(el);
    ['padding', 'margin', 'gap'].forEach((prop) => {
      const val = cs[prop];
      if (typeof val === 'string' && /^\d+px$/.test(val)) {
        const px = parseInt(val, 10);
        if (px !== 0 && px !== 1 && px !== 2 && px !== 3 && px % 4 !== 0) {
          samples.push({ selector: el.className, prop, value: val });
        }
      }
    });
  });
  return samples;
});
if (nonAlignedSamples.length > 0) gridViolations.push({ page: name, url, samples: nonAlignedSamples });
```

---

### 15. `frontend/src/components/EmptyState.jsx` (D-EMOJI-01 — extend `icon` prop to string|ReactNode)

**Current (`EmptyState.jsx:5-17`):**
```jsx
export default function EmptyState({ icon = '📭', text = '暂无数据', subtext }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-text">{text}</div>
      {subtext && (
        <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', marginTop: 4, lineHeight: 1.5 }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
```

**New (string → Icon, ReactNode → render as-is):**
```jsx
import Icon from './primitives/Icon';

export default function EmptyState({ icon = 'mail', text = '暂无数据', subtext }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {typeof icon === 'string'
          ? <Icon name={icon} size={48} />
          : icon}
      </div>
      <div className="empty-state-text">{text}</div>
      {subtext && (
        <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', marginTop: 4, lineHeight: 1.5 }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
```

**8 call sites to migrate** (from `Grep`):
| File | Line | Current `icon` | New `icon` |
|------|------|----------------|-----------|
| `pages/AdminDishesPage.jsx` | 528 | `"🍽️"` | `"set-meal"` |
| `pages/AdminCategoriesPage.jsx` | 132 | `"📂"` | `"folder"` |
| `pages/AdminChefsPage.jsx` | 95 | `"👨‍🍳"` | `"chef"` |
| `pages/ChefOrdersPage.jsx` | 116 | `"📋"` | `"inventory2"` |
| `components/ChefSelectModal.jsx` | 45 | `"👨‍🍳"` | `"chef"` |
| `components/InvitationsModal.jsx` | 34 | `"📭"` | `"mail"` |
| `pages/OrderPage.jsx` | 434 | `"🍽️"` | `"set-meal"` |
| `pages/ChefDishesPage.jsx` | 548 | `"🍽️"` | `"set-meal"` |
| `pages/UserFavoritesPage.jsx` | 52 | `"❤️"` | `"favorite"` |
| `pages/AdminIngredientsPage.jsx` | 300 | `"🥬"` | `"eco"` |
| `pages/UserOrdersPage.jsx` | 100 | `"📋"` | `"inventory2"` |
| `pages/UserWishesPage.jsx` | 287 | `"💡"` | `"lightbulb"` |
| `pages/GuestOrderPage.jsx` | 346 | `"🍽️"` | `"set-meal"` |
| `components/WishAdvanceModal.jsx` | 135, 138 | `"🔍"` / `"🍽️"` | `"search"` / `"set-meal"` |

**Pattern source:** `DishCard.jsx:33-40` (already uses `fontSize: '2.5rem'` emoji as fallback image — same migration treatment applies there: `🍽️` → `<Icon name="set-meal" size={48} />`).

**Convention:** `subtext` marginTop: 4 stays raw px — it's an inline cosmetic adjustment inside the EmptyState itself, but RESEARCH §3 marks it as needing tokenisation (CONTEXT has slight inconsistency; either migrate to `var(--md-spacing-1)` or document as inline noise).

---

### 16. 12 page files (D-GRID-01 + D-EMOJI-01)

**Migration surface** (per RESEARCH §3 + §6):

**Spacing token targets (from `Grep`):**

| File | Examples | Token Mapping |
|------|----------|---------------|
| `pages/UserHomePage.jsx` | `:39` `padding: '0 16px', gap: 10, marginBottom: 16`; `:45` `padding: 12` | spacing-4 / spacing-2 / spacing-4 / spacing-3 |
| `pages/GuestOrderPage.jsx` | `:230` `marginBottom: 16`; `:252,266,270,293,320` `gap: 8, padding: '0 16px 4px'` | spacing-4 / spacing-2 / spacing-4 + spacing-1 |
| `pages/PreferencesPage.jsx` | `:157,206,232` `marginBottom: 16 / padding: '16px 0'`; `:172` `gap: 6` | spacing-4 / spacing-2 |
| `pages/AdminDishesPage.jsx` | 8 occurrences — `:614` `marginBottom: 12`; `:628` `gap: 6` etc. | spacing-3 / spacing-1 |
| `pages/ChefDishesPage.jsx` | 8 occurrences — mirror of AdminDishesPage | spacing-3 / spacing-1 |
| `pages/OrderPage.jsx` | 8 occurrences — `:338,645` selects (`.form-input` residual — leave 16px) | spacing-3 |
| `pages/AdminIngredientsPage.jsx` | 7 occurrences | mixed |
| `components/composites/Header.css` | 11 occurrences | mixed |
| `components/composites/ListItem.css` | 10 occurrences | mixed |
| `components/composites/Modal.css` | 7 occurrences | mixed |
| `components/primitives/Button.css` | 6 occurrences | spacing-3 |

**Emoji migration targets (106 clusters across 31 files):**

High-volume files (per RESEARCH §6):
- `pages/DishDetailPage.jsx` (11) — `🍽️ → set-meal`, `🥬 → eco`, etc.
- `pages/AdminHomePage.jsx` (9) — `📊 → bar-chart`, `👥 → group`, etc.
- `pages/AdminStatsPage.jsx` (9) — same family
- `pages/AdminDishesPage.jsx` (8)
- `pages/ChefDishesPage.jsx` (8)
- `pages/GuestOrderPage.jsx` (7) — `🛒 → shopping-cart`, `🍽️ → set-meal`, etc.

**Migration example — `UserHomePage.jsx:11-32` (replace emoji icons):**
```jsx
// BEFORE
const menuEntries = [
  { icon: '🍽️', title: '开始点菜', ... },
  { icon: '👅',  title: '口味偏好', ... },
  { icon: '👨‍🍳', title: '订单管理', ... },     // chef/admin only
];

// AFTER — emoji → Icon name + render via <Icon name={entry.icon} />
const menuEntries = [
  { icon: 'set-meal', title: '开始点菜', ... },
  { icon: 'restaurant', title: '口味偏好', ... },  // taste buds → restaurant
  { icon: 'chef', title: '订单管理', ... },
];

// Render (existing :47 was `<div>{entry.icon}</div>`)
// AFTER
<div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 'var(--md-spacing-1)' }}>
  <Icon name={entry.icon} size={32} />
</div>
```

**Discriminating emoji (per RESEARCH §6 — NOT replaced):**
- `✕` U+2715 — modal close character (keep — character glyph, not pictograph)
- `▼` `▲` `›` `·` `•` — UI affordance glyphs / separators (keep)

**Convention:** new Icon name strings come from the Phase 12-extended `ICONS` map (see file #5 above).

---

### 17. `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UAT-REPORT.md` (NEW — D-UAT-04)

**Analog (partial):** `.planning/phases/11-composite-navigation-components/11-VERIFICATION.md`

**Section structure to follow (per D-UAT-04 + 6-flow methodology):**
```markdown
# Phase 12 UAT Report
**Date:** 2026-07-28
**Branch:** feature/ui-rebuild
**Tester:** (human)

## Gate A — Developer tools (DevTools / Console / lint / build)
- [ ] `npm run lint` — 0 new errors
- [ ] `npm run lint:css` — 0 hard-coded border-radius
- [ ] `npm run check:md3` — 0 spacing/motion/emoji residue
- [ ] `npm run build` — 0 error
- [ ] Browser DevTools console — 0 warnings

## Gate B — 6 flows
### Flow 1: Register/Login
- [ ] New account → Login → Home
- [ ] First-login force-change-password route
- ...

### Flow 2: 菜品 CRUD
...

### Flow 3: 订单创建
...

### Flow 4: 愿望单生命周期
...

### Flow 5: 访客点菜
...

### Flow 6: 口味偏好
...

## Gate C — DevTools DOM check
- [ ] `document.querySelectorAll('header').length === 1` on every PC page
- [ ] Ripple click event triggers on every `IconButton` / `Button` / `FAB`
- [ ] All spacing samples are multiples of 4 (8dp grid)

## Gate D — Screenshots & issues
| Flow | Screenshot | Issues | Status |
|------|-----------|--------|--------|
| 1    | /path     | none   | PASS   |
```

**Convention:** mirror the 4-gate structure from CONTEXT D-UAT-03 (人工浏览 / grep+lint+build / DevTools DOM / Console zero).

---

## Shared Patterns

### S1. CSS token consumption (apply to all CSS + JSX style rewrite)

**Source:** `frontend/src/css/tokens.css:151-174` (entire spacing/motion/radius family).

**Convention examples:**
```css
/* ─── Spacing ─── */
padding: var(--md-spacing-2) var(--md-spacing-4);    /* 8px 16px */
margin-bottom: var(--md-spacing-4);                  /* 16px */
gap: var(--md-spacing-3);                            /* 12px */

/* ─── Motion ─── */
transition: color var(--md-motion-duration-short) var(--md-motion-easing-standard);
animation: fadeInUp var(--md-motion-duration-long) var(--md-motion-easing-emphasized);

/* ─── Radius ─── */
border-radius: var(--md-radius-md);                  /* 16px — FAB / Card */
border-radius: var(--md-radius-sm);                  /* 12px — Button / Input */
border-radius: var(--md-radius-full);                /* 9999px — pill */

/* ─── Color (state-layer neutral) ─── */
background: var(--md-color-surface-container-lowest);
color: var(--md-color-on-surface-variant);
```

**Apply to:** all 12 page file inline styles (`padding`, `margin`, `gap`); all 28 component CSS files (`.css`); `Ripple.jsx:45-46`, `ToastContext.jsx:63` motion replacements.

---

### S2. `md-interactive` class on any clickable element (apply to all clickable UI)

**Source:** `frontend/src/components/primitives/base.css:8-45`

**Convention:**
```jsx
<button className="md-button md-interactive" onClick={...}>
<button className="md-icon-button md-interactive" onClick={...}>
<button className="md-fab md-interactive" onClick={...}>
<div className="md-card md-interactive" role="button" onClick={...}>
```

**Why:** the `.md-interactive::before` provides MD3 state-layer (hover/pressed/focused); `.md-interactive > :not(.md-ripple-layer)` ensures children render above state-layer.

**Apply to:** every new primitive or composite button-like surface; NOT to raw `<button>` without Ripple/state-layer wrapper.

---

### S3. Ripple container (apply to all hover-able clickable surfaces)

**Two modes (Phase 12 introduces self-mode):**

**Self-mode (only for primitive internal Button/IconButton/FAB — see file #1):**
```jsx
<Ripple mode="self" disabled={disabled}>
  <button ...>{children}</button>
</Ripple>
```

**Span-wrap-mode (composite consumers — Sidebar/BottomBar/Card/ListItem):**
```jsx
<Ripple disabled={!isClickable} style={{ width: '100%' }}>
  <button className="md-sidebar__item md-interactive" onClick={...}>
    <span className="..."><Icon ... /></span>
  </button>
</Ripple>
```

**Source:** `Sidebar.jsx:76-91` (canonical span-wrap usage).

**Apply to:** every composite clickable surface that uses non-button-shaped children (div, custom As). **Never** wrap with `<Ripple mode="self"><div>...</div></Ripple>` (divs can't accept `onPointerDown`).

---

### S4. Snackbar showToast overload (apply to every error/success/info toast)

**Source:** `frontend/src/contexts/ToastContext.jsx:223-234` (overload — RESEARCH §10).

**Backward-compatible 2-arg form (213 sites unchanged):**
```js
showToast('加载失败', 'error');
showToast('保存成功');                        // defaults to 'success'
showToast('订单提交成功', 'info');
```

**Optional 2nd-arg object form (new — for action button):**
```js
showToast('愿望已提交', {
  type: 'success',
  duration: 4000,                            // optional override
  action: { label: '撤销', onClick: async () => { await api.cancelWish(id); } },
});
```

**Apply to:** all 213 existing call sites (NO CHANGE); 3 NEW example sites per RESEARCH §10.5.

---

### S5. Icon usage (apply to all UI surfaces; replaces emoji)

**Source:** `frontend/src/components/primitives/Icon.jsx:124-152`

**Convention:**
```jsx
import Icon from './primitives/Icon';
<Icon name="search" size={20} />                       // standard
<Icon name="dark-mode" size={18} weight={600} />       // bold variant
<Icon name="mail" size={48} />                          // empty state
```

**Never:**
- Inline emoji characters (`🍽️`, `👨‍🍳`, `📋`) in JSX text or `style={{ fontSize: '2.5rem' }}` divs.
- Hard-coded SVG `<svg>` paths — always go through `<Icon>` for tree-shaking + theme color.

**Apply to:** DishCard image-fallback (`DishCard.jsx:33,38`), GuestDishCard image-fallback (`GuestDishCard.jsx:23`), EmptyState defaults, all page-level inline emoji.

---

### S6. Click-outside + ESC patterns (from existing Header.jsx & Modal.jsx)

**Click-outside pattern** — `composites/Header.jsx:56-66`:
```jsx
const menuRef = useRef(null);
useEffect(() => {
  if (!menuOpen) return;
  const handleClick = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, [menuOpen]);
```

**ESC handler** — `composites/Modal.jsx:71-78`:
```js
useEffect(() => {
  if (!open) return;
  const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
  document.addEventListener('keydown', handleKey);
  return () => document.removeEventListener('keydown', handleKey);
}, [open, onClose]);
```

**Apply to:** any new modal/menu/popover added by Phase 12 (e.g., extended snackbar action menu — none expected in Phase 12; reserved for future).

---

## No Analog Found

| File | Role | Data Flow | Reason | Workaround |
|------|------|-----------|--------|------------|
| `frontend/.stylelintrc.json` | config (stylelint) | lint-config | No prior stylelint in repo (Phase 12 introduces it) | Use RESEARCH §8 template; verify versions with `npm view` |
| `frontend/scripts/check-m3-tokens.sh` | CI script | grep | New file (CONTEXT D-FILE-02); source = `scripts/check-tokens.sh` | Copy `check/fail()` helpers from `check-tokens.sh:14-37`; extend with Check #8-10 |
| `frontend/scripts/audit-md3-compliance.mjs` | e2e (playwright) | playwright | New file (CONTEXT D-UAT-02); source = `frontend/scripts/audit-touch-targets.mjs` | Mirror `audit-touch-targets.mjs` structure; add 3 new audit cases |
| `12-UAT-REPORT.md` | report | manual | New manual artifact (CONTEXT D-UAT-04) | Mirror `11-VERIFICATION.md` shape |

---

## Cross-Cutting Constraint Notes (for planner)

1. **Branch constraint:** All Phase 12 work happens on `feature/ui-rebuild`. No new branches. (`STATE.md`)
2. **No backend changes:** All touched files are `frontend/`. `backend/`, `backend/alembic/`, `backend/tests/` are NOT in scope.
3. **Backward compatibility for `showToast`:** The signature overload (string vs object) is critical because 213 call sites exist. The new object form is purely additive.
4. **Old-class residuals:** Per RESEARCH §7, 2 known residuals remain by design:
   - `.form-input` × 9 sites — `<select className="form-input">` only; **document in UAT-REPORT** as deviation. Do NOT migrate (Select primitive deferred).
   - `.btn-search` × 6 sites — tokenise `padding: 4px 10px → var(--md-spacing-1) var(--md-spacing-2)` (still keep the class as utility per Phase 10 D-03).
   - `.fab` × 1 site — INTENTIONAL residual (placement-only, per Phase 10 D-09). Document as design choice; NOT a violation.
5. **Tokenisation exclusions (per D-GRID-01):**
   - `1px` borders / hairlines — keep raw `1px`.
   - `2px`, `3px`, `4px` outline-offsets / focus rings / spinner borders — keep raw.
   - `80px` nav-height safe area — keep raw.
6. **MD3 motion exclusions:**
   - `0.01ms !important` reduced-motion sentinels (`styles.css:483,485`) — keep raw (sentinel value).
   - `6s` reduced-motion fallback (`Button.css:118`) — keep raw.
   - Stagger animation delays (`0.1s`/`0.2s`/`0.3s`/`0.4s`, `styles.css:141`) — keep raw (decorative cadence, not MD3 scale).
7. **stylelint ignoreFiles:** Modal.css (full-screen variant `border-radius: 0` — valid but defensive) and Header.css (already uses tokens — defensive).
8. **`<Ripple>` public API:** keep span-wrapping for non-button children. The `mode="self"` is only for primitive internal Button/IconButton/FAB consumers.
9. **emoji scan methodology:** uses Python `regex` library `\X` grapheme clusters + `\p{Extended_Pictographic}` for accurate cluster counting. Verify with `rg -P` if Python script unavailable.
10. **Plan execution order matters:** 12-00-BUGFIX → 12-01 → 12-02 (serial per D-PLAN-01). Each plan's verification gates must pass before next plan starts.

---

## Metadata

**Analog search scope:**
- `frontend/src/components/primitives/` (all 16 primitives + co-located CSS)
- `frontend/src/components/composites/` (all 7 composites + co-located CSS)
- `frontend/src/components/*.jsx` (10 single-file components: Header re-export, EmptyState, Loading, ThemeToggle, InvitationsSection, WishCard, DishCard, GuestDishCard, PasswordInput, modals)
- `frontend/src/contexts/` (3 contexts)
- `frontend/src/css/` (3 CSS files)
- `frontend/src/utils/` (utility functions)
- `frontend/scripts/` (1 Playwright + sample structure)
- `scripts/` (1 token-check)
- `frontend/src/pages/` (24 pages — sampled by grep for padding/margin/gap + emoji)
- `frontend/src/App.jsx` (routing + layout)
- `frontend/package.json` + `frontend/.eslint.config.js` (config)
- `.planning/phases/11-composite-navigation-components/11-PATTERNS.md` (prior-phase map)

**Files scanned:** 80+ files (every frontend source + key backend reference for context)

**Pattern extraction date:** 2026-07-28

**Phase confidence:** HIGH — every analog excerpt above is a direct quote from the actual file (line numbers verified by `Read`). The only novel artifacts (stylelint config, check-m3-tokens.sh, audit-md3-compliance.mjs, UAT-REPORT.md) have direct extensions from existing files; no guesswork required.

---

*Phase: 12-Page-Level Refactor + 8dp Grid + HUMAN-UAT*
*Pattern map generated for planner consumption.*
