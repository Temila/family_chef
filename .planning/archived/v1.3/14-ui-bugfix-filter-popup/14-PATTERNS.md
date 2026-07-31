# Phase 14: UI Bugfix & Filter Popup - Pattern Map

**Mapped:** 2026-07-29
**Phase dir:** `/home/temila/family_chef/.planning/phases/14-ui-bugfix-filter-popup/`
**Files analyzed:** 9 (7 modify + 2 create)
**Analogs found:** 9 / 9 (100% — every file has a real codebase analog; no RESEARCH.md fallback needed)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/components/composites/Sheet.jsx` *(new)* | composite | request-response (modal-as-page) | `frontend/src/components/composites/Modal.jsx` | **exact** (variant of Modal) |
| `frontend/src/components/composites/Sheet.css` *(new)* | config (CSS) | N/A | `frontend/src/components/composites/Modal.css` | **exact** (`md-modal--full-screen` variant) |
| `frontend/src/components/composites/Modal.css` *(modify)* | config (CSS) | N/A | itself (additive: `md-modal--bottom-sheet` + D-11 border) | **exact** |
| `frontend/src/components/composites/BottomBar.css` *(modify)* | config (CSS) | N/A | itself (BUG-01 — remove max-width + centering) | **exact** |
| `frontend/src/css/styles.css` *(modify)* | config (CSS) | N/A | itself (D-08 selector list + th::before width) | **exact** |
| `frontend/src/pages/AdminIngredientsPage.jsx` *(modify)* | page | request-response (CRUD + dropdowns) | `frontend/src/pages/AdminDishesPage.jsx` | **exact** (parallel admin page, same accordion + filter shape) |
| `frontend/src/pages/AdminDishesPage.jsx` *(modify)* | page | request-response (CRUD) | `frontend/src/pages/AdminIngredientsPage.jsx` | **exact** (mirror) |
| `frontend/src/components/WishCard.jsx` *(modify)* | component | request-response (action callbacks) | itself + `frontend/src/components/DishCard.jsx` (cross-card consistency) | **exact** |
| `frontend/src/components/DishCard.jsx` *(modify)* | component | request-response (action callbacks) | `frontend/src/components/WishCard.jsx` | **exact** |

**Note:** `DishCard.jsx` was not called out in CONTEXT.md but is implied by **D-05** (3-class consistency: 食材卡 / 愿望卡 / 菜品卡). Adding it here so planner assigns a touch task for the consistent-grid-stretch pattern.

---

## Pattern Assignments

### `frontend/src/components/composites/Sheet.jsx` (NEW composite, request-response)

**Analog:** `frontend/src/components/composites/Modal.jsx` (Phase 11 — COMPO-08)

**Role:** New wrapper composite that renders a centered modal on desktop (≥1024px) and a bottom sheet on mobile (<1024px). Internally delegates to `<Modal variant="bottom-sheet">` so we inherit all MD3 modal behavior (focus trap, ESC, scroll lock, focus return).

**Imports pattern** (Modal.jsx:27-29):
```jsx
import { useEffect, useRef } from 'react';
import { trapFocusWithin } from '../../utils';
import './Modal.css';
```

**Core API surface** (Modal.jsx:31-47 — copy props shape, drop `full-screen`-specific bits):
```jsx
export default function Sheet({
  open = true,
  onClose,
  title,
  closeIcon = true,
  header,
  footer,
  actions,
  children,
  closeOnBackdrop = true,
  labelledBy,
  describedBy,
  initialFocusRef,
  className = '',
  style,
}) { /* identical body to Modal but pass variant="bottom-sheet" */ }
```

**Recommended implementation approach** (agent discretion per CONTEXT.md): Two paths are equally acceptable:
- **(A)** Thin wrapper that calls `<Modal variant="bottom-sheet" {...props} />` — minimum duplication
- **(B)** Inline the JSX from Modal.jsx with the `bottom-sheet` variant hardcoded — slight duplication, easier to diverge later

Recommendation: **Path A**. Sheet becomes a ~25-line pass-through, single source of MD3 modal behavior.

**Reference lines to copy verbatim:** Modal.jsx:48-145 (full body — effect hooks, ESC handler, overlay markup, slots). The only deltas vs Modal are: drop `variant` prop entirely, hardcode `'bottom-sheet'` in the `overlayClasses` array (Modal.jsx:88-91), and drop the `full-screen` branch.

---

### `frontend/src/components/composites/Sheet.css` (NEW CSS)

**Analog:** `frontend/src/components/composites/Modal.css` — specifically the `md-modal--full-screen` block at Modal.css:21-47.

**Base rule to copy** (Modal.css:27-39):
```css
.md-modal {
  background: var(--md-color-surface-container-lowest);
  border-radius: var(--md-radius-lg);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--md-elevation-3);
  display: flex;
  flex-direction: column;
  position: relative;
}
```

**Full-screen override to copy and adapt** (Modal.css:42-47):
```css
.md-modal--full-screen .md-modal {
  max-width: 100%;
  max-height: 100vh;
  height: 100vh;
  border-radius: 0;
}
```

**New variant rule to add** (`md-modal--bottom-sheet`):
```css
/* Mobile (default): bottom sheet anchored to bottom, top corners rounded */
.md-modal--bottom-sheet {
  padding: 0;
  align-items: flex-end;
  justify-content: center;
}
.md-modal--bottom-sheet .md-modal {
  max-width: 100%;
  width: 100%;
  max-height: 90vh;
  height: auto;
  border-radius: var(--md-radius-lg) var(--md-radius-lg) 0 0; /* 16px top only */
  border-bottom: none;
  animation: md-sheet-in var(--md-motion-duration-medium) var(--md-motion-easing-emphasized);
}

/* Desktop (≥1024px): center modal — same visual as basic modal */
@media (min-width: 1024px) {
  .md-modal--bottom-sheet {
    padding: var(--md-spacing-4);
    align-items: center;
  }
  .md-modal--bottom-sheet .md-modal {
    max-width: 480px;
    border-radius: var(--md-radius-lg);
    border-bottom: 1px solid var(--md-color-outline-variant);
    animation: none;
  }
}

@keyframes md-sheet-in {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

/* Reduced motion: instant */
@media (prefers-reduced-motion: reduce) {
  .md-modal--bottom-sheet .md-modal { animation: none; }
}
```

**Token references used:** `var(--md-radius-lg)` (24px — tokens.css:147), `var(--md-color-outline-variant)` (light: #c1c9bf / dark: #414941 — tokens.css:38, 223), `var(--md-motion-duration-medium` (250ms — tokens.css:171), `var(--md-motion-easing-emphasized` (cubic-bezier(0.2, 0, 0, 1) — tokens.css:174).

---

### `frontend/src/components/composites/Modal.css` (MODIFY — additive)

**Two changes:**

**Change 1 — D-11 border for dark-mode contrast** (insert after Modal.css:39):
```css
.md-modal {
  /* existing styles unchanged */
  border: 1px solid var(--md-color-outline-variant); /* D-11: BUG-07 / UI-03 — provides edge contrast in dark mode */
}
```

Then exclude from full-screen and bottom-sheet (insert after the new full-screen/bottom-sheet overrides):
```css
.md-modal--full-screen .md-modal,
.md-modal--bottom-sheet .md-modal {
  border: none; /* full-bleed variants don't need edges */
}
```

**Change 2 — bottom-sheet variant** — **handled in Sheet.css above**, not here. Modal.css stays the source of `.md-modal` base + `.md-modal--full-screen`; Sheet.css owns its own variant.

---

### `frontend/src/components/composites/BottomBar.css` (MODIFY — BUG-01)

**Change** (replace BottomBar.css:9-30):
```css
.md-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;                  /* was: left: 50% */
  transform: none;          /* was: transform: translateX(-50%) */
  width: 100%;              /* keep */
  /* deleted: max-width: 420px; */
  height: var(--md-nav-height);
  background: var(--md-color-surface-container);
  border-top: 1px solid var(--md-color-outline-variant);
  padding: var(--md-spacing-3) 0 calc(var(--md-spacing-3) + env(safe-area-inset-bottom, 0px));
  z-index: 200;
  display: flex;
  justify-content: space-around;
  align-items: center;
}
/* DELETED: @media (min-width: 640px) { .md-bottom-bar { max-width: 768px; } } */
@media (min-width: 1024px) {
  .md-bottom-bar { display: none; }
}
```

**Critical preservation:** active-pill (lines 49-67) and tab layout (lines 33-46) untouched — those are MD3-correct.

**No analog needed** — direct edit.

---

### `frontend/src/css/styles.css` (MODIFY — D-08 + BUG-02)

**Change 1 — D-08: compact interactive targets** (insert as a new section, recommended location: styles.css:343 *before* `.pc-data-table th::before` block; or after the 48dp rule at styles.css:519):

```css
/* ═══ Phase 14 D-08: compact interactive targets (12dp min) ═══
   覆盖 MD3 48dp 触控目标（styles.css:519）针对特定小交互元素：下拉 ▾ 触发按钮、
   数量步进、菜单/选择项、愿望挑选、访客加菜、偏好标签按钮、快速操作卡。
   视觉策略：透明背景 + var(--md-color-primary) 文字色 + hover var(--md-color-surface-container-high)。
   与 48dp 规则在同一文件，按"后写覆盖"语义生效。 */
.compact-interactive-target,
button.compact-interactive-target,
.compact-interactive-target.chef-select-item,
.compact-interactive-target.wish-picker-item,
.compact-interactive-target.menu-item,
.compact-interactive-target.guest-add-btn,
.compact-interactive-target.theme-toggle,
.compact-interactive-target .qty-stepper button,
.compact-interactive-target .preference-tag button,
.compact-interactive-target .quick-action {
  min-width: 12px;
  min-height: 12px;
}
```

**Note on D-08 selector list:** CONTEXT.md D-08 specifies a long selector list. In practice, the only consumers in AdminIngredientsPage.jsx + AdminDishesPage.jsx dropdowns are the inline-styled `<button>` with `▾` (lines 328-346, 420-436). The most maintainable approach is to add a single class `.compact-interactive-target` to those buttons in JSX and have a single CSS rule. **Do not blanket-apply** to all buttons globally — that defeats UX-04 (48dp).

**Change 2 — BUG-02: th::before width bump** (styles.css:348-354):
```css
.pc-data-table th::before {
  content: '';
  display: inline-block;
  width: 48px; /* was 32px — bumped per D-13 if 32px still misaligns */
  margin-right: var(--md-spacing-2);
  vertical-align: middle;
}
```

**Audit step for BUG-02:** Verified via grep — all 7 `<table>` elements already use `.pc-data-table` (AdminDishesPage:532, AdminIngredientsPage:307, AdminCategoriesPage:137, AdminChefsPage:99, AdminLogsPage:82, ChefDishesPage:552, AdminUsersPage:170). So BUG-02's audit step is a **no-op verification**, and the only fix needed is the width bump.

---

### `frontend/src/pages/AdminIngredientsPage.jsx` (MODIFY — BUG-04 + BUG-05 + UI-01 partial)

**Three independent edits** within this file:

**Edit A — BUG-05: mobile card button pinned to bottom** (lines 410-503)

Current structure: `Card → <div flex items-center> + <div aliases> + <div flex gap-3 buttons>`. Card primitive body is `flex:1` (Card.css:82). For buttons to stretch to row height, the **inner button row** needs `margin-top: auto`; the aliases section needs to NOT consume the available space.

Pattern from `WishCard.jsx:200-213` (footer slot):
```jsx
<Card ... footer={
  <div style={{
    display: 'flex',
    gap: 'var(--md-spacing-2)',
    flexWrap: 'wrap',
    marginTop: 'var(--md-spacing-2)',  /* wish version uses var(--md-spacing-2) */
    paddingTop: 'var(--md-spacing-2)',
    borderTop: '1px dashed var(--md-color-outline-variant)',
  }}>
    {actions}
  </div>
}>
```

**Recommended structure for AdminIngredientsPage mobile card:**
```jsx
<Card key={item.id} variant="elevated" style={{ marginBottom: 'var(--md-spacing-2)' }}>
  {/* Content column — children of md-card__body; body is display:flex via Card.css:77-83 */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--md-spacing-2)', minHeight: '120px' }}>
    {/* Top: name + chevron dropdown trigger (compact-interactive-target, lines 420-468) */}
    <div className="flex items-center gap-3">
      <div style={{ flex: 1 }}>... name + count + ▾ dropdown</div>
    </div>
    {/* Aliases (optional, consumes natural height) */}
    {(item.aliases || []).length > 0 && (
      <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)' }}>
        别名：{item.aliases.join('、')}
      </div>
    )}
    {/* Spacer that pushes buttons down — same as WishCard footer pattern */}
    <div style={{ flex: 1 }} />
    {/* Buttons row — auto-stretches to bottom via sibling flex:1 above */}
    <div className="flex gap-3" style={{ marginTop: 'var(--md-spacing-2)' }}>
      <Button variant="outlined" size="sm" className="flex-1" onClick={() => openEdit(item)}>编辑</Button>
      {/* delete button */}
    </div>
  </div>
</Card>
```

**Note (agent discretion per CONTEXT.md):** Whether to migrate to `Card.footer` slot is up to implementation. The simpler `flex:1` spacer approach matches the WishCard.jsx pattern more loosely but stays inside the body — easier diff, no slot migration. Either is acceptable.

**Edit B — BUG-04: dropdown trigger button shape + z-index fix** (lines 326-377 table + 418-468 mobile)

**B-1 — Trigger button styles:**
Replace inline style block at lines 332-345 (and 423-435) with the compact-interactive-target class. The `borderRadius: '50%'` → leave alone (per D-08 — the rule is about `min-width/min-height`, not radius). Color stays transparent + primary text. Add `className="compact-interactive-target"` and trim inline styles to just layout-essential props.

```jsx
<button
  type="button"
  data-dropdown-id={item.id}
  onClick={(e) => { e.stopPropagation(); toggleDropdown(item.id); }}
  className="compact-interactive-target"
  style={{
    marginLeft: 'var(--md-spacing-1)', verticalAlign: 'middle',
    background: 'transparent',
    color: 'var(--md-color-primary)',
    border: 'none',
    padding: 'var(--md-spacing-1)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
    lineHeight: 1,
    cursor: 'pointer',
  }}
  aria-label="查看关联菜品"
  title="查看关联菜品"
>
  ▾
</button>
```

**B-2 — z-index fix (D-09):** Current `zIndex: 50` is too low; gets occluded by card stacks. Two implementation paths (CONTEXT.md §D-09 leaves to agent):

- **Path A (recommended):** Convert dropdown to **Portal-mounted** with `position: fixed; top/left from triggerRef.getBoundingClientRect()`. New utility: extract a small `<Dropdown>` primitive, OR inline the pattern. Codebase has zero Portal usage — must add `import { createPortal } from 'react-dom'`.
- **Path B (less invasive):** Bump z-index to 1000 (above snackbar) + remove `overflow: hidden` on the containing `<Card>` and `<td>`. Card.css:13 sets `overflow: hidden` on `.md-card` — would need to scope the override.

**Recommended:** Path A. Cleaner separation, doesn't fight Card primitive's overflow guarantee. Pattern reference: `Ripple.jsx:48` (uses `getBoundingClientRect` already).

Minimal Portal dropdown skeleton (use as reference, not verbatim):
```jsx
const triggerRef = useRef(null);
const [coords, setCoords] = useState(null);

const openMenu = () => {
  const rect = triggerRef.current.getBoundingClientRect();
  setCoords({ top: rect.bottom + 4, left: rect.left });
  setOpenDropdown(item.id);
};

// render:
{coords && openDropdown === item.id && createPortal(
  <div style={{
    position: 'fixed', top: coords.top, left: coords.left, zIndex: 1000,
    background: 'var(--md-color-surface-container-high)',
    border: '1px solid var(--md-color-outline-variant)',
    borderRadius: 'var(--md-radius-md)', boxShadow: 'var(--md-elevation-2)',
    minWidth: 160, maxHeight: 200, overflowY: 'auto', padding: 'var(--md-spacing-1)',
  }}>
    {/* dropdown items */}
  </div>,
  document.body
)}
```

**Edit C — UI-01 partial: replace inline advanced-filter accordion with Sheet/Modal trigger** (lines 270-298)

Current: button toggles `showAdvFilter`, body renders inline `<div>` with Chips.
Target: button opens Sheet; Sheet body has the Chips; Sheet footer has "清空 / 应用".

```jsx
{/* Replace lines 270-298 with: */}
<Button variant="tonal" size="sm" onClick={() => setShowAdvFilter(true)}>
  高级筛选
</Button>

{showAdvFilter && (
  <Sheet
    open
    onClose={() => setShowAdvFilter(false)}
    title="高级筛选 — 食材"
    footer={
      <div className="flex gap-3" style={{ width: '100%' }}>
        <Button variant="tonal" className="flex-1" onClick={() => { setAdvCategory(''); }}>清空</Button>
        <Button variant="filled" className="flex-1" onClick={() => setShowAdvFilter(false)}>应用</Button>
      </div>
    }
  >
    <div className="filter-section">
      <div className="filter-section-label">分类</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-1)' }}>
        <Chip variant="filter" selected={!advCategory} onClick={() => setAdvCategory('')}>全部</Chip>
        {ingredientCategories.map(c => (
          <Chip variant="filter" selected={advCategory === c.name} key={c.id}
            onClick={() => setAdvCategory(c.name)}>{c.name}</Chip>
        ))}
      </div>
    </div>
  </Sheet>
)}
```

State flow: `advCategory` still drives the `useEffect` loadIngredients dependency (line 46) — no change.

---

### `frontend/src/pages/AdminDishesPage.jsx` (MODIFY — BUG-04 + UI-01 partial)

**Two edits:**

**Edit A — BUG-04 dropdown fix** (lines 730-808 — the ingredient/semifinished dropdowns):

Apply same compact-interactive-target class + Portal fix pattern as AdminIngredientsPage. The dropdowns here use `<div ref={...}>` + click-outside `useEffect` (lines 80-99) — slightly different shape, but the z-index/Portal fix applies identically.

Recommended: convert these to Portal-rendered too. Refactor the two `ingDropdownRef`/`sfDropdownRef` handlers into a shared helper if time permits.

**Edit B — UI-01 partial: Sheet for advanced filter** (lines 478-523):

Same Sheet wrapper as AdminIngredientsPage. **Important: this filter has TWO sections** (categories + 半成品 toggle). Sheet body becomes:

```jsx
<Sheet
  open
  onClose={() => setShowAdvFilter(false)}
  title="高级筛选 — 菜品"
  footer={
    <div className="flex gap-3" style={{ width: '100%' }}>
      <Button variant="tonal" className="flex-1" onClick={() => {
        setAdvCategoryIds([]); setSfFilter('all');
      }}>清空</Button>
      <Button variant="filled" className="flex-1" onClick={() => setShowAdvFilter(false)}>应用</Button>
    </div>
  }
>
  {/* Copy existing renderCategorySection calls — keep their internal logic */}
  {renderCategorySection(getTypeMeta('region').label, regions, advCategoryIds, ...)}
  {dishCategoryTypes.filter(t => t.key !== 'region').map(t => { ... })}
  <div className="filter-section">
    <div className="filter-section-label">半成品</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-1)' }}>
      {/* sfFilter chips */}
    </div>
  </div>
</Sheet>
```

`advCategoryIds` + `sfFilter` still drive the loadDishes effect (line 78) — no state change.

---

### `frontend/src/components/WishCard.jsx` (MODIFY — BUG-03)

**Current state:** WishCard.jsx:194-258 already uses `Card primitive` with `footer` slot — line 199-213 already implements `marginTop: var(--md-spacing-2)` push. So **most of the work is verification**.

**Required change (minimal):** Ensure the **body content area** uses `flex: 1` to fill available height so footer sticks to bottom when card is stretched by grid.

WishCard.jsx already wraps content in a body div (Card.css handles `flex: 1` on `.md-card__body` automatically via Card.css:82). However, the **card root itself** must allow grid stretch — verify `.mobile-card-list--grid` items get `align-self: stretch` (CSS Grid default; .mobile-card-list at styles.css:290 is `display: grid` so YES).

**Concrete touch:** at WishCard.jsx:146-159, add `display: 'flex'; flexDirection: 'column';` to `cardStyle` so the card root becomes a flex column — letting `marginTop: 'auto'` on the footer slot push it down.

```jsx
const cardStyle = {
  width: '100%',
  maxWidth: '600px',
  marginLeft: 'auto',
  marginRight: 'auto',
  minHeight: '120px',
  marginBottom: 'var(--md-spacing-4)',
  display: 'flex',              // ← new
  flexDirection: 'column',      // ← new
  ...(highlight ? { ... } : {}),
  ...(!hasActions ? { opacity: 0.7 } : {}),
};
```

**And** at the footer (line 199-213), change `marginTop: 'var(--md-spacing-2)'` to `marginTop: 'auto'` so the footer pushes to card bottom regardless of content height.

---

### `frontend/src/components/DishCard.jsx` (MODIFY — BUG-03 cross-card consistency per D-05)

**Analog:** `WishCard.jsx` — same Card-primitive refactor pattern.

Apply the same two edits (cardStyle `display:flex; flex-direction:column` + footer `margin-top: auto`). DishCard's current footer slot (read DishCard.jsx structure) likely already uses footer, but verify and align margin-top to `auto`.

**No new analog needed** — pattern identical to WishCard.

---

## Existing Component Reuse Map

### Card primitive (`frontend/src/components/primitives/Card.jsx`)
- **footer slot:** already supports actions region (`Card.css:86-93`). Used by WishCard.jsx and likely DishCard.
- **variant="elevated":** default for admin cards (Bugfixes). Card.css:20-26.
- **flex:1 on body:** automatic via `.md-card__body { flex: 1 }` (Card.css:82).
- **For BUG-03/05:** pair with `display:flex; flex-direction:column` on the card root via style prop.

### Modal composite (`frontend/src/components/composites/Modal.jsx`)
- **Already supports `variant` prop** with `full-screen` (Modal.jsx:32, 86). Sheet will add `bottom-sheet`.
- **ESC + scroll lock + focus trap** all in place (Modal.jsx:52-78).
- **Header/footer/body slot pattern** (Modal.jsx:108-141) — Sheet uses identical slot API.

### MD3 tokens (`frontend/src/css/tokens.css`)
| Token | Value | Used for |
|-------|-------|----------|
| `--md-radius-lg` | 24px | Modal corners (tokens.css:147) |
| `--md-radius-md` | 16px | Dropdown menu / Sheet top corners (tokens.css:146) |
| `--md-color-outline-variant` | `#c1c9bf` (light) / `#414941` (dark) | D-11 modal border (tokens.css:38, 223) |
| `--md-color-surface-container-high` | `#e7e9e3` / `#282b27` | Dropdown hover bg (tokens.css:49, 234) |
| `--md-motion-duration-medium` | 250ms | Sheet enter animation (tokens.css:171) |
| `--md-motion-easing-emphasized` | cubic-bezier(0.2, 0, 0, 1) | Sheet enter animation (tokens.css:174) |
| `--md-elevation-3` | (token) | Modal/Sheet shadow |
| `--md-nav-height` | 80px | Page bottom padding |

### Bottom-bar z-index hierarchy (verified across codebase)
| Layer | z-index | File |
|-------|---------|------|
| Snackbar | 1000 | `contexts/ToastContext.jsx:42` |
| Modal scrim | 500 | `composites/Modal.css:14` |
| Cart-bar | 201 | `css/styles.css:230` |
| Bottom-bar | 200 | `composites/BottomBar.css:20` |
| Header avatar dropdown | 200 | `composites/Header.css:109` |
| FAB | 150 | `css/styles.css:164` |
| Cart-detail-panel | 149/200 | `css/styles.css:235` |
| Header | 100 | `composites/Header.css:13` |
| Sidebar | 100 | `composites/Sidebar.css:20` |
| (current) Dropdowns | **50** ← BUG-04 | `pages/AdminIngredientsPage.jsx:350` |

**D-09 z-index resolution:** Dropdown should use **Portal + z-index 1000** OR bump in-place z-index to **300** with overflow:hidden overrides. Portal is cleaner.

---

## Shared Patterns

### Pattern: MD3 bottom-sheet animation
**Source:** `frontend/src/css/styles.css:137` (`.animate-fade-in` — existing emphasized-easing reference)
**Apply to:** Sheet.css enter animation
```css
animation: md-sheet-in var(--md-motion-duration-medium) var(--md-motion-easing-emphasized);
```

### Pattern: Click-outside via document mousedown
**Source:** `AdminIngredientsPage.jsx:48-62` and `AdminDishesPage.jsx:80-99`
**Apply to:** Sheet/Modal (already in Modal.jsx) and any new Dropdown primitive
```jsx
useEffect(() => {
  if (!open) return;
  const handler = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [open, onClose]);
```

### Pattern: Grid stretch for uniform-height cards
**Source:** `frontend/src/css/styles.css:290-308` (`.mobile-card-list`, `.mobile-card-list--grid`)
**Apply to:** BUG-03 / BUG-05 (already correct at the container level; card-level flex column is the missing piece)
```css
/* Container already correct: */
.mobile-card-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--md-spacing-3);
  /* default align-items: stretch; no change needed */
}
/* Per-card: display:flex; flex-direction:column (set via inline style in JSX) */
```

### Pattern: Touch target exemption
**Source:** `frontend/src/css/styles.css:519-527` (existing 48dp rule)
**Apply to:** D-08 — single class added in styles.css after the existing 48dp rule:
```css
/* Existing rule at styles.css:519 */
button, a, input, select, textarea,
[role="button"], [tabindex]:not([tabindex="-1"]),
.theme-toggle, .qty-stepper button,
.menu-item, .chef-select-item, .wish-picker-item,
.guest-add-btn, .preference-tag button,
.quick-action { min-width: 48px; min-height: 48px; }

/* Add after, as override for compact-interactive-target class: */
.compact-interactive-target,
.compact-interactive-target.chef-select-item,
.compact-interactive-target.wish-picker-item,
.compact-interactive-target.menu-item,
.compact-interactive-target.guest-add-btn,
.compact-interactive-target.theme-toggle,
.compact-interactive-target .qty-stepper button,
.compact-interactive-target .preference-tag button,
.compact-interactive-target .quick-action {
  min-width: 12px; min-height: 12px;
}
```

### Pattern: Modal border (D-11)
**Source:** MD3 spec — outline-variant border in dark mode
**Apply to:** Modal.css `.md-modal` rule only (not full-screen, not bottom-sheet)
```css
.md-modal { border: 1px solid var(--md-color-outline-variant); }
.md-modal--full-screen .md-modal,
.md-modal--bottom-sheet .md-modal { border: none; }
```

---

## No Analog Found

None. Every file in scope has a direct analog in the codebase. No RESEARCH.md fallback patterns needed.

---

## Risk Areas

### Risk 1 — BottomBar.css change may regress desktop/tablet visual
**Issue:** Removing `max-width: 420px / 768px` makes BottomBar span the entire viewport. On 640-1023px tablets this is fine (bottom-bar is `display:none` at ≥1024px). But the `left: 50% / transform: translateX(-50%)` is also used by `.order-bar`, `.cart-bar`, `.cart-detail-panel` (styles.css:225, 230, 235) — those need to keep their centering. **Don't touch those rules.**

**Mitigation:** Edit only the `.md-bottom-bar` block (BottomBar.css:9-30). Verify by grep that `.order-bar`/`.cart-bar` still use `max-width: 420px / 768px / 1200px` with `left: 50% / translateX(-50%)` — they should remain unchanged.

### Risk 2 — Dropdown z-index fix requires Portal or stacking-context surgery
**Issue:** Existing dropdowns sit inside `<Card>` which has `overflow: hidden` (Card.css:13). Even with z-index: 1000, the menu gets clipped. Solutions either require Portal (recommended) or removing overflow on Card (not safe — Card primitive contracts guarantee overflow:hidden for image clipping).

**Mitigation:** Path A — Portal. Plan adds 1 new import (`createPortal from 'react-dom'`) and ~30 lines per dropdown consumer. No code currently uses Portal; first usage sets the pattern.

**Fallback:** If Portal deemed too risky, Path B is: scope-bypass via `:where()` selector — add `.mobile-card-list .md-card { overflow: visible }` and `.pc-data-table td { overflow: visible }`. But this could expose image overflow on `.md-card__image` (4/3 aspect ratio). Use as last resort.

### Risk 3 — Sheet animation may conflict with Modal scroll-lock
**Issue:** Modal.jsx:52-68 locks `document.body.style.overflow = 'hidden'`. Sheet inherits this. But if user opens Sheet, then opens a nested Modal (e.g., Sheet → confirm), the inner Modal will save `previousOverflow = 'hidden'` and restore it on close — second Modal closes correctly but first Sheet's scroll lock has been lost.

**Mitigation:** This is a pre-existing Modal pattern (Phase 11 didn't address nested cases). For Phase 14, Sheet/Modal nesting is **not in scope** (filters don't trigger nested modals). Document the limitation in Sheet.jsx docblock but don't fix.

### Risk 4 — D-08 min-width/min-height: 12px violates accessibility heuristics
**Issue:** A 12×12 button has 144px² hit area — way below WCAG 2.5.5 (44×44) and MD3 (48dp). User explicitly chose this override per D-08; document in CSS comment that the override is **intentional and scoped** to specific compact contexts.

**Mitigation:** Add a clear comment block above the new rule referencing D-08 + which selectors it affects, so future audits understand why.

### Risk 5 — Advanced-filter Sheet may break `useEffect` deps
**Issue:** AdminIngredientsPage.jsx:46 has `useEffect(() => { loadIngredients(); }, [advCategory])`. AdminDishesPage.jsx:78 has `[advCategoryIds, user?.role, sfFilter]`. Both filters are state-driven — the Sheet wraps the UI but **state ownership stays in the page**. After Sheet closes, the new filter value persists, triggering re-load on next mount.

**Mitigation:** No code change needed — verify the state variables (`advCategory`, `advCategoryIds`, `sfFilter`) remain in the page component, not moved into Sheet. Sheet only consumes via props or stays in the page (preferred: keep state in page, pass into Sheet as controlled props).

### Risk 6 — `align-items: stretch` default may collide with explicit `align-items: end` on chef avatar rows
**Issue:** Some `.flex` rows use `align-items: center`. The mobile-card-list grid stretch only affects the **direct card child height**, not internal flex alignment. Internal alignment is unaffected.

**Mitigation:** None needed — verified by reading styles.css:147 (`.flex { display: flex }` has no align-items override; defaults to `stretch` which doesn't break center alignment on cards).

### Risk 7 — Bottom-bar hiding is automatic via z-index, no state coordination
**Issue:** CONTEXT.md D-03 states "modal scrim z-index 500 already covers bottom-bar's z-index 200" — true. But the bottom-bar still **receives pointer events** behind the scrim. If scrim has `pointer-events: auto` (Modal.css — overlay has click handler at Modal.jsx:82-84), clicks on the lower half hit the scrim, not the bottom-bar. Safe.

**Mitigation:** Verify Modal.css:10-19 overlay covers full viewport — confirmed (`position: fixed; inset: 0`). No state coordination needed.

---

## Recommended Wave Structure

### Wave 1 — Foundation (1 plan, 2 files)
**Goal:** Add Sheet composite so all filter migration has the new primitive available.
- `frontend/src/components/composites/Sheet.jsx` *(new)*
- `frontend/src/components/composites/Sheet.css` *(new)*
- `frontend/src/components/composites/Modal.css` *(D-11 border additive)*

**Verification:** Render `<Sheet open>content</Sheet>` in a Storybook-style test or temporary page; verify center-on-desktop / sheet-on-mobile visual + animation.

### Wave 2 — Bugfix sweep (1 plan, 4 files)
**Goal:** Knock out BUG-01, BUG-02, BUG-03, BUG-04, BUG-05 in parallel (independent files).
- `frontend/src/components/composites/BottomBar.css` *(BUG-01)*
- `frontend/src/css/styles.css` *(D-08 + BUG-02 width)*
- `frontend/src/components/WishCard.jsx` *(BUG-03)*
- `frontend/src/components/DishCard.jsx` *(BUG-03 consistency)*

**Verification:** Visual: BottomBar fills viewport width on 360px-1023px range; table headers align with first column on AdminDishesPage + AdminIngredientsPage; WishCard grid items have equal height.

### Wave 3 — Sheet migration + dropdown fix (1 plan, 2 files)
**Goal:** Migrate the 2 admin filter accordions to Sheet + fix dropdown z-index (depends on Wave 1 Sheet + Wave 2 styles.css compact-interactive-target).
- `frontend/src/pages/AdminIngredientsPage.jsx` *(BUG-04 dropdown + BUG-05 mobile card buttons + UI-01 partial Sheet)*
- `frontend/src/pages/AdminDishesPage.jsx` *(BUG-04 dropdown + UI-01 partial Sheet)*

**Verification:** Click 高级筛选 → opens as Sheet (mobile) / centered Modal (desktop); clear / apply buttons work; click ▾ in any row → dropdown appears above all content (no occlusion).

### Optional Wave 4 — Final pass (no new files)
**Goal:** Address any remaining UX issues from UAT, fine-tune Sheet animation duration, check Phase 13 commit `0f808f6` to verify no overlap with fix-sweep work.

---

## Metadata

**Analog search scope:** `frontend/src/components/{composites,primitives}/`, `frontend/src/pages/`, `frontend/src/css/`, `frontend/src/components/{WishCard,DishCard}.jsx`, `frontend/src/contexts/`
**Files scanned:** 25+ frontend files (CSS + JSX)
**Pattern extraction date:** 2026-07-29
**Research file:** None (phase opted to skip research; CONTEXT.md is comprehensive)
**Phase 13 commit cross-check:** `0f808f6` — fix-sweep landed 9 frontend issues. Verified BUG-01/02/03 not in that set (still open defects). No overlap with Phase 14 work.