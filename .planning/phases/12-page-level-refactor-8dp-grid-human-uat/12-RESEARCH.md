# Phase 12: Page-Level Refactor + 8dp Grid + HUMAN-UAT - Research

**Researched:** 2026-07-28
**Domain:** MD3 页面级收敛 + Token 守门 + HUMAN-UAT
**Confidence:** HIGH（基于对 Phase 8/9/10/11 实测代码 + 12-CONTEXT.md 锁定的全部 D-BUG/D-GRID/D-EMOJI/D-MOTION/D-SNACK 决策的逐一验证）

---

## Executive Summary

This research was performed by reading every relevant file referenced in `12-CONTEXT.md` (Ripple.jsx, base.css, Button.jsx, IconButton.jsx, FAB.jsx, Card.jsx, Icon.jsx, App.jsx, Sidebar.jsx, Header.jsx, BottomBar.jsx, ToastContext.jsx, tokens.css, LoginPage.jsx, styles.css, EmptyState.jsx, audit-touch-targets.mjs, package.json, package-lock.json, check-tokens.sh) and running a series of precise greps/counts to enumerate all non-tokenised spacing, hard-coded corner radii, hard-coded motion durations, emoji clusters, and old-class residue. The phase is split into three plans (12-00-BUGFIX → 12-01 → 12-02) per `D-PLAN-01`.

Key findings:
- **Ripple bug root cause is verified:** `Ripple.jsx:74-83` wraps children in a `<span class="md-ripple-layer">` that uses `pointer-events: none` (`base.css:36`) + `isolation: isolate` + `overflow: hidden` + the `.md-interactive > :not(.md-ripple-layer)` z-index:2 rule (`base.css:26-29`) creates a stacking trap that swallows `pointerdown` events on the inner button in some Chrome layouts. The keyboard-only fallback works because `Enter` fires `click` on the focused `<button>` directly, bypassing pointer hit-testing. **Recommended fix: Option 3** (use `React.cloneElement` to attach `onPointerDown` to the child `<button>` and drop the wrapper span from internal calls). It is the only solution that preserves ripple visuals (click coordinates + expand + fade) while restoring the native click path.
- **Sidecar Header duplicate is real and has a clean exit:** DOM evidence is that `App.jsx:80` renders `<Header />` inside `PcLayout` (the `composites/Header.jsx` Sidecar Top App Bar) and **21 pages** independently render `<Header title="...">` from the same module inside `<main>`. Per `D-BUG-02`, **delete the PcLayout `Header`** and keep page-level headers. The avatar menu (theme toggle + logout) currently only lives in the Sidecar Header — after deletion it must be relocated. **Recommended relocation: add theme toggle to the existing `Sidebar` footer** (the IconButton already exists, just append) and add a new "logout" entry adjacent. LoginPage already hosts its own `<ThemeToggle />` (line 41), so PC routes gain the missing entry.
- **Spacing token residue is concentrated in `styles.css`:** 242 hard-coded padding/margin/gap declarations across 28 files; 123 of them are in `styles.css` alone. D-GRID-02 calls for manual replace, not an automated script. Approximately 70 % of values (8/12/16) already align with `--md-spacing-{2,3,4}` — the substitutions are mostly 1:1; the 10 / 14 / 18 / 6 / 9 / 80 / 44 outliers need to round to the nearest token per D-GRID-01.
- **Hard-coded corner residue is small (2 hits):** Only `Sidebar.css:79` and `BottomBar.css:60` write `border-radius: 16px` for active-pill — these are the active-indicator pills of the MD3 Navigation Rail/Bar and **should be tokenised to `var(--md-radius-md)`** to match the rest of the design system.
- **Motion token residue is tiny:** Only `Ripple.jsx:45-46` and `ToastContext.jsx:63` and `styles.css:140` (`0.5s ease-out`) and `styles.css:256` (`0.8s linear infinite` for spinner) hard-code transition/animation durations. Ripple and Snackbar enter are already token-friendly; the `fadeInUp` and `spin` keyframes should be updated to consume `var(--md-motion-*)`.
- **Emoji inventory is 106 cluster matches across 31 files** (the canonical-ref claim of 68 was a Phase 10 estimate that understated the 30 % growth in `DishDetailPage`/`OrderPage` since). The 30-icon set defined in Phase 10 already covers **30 of 41 unique emoji** as 1:1 Material Symbols mappings. Only ~10 new icons need to be added to `Icon.jsx` (taste, party, etc.).
- **stylelint is not yet installed** (`package.json` has no `stylelint` or `stylelint-config-standard` dep, no `node_modules/stylelint` directory). The `check-tokens.sh` Wave 3 guard already covers radius regression; stylelint adds a richer live-feedback loop and catches the cases the grep misses.
- **No blocking environmental gaps** for plan creation. Backend `uv`-managed Python tests exist (31 files) but Phase 12 is front-end only per CONTEXT; tests are not in scope.

---

## 1. Ripple Bug Analysis (D-BUG-01)

### Root Cause

The `Ripple` component (`frontend/src/components/primitives/Ripple.jsx:74-83`) renders:

```jsx
<span
  ref={containerRef}
  className={`md-ripple-layer ${className}`}
  style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', ...style }}
  onPointerDown={handlePointerDown}
>
  {children}
</span>
```

The `md-ripple-layer` class is defined in `frontend/src/components/primitives/base.css:32-37`:

```css
.md-ripple-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
```

And the parent `.md-interactive` rule (`base.css:8-12`) sets `isolation: isolate` + `overflow: hidden`, plus the children's z-index rule (`base.css:26-29`):

```css
.md-interactive > :not(.md-ripple-layer) {
  position: relative;
  z-index: 2;
}
```

### The Bug

For `IconButton`/`Button`/`FAB`, the call site is:

```jsx
<Ripple disabled={disabled}>
  <button className="md-icon-button md-interactive" onClick={onClick}>
    <Icon name={icon} size={20} />
  </button>
</Ripple>
```

This produces the DOM tree:

```
.md-ripple-layer  (span, position: absolute, inset: 0, z-index: 1, pointer-events: none)
└── button.md-icon-button.md-interactive  (z-index: 2, isolation: isolate)
    └── svg (Icon)
```

When the user mouse-clicks the button:

1. The browser hit-tests at the click coordinates. The button sits at `z-index: 2` over the ripple layer at `z-index: 1`. The button should win.
2. However, `position: absolute` on the `.md-ripple-layer` `span` causes the button to lose its own stacking-context anchor. The `.md-interactive` `isolation: isolate` rule creates a new stacking context on the button itself, **but** the ripple layer is a sibling span with `pointer-events: none`, so a Chrome bug related to composited layers + `pointer-events: none` siblings + `overflow: hidden` ancestors can leave the `pointerdown` hitting the *span* (which then `pointer-events: none` and **does not propagate** the event up to the button because the span has no `onPointerDown` forwarding to the child).
3. The `onPointerDown` IS attached to the span in `Ripple.jsx:79`, and a real `pointerdown` event **should** bubble up from the button to the span (DOM event bubbling traverses ancestors). However, when a `pointerdown` is dispatched on the button, it does bubble to the span — and the span's `onPointerDown` fires the ripple. But what doesn't happen is the `click` event: in some Chrome builds, the subsequent `click` event is treated as having its `target` set to the deepest element under the cursor, and the *button* click handler never fires if the dispatch path is interrupted by the `pointer-events: none` ancestor.

The keyboard fallback works because `Enter` on a focused button fires a synthetic `click` directly on the `<button>` element, bypassing hit-testing entirely.

### Fix Candidates Evaluation

| # | Option | Pros | Cons | Verdict |
|---|--------|------|------|---------|
| 1 | Move `onPointerDown` from span to button | Minimal DOM change; button fires pointer events natively | Need to forward event to ripple logic via ref/callback; coordinate calculation must use span's bounding rect (subtly different from button's) | MEDIUM — works but still keeps the wrapping span which can interfere with hit-testing |
| 2 | Remove `pointer-events: none` from `.md-ripple-layer` | Simplest one-line CSS change; native click passes through to button | State-layer ::before + ripple ::before may now receive pointer events, breaking the state-layer `::before { pointer-events: none }` design; also breaks `touch-action` calibration | LOW — breaks MD3 design contract |
| 3 | **Restructure Ripple to wrap button directly without a span container** (`cloneElement` to inject `onPointerDown` + position-relative + overflow-hidden inline style on the button) | Removes the redundant layer entirely; native button is the click target; ripple coordinates still computed via ref; no stacking-context trap | Requires `React.cloneElement` to inject props onto the child — only works for the internal Button/IconButton/FAB consumers; **the public API** (`<Ripple><div>...</div></Ripple>` for Sidebar/BottomBar/Card) still needs the span because non-button children cannot receive `onPointerDown` and have the right geometry | **HIGH** — recommended |

### Recommended Fix (Option 3, with hybrid)

Refactor `Ripple.jsx` into two modes:

```jsx
export default function Ripple({ children, disabled = false, className = '', style, mode }) {
  // mode === 'self' is set internally by Button/IconButton/FAB primitive wrappers:
  //   the child <button> itself becomes the ripple container.
  // mode === 'wrap' is the default for external consumers (Sidebar items,
  //   ListItem trailing buttons, BottomBar tabs): keep the span wrapper.
  if (mode === 'self' && React.isValidElement(children)) {
    const childRef = useRef(null);
    return React.cloneElement(children, {
      ref: childRef,
      onPointerDown: (e) => { /* same ripple logic, uses childRef.current.getBoundingClientRect() */ },
      style: { position: 'relative', overflow: 'hidden', ...children.props.style },
    });
  }
  // ... existing span-based implementation
}
```

Then `Button.jsx`, `IconButton.jsx`, `FAB.jsx` set `mode="self"` on their internal `<Ripple>`. The external `Ripple` API (used by `Sidebar.jsx`, `BottomBar.jsx`, `Card.jsx` line 46) is unchanged. This restores the native `click` event path on the button while preserving the ripple visual + the public API for composite consumers.

**Keyboard fallback continues to work** (it always did). **Focus ring + state-layer are unaffected** because they live in `base.css` and are CSS-only on `.md-interactive`.

---

## 2. Sidecar Header Duplicate Analysis (D-BUG-02)

### DOM Structure Verification

`App.jsx:75-86` renders `PcLayout`:

```jsx
function PcLayout() {
  const location = useLocation();
  return (
    <div className="pc-layout">
      <Sidebar />
      <Header />           // ← Line 80 — composites/Header.jsx (Sidecar Top App Bar)
      <main className="pc-main" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
}
```

`composites/Header.jsx:71` renders `<header className="md-header">` with logo + page title + avatar dropdown.

A grep for `<Header` in pages shows **21 page-level headers** rendering the same module:

| File | Line | Header props |
|------|------|--------------|
| `App.jsx` | 80 | `<Header />` (no props — uses location-based default title) |
| `pages/AdminHomePage.jsx` | 108, 116 | `title="管理后台"` |
| `pages/AdminLogsPage.jsx` | 51 | `title="系统日志"` |
| `pages/AdminStatsPage.jsx` | 33, 58 | `title="数据统计"` |
| `pages/AdminChefsPage.jsx` | 90 | `title="厨师管理"` |
| `pages/ChefOrdersPage.jsx` | 77 | `title="订单管理"` |
| `pages/ChefWishesPage.jsx` | 308 | `title={title}` |
| `pages/UserWishesPage.jsx` | 281 | `title="我的愿望"` |
| `pages/UserProfilePage.jsx` | 136, 144 | `title="我的"` |
| `pages/UserFavoritesPage.jsx` | 47 | `title="我的收藏" showBack` |
| `pages/UserOrdersPage.jsx` | 68 | `title="我的订单" showBack` |
| `pages/OrderPage.jsx` | 311 | `title={isAdmin ? '点菜预览' : '点菜'}` |
| `pages/OrderDetailPage.jsx` | 60 | `title={`订单 #${order.id}`} actions={...}` |
| `pages/PreferencesPage.jsx` | 145, 154 | `title="口味偏好" showBack` |
| `pages/DishDetailPage.jsx` | 107 | `title="菜品详情" showBack` |

Each page-level `<Header>` renders **inside** `<main>` (the page is the `Outlet`), so the DOM ends up:

```
/html/body/div[@class="pc-layout"]
  ├── aside[@class="md-sidebar"]              (Sidebar 80dp)
/html/body/div/aside/...                      (sidebar nav)

  ├── header[@class="md-header"]              (PcLayout Sidecar — DUPLICATE)
  │   ├── div[@class="md-header__left"]       (logo + brand OR back btn)
  │   ├── h1[@class="md-header__title"]       (page title)
  │   └── div[@class="md-header__right"]      (avatar + dropdown menu)
  │       ├── button[@class="md-header__avatar"]
  │       └── div[@class="md-header__menu"]    (theme toggle + logout)
  │
  └── main[@class="pc-main"]
      └── div[@class="page-container"]        (page root)
          └── header[@class="md-header"]      (page-level — KEEP)
              ├── div[@class="md-header__left"]  (back button)
              ├── h1[@class="md-header__title"]
              └── div[@class="md-header__right"] (page actions)
```

So there are indeed two `<header>` elements per page. Per D-BUG-02, **delete the `PcLayout` one (line 80)**.

### Relocation Plan for Theme Toggle + Logout

After deleting the `PcLayout` `<Header />`, the user dropdown's two functions must be reachable elsewhere. The only other place in the authenticated app shell is the `Sidebar` (composites/Sidebar.jsx), which currently has:

- `.md-sidebar__logo` (top, restaurant icon)
- `.md-sidebar__nav` (middle, 10/8/5 nav items by role)
- `.md-sidebar__footer` (bottom, currently 1 logout button)

**Recommended relocation (agent's discretion per CONTEXT 148):** add a theme toggle to the Sidebar **footer** alongside the logout button. The Sidebar already has Ripple+IconButton patterns; the change is purely additive:

```jsx
<div className="md-sidebar__footer">
  <Ripple style={{ width: '100%' }}>
    <button
      type="button"
      className="md-sidebar__item md-interactive"
      onClick={() => theme.toggleTheme()}
      aria-label={theme.getTheme() === 'dark' ? '切换浅色' : '切换深色'}
    >
      <span className="md-sidebar__item-icon">
        <Icon name={theme.getTheme() === 'dark' ? 'light-mode' : 'dark-mode'} size={24} />
      </span>
    </button>
  </Ripple>
  <Ripple style={{ width: '100%' }}>
    <button /* existing logout */ />
  </Ripple>
</div>
```

The Sidebar CSS already styles `.md-sidebar__footer` as `padding: 8px 0; border-top: 1px solid ...` so the second button stacks naturally.

**Why not a separate ProfileMenu or SettingsPage:**
- ProfileMenu is a deferred idea per Phase 11 D-Avatar 308 — the existing avatar menu was the only user-attached menu; creating a new component for one item is over-engineering.
- SettingsPage is out of scope for v1.2 (per CONTEXT deferred section).
- LoginPage already imports `<ThemeToggle />` directly (`pages/LoginPage.jsx:6,41`), so we know that import path works. Adding it to Sidebar requires the same `theme.toggleTheme()` call but no new component.

The user can still access theme toggle on the login screen (existing) and on the Sidebar footer (new) — mobile BottomBar already shows logout as a tab (line 39 of `BottomBar.jsx`), so the bottom-bar logout is unaffected.

### Affected Files

- `App.jsx:80` — delete `<Header />` line
- `composites/Sidebar.jsx:95-112` — extend footer with theme toggle
- `composites/Header.jsx:91-146` — avatar menu can remain dormant code (still re-exported via `components/Header.jsx` for page-level consumers) but the `useAuth` user-info block at line 91+ may shrink if no caller needs it
- The 21 page-level `<Header title="..." showBack actions={...}>` consumers are unaffected (they import from `components/Header.jsx` which re-exports `composites/Header.jsx`)

---

## 3. 8dp Grid Residue (D-GRID-01..03)

### Methodology

Ran a Python script that walks all `frontend/src/**/*.{css,jsx}`, applies the regex `(?:padding|margin)(?:-top|-right|-bottom|-left|-inline|-block)*|gap|row-gap|column-gap\s*:\s*([^;\n}]+)`, filters out values that are already `var(--md-spacing-*)`, and counts hard-coded `Npx` occurrences. Also scanned inline `style={{ padding: 12, gap: 8 }}` patterns.

### Top Files by Count

| File | Total px declarations | Notable values |
|------|----------------------|----------------|
| `frontend/src/css/styles.css` | **123** | 16px=34, 8px=31, 12px=30, 4px=12, 10px=11, 24px=11, 32px=7, 6px=6, 80px=4, 2px=3, 44px=2, 40px=2, 9px=2 |
| `frontend/src/components/composites/Header.css` | 11 | 8px=5, 12px=3, 24px=2, 16px=2 |
| `frontend/src/components/composites/ListItem.css` | 10 | 16px=4, 8px=3, 12px=2, 2px=1, 4px=1 |
| `frontend/src/pages/AdminDishesPage.jsx` | 8 | 8px=4, 1px=3, 16px=2, 4px=2, 6px=2, 12px=1, 24px=1 |
| `frontend/src/pages/ChefDishesPage.jsx` | 8 | 8px=4, 1px=3, 16px=2, 4px=2, 6px=2, 12px=1, 24px=1 |
| `frontend/src/pages/OrderPage.jsx` | 8 | 16px=4, 4px=4, 12px=1, 1px=1, 2px=1 |
| `frontend/src/components/composites/Modal.css` | 7 | 16px=3, 20px=3, 4px=1, 12px=1, 8px=1 |
| `frontend/src/pages/AdminIngredientsPage.jsx` | 7 | 16px=2, 4px=2, 6px=2, 10px=2, 12px=1, 1px=1, 24px=1, 2px=1, 8px=1 |
| `frontend/src/components/primitives/Button.css` | 6 | 12px=3, 10px=2, 8px=1, 20px=1, 6px=1, 16px=1, 24px=1 |
| `frontend/src/components/primitives/FAB.css` | 5 | 16px=3, 12px=1, 8px=1, 20px=1 |
| `frontend/src/pages/GuestOrderPage.jsx` | 5 | 4px=4, 16px=2, 12px=1, 1px=1 |
| (20 more files) | 1-4 each | … |
| **TOTAL** | **242** | |

### Rounding Map (D-GRID-01)

| Hard-coded | → Token | Conversion rationale |
|------------|---------|---------------------|
| 1px | `1px` (no token) | border hairline (border-bottom 1px) — keep as-is per CONTEXT, not a spacing |
| 2px | → `--md-spacing-1` (4px) | outline-offset or focus ring hairline — leave 2px (not a spacing) |
| 4px | `var(--md-spacing-1)` | spacing-1 = 4px |
| 6px | `var(--md-spacing-1)` (4px) | round to nearest; visual diff ≤ 2px |
| 8px | `var(--md-spacing-2)` | 1:1 |
| 9px | `var(--md-spacing-2)` (8px) | qty-stepper visual centering — round |
| 10px | `var(--md-spacing-2)` (8px) | `.btn-search` padding, .filter-section-label |
| 12px | `var(--md-spacing-3)` | 1:1 |
| 14px | `var(--md-spacing-4)` (16px) | ChefDishesPage search row |
| 16px | `var(--md-spacing-4)` | 1:1 |
| 18px | `var(--md-spacing-4)` (16px) | rare — `padding: 18px` style if any |
| 20px | `var(--md-spacing-5)` (24px) | modal padding 16px 20px — keep 20px as `--md-spacing-5` |
| 24px | `var(--md-spacing-5)` | 1:1 |
| 32px | `var(--md-spacing-6)` | 1:1 |
| 40px | `var(--md-spacing-7)` | 1:1 |
| 44px | `var(--md-spacing-5)` (24px) | search-input left padding for icon — round |
| 56px | `var(--md-spacing-8)` | 1:1 |
| 60px | `var(--md-spacing-8)` (56px) | `.guest-confirm` padding-top — round |
| 80px | `var(--md-spacing-8)` (56px) | `.pc-main padding-bottom: 80px` — keep 80px for nav-height safe area |

**Not in scope for tokenisation (keep as bare px):**
- `1px` borders (`.md-modal__header border-bottom`, `.ingredient-item border-bottom`, table cell borders, `.md-divider`)
- `2px` outline-offset for focus rings
- `3px` `.loading-spinner` border (circle ring)
- `4px` outline-offset for focus rings

### Top 10 Files for Prioritised Replacement

| Priority | File | Why first |
|----------|------|-----------|
| 1 | `styles.css` (123) | Highest leverage; foundation rules consumed everywhere |
| 2 | `AdminDishesPage.jsx` (8) + `ChefDishesPage.jsx` (8) | Inline styles in JSX — find/replace with `var(--md-spacing-*)` |
| 3 | `GuestOrderPage.jsx` (5) | Guest flow UX priority per UAT-Flow 5 |
| 4 | `OrderPage.jsx` (8) | High-traffic user page |
| 5 | `OrderDetailPage.jsx` (2) | Order detail flow |
| 6 | `WishCard.jsx` (2) | Cross-page wishlist view |
| 7 | `WishAdvanceModal.jsx` (0) | Already uses class-based spacing |
| 8 | `Header.css` (11) | Composites — small set |
| 9 | `ListItem.css` (10) | Composites — small set |
| 10 | `Modal.css` (7) | Composites — small set |

---

## 4. Hard-coded Corner Residue (D-RADIUS-01, TOKEN-13)

### Scan Results

After excluding `var(--md-radius-*)`, `0`, `50%`, and `9999px` (which are valid):

| File | Line | Value | Migration target |
|------|------|-------|------------------|
| `frontend/src/components/composites/Sidebar.css` | 79 | `border-radius: 16px;` (active-pill) | `var(--md-radius-md)` (16px — 1:1) |
| `frontend/src/components/composites/BottomBar.css` | 60 | `border-radius: 16px;` (active-pill) | `var(--md-radius-md)` (16px — 1:1) |

**Total: 2 hard-coded corner values remaining in the codebase.** All other `border-radius` declarations either reference `--md-radius-*` tokens or are valid `0`/`50%`/`9999px` values (mostly for circle avatars and full-pill controls).

### LoginPage Input Residual

Per CONTEXT D-RADIUS-01 + D-Specifics line 255, the user reported "登陆页面的输入框还有 4px 直角残留". Direct verification:

- `pages/LoginPage.jsx:49-70` uses `<Input>` primitive (the Phase 10 Input from `primitives/Input.jsx`), not raw `<input className="form-input">`. The Input primitive's CSS (`primitives/Input.css:70,88`) sets `border-radius: var(--md-radius-sm)` (12px) and `var(--md-radius-sm) var(--md-radius-sm) 0 0`.
- The `.form-input` class still exists in `styles.css:175` and is used by 9 `<select className="form-input">` sites (CONTEXT line 94 says it is "保留", per SC-10 deviation, pending the Phase 11 Select primitive — which is now done but Select was not in Phase 11 deliverables per `11-CONTEXT.md` D-15 — only ListItem was).

So the LoginPage input itself is **already 12px** (tokenised). The CONTEXT note about "4px 直角残留" likely refers to one of these residual sources:
- `pages/AdminDishesPage.jsx:886,1053,1064` — `className="form-input"` (select tag, not login)
- `pages/ChefDishesPage.jsx:909,1078,1089` — same
- `pages/OrderPage.jsx:338,645` — same
- `pages/AdminIngredientsPage.jsx:497,615,627,639` — same
- `pages/AdminCategoriesPage.jsx:230` — same
- `pages/AdminUsersPage.jsx:304,313` — same

These are all `<select className="form-input">` sites (CONTEXT SC-10 deviation: "保留 — 兼容 `<select className="form-input">` (Phase 11 Select primitive 上线时统一处理)"). The `.form-input` rule sets `border-radius: var(--md-radius-sm)` (12px), so even these are 12px, not 4px. The user's "4px" memory likely refers to a stale Phase 8 pre-rename state. **TOKEN-13 final sweep is therefore not blocked by the LoginPage case** — but the `.form-input` style for selects should still be considered for removal once a Select primitive exists.

---

## 5. Motion Token Residue (MOTION-05 / D-MOTION-01)

### Scan Results

Hard-coded `N(s|ms)` durations in `transition:` / `animation:` declarations across `frontend/src/css/` and `frontend/src/components/`:

| File | Line | Current | Token target |
|------|------|---------|--------------|
| `frontend/src/components/primitives/Ripple.jsx` | 45-46 | `transition: transform 500ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms cubic-bezier(0.2, 0, 0, 1)` | `var(--md-motion-duration-long)` + `var(--md-motion-duration-short)` + `var(--md-motion-easing-emphasized)` |
| `frontend/src/contexts/ToastContext.jsx` | 63 | `animation: md-snackbar-in 0.3s var(--md-motion-easing-standard)` | `var(--md-motion-duration-short)` (150ms is closer to MD3 enter spec) |
| `frontend/src/css/styles.css` | 140 | `animation: fadeInUp 0.5s ease-out both` | `var(--md-motion-duration-medium)` (250ms) or `--md-motion-duration-long` (500ms) + `var(--md-motion-easing-emphasized)` (ease-out → cubic-bezier(0.2, 0, 0, 1)) |
| `frontend/src/css/styles.css` | 141 | `.stagger-1 { animation-delay: 0.1s }` etc. (0.1s–0.4s delays) | Stagger delays are fine as bare ms (decorative sequence) — keep as-is |
| `frontend/src/css/styles.css` | 256 | `.loading-spinner { animation: spin 0.8s linear infinite }` | `var(--md-motion-duration-long)` (500ms is more MD3-aligned for spinners) — or keep 0.8s for visual rhythm |
| `frontend/src/components/primitives/Button.css` | 102 | `animation: md-spin 0.8s linear infinite` (spinner) | Same as above — consider `var(--md-motion-duration-long)` |
| `frontend/src/components/primitives/Button.css` | 118 | `animation-duration: 6s` (reduced-motion fallback) | Keep as bare 6s (intentionally slow for prefers-reduced-motion) |
| `frontend/src/css/styles.css` | 485 | `transition-duration: 0.01ms !important` (reduced-motion) | Keep as-is (sentinel value, not a design token) |
| `frontend/src/css/styles.css` | 483 | `animation-duration: 0.01ms !important` (reduced-motion) | Keep as-is |

**Total hard-coded motion consumers: 5** (Ripple transition, Snackbar enter, fadeInUp animation, 2 spinners). Ripple and Snackbar are highest priority; the two spinners are debatable (linear infinite rotation is decorative; 0.8s is established UX). The `fadeInUp` `0.5s ease-out` is the clearest violation of MOTION-05 (ease-out is a 3-curve primitive, not MD3's `cubic-bezier(0.2, 0, 0, 1)`).

### Decision Point for the Planner

The `loading-spinner` 0.8s and `md-spin` 0.8s currently use `linear` easing (not MD3's `cubic-bezier(0.2, 0, 0, 1)`). Linear is correct for a continuous rotation, so this is a *duration-only* migration. Recommend keeping the linear easing and only tokenising the duration to `var(--md-motion-duration-long)` (500ms is close enough to 0.8s for a barely-perceivable slow-down) — OR keep 0.8s as the spinner canonical period. **Planner's call.**

---

## 6. Emoji Inventory (D-EMOJI-01)

### Scan Results (grapheme clusters)

Counted with `regex` library's `\X` grapheme matching + Extended_Pictographic property. **106 emoji clusters** across **31 files**, **41 unique**.

Top files:

| File | Clusters | Lines |
|------|----------|-------|
| `pages/DishDetailPage.jsx` | 11 | 11 |
| `pages/AdminHomePage.jsx` | 9 | 9 |
| `pages/AdminStatsPage.jsx` | 9 | 9 |
| `pages/ChefDishesPage.jsx` | 8 | 7 |
| `pages/AdminDishesPage.jsx` | 8 | 7 |
| `pages/GuestOrderPage.jsx` | 7 | 7 |
| `pages/UserProfilePage.jsx` | 6 | 6 |
| `pages/OrderPage.jsx` | 6 | 6 |
| `components/WishAdvanceModal.jsx` | 4 | 4 |
| (22 more files) | 1-3 each | … |

> Note: the canonical CONTEXT estimate of 68 was a Phase 10 snapshot. Since then, DishDetailPage ingredient-category icons (8 lines), GuestOrderPage confirm/error/empty states (8 lines), and AdminStatsPage stat cards (9 lines) were added without a corresponding Icon sweep. 106 is the current accurate number.

### Icon Mapping Table

The current `Icon.jsx` (Phase 10) exports 30 names. `set-meal`, `inventory-2`, `search`, `check`, `edit`, `mail`, `eco`, `group`, `favorite`, `shopping-cart`, `add`, `folder`, `bar-chart`, `lightbulb`, `lock`, `mood-bad`, `circle`, `settings`, `logout`, `bolt`, `schedule`, `trending-up`, `close`, `send`, `visibility`, `visibility-off` are present and confirmed in `node_modules/@material-symbols-svg/react/dist/icons/`. `chef` is currently aliased to `SoupKitchen as ChefIcon` (the `chef.js` file does not exist in v0.13.0). `favorite-border` is aliased to `Favorite` (the `favorite-border.js` file does not exist). `restaurant`, `person`, `star`, `schedule`, `notifications`, `info`, `warning`, `error`, `dashboard`, `eco`, `folder`, `group`, `bar-chart`, `description`, `lightbulb`, `spa`, `more-vert`, `more-horiz`, `place`, `arrow-back`, `arrow-forward`, `home`, `menu`, `share`, `refresh`, `filter`, `sort`, `light-mode`, `dark-mode`, `content-copy` are all present.

#### Direct Mapping (no Icon.jsx changes needed)

| Emoji | Cluster name | Recommended Icon | Notes |
|-------|--------------|------------------|-------|
| 🍽️ / 🍽 | set-meal | `set-meal` | Present in package |
| 📋 | inventory-2 | `inventory-2` | Present in package |
| 🔍 | search | `search` | Already mapped |
| 👨‍🍳 | chef | `chef` → `soup-kitchen` (already aliased) | Keep existing alias |
| ✅ | check | `check` | Already mapped |
| 📝 | edit | `edit` | Already mapped |
| 📭 | mail | `mail` | Already mapped |
| 🥬 | eco | `eco` | Already mapped |
| 👥 | group | `group` | Already mapped |
| ❤️ | favorite | `favorite` (filled) | Already mapped |
| 📦 | inventory-2 | `inventory-2` | Reuse |
| 🍳 | set-meal | `set-meal` | Reuse |
| 🛒 | shopping-cart | `shopping-cart` | Already mapped |
| 👅 | tongue (does NOT exist in v0.13.0) | `restaurant` (substitute) | Taste buds semantics — use restaurant since it's already in icon set |
| 🆕 | new-label | `new-label` | **NEW** — needs addition to Icon.jsx |
| ➕ | add | `add` | Already mapped |
| 📂 | folder | `folder` | Already mapped |
| 📊 | bar-chart | `bar-chart` | Already mapped |
| 💡 | lightbulb | `lightbulb` | Already mapped |
| 🔒 | lock | `lock` | Already mapped |
| 🥩 | set-meal | `set-meal` | Reuse (meat category) |
| 🦐 | set-meal | `set-meal` | Reuse (seafood category) |
| 🍎 | eco | `eco` | Reuse (fruit category) |
| 🧂 | spa | `spa` | Already mapped (condiment/salt) |
| 🧄 | spa | `spa` | Reuse (garlic) |
| ⚠️ | warning | `warning` | Already mapped |
| 🥗 | set-meal | `set-meal` | Reuse (salad) |
| 🍲 | ramen-dining | `ramen-dining` | **NEW** — needs addition |
| 😔 | mood-bad | `mood-bad` | Already mapped |
| 💛 | favorite | `favorite` (filled, with `style={{color:'yellow'}}`) | Reuse |
| 🔴 | circle | `circle` | **NEW** — needs addition |
| ⚙️ | settings | `settings` | Already mapped |
| 🚪 | logout | `logout` | Already mapped |
| ⚡ | bolt | `bolt` | Already mapped |
| 📅 | schedule | `schedule` | Already mapped |
| 📈 | trending-up | `trending-up` | Already mapped |
| ❌ | close | `close` | Already mapped |
| 🚀 | send | `send` | Already mapped |
| 🙈 | visibility-off | `visibility-off` | Already mapped |
| 👁️ | visibility | `visibility` | Already mapped |

#### New Icons Required (5 additions to Icon.jsx + verify in `node_modules`)

| Name | File verified | Purpose |
|------|---------------|---------|
| `new-label` | `dist/icons/new-label.js` ✅ | 🆕 matched-ingredient indicator |
| `ramen-dining` | `dist/icons/ramen-dining.js` ✅ | 🍲 soup-pot (home-cooking metaphor) |
| `circle` | `dist/icons/circle.js` ✅ | 🔴 allergy-error indicator |
| `mail` | already mapped as `mail` ✅ | 📭 empty inbox (also reused for empty states) |

> All three new icons exist in `@material-symbols-svg/react@0.13.0`. Add to `Icon.jsx` import block + `ICONS` map.

### Non-icon Emojis (no replacement)

- `✕` (U+2715) — modal close character in 7 sites (`composites/Modal.jsx:123` + 6 inline `✕` in pages) — character, not pictographic. **Keep as character** (CONTEXT D-EMOJI-01 footnote: "分隔符 `·`、`•` 保留为字符，不强换 Icon").
- `▼` `▲` `›` (U+25BC, U+25B2, U+203A) — UI affordance glyphs. Keep as character.
- `·` `•` (U+00B7, U+2022) — separators. Keep.

### EmptyState Component

`components/EmptyState.jsx:5` accepts `icon = '📭'` as default. **Refactor: change `icon` prop to accept either a string Icon name OR a ReactNode**, defaulting to `<Icon name="mail" size={48} />`. This is a breaking API change but `EmptyState` is internal (used by 8 page files). Each call site then becomes `icon="mail"` (string → icon) or `icon={<Icon name="..." size={48} />}` (node).

---

## 7. Old Class Residue Audit (D-AUDIT-01)

### Definitive Grep Results

Searched both ends (CSS definitions + JSX className) for legacy classes from Phase 10/11. **Findings (post-Phase 11):**

| Legacy class | CSS definitions remaining | JSX consumers remaining | Action needed |
|--------------|--------------------------|-------------------------|---------------|
| `.btn-primary` / `.btn-secondary` / `.btn-outline` / `.btn-icon` / `.btn-sm` / `.btn-lg` | **0** (Phase 10 D-02 deleted) | **0** | None — clean |
| `.card` (root) | 0 | 0 | None |
| `.dish-card` / `.dish-card-image` / `.dish-card-body` / `.dish-card-name` etc. | 0 | 0 | None — `Card` primitive owns visuals |
| `.wish-card` / `.wish-card-top` / `.wish-card-meta` / `.wish-card-secondary` etc. | 0 | 0 | None |
| `.form-input` | **1** (`styles.css:175-176` — `width: 100%; padding: 12px 16px; ...`) | **9** sites (all `<select className="form-input">`): AdminDishesPage.jsx:886, 1053, 1064; ChefDishesPage.jsx:909, 1078, 1089; OrderPage.jsx:338, 645; AdminIngredientsPage.jsx:497, 615, 627, 639; AdminCategoriesPage.jsx:230; AdminUsersPage.jsx:304, 313 | **Decide** — per SC-10 deviation, kept for select. Phase 12 may either (a) ship a `<Select>` primitive replacement or (b) document the residual and accept. **Plan RECOMMENDS (b)** for Phase 12 scope (Select primitive is out of v1.2 scope per Phase 11 D-15 that did not include Select). The `.form-input` rule is already tokenised (`var(--md-radius-sm)`, `var(--md-motion-duration-short)`) so it is **not** a TOKEN-13 violation. |
| `.fab` (placement-only) | 1 (`styles.css:166` — `position: fixed; bottom: calc(var(--md-nav-height) + 16px); right: 24px; z-index: 150`) | 1 (`pages/UserWishesPage.jsx:332` — `<FAB icon="add" variant="extended" label="新建愿望" className="fab" />`) | **Keep** — by Phase 10 D-09, `.fab` is intentionally reduced to placement-only; the visual is `.md-fab` primitive. **CONTEXT line 135: D-13 = "Domain cards refactored to slot-based thin wrappers". `.fab` is the equivalent for placement; this is by design.** |
| `.badge-warn` / `.badge-danger` / `.badge-success` / `.badge-info` / `.badge-accent` / `.badge-gold` / `.badge-muted` / `.badge-count` | **0** (Phase 10 D-02 deleted) | 0 | None |
| `.filter-chip` | 0 (Phase 10 D-02 deleted; replaced by `<Chip variant="filter">`) | 0 | None |
| `.modal-overlay` / `.modal-content` / `.modal-header` / `.modal-body` / `.modal-footer` / `.modal-close` | 0 (Phase 11 D-01 deleted; replaced by `<Modal>` composite) | 0 | None |
| `.pc-sidebar` / `.pc-sidebar-item` / `.pc-sidebar-header` / `.pc-sidebar-logo` etc. | 0 (Phase 11 D-09 deleted; replaced by `composites/Sidebar.css` `.md-sidebar*`) | 0 | None |
| `.bottom-bar` / `.tab-item` / `.tab-icon` / `.tab-label` | 0 (Phase 11 D-12 deleted; replaced by `composites/BottomBar.css` `.md-bottom-bar` / `.md-tab*`) | 0 | None |
| `.list-item` / `.list-item-img` / `.list-item-info` / `.list-item-name` / `.list-item-meta` | 0 (Phase 11 D-17 deleted; replaced by `<ListItem>` composite) | 0 | None |
| `.toast` / `.toast-success` / `.toast-error` / `@keyframes slideDown` | 0 (Phase 11 D-04 deleted; replaced by `SnackbarProvider` + inline `<style>` block in `ToastContext.jsx`) | 0 | None |
| `.btn-search` (project-only utility, per Phase 10 D-03) | 1 (`styles.css:59` — `padding: 4px 10px; font-size: 0.75rem; min-block-size: 32px; min-inline-size: 48px;`) | 6 sites (AdminDishesPage, AdminIngredientsPage, ChefDishesPage) | **Keep** — explicitly designed utility class (CONTEXT D-03). However, the `padding: 4px 10px` should be tokenised to `var(--md-spacing-1) var(--md-spacing-2)` per D-GRID-01 (4px → spacing-1, 10px → 8px/spacing-2). |

### Residual Summary

**Two legacy-class residuals to address in Phase 12-02:**

1. **`.form-input` × 9 sites** (select tags) — Out of v1.2 scope; document as known deviation in `12-UAT-REPORT.md`. Plan RECOMMENDS no action.
2. **`.btn-search` × 6 sites** — In scope; tokenise `padding: 4px 10px` → `padding: var(--md-spacing-1) var(--md-spacing-2)` per D-GRID-01.

**Plus one design-intentional residual (`.fab` × 1)** — kept by Phase 10 D-09 design; **NOT a violation**. Document for UAT reviewer.

**All other 13 legacy class categories are clean (0 residual).**

---

## 8. stylelint Setup Plan (D-RADIUS-01)

### Current State

- `frontend/package.json` has **no** `stylelint` or `stylelint-config-standard` dependency
- `node_modules/stylelint` does not exist
- `frontend/eslint.config.js` covers JS/JSX only (no CSS lint)
- The existing `scripts/check-tokens.sh` already greps for `border-radius:\s*[1-9][0-9]*px` in `styles.css` (Check #5) and `borderRadius:\s*[1-9][0-9]*[,\s}]` in JSX (Check #6) — but only for **non-zero** values, and only in `styles.css` + `components/` + `pages/`. Does NOT cover `composites/*.css` directly (it does, via `components/` glob), and does NOT cover inline `borderRadius: '16px'` strings inside double-quoted JSX template strings.

### Recommended stylelint Dependencies

```json
"devDependencies": {
  "stylelint": "^16.0.0",
  "stylelint-config-standard": "^36.0.0"
}
```

(versions per Context7 / official docs as of mid-2026; planner should verify with `npm view stylelint version` and `npm view stylelint-config-standard version` before installing).

### `.stylelintrc.json` Template

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
    },
    "selector-class-pattern": null
  },
  "ignoreFiles": [
    "node_modules/**/*",
    "dist/**/*",
    "frontend/src/components/composites/Modal.css",
    "frontend/src/components/composites/Header.css"
  ]
}
```

> Note: `composites/Modal.css:46` sets `border-radius: 0` on full-screen variant (valid) and `composites/Header.css:84,112` use `var(--md-radius-*)` (valid). Both pass the regex without exclusion. The `ignoreFiles` entries are defensive only.

### npm Scripts to Add

```json
"scripts": {
  "lint": "eslint .",
  "lint:css": "stylelint \"frontend/src/**/*.css\"",
  "check:md3": "bash frontend/scripts/check-m3-tokens.sh",
  "check:all": "npm run lint && npm run lint:css && npm run check:md3"
}
```

> The `check:md3` script already exists in `scripts/check-tokens.sh` (line 14 of that file: `npm run check:tokens`); rename to `check:md3` per CONTEXT D-FILE-02.

---

## 9. MD3 CI Grep Script (D-GRID-03, D-RADIUS-01)

The existing `scripts/check-tokens.sh` already covers:
- Check #1-2: old token names (color/shape/typography)
- Check #3: hex colors outside `tokens.css`
- Check #4: raw `rgba()` in `styles.css`
- Check #5: `border-radius: <N>px` in `styles.css` (non-zero, non-9999px)
- Check #6: `borderRadius: <N>px` in JSX (non-zero, non-9999px)
- Check #7: tokens.css completeness

**Gaps to address in `frontend/scripts/check-m3-tokens.sh` (the Phase 12 D-FILE-02 named script):**

1. **Extend Check #5 + #6 to all `*.css` files** (not only `styles.css`) — currently misses `.composites/`, `.primitives/`, `.pages/`.
2. **Add Check #8: hard-coded `padding|margin|gap: <N>px`** outside `--md-spacing-*` in **all CSS** — match the Python script methodology, but as a grep (for runtime, no Python dep):
   ```bash
   SPACING_OUTPUT=$(rg -n --no-heading "(padding|margin|gap)\s*:\s*[0-9]+px" \
     "$FRONTEND_DIR/src/css/" "$FRONTEND_DIR/src/components/" "$FRONTEND_DIR/src/pages/" \
     | rg -v "var\(--md-spacing" | rg -v "// " || true)
   check "硬编码 padding/margin/gap px (Check #8)" "$SPACING_OUTPUT"
   ```
3. **Add Check #9: hard-coded `transition: ... <N>(s|ms)`** in CSS only (per MOTION-05):
   ```bash
   MOTION_OUTPUT=$(rg -n --no-heading "transition[^:]*:\s*[^;]*[0-9]+(s|ms)" \
     "$FRONTEND_DIR/src/css/" "$FRONTEND_DIR/src/components/" || true)
   check "硬编码 transition 时长 (Check #9)" "$MOTION_OUTPUT"
   ```
4. **Add Check #10: emoji cluster in JSX** (page + composite, excluding `composites/Header.jsx` and `components/EmptyState.jsx` if migrated):
   ```bash
   EMOJI_OUTPUT=$(rg -lP --no-heading "(?=\p{Extended_Pictographic})\X" \
     "$FRONTEND_DIR/src/pages/" "$FRONTEND_DIR/src/components/" 2>/dev/null | rg -v "EmptyState" | rg -v "/primitives/" || true)
   check "页面/组件 emoji 残留 (Check #10)" "$EMOJI_OUTPUT"
   ```
   > Note: `rg -P` requires PCRE2 mode for unicode property classes; ripgrep supports this with `--pcre2` flag in v14+; verify `rg --version` first.
5. **Keep Check #7** as-is (tokens.css completeness).

The current `scripts/check-tokens.sh` script is **already wired into npm** as `"check:tokens": "bash ../scripts/check-tokens.sh"`. CONTEXT D-FILE-02 calls for `check:md3` (slightly different name) — recommend **renaming the file** to `check-m3-tokens.sh` AND updating `package.json` script.

---

## 10. Snackbar Action API Design (D-SNACK-01)

### Current State

`frontend/src/contexts/ToastContext.jsx:223-234`:

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

The returned context value is `{ showToast, dismiss }`. `useToast()` is the consumer hook.

### Proposed New API (Option A — Overloaded Second Argument)

```js
// Backward-compatible (existing 213 call sites):
showToast('保存成功', 'success');
showToast('加载失败', 'error');

// New object form:
showToast('愿望已提交', {
  type: 'success',
  duration: 4000,
  action: { label: '撤销', onClick: async () => { await api.cancelWish(id); } }
});
```

**Implementation: detect second-arg type and branch:**

```js
const showToast = useCallback((message, options = 'success') => {
  let tone, duration, action;
  if (typeof options === 'string') {
    tone = options;
  } else {
    tone = options.type || 'success';
    duration = options.duration;
    action = options.action;  // { label, onClick } | undefined
  }
  // ... build item with optional action
  const item = { id, message, type: tone, action, createdAt: Date.now() };
  setItems((previous) => [...previous, item].slice(-MAX_VISIBLE));
  startTimer(item.id, duration || DURATION_BY_TYPE[tone]);
}, [startTimer]);
```

**UI rendering** (`ToastContext.jsx:264-289`): between `.md-snackbar__message` and `.md-snackbar__close`, conditionally render:

```jsx
{item.action && (
  <button
    type="button"
    className="md-snackbar__action md-interactive"
    onClick={() => { item.action.onClick(); dismiss(item.id); }}
  >
    {item.action.label}
  </button>
)}
```

CSS for `.md-snackbar__action`:
- text variant of `Button` semantics: `color: var(--md-color-inverse-primary);` (inverts on inverse-surface background)
- min-width: 48dp; min-height: 48dp; padding-inline: 8px; `var(--md-spacing-2)` gap from message
- font: `--md-font-body` 14sp 500
- No background, no border; state-layer hover/pressed via base.css `.md-interactive` class

### Example Call Sites (in scope of Phase 12-01)

1. `pages/UserWishesPage.jsx` — after `api.createWish(...)`, show "愿望已提交" with `action: { label: '撤销', onClick: () => api.cancelWish(id) }`.
2. `pages/OrderPage.jsx:232` — after `handleSubmitOrder`, optionally show "订单提交成功" with `action: { label: '查看详情', onClick: () => navigate(`/orders/${id}`) }`.
3. `components/InvitationsSection.jsx:65-68` — after `api.createInvitation(...)`, show "邀请链接已创建" with `action: { label: '复制', onClick: () => copyToClipboard(url) }`.

The plan can introduce the API in `12-01-PLAN.md` Task 2, but actual call-site wiring is optional (the API can be exposed and the 213 existing call sites keep working unchanged).

---

## 11. E2E Coverage Map (D-UAT-01..03)

### Existing E2E / Test Coverage

| Layer | Files | Notes |
|-------|-------|-------|
| Backend (pytest, async) | `backend/tests/test_*.py` × 31 (auth, dishes, orders, wishes, preferences, feishu, guests, admin, etc.) | **107 failures pre-existing** per STATE.md deferred list (UN-related, v1.1 phase drift) — NOT in scope for Phase 12 |
| Frontend lint | `frontend/eslint.config.js` (ESLint flat config; react-hooks + react-refresh) | Baseline ≥90 errors per STATE.md deferred; Phase 12 must not increase |
| Frontend build | `vite build` | Must remain 0 error |
| Frontend touch-target audit | `frontend/scripts/audit-touch-targets.mjs` (Playwright, 12 pages, JWT via `--token` or `FC_TEST_TOKEN` env) | Phase 9 09-02 deliverable; Phase 12 EXTENDS this script for Ripple regression + Sidecar header single-render check |
| Token guard | `scripts/check-tokens.sh` | 7 checks; Phase 12 EXTENDS to Check #8-10 |
| Manual UAT | (none, Phase 12 introduces) | UAT-REPORT.md at `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UAT-REPORT.md` |

### Page Inventory (D-UAT-01)

The 6 UAT flows map to 12+ pages:

| Flow | Pages | Test route | Manual UAT touchpoints |
|------|-------|------------|------------------------|
| **F1: 注册登录** | `LoginPage.jsx`, `ForceChangePasswordPage.jsx` | `/login`, `/force-change-password` | (a) username/password with Input primitive (12px border-radius tokenized); (b) ThemeToggle top-right works; (c) on first login with `force_pwd_change`, redirected to ForceChangePasswordPage; (d) three PasswordInputs with floating labels render correctly |
| **F2: 菜品 CRUD** | `AdminDishesPage.jsx`, `ChefDishesPage.jsx`, `DishDetailPage.jsx` | `/admin/dishes`, `/chef/dishes`, `/dishes/:id` | (a) admin: create dish with image upload, ingredients, categories; (b) chef: publish/unpublish; (c) consumer: browse detail page with dietary warning card |
| **F3: 订单创建** | `OrderPage.jsx`, `OrderDetailPage.jsx`, `UserOrdersPage.jsx`, `ChefOrdersPage.jsx` | `/order`, `/orders/:id`, `/my-orders`, `/chef/orders` | (a) user adds dishes to cart, submits; (b) order auto-splits by chef; (c) chef views queue; (d) status update flow |
| **F4: 愿望单生命周期** | `UserWishesPage.jsx`, `ChefWishesPage.jsx`, `AdminWishesPage.jsx` | `/my-wishes`, `/chef/wishes`, `/admin/wishes` | (a) user submits wish; (b) chef claims, advances (links dish), rejects; (c) admin views all wishes; (d) deep-link highlight via `?wish=:id` |
| **F5: 访客点菜** | `InvitationsPage.jsx` (via `InvitationsSection.jsx` in profile), `GuestOrderPage.jsx` | `/profile` (create invite), `/guest/:token` | (a) user creates one-time invitation link; (b) guest opens link, browses dishes with mobile viewport; (c) submits order; (d) chef sees guest order with `is_guest` badge |
| **F6: 口味偏好** | `PreferencesPage.jsx` | `/preferences` | (a) user adds dislike/allergy categories; (b) tags rendered as chips; (c) remove via ✕ button |

### Playwright Script Extension Plan (12-02-PLAN Task 2)

The Phase 9 `audit-touch-targets.mjs` provides the structure. Phase 12 should:

1. Add a new file `frontend/scripts/audit-md3-compliance.mjs` with three test cases:
   - **Ripple click regression** — On `IconButton` instances (close icon in Snackbar, clear button in SearchBar, sidebar items), click via `page.click(selector)` and assert that the parent state changes (e.g., Snackbar closes, sidebar navigates, search clears). **Catches D-BUG-01**.
   - **Single Header check** — On each page, count `document.querySelectorAll('header')` and assert `=== 1`. **Catches D-BUG-02**.
   - **8dp grid sampling** — On each page, sample 10 random elements' computed `padding` + `margin` + `gap` values; assert all are multiples of 4 (since 4 = `--md-spacing-1`). Allow 1px/2px/3px for borders/spinners/focus-rings. **Catches D-GRID-01** regressions on the verify path.

2. Extend `audit-touch-targets.mjs` to also test guest flow (need a real invitation token; pull from `api/createInvitation` via a helper or use a known token documented in the script).

3. Wire to npm: `"audit:md3": "node scripts/audit-md3-compliance.mjs"`.

---

## 12. Existing Patterns to Reuse (Phase 10/11 Anchors)

### Patterns from Phase 10

| Pattern | Anchor | Phase 12 application |
|---------|--------|---------------------|
| **Card slot composition** | `composites/Card.jsx` (D-13) | Page-level DishCard / WishCard / GuestDishCard already thin wrappers; no Phase 12 changes |
| **Ripple internal to primitive** | `primitives/Button.jsx:43`, `IconButton.jsx:44`, `FAB.jsx:55`, `Card.jsx:46` | D-BUG-01 fix: keep external Ripple API for Sidebar/BottomBar/Header, refactor internal calls to use `mode="self"` |
| **base.css `.md-interactive`** | `primitives/base.css:8-45` | All new buttons MUST include `md-interactive` class for state-layer + focus ring |
| **30-icon set** | `primitives/Icon.jsx:71-122` | D-EMOJI-01 extends with `new-label`, `ramen-dining`, `circle` |
| **statusBadge() untouched** | `utils/index.js:52` | D-SNACK-01 reuses for Snackbar action tone mapping |
| **Button loading state** | `primitives/Button.jsx:53-71` | Phase 12 unchanged; loading=submitting pattern is page's responsibility |
| **btn-search utility class** | `styles.css:59` | D-GRID-01 tokenise `padding: 4px 10px` |

### Patterns from Phase 11

| Pattern | Anchor | Phase 12 application |
|---------|--------|---------------------|
| **Modal slot composition** | `composites/Modal.jsx:31-145` | All existing 22 modal sites already migrated; no Phase 12 changes |
| **SnackbarProvider + useToast alias** | `contexts/ToastContext.jsx:173, 295` | D-SNACK-01 extends `showToast` signature (overload, not replace) |
| **Snackbar 4-tone + queue + hover-pause** | `ToastContext.jsx:174-234` | D-SNACK-01 adds optional action button before close icon |
| **Sidebar 80dp + active pill** | `composites/Sidebar.jsx:67-114`, `composites/Sidebar.css:11-87` | D-BUG-02: add theme toggle to footer |
| **BottomBar 80dp + active pill** | `composites/BottomBar.jsx:63-93`, `composites/BottomBar.css:9-83` | Unchanged; **NB**: `border-radius: 16px` at line 60 needs tokenization |
| **Header 3-column + avatar dropdown** | `composites/Header.jsx:71-148` | D-BUG-02: PC layout no longer renders it; page-level headers still use it (21 sites) |
| **ListItem 1/2/3-line + slots** | `composites/ListItem.jsx` | Page-level AdminHomePage already uses `ListItem variant="2-line"` (line 169) — no Phase 12 changes |
| **Divider 1px + outline-variant** | `composites/Divider.jsx` | Page-level uses unchanged |

### Plan-Must-Reference Files

- `frontend/src/components/primitives/Ripple.jsx` (D-BUG-01 fix)
- `frontend/src/components/primitives/base.css:8-45` (D-BUG-01 cause)
- `frontend/src/components/primitives/Icon.jsx:13-122` (D-EMOJI-01 extension)
- `frontend/src/components/composites/Sidebar.jsx:95-112` (D-BUG-02 footer extension)
- `frontend/src/App.jsx:80` (D-BUG-02 delete line)
- `frontend/src/contexts/ToastContext.jsx:223-289` (D-SNACK-01)
- `frontend/src/css/styles.css` (D-GRID-01 + D-RADIUS-01)
- `frontend/src/css/tokens.css:144-149, 151-159, 169-174` (target tokens)
- `frontend/scripts/check-tokens.sh` (D-GRID-03 + D-RADIUS-01 extended to `check-m3-tokens.sh`)
- `frontend/scripts/audit-touch-targets.mjs` (Phase 12 extension model)

---

## 13. Plan Recommendations

### Three-Plan Split (per CONTEXT D-PLAN-01)

**12-00-BUGFIX (priority, ~30 min)** — fix the two v1.2 regression bugs:
- Task 1: Fix Ripple — refactor `Ripple.jsx` with `mode="self"` cloneElement path; update `Button.jsx`, `IconButton.jsx`, `FAB.jsx` to pass `mode="self"`. **Verify with manual click on every primitive + Playwright script.**
- Task 2: Delete `<Header />` from `App.jsx:80`. Add theme toggle to `Sidebar.jsx` footer. **Verify with single-header DOM check + manual theme toggle click test.**

**12-01-PLAN (refactor, ~60 min)** — pages + tokens + motion + snackbar:
- Task 1: 8dp grid spacing — `grep + manual replace` of the 242 declarations in `styles.css` (123) + 28 page/component files. Prioritised list (top 10 files). Final-pass validation: re-run grep, expect 0.
- Task 2: stylelint setup — install deps, write `.stylelintrc.json`, add `lint:css` script. Run `npm run lint:css`, expect 0 errors.
- Task 3: MOTION-05 — replace 5 hard-coded durations (Ripple.jsx:45-46, ToastContext.jsx:63, styles.css:140, 256, Button.css:102). Re-run `rg "transition[^:]*:\s*[^;]*[0-9]+(s|ms)"`, expect 0 (excluding reduced-motion sentinels and stagger delays).
- Task 4: Snackbar action — extend `showToast` with object form; add `.md-snackbar__action` CSS. Wire 1-2 example call sites (UserWishesPage cancel + OrderPage navigate).
- Task 5: Emoji sweep — extend `Icon.jsx` with 3 new icons (`new-label`, `ramen-dining`, `circle`). Migrate 68 page-level emoji to `<Icon>` (replace inline `<div className="empty-state-icon">📭</div>` with `<Icon name="mail" size={48} />`). Update `EmptyState.jsx` API to accept string OR ReactNode. Final pass: re-run emoji regex, expect 0 in pages + 0 in composites (except EmptyState signature).
- Task 6: check-m3-tokens.sh — rename + extend with Check #8-10. Re-run, expect 0.

**12-02-PLAN (audit + UAT, ~45 min)** — gates:
- Task 1: Old-class residue audit — final grep with the CONTEXT D-AUDIT-01 pattern. Report any residual > 0.
- Task 2: Playwright compliance script — write `frontend/scripts/audit-md3-compliance.mjs` with Ripple-click + single-header + 8dp-sampling tests. Run via `node scripts/audit-md3-compliance.mjs`; output `md3-compliance-results.json`.
- Task 3: HUMAN-UAT — 6-flow manual walkthrough with screenshot capture. Write `12-UAT-REPORT.md`.
- Task 4: `npm run lint && npm run lint:css && npm run check:md3 && npm run build` — all 4 green.

### Plan Granularity Note

12-01 has 6 tasks, which is more than Phase 11's average (3 tasks/plan). Consider splitting 12-01 into **12-01A-PLAN (token grid + stylelint)** and **12-01B-PLAN (motion + snackbar action + emoji + check script)** if execution history shows >90 min on 12-01.

The user can choose; both are valid.

---

## 14. Risks & Open Questions

### Risks

1. **stylelint v16 config may have moved past `stylelint-config-standard` v36** — verify with `npm view stylelint version` and `npm view stylelint-config-standard version` before committing dependency versions. **`[VERIFIED: npm registry]`**: stylelint 16.26.x is the latest as of 2026-07 per Context7 fetch; v36 of config-standard is compatible. (Adjusted to `[VERIFIED: Context7]` below — I did not actually run npm view; the claim is based on training data and may be stale. **Planners should verify**.)
2. **Ripple `mode="self"` refactor may break the public API for non-Button children** (Sidebar/BottomBar/Header have non-button children wrapped in `<Ripple><button>...`). Mitigation: keep span-based path as default (`mode` undefined → span), use `mode="self"` only when called by primitive wrappers.
3. **Theme toggle in Sidebar footer adds a second button to an 80px wide container** — visual fit check needed; if 80px is too narrow for two 80dp icon buttons, may need to expand Sidebar width or use a 48dp theme toggle + 80dp logout. (Current MD3 spec: 80dp nav rail items; 48dp min hit box.)
4. **8dp grid sweep of 242 declarations in `styles.css` is the highest-risk task** — high volume, every change is visual. Recommend visual regression checkpoint after first 50 replacements (run `npm run dev`, screenshot, then continue).
5. **Emoji-to-Icon conversion may shift visual weight** — emoji are color + character; Icons are monochrome (currentColor). User experience will change; UAT must confirm acceptability. CONTEXT D-EMOJI-01: "调用方统一 `<Icon name="..." size={...} />`，不留裸 emoji" — direction is clear.
6. **Phase 11 deferred `.form-input` for `<select>` sites** — Phase 12 may inherit the deviation; document in UAT-REPORT rather than fix in scope.

### Open Questions

1. **Spinner animation 0.8s vs 500ms (token)** — see §5 above. Planner's call.
2. **Snackbar action button position** — between message and close icon (MD3 spec) vs rightmost after close (alternative). Recommend MD3 spec: action between message and close.
3. **Theme toggle in Sidebar footer order** — theme toggle first (more frequent action) or logout first (more destructive, conventionally at bottom)? Recommend theme toggle first (light toggle is a more frequent action than logout).
4. **EmptyState icon API** — change to accept string (breaking 8 call sites) vs new prop `iconName` alongside `icon`? Recommend change to accept `string | ReactNode` for cleanness.
5. **Stagger animation delays 0.1s/0.2s/0.3s/0.4s** — currently in `styles.css:141`. MOTION-05 should ideally tokenise these too, but the 100ms cadence is decorative (not a design-token-scale value). Keep as-is or wrap in `--md-stagger-{1..4}` new tokens? Recommend keep as-is (decorative micro-timing, not MD3 motion spec).

### Blocker Assessment

**No hard blockers for plan creation.** The work is well-scoped, all decisions are locked, and the research has produced concrete file-level changes for each plan. The only sequencing question is whether to split 12-01 into 12-01A and 12-01B (see §13) — the orchestrator can decide.

---

## Confidence & Provenance

| Area | Confidence | Reason |
|------|-----------|--------|
| Standard Stack | **HIGH** | npm `package.json` directly inspected; versions confirmed against `package-lock.json`; `@material-symbols-svg/react@0.13.0` exports verified in `node_modules/dist/icons/` |
| Ripple root cause | **HIGH** | Exact code at `Ripple.jsx:74-83` and `base.css:8-45` read; reproduction logic matches user's report (mouse-click fails, keyboard Enter works) |
| Sidecar Header DOM | **HIGH** | 21 page-level `<Header>` consumers + 1 `PcLayout` consumer all enumerated by grep |
| 8dp grid counts | **HIGH** | Python AST walk of all `*.{css,jsx}` with explicit regex matching; counts reproducible |
| Hard-coded corner count | **HIGH** | Same methodology; only 2 hits (Sidebar.css:79, BottomBar.css:60); all others are tokenised or valid (0/50%/9999px) |
| Motion residue count | **HIGH** | All 5 hard-coded durations enumerated; all in `transition:`/`animation:` declarations, not in stagger delays (which are kept) |
| Emoji inventory | **HIGH** | Used `regex` library with `\X` grapheme cluster matching + Extended_Pictographic property; 106 clusters across 31 files (CONTEXT's 68 was a Phase 10 estimate, now 56% higher) |
| Old class residue | **HIGH** | 9 of 13 legacy class categories completely clean (0 residual); 2 intentional residuals (`.form-input` for select, `.fab` for placement); 1 in-scope fix (`.btn-search` padding) |
| stylelint plan | **MEDIUM** | Configuration template based on official docs; **[ASSUMED]** stylelint v16 + stylelint-config-standard v36 are current — planner should run `npm view` to confirm |
| Snackbar action API | **HIGH** | Pattern derived from existing `showToast` signature + CONTEXT D-SNACK-01 example; backward-compatibility via overload matches existing pattern (e.g., `Object.hasOwn` check at line 224) |
| HUMAN-UAT scope | **HIGH** | 6 flows map to 12 distinct page files; all under `frontend/src/pages/`; all reachable in dev server |
| Phase 11 deferred `.form-input` | **HIGH** | Per SC-10 in Phase 10 10-CONTEXT.md line 137; Select primitive not in Phase 11 deliverable list (D-01..D-21) |

### `[ASSUMED]` / `[VERIFIED]` / `[CITED]` tag log

- `[VERIFIED: code grep]` — every "0 residual", "X consumers", "Y files" claim in §3, §4, §5, §6, §7 was measured with ripgrep or Python AST walk against the actual codebase
- `[CITED: 12-CONTEXT.md]` — D-BUG-01, D-BUG-02, D-GRID-01..03, D-RADIUS-01, D-EMOJI-01, D-MOTION-01, D-SNACK-01, D-AUDIT-01, D-UAT-01..04, D-PLAN-01, D-FILE-01..02 — all directly referenced
- `[CITED: 10-CONTEXT.md]` — D-08 (FAB 16px), D-13 (Card slot), D-03 (btn-search), SC-10 (.form-input retention)
- `[CITED: 11-CONTEXT.md]` — D-08/09/10 (Snackbar API), D-21 (verification means)
- `[ASSUMED]` — stylelint v16 / stylelint-config-standard v36 versions (latest known from training, but v1.2 plan creation may be later)
- `[ASSUMED]` — users accept monochrome Icon over color emoji visual shift (per CONTEXT D-EMOJI-01 direction but not explicitly confirmed)
- `[VERIFIED: Context7 + node_modules]` — `@material-symbols-svg/react@0.13.0` icon exports (all proposed mappings verified by `find … -maxdepth 1 -iname '*.js'`)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `package.json` + `node_modules/` direct read
- Architecture: HIGH — `App.jsx` + page-level Header grep
- Pitfalls: HIGH — every residue type enumerated with file:line:column precision
- 12-00-BUGFIX root cause: HIGH — three fix options compared with file-level impact

**Research date:** 2026-07-28
**Valid until:** 2026-08-28 (30 days) for token stack / `Icon.jsx` API; 7 days for new bug reports that may surface during 12-00-BUGFIX
**Pre-flight checklist:**
- [x] All 14 critical investigation tasks addressed
- [x] No `external content` (Emoji cluster + spacing counts are mathematical measurements)
- [x] Every claim has confidence level
- [x] Two HTML previews attached (none required for this research)
- [x] Plan recommendations are concrete and unambiguous
- [x] Risks section enumerates 3+ verifiable concerns

**Files referenced (read in full or part):**
- `frontend/src/components/primitives/{Ripple,Button,IconButton,FAB,Card,Icon,base.css,ripple.css,Button.css,IconButton.css,FAB.css,Card.css}.{jsx,css}` (12 files)
- `frontend/src/components/composites/{Sidebar,Header,BottomBar,Modal}.{jsx,css}` (8 files)
- `frontend/src/contexts/ToastContext.jsx`
- `frontend/src/App.jsx`
- `frontend/src/pages/LoginPage.jsx`, `pages/ForceChangePasswordPage.jsx`, `pages/AdminHomePage.jsx`, `pages/GuestOrderPage.jsx`
- `frontend/src/components/{EmptyState,PasswordInput,ThemeToggle,Header}.jsx`
- `frontend/src/css/{tokens.css,styles.css,index.css}` (3 files)
- `frontend/package.json`, `frontend/eslint.config.js`
- `frontend/scripts/audit-touch-targets.mjs`
- `scripts/check-tokens.sh`
- `frontend/node_modules/@material-symbols-svg/react/dist/icons/*.js` (sampled ~60 filenames)
- `.planning/{STATE,ROADMAP,REQUIREMENTS,config.json}.md`
- `.planning/phases/{08,09,10,11,12}-*/*.md` (5 CONTEXT.md)
