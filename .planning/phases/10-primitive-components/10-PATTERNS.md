# Phase 10: Primitive Components - Pattern Map

**Mapped:** 2026-07-27  
**Files analyzed:** 18 new/relocated files (plus consumer migration set)  
**Analogs found:** 18 / 18 (CSS files use the nearest JSX/CSS analog where no same-file component exists)

## File Classification

| file | role | data flow | closest_analog | match quality |
|---|---|---|---|---|
| `frontend/src/components/primitives/base.css` | shared utility | transform/presentation | `frontend/src/css/styles.css:22-46` | role-match |
| `frontend/src/components/primitives/Button.jsx` | primitive component | request-response/event | `frontend/src/components/WishCard.jsx:52-66` | role-match |
| `frontend/src/components/primitives/Button.css` | primitive component CSS | presentation | `frontend/src/css/styles.css:80-106` | exact visual ancestor |
| `frontend/src/components/primitives/IconButton.jsx` | primitive component | event | `frontend/src/components/Icon.jsx:10-35` | role-match |
| `frontend/src/components/primitives/IconButton.css` | primitive component CSS | presentation | `frontend/src/css/styles.css:96-103` | exact |
| `frontend/src/components/primitives/FAB.jsx` | primitive component | event | `frontend/src/pages/UserWishesPage.jsx:324-330` | role-match |
| `frontend/src/components/primitives/FAB.css` | primitive component CSS | presentation | `frontend/src/css/styles.css:219-223` | exact |
| `frontend/src/components/primitives/Icon.jsx` | migration utility/component | transform/presentation | `frontend/src/components/Icon.jsx:10-35` | exact API, implementation migration |
| `frontend/src/components/primitives/Ripple.jsx` | shared utility/component | event-driven | `frontend/src/components/Ripple.jsx:11-81` | exact |
| `frontend/src/components/primitives/ripple.css` | shared utility CSS | presentation | `frontend/src/css/ripple.css:1-8` | exact |
| `frontend/src/components/primitives/Card.jsx` | primitive component | event/presentation | `frontend/src/components/DishCard.jsx:17-67` | role + data-flow match |
| `frontend/src/components/primitives/Card.css` | primitive component CSS | presentation | `frontend/src/css/styles.css:108-129` | exact visual ancestor |
| `frontend/src/components/primitives/Input.jsx` | primitive component | request-response/controlled input | `frontend/src/pages/LoginPage.jsx:46-71` | exact interaction |
| `frontend/src/components/primitives/Input.css` | primitive component CSS | presentation | `frontend/src/css/styles.css:229-234` | exact visual ancestor |
| `frontend/src/components/primitives/Badge.jsx` | primitive component | transform/presentation | `frontend/src/components/Badge.jsx:5-15` | exact |
| `frontend/src/components/primitives/Badge.css` | primitive component CSS | presentation | `frontend/src/css/styles.css:131-141` | exact |
| `frontend/src/components/primitives/Chip.jsx` | primitive component | event-driven toggle | `frontend/src/pages/ChefOrdersPage.jsx:78-104` | exact interaction |
| `frontend/src/components/primitives/Chip.css` | primitive component CSS | presentation | `frontend/src/css/styles.css:143-150` | exact |

## Pattern Assignments

### Wave 1 — 10-01

#### `base.css` (shared utility, presentation)
**Analog:** `frontend/src/css/styles.css:22-46`.

```css
.state-hover, .state-pressed, .state-focused, .state-disabled {
  position: relative;
  overflow: hidden;
  z-index: 0;
}
.state-hover::before,
.state-pressed::before,
.state-focused::before,
.state-disabled::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-state-layer-primary);
  opacity: 0;
  pointer-events: none;
  z-index: -1;
  transition: opacity var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.state-hover:hover::before { opacity: var(--md-state-layer-hover); }
.state-pressed:active::before { opacity: var(--md-state-layer-pressed); }
```

**Deviations:** Replace legacy negative-z stacking with the UI-SPEC isolation / z0 state / z1 ripple / z2 content model; add focus-visible, `aria-disabled`, 48dp hit-box, reduced-motion and disabled rules. Import from every primitive CSS file. Consumers: all new primitives and all migrated buttons/cards/inputs/chips (30+ files).

#### `Button.jsx` (primitive component, event/request-response)
**Analog:** `frontend/src/components/WishCard.jsx:52-66` and `:76-103`.

```jsx
<button
  type="button"
  className="btn btn-primary btn-sm flex-1"
  onClick={() => onEdit?.(wish)}
>
  编辑愿望
</button>
<button
  type="button"
  className="btn btn-outline btn-sm flex-1"
  style={DANGER_BTN_STYLE}
  onClick={() => onCancel?.(wish)}
>
  撤销愿望
</button>
```

**Deviations:** Use `forwardRef`, `variant="filled|tonal|outlined|text"`, `size`, optional `icon`, native prop spreading and `type="button"`; render internal Ripple and inline 16px spinner for loading, preserving label and `aria-busy`. Do not preserve old `btn` classes. Consumers: roughly 100 button call sites; especially WishCard (4), GuestDishCard (1 add), LoginPage (1 submit), Admin/Chef pages, modals, search buttons (`AdminIngredientsPage`, `ChefDishesPage`, `AdminDishesPage`, 6 compact buttons).

#### `Button.css` (primitive CSS, presentation)
**Analog:** `frontend/src/css/styles.css:80-106`.

```css
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 20px; border: none; border-radius: var(--md-radius-full);
  font-size: 0.875rem; font-weight: 500; position: relative; overflow: hidden; z-index: 0; }
.btn-primary { background: var(--md-color-primary); color: var(--md-color-on-primary); box-shadow: var(--md-elevation-1); }
.btn-secondary { background: var(--md-color-surface-container); color: var(--md-color-on-surface);
  border: 1px solid var(--md-color-outline-variant); }
.btn-outline { background: transparent; color: var(--md-color-primary); border: 1px solid var(--md-color-outline); }
.btn-sm { padding: 6px 14px; font-size: 0.8rem; }
.btn-lg { padding: 14px 28px; font-size: 1rem; }
:disabled, [disabled], [aria-disabled="true"] { opacity: 0.38; cursor: not-allowed; box-shadow: none; }
```

**Deviations:** Rename to `.md-button`, use token-only MD3 four-variant matrix and visual-in-hit-box geometry (sm 32, md 40, lg 48; root min 48); no `transition: all`, no pill radius (use `--md-radius-sm`), and loading spinner styles. Consumers: same Button consumers above; `.btn-search` remains the only legacy utility exception.

#### `IconButton.jsx` (primitive component, event)
**Analog:** `frontend/src/components/Icon.jsx:10-35` plus `Header.jsx:17-26`.

```jsx
<Ripple>
  <button
    className="header-back"
    onClick={() => navigate(-1)}
    title="返回"
  >
    ←
  </button>
</Ripple>
```

**Deviations:** Render `<Icon name={icon} />` rather than text/emoji, require accessible name, support `density="default|fab"`, selected state, ref/native attribute pass-through and built-in Ripple. Consumers: Header back action (1), GuestOrderPage `.btn-icon` (1), all icon-only/emoji navigation controls in Sidebar (roughly 10) and BottomBar (roughly 5); later composite migrations consume it.

#### `IconButton.css` (primitive CSS, presentation)
**Analog:** `styles.css:96-103`.

```css
.btn-icon { width: 48px; height: 48px; padding: 0; border-radius: var(--md-radius-full);
  background: var(--md-color-surface-container); border: 1px solid var(--md-color-outline-variant);
  color: var(--md-color-on-surface-variant); display: flex; align-items: center; justify-content: center;
  transition: all var(--md-motion-duration-short) var(--md-motion-easing-standard); }
.btn-icon:hover { color: var(--md-color-on-surface); border-color: var(--md-color-outline); }
.btn-icon.active { color: var(--md-color-primary); border-color: var(--md-color-primary);
  background: var(--md-color-primary-container); }
```

**Deviations:** `.md-icon-button`; default visual 40 inside 48 hit box, `fab` visual 48, transparent rest, no border, base state/focus rules, no `transition: all`. Consumers: Header and GuestOrderPage plus Sidebar/BottomBar icon actions.

#### `FAB.jsx` (primitive component, event)
**Analog:** `frontend/src/pages/UserWishesPage.jsx:324-330`.

```jsx
<Ripple>
  <button
    className="fab"
    onClick={() => setShowForm(true)}
    aria-label="提交愿望"
  >
    <span>＋</span>
  </button>
</Ripple>
```

**Deviations:** Native button with `icon`, `label`, `variant="extended"`, `size="small"`; built-in Ripple, no fixed positioning, and `--md-radius-md` for every form. Consumers: UserWishesPage (1 fixed placement); Invitations/creation actions and future extended FAB call sites.

#### `FAB.css` (primitive CSS, presentation)
**Analog:** `styles.css:219-223`.

```css
.fab { position: fixed; bottom: calc(var(--md-nav-height) + 16px); right: 24px;
  width: 56px; height: 56px; border-radius: var(--md-radius-md);
  background: var(--md-color-primary); color: var(--md-color-on-primary);
  border: none; box-shadow: var(--md-elevation-1); display: flex; align-items: center;
  justify-content: center; font-size: 1.5rem; z-index: 150;
  transition: all var(--md-motion-duration-short) var(--md-motion-easing-standard); }
.fab:hover { transform: scale(1.05); box-shadow: var(--md-elevation-3); }
```

**Deviations:** Remove fixed/page z-index and scale; use primary-container/on-primary-container, elevation 3→1 pressed, 56/40 visual geometry, extended layout, and base state/focus/disabled. Placement remains on page consumer. Consumers: UserWishesPage (1).

#### `Icon.jsx` (migration utility/component, transform)
**Analog:** current `frontend/src/components/Icon.jsx:10-35`.

```jsx
export default function Icon({ name, size = 24, fill = 0, weight = 400, grade = 0, className = '' }) {
  const iconName = String(name || '').replace(/\s+/g, '_');
  return (
    <span className={`material-symbols-outlined ${className}`} style={{
      fontSize: size,
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}`,
      lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }} aria-hidden="true">
      {iconName}
    </span>
  );
}
```

**Deviations:** Move to primitives, retain API, replace font ligature with a statically imported 30-name `ICONS` map from `@material-symbols-svg/react`; pass size/fill/weight/grade to SVG, `currentColor`, warn-and-render-null for unknown names, and `aria-hidden`. Update imports across existing Icon consumers; do not clean page emoji in this phase.

#### `Ripple.jsx` (shared utility/component, event-driven)
**Analog:** `frontend/src/components/Ripple.jsx:11-81`.

```jsx
const handlePointerDown = useCallback((e) => {
  if (disabled || !containerRef.current) return;
  const rect = containerRef.current.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const diameter = Math.max(rect.width, rect.height) * 2.5;
  const ripple = document.createElement('span');
  ripple.className = 'ripple-span';
  ripple.style.cssText = `position: absolute; pointer-events: none;
    border-radius: 50%; width: ${diameter}px; height: ${diameter}px;
    left: ${x - diameter / 2}px; top: ${y - diameter / 2}px;
    background: var(--md-color-primary); opacity: 0.12; transform: scale(0);`;
  containerRef.current.appendChild(ripple);
```

**Deviations:** Relocate import to `./ripple.css`, expose the same children/disabled/className/style API, use `.md-ripple-layer` stacking contract and skip rendering under reduced motion. Primitive controls call it internally; external API remains for WishCard/Header/Sidebar. Consumers: existing external Ripple uses in DishCard, WishCard, Sidebar, Header (approximately 9 occurrences).

#### `ripple.css` (shared utility CSS, presentation)
**Analog:** `frontend/src/css/ripple.css:1-8`.

```css
.ripple-container {
  position: relative;
  overflow: hidden;
  display: inline-flex;
}
```

**Deviations:** Rename/extend to `.md-ripple-layer` and keep only shared container mechanics; no colors or variant geometry. Consumers: relocated Ripple and internal Button/IconButton/FAB/Card.

### Wave 2 — 10-02

#### `Card.jsx` (primitive component, event/presentation)
**Analog:** DishCard `:17-67`, GuestDishCard `:7-43`, and WishCard `:149-207`.

```jsx
<Ripple style={{ width: '100%' }}>
  <div className="dish-card" onClick={() => navigate(`/dishes/${dish.id}`)}>
    <div className="dish-card-image">{image}</div>
    <div className="dish-card-body">
      <div className="dish-card-name">{dish.name}</div>
      <div className="dish-card-meta">{meta}</div>
      <div className="dish-card-footer">{footer}</div>
    </div>
  </div>
</Ripple>
```

**Deviations:** New slot API `image/header/children/footer`, variant elevated/filled/outlined, optional clickable semantics (only then Ripple/state/keyboard), transparent business logic, and class/ref/native prop forwarding. DishCard, WishCard, GuestDishCard become thin domain wrappers. Consumers: those 3 components (one each), UserFavoritesPage card (1), plus existing generic `.card` consumers (AdminIngredients mobile list and other page cards, roughly 20).

#### `Card.css` (primitive CSS, presentation)
**Analog:** `styles.css:108-129`.

```css
.card { background: var(--md-color-surface-container-lowest); border: 1px solid var(--md-color-outline-variant);
  border-radius: var(--md-radius-md); overflow: hidden; position: relative; z-index: 0;
  transition: box-shadow var(--md-motion-duration-short) var(--md-motion-easing-standard),
              border-color var(--md-motion-duration-short) var(--md-motion-easing-standard); }
.card:hover { box-shadow: var(--md-elevation-2); }
.card-body { padding: 16px; }
.dish-card-image { width: 100%; aspect-ratio: 4/3; overflow: hidden; }
.dish-card-body { padding: 12px; flex: 1; display: flex; flex-direction: column; }
```

**Deviations:** `.md-card` slots; elevated level 1→2 only, filled level 0/highest surface, outlined 1px outline-variant; 16px radius and image corner clipping. Delete `.card`, `.dish-card`, `.wish-card` selectors after migration. Consumers: DishCard/WishCard/GuestDishCard and generic card call sites.

#### `Input.jsx` (primitive component, controlled request-response)
**Analog:** LoginPage `:46-71` and WishFormModal `:176-229`.

```jsx
<div className="form-group">
  <label className="form-label">用户名</label>
  <input
    className="form-input"
    type="text"
    value={loginData.username}
    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
    placeholder="请输入用户名"
    required
    autoComplete="username"
  />
</div>
```

**Deviations:** `forwardRef` native input/textarea-compatible props, outlined/filled variants, label prop with CSS-only floating label, supporting/error text, leading/trailing slots, generated id and `aria-describedby`/`aria-invalid`; preserve controlled values and handlers. Consumers: 51 `form-label` patterns and 100+ `form-input` occurrences across Admin/Chef dish/category/ingredient/user forms, LoginPage, PasswordInput, WishFormModal, WishRejectModal, OrderPage and UserProfilePage.

#### `Input.css` (primitive CSS, presentation)
**Analog:** `styles.css:229-234`.

```css
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 0.85rem; font-weight: 500;
  color: var(--md-color-on-surface-variant); margin-bottom: 6px; }
.form-input { width: 100%; padding: 12px 16px;
  background: var(--md-color-surface-container-high); border: 1px solid var(--md-color-outline-variant);
  border-radius: var(--md-radius-sm); color: var(--md-color-on-surface); font-size: 0.9rem;
  outline: none; transition: all var(--md-motion-duration-short) var(--md-motion-easing-standard); }
.form-input:focus { outline: var(--md-focus-ring-outer); outline-offset: 2px; }
.form-error.show { display: block; }
```

**Deviations:** `.md-input` wrapper/field, 56dp height, 16sp text, 2px focus/error outline without layout shift, filled bottom line, floating label and reduced-motion rules. Delete old `.form-input` selectors only after all 12 form families are migrated. Consumers: same 51 labels / form-input callers.

### Wave 2 — 10-03

#### `Badge.jsx` (primitive component, transform/presentation)
**Analog:** current Badge `:5-15` and `statusBadge()` `utils/index.js:52-78`.

```jsx
import { statusBadge } from '../utils';
export default function Badge({ status, text, type }) {
  const badgeInfo = text ? { text, cls: `badge-${type || 'info'}` } : statusBadge(status);
  return <span className={`badge ${badgeInfo.cls}`}>{badgeInfo.text}</span>;
}
```

**Deviations:** visual-only `variant` and `tone`, children/leading icon, no business-status dependency in core; optionally keep a compatibility adapter mapping old `status/text/type` to `statusBadge()` and tone. No role/button semantics. Consumers: existing `<Badge status>` across order/dish/wish/admin pages (about 40), DishCard badge slots, and Sidebar/BottomBar count badges (count badge can use state tone).

#### `Badge.css` (primitive CSS, presentation)
**Analog:** `styles.css:131-141`.

```css
.badge { display: inline-flex; align-items: center; padding: 2px 10px;
  border-radius: var(--md-radius-full); font-size: 0.7rem; font-weight: 500; white-space: nowrap; }
.badge-warn { background: var(--md-color-tertiary-container); color: var(--md-color-tertiary); }
.badge-danger { background: var(--md-color-error-container); color: var(--md-color-error); }
.badge-success { background: var(--md-color-primary-container); color: var(--md-color-primary); }
.badge-info { background: var(--md-color-secondary-container); color: var(--md-color-secondary); }
.badge-count { min-width: 18px; height: 18px; padding: 0 5px; border-radius: var(--md-radius-full); }
```

**Deviations:** `.md-badge`, 24dp min height, 4x8 padding, 12sp label/14dp icon, eight semantic token tones and three variants; count remains pill but no hardcoded red. Consumers: all old badge classes and `<Badge>` call sites.

#### `Chip.jsx` (primitive component, event-driven toggle)
**Analog:** ChefOrdersPage `:78-104`.

```jsx
<div className="filter-chips">
  <button
    className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
    onClick={() => setFilterStatus('all')}
  >
    全部
  </button>
  <button
    className={`filter-chip ${filterStatus === 'pending' ? 'active' : ''}`}
    onClick={() => setFilterStatus('pending')}
  >
    待处理
  </button>
</div>
```

**Deviations:** `variant="assist|filter|input|suggestion"`; filter uses native button + `aria-pressed` and selected check slot, input has independent remove action, static variants remain span unless onClick supplied, no Ripple. Consumers: 10+ filter-chip occurrences in ChefOrdersPage, ChefWishesPage, GuestOrderPage, Admin/ChefDishesPage, AdminCategoriesPage, AdminUsersPage, OrderDetailPage; preference tags are candidate input-chip consumers.

#### `Chip.css` (primitive CSS, presentation)
**Analog:** `styles.css:143-150`.

```css
.filter-chip { padding: 6px 14px; border-radius: var(--md-radius-full); font-size: 0.8rem;
  font-weight: 500; background: var(--md-color-surface-container);
  color: var(--md-color-on-surface-variant); border: 1px solid var(--md-color-outline-variant);
  cursor: pointer; transition: all var(--md-motion-duration-short) var(--md-motion-easing-standard);
  position: relative; overflow: hidden; z-index: 0; }
.filter-chip:hover { color: var(--md-color-on-surface); border-color: var(--md-color-outline); }
.filter-chip.active { background: var(--md-color-primary); color: var(--md-color-on-primary);
  border-color: transparent; box-shadow: var(--md-elevation-1); }
```

**Deviations:** `.md-chip`, 32dp visual in 48dp interactive wrapper, secondary-container selected colors, reserved check slot to prevent width jitter, no `transition: all`, no Ripple, and four variant rules. Delete `.filter-chip` after migration. Consumers: all filter-chip sites listed for Chip.

## Shared Patterns

- **Tokens:** `frontend/src/css/tokens.css:143-190` is the source of truth for radius, spacing, elevation, motion, focus and state opacity. Primitive CSS must use `var(--md-*)`; no new hex/rgb values.
- **Interaction:** Base state layer uses isolation and explicit local stacking; native `disabled` is preferred and whole control opacity is 38%. Button/IconButton/FAB/Card own Ripple; Input and Chip do not.
- **Compatibility:** preserve native handlers, refs, controlled input behavior, `type="submit"` where forms need it, and the external Ripple API. `statusBadge()` remains in `utils/index.js`; only its old class names are adapted to Badge tones.
- **Migration gate:** before deleting selectors from `styles.css`, scan for old `btn-*`, `card`, `dish-card`, `wish-card`, `form-input`, `fab`, `badge-*`, and `filter-chip`; `.btn-search` is the sole intentional utility exception.
- **Non-primitive consumers:** Sidebar/Header/BottomBar keep their layout classes and are not fully redesigned in this phase, but their old Ripple/Icon/button call sites should import primitives where explicitly migrated. Page-level emoji cleanup remains deferred.

## No Analog Found

None. There is no existing slot-based Card, floating-label Input, multi-variant Chip, or SVG icon registry; their closest analogs above provide structure and event semantics, while the locked UI-SPEC provides the missing geometry.

## Metadata

**Analog search scope:** `frontend/src/components/`, `frontend/src/pages/`, `frontend/src/css/`, `frontend/src/utils/`.  
**Files scanned/read:** 17 requested analog files plus targeted page/form/util excerpts.  
**Pattern extraction date:** 2026-07-27

## PATTERN MAPPING COMPLETE
