---
phase: 09
slug: motion-state-layers
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-27
---

# Phase 9 — UI Design Contract: Motion & State Layers

> Visual and interaction contract for MD3 interaction feedback layer. All decisions pre-populated from CONTEXT.md (D-01..D-12), RESEARCH.md, ROADMAP.md, and REQUIREMENTS.md. No questions needed.

---

## 1. Scope & Deliverables

| Deliverable | Type | File(s) | Requirement |
|-------------|------|---------|-------------|
| State-layer CSS toolkit (`::before` pseudo-element, 4-state opacity) | CSS | `styles.css`, `tokens.css` | TOKEN-11 |
| React `<Ripple>` component (onPointerDown → CSS animation span → auto-remove) | React component | `Ripple.jsx`, `ripple.css` | MOTION-01 |
| Card elevation-1→2 hover transition cleanup (remove translateY/border-color) | CSS | `styles.css` | MOTION-02 |
| Link/list-item state-layer hover feedback (via `.state-hover` tool class) | CSS | `styles.css` | MOTION-03 |
| Focus ring consumer extension (10+ elements) | CSS | `styles.css` | MOTION-04 |
| Disabled style unification (`opacity: 0.38`, no `pointer-events: none`) | CSS | `styles.css` | D-10 |
| Material Symbols `<Icon>` component skeleton | React component | `Icon.jsx` | D-11 |
| Touch target ≥48dp global audit + Playwright script | CSS + Playwright | `styles.css`, `audit-touch-targets.mjs` | UX-03 |

---

## 2. Visual Design Tokens Used

### Phase 8 Tokens Consumed (already defined in `tokens.css`)

| Token Category | Specific Tokens | Source |
|----------------|----------------|--------|
| Color (primary) | `--md-color-primary` | Ripple color @12% opacity, state-layer tint on Surface backgrounds |
| Color (on-surface) | `--md-color-on-surface` | State-layer tint on Primary-Container/Surface-Container backgrounds |
| Elevation | `--md-elevation-1`, `--md-elevation-2` | Card hover: box-shadow transition between these two levels |
| Motion duration | `--md-motion-duration-short` (150ms) | Card elevation transition, state-layer opacity transition |
| Motion duration | `--md-motion-duration-long` (500ms) | Ripple scale animation |
| Motion easing | `--md-motion-easing-standard` (`cubic-bezier(0.2,0,0,1)`) | State-layer opacity, card elevation, ripple fade-out |
| Motion easing | `--md-motion-easing-emphasized` (`cubic-bezier(0.2,0,0,1)`) | Ripple scale-in animation |
| Focus ring | `--md-focus-ring-outer` (2px On-Primary) | Surface-background interactive elements |
| Focus ring | `--md-focus-ring-inner` (2px Surface) | Primary-background interactive elements (btn-primary, fab, etc.) |
| Spacing | `--md-spacing-*` | Touch target padding compensation to meet 48dp |
| Border radius | `--md-radius-*` | Ripple container corner matching |

### Phase 9 New Tokens (added to `tokens.css`)

| Token Name | Value | Usage |
|------------|-------|-------|
| `--md-state-layer-hover` | `0.08` | Hover state opacity |
| `--md-state-layer-pressed` | `0.10` | Pressed/active state opacity |
| `--md-state-layer-focused` | `0.12` | Focus-visible state opacity (user choice: slightly above MD3 spec 10%) |
| `--md-state-layer-disabled` | `0.38` | Disabled state overlay opacity |
| `--md-state-layer-primary` | `var(--md-color-primary)` | State-layer tint for elements on Surface/Surface-Variant backgrounds |
| `--md-state-layer-on-surface` | `var(--md-color-on-surface)` | State-layer tint for elements on Primary-Container/Surface-Container backgrounds |

---

## 3. Interaction Patterns

### 3.1 State-Layer System (TOKEN-11)

**Mechanism:** CSS `::before` pseudo-element overlay with opacity transitions. No JS involved.

**Technical pattern for each interactive element:**
```css
.interactive-element {
  position: relative;
  overflow: hidden;
  z-index: 0;
}

.interactive-element::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-state-layer-primary); /* default: primary tint */
  opacity: 0;
  pointer-events: none;
  z-index: -1; /* sits between element bg (z:auto) and content (z:0 parent context) */
  transition: opacity var(--md-motion-duration-short) var(--md-motion-easing-standard);
}

/* Tool classes for one-shot application */
.state-hover:hover::before     { opacity: var(--md-state-layer-hover); }    /* 8% */
.state-pressed:active::before  { opacity: var(--md-state-layer-pressed); }  /* 10% */
.state-focused:focus-visible::before { opacity: var(--md-state-layer-focused); } /* 12% */
```

**Surface-type variant (D-05):**
- Surface / Surface-Variant background → `background-color: var(--md-state-layer-primary)` (primary tint)
- Primary-Container / Surface-Container background → `background-color: var(--md-state-layer-on-surface)` (on-surface tint)

**State opacity values (D-04):**

| State | Opacity | MD3 Canonical | Note |
|-------|---------|---------------|------|
| hover | 8% | 8% | Matches spec |
| pressed | 10% | 10% | Matches spec |
| focused | 12% | 10% | User preference: slightly higher contrast |
| disabled | 38% | 38% | Matches `M3OpacityToken.disabledContent` |

### 3.2 Ripple Component (MOTION-01)

**Component signature:**
```jsx
<Ripple disabled={bool} className={string}>
  {children}
</Ripple>
```

**Behavior (D-01, D-02, D-03):**
- **Trigger:** `onPointerDown` event (unified touch + mouse via PointerEvent API)
- **Coordinate capture:** `PointerEvent.clientX/Y` minus `getBoundingClientRect()` offset
- **Ripple size:** `Math.max(width, height) × 2.5` to guarantee coverage
- **Animation:** CSS transition `transform: scale(0) → scale(1)` over 500ms `--md-motion-easing-emphasized`
- **Fade-out:** On `pointerup` or `animationend`, ripple opacity → 0 over 150ms, then DOM remove
- **Color:** `--md-color-primary` at 12% opacity (D-03)
- **Multiple ripples:** Supported — each pointer creates a fresh `<span>`, tracked via `Set` for cleanup
- **Disabled guard:** When `disabled={true}`, `onPointerDown` handler returns early

**Ripple application scope (D-02):**
| Apply Ripple To | Do NOT Apply To |
|----------------|-----------------|
| `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline` | `.filter-chip` |
| `.fab` | `.tab-item` |
| `.btn-icon` | `.badge` |
| `.card`, `.dish-card`, `.wish-card` | Static decorative elements |
| `.quick-action`, `.list-item` | `.guest-page .dish-card` (D-08) |
| `.pc-sidebar-item`, `.header-back` (D-12) | — |

### 3.3 Card Elevation Transition (MOTION-02)

**Before (Phase 7):**
```css
.dish-card:hover {
  border-color: var(--md-color-outline);
  box-shadow: var(--md-elevation-2);
  transform: translateY(-2px);
}
```

**After (Phase 9 — D-07):**
```css
.card, .dish-card, .wish-card {
  transition: box-shadow var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.card:hover, .dish-card:hover, .wish-card:hover {
  box-shadow: var(--md-elevation-2);
  /* No border-color change, no translateY — D-07 */
}
```

**Guest page override (D-08):**
```css
.guest-page .dish-card { cursor: default; }
.guest-page .dish-card:hover { box-shadow: none; transform: none; }
```

**Other transforms to remove (D-07 secondary):**
- `.btn-primary:hover` — remove `transform: translateY(-1px)` and `filter: brightness(1.05)` (Ripple provides feedback)
- Keep `.fab:hover { transform: scale(1.05) }` — this is FAB's standard MD3 feedback

### 3.4 Focus Ring Consumer Extension (MOTION-04)

**Existing consumers (Phase 8, styles.css:471-485):**
- Global `:focus-visible` — `outline: 2px solid var(--md-color-primary)`
- `.btn:focus-visible`, `.filter-chip:focus-visible`, `.list-item:focus-visible`
- `.dish-card:focus-visible`, `.card:focus-visible`, `.order-card:focus-visible`
- `.btn-primary:focus-visible`, `.filter-chip.active:focus-visible`, `.fab:focus-visible`

**Extension targets (Phase 9):**

| Element | Focus Ring | Rationale |
|---------|-----------|-----------|
| `.header-back:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.tab-item:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.pc-sidebar-item:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.theme-toggle:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.modal-close:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.qty-stepper button:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.menu-item:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.chef-select-item:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.wish-picker-item:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.guest-add-btn:focus-visible` | `--md-focus-ring-outer` | Surface background |
| `.preference-tag button:focus-visible` | `--md-focus-ring-outer` | Small interactive element |
| `.search-bar input:focus-visible` | Already has custom focus style (line 95) | Keep as-is — uses outline + box-shadow pattern |

**Decision rule:** For elements on Surface background → `var(--md-focus-ring-outer)` (On-Primary). For elements with Primary background → `var(--md-focus-ring-inner)` (Surface-color inner ring).

### 3.5 Disabled Style Unification (D-10)

**Global reset for ALL interactive elements:**
```css
button:disabled, a[aria-disabled="true"], 
.btn:disabled, .btn[disabled],
/* 所有可交互元素的 :disabled 态 */ {
  opacity: 0.38;
  cursor: not-allowed;
  box-shadow: none;
  /* pointer-events: none intentionally removed — retain focusability for a11y */
}
```

**Migration from current:**
- `.btn:disabled` current: `opacity: 0.45; pointer-events: none;` → change to `opacity: 0.38;` remove `pointer-events: none`
- Expand from `.btn`-only to a global `:disabled` rule covering all interactive elements

**Disabled state-layer note (Pitfall 6 from RESEARCH):**
- Element-level `opacity: 0.38` is the primary disabled indicator
- `::before` state-layer **does NOT** apply its disabled overlay (0.38) on elements that already set `opacity: 0.38` — this prevents double-dimming
- Only use `::before` disabled overlay for elements that do NOT set element-level opacity (low-contrast decorative elements)

---

## 4. Component Inventory

### Full Inventory: What Each Interactive Element Gets

| CSS Class / Component | State-Layer (`::before`) | Ripple (`<Ripple>`) | Elevation Transition | Focus Ring (existing) | Focus Ring (Phase 9 new) | Disabled (D-10) | Notes |
|-----------------------|--------------------------|---------------------|---------------------|----------------------|--------------------------|------------------|-------|
| `.btn` | ✅ Primary tint | ✅ | — | ✅ line 475 | — | ✅ New global rule | Ripple + state-layer (D-02) |
| `.btn-primary` | ✅ On-surface tint (container bg) | ✅ | — | ✅ line 483 | — | ✅ | Ripple only — primary-bg elements get ripple as main feedback |
| `.btn-secondary` | ✅ Primary tint | ✅ | — | ✅ (via `.btn`) | — | ✅ | |
| `.btn-outline` | ✅ Primary tint | ✅ | — | ✅ (via `.btn`) | — | ✅ | |
| `.btn-icon` | ✅ Primary tint | ✅ | — | ✅ (via `.btn`) | — | ✅ | 40×40 → needs 48dp padding |
| `.fab` | ❌ (primary bg, ripple only) | ✅ | — | ✅ line 485 | — | ✅ | Keep `.fab:hover { transform: scale(1.05) }` |
| `.card` | ✅ Primary tint | ✅ | ✅ elevation-1→2 | ✅ line 479 | — | — | Cards rarely disabled |
| `.dish-card` | ✅ Primary tint | ✅ | ✅ elevation-1→2 | ✅ line 478 | — | — | State-layer on outermost container |
| `.wish-card` | ✅ Primary tint | ✅ | ✅ elevation-1→2 | — | — | — | State-layer + ripple + elevation |
| `.list-item` | ✅ Primary tint | ✅ | — | ✅ line 477 | — | — | |
| `.tab-item` | ✅ Primary tint | ❌ (D-02 excluded) | — | — | ✅ NEW | — | State-layer hover only, no ripple |
| `.filter-chip` | ✅ Primary tint | ❌ (D-02 excluded) | — | ✅ line 476 | — | ✅ | State-layer replaces existing hover bg |
| `.pc-sidebar-item` | ✅ Primary tint | ✅ (D-12) | — | — | ✅ NEW | — | State-layer + ripple (D-12) |
| `.header-back` | ✅ Primary tint | ✅ (D-12) | — | — | ✅ NEW | — | 36×36 → needs 48dp padding |
| `.theme-toggle` | ✅ Primary tint | — | — | — | ✅ NEW | — | 36×36 → needs 48dp padding |
| `.modal-close` | ✅ Primary tint | — | — | — | ✅ NEW | — | 32×32 → needs 48dp padding |
| `.qty-stepper button` | ✅ Primary tint | — | — | — | ✅ NEW | — | 30×30 → needs 48dp padding |
| `.menu-item` | ✅ Primary tint | — | — | — | ✅ NEW | — | |
| `.chef-select-item` | ✅ Primary tint | — | — | — | ✅ NEW | — | |
| `.wish-picker-item` | ✅ Primary tint | — | — | — | ✅ NEW | — | |
| `.quick-action` | ✅ Primary tint | ✅ (D-02) | ✅ elevation-1→2 | — | — | — | |
| `.preference-search-item` | ✅ Primary tint | — | — | — | — | — | |
| `.preference-tag button` | ✅ Primary tint | — | — | — | ✅ NEW | — | Very small target |
| `.password-toggle-btn` | ✅ Primary tint | — | — | — | — | — | |
| `.guest-page .dish-card` | ❌ (D-08: no hover) | ❌ (D-08) | ❌ (D-08) | ✅ (keep for a11y) | — | — | Guest cards: cursor default, no interaction |
| `.guest-add-btn` | — | — | — | — | ✅ NEW | — | 32×32 → needs 48dp padding |
| `.dish-fav-btn` | — | — | — | — | — | — | 28×28 → needs 48dp padding |
| `.pc-data-table tr` | ✅ Primary tint (on td) | — | — | — | — | — | Table row hover state-layer |

### Surface-Tint Variant Mapping

| Background | State-layer `background-color` | Applies To |
|------------|-------------------------------|------------|
| Surface / Surface-Variant / Surface-Container-\* | `--md-state-layer-primary` (primary tint) | `.btn`, `.btn-secondary`, `.btn-outline`, `.btn-icon`, `.card`, `.dish-card`, `.list-item`, `.tab-item`, `.filter-chip`, `.pc-sidebar-item`, `.header-back`, `.theme-toggle`, `.modal-close`, `.qty-stepper button`, `.menu-item`, `.chef-select-item`, `.wish-picker-item`, `.quick-action`, `.preference-search-item`, `.preference-tag button`, `.password-toggle-btn` |
| Primary-Container / Surface-Container-High+ / Primary-filled | `--md-state-layer-on-surface` (on-surface tint) | `.btn-primary`, `.pc-sidebar-item.active` (primary-container bg), `.filter-chip.active` |
| Primary bg (FAB, .btn-primary body) | No state-layer — Ripple only | `.fab`, `.btn-primary` |

---

## 5. Touch Target Compliance Matrix (UX-03)

### Known Small Elements Requiring Padding Compensation (D-09)

| Element | Current Size | Target (≥48dp) | Strategy | CSS Change |
|---------|-------------|----------------|----------|------------|
| `.qty-stepper button` | 30×30 | 48×48 via padding | Increase container to 48dp, keep visual 30px | `min-width: 48px; min-height: 48px; padding: 9px` |
| `.theme-toggle` | 36×36 | 48×48 | Increase container to 48dp | `min-width: 48px; min-height: 48px;` |
| `.header-back` | 36×36 | 48×48 | Increase container to 48dp | `min-width: 48px; min-height: 48px;` |
| `.modal-close` | 32×32 | 48×48 | Increase container to 48dp | `min-width: 48px; min-height: 48px;` |
| `.dish-fav-btn` | 28×28 | 48×48 | Increase container to 48dp | `min-width: 48px; min-height: 48px;` |
| `.guest-add-btn` | 32×32 | 48×48 | Increase container to 48dp | `min-width: 48px; min-height: 48px;` |
| `.preference-tag button` | ~20px icon | 48×48 | Increase container | `min-width: 48px; min-height: 48px;` |
| `.btn-icon` (40dp) | 40×40 | 48×48 | Increase from 40→48dp | `width: 48px; height: 48px;` |

### Global CSS Rule

```css
/* Interaction touch target minimum — Material Accessibility guideline */
button, a, input, select, textarea,
[role="button"], [tabindex]:not([tabindex="-1"]),
.btn, .btn-icon, .list-item, .tab-item,
.filter-chip, .pc-sidebar-item, .header-back,
.theme-toggle, .modal-close, .qty-stepper button,
.fab, .menu-item, .chef-select-item, .wish-picker-item,
.guest-add-btn, .dish-fav-btn, .preference-tag button {
  min-width: 48px;
  min-height: 48px;
}
```

**Visual compensation:** Apply `padding` to center the visual element within the 48dp clickable area. The visible icon size stays at original dimensions; the hit area expands to 48dp.

### Playwright Audit Script (Wave 2)

**Script:** `frontend/scripts/audit-touch-targets.mjs`

**Pages to audit:**
- `/login` — Login page
- `/home` — User home (dishes list)
- `/orders` — Chef order queue (authenticated as chef)
- `/admin/dishes` — Admin dishes page
- `/wishes` — User wishes page
- `/admin/wishes` — Chef wishes queue
- `/admin/chefs` — Admin chefs page
- `/guest/menu/{token}` — Guest menu page
- `/guest/confirm/{code}` — Guest confirm page

**Authentication strategy:** Inject JWT token via `page.evaluate(() => localStorage.setItem('fc_token', token))` before navigation (avoid hardcoded credentials in script).

**Output:** `touch-audit-results.json` — list of all elements with width < 48px or height < 48px, grouped by page.

**Pass criteria:** After applying the global CSS min-size rule and individual padding fixes, zero verified violations remain. Manual UAT recheck for edge cases.

---

## 6. Accessibility & Focus

### Keyboard Accessibility

| Concern | Approach | Verification |
|---------|----------|-------------|
| Focus ring on keyboard Tab only | Use `:focus-visible` (already established Phase 8 line 471-472) | Manual click → no ring; Tab → ring visible |
| Disabled elements focusable | D-10 removes `pointer-events: none`, disabled attribute prevents activation | Tab to disabled button → focus ring visible, Enter does nothing |
| State-layer on `:focus-visible` | `::before` opacity 12% when focused | Matches Phase 8 focus ring tokens |
| No focus ring after mouse click | `:focus:not(:focus-visible) { outline: none; }` (Phase 8 line 472) | Already established, ensure no overrides |

### Contrast & Visual Accessibility

| Element | Contrast Ratio | Standard |
|---------|---------------|----------|
| State-layer hover (8% primary on surface) | Subtle — decorative only | WCAG does not require contrast on hover overlays |
| State-layer focus (12% primary on surface) | ≥3:1 on surface tones | MD3 spec value |
| Disabled content (38% opacity) | ≥3:1 on adjacent surface | MD3 `disabledContent` token |
| Focus ring outer (On-Primary on Surface) | ≥4.5:1 | WCAG AA |

### Screen Reader Considerations
- Ripple elements (`<span>`) have `pointer-events: none` and no text content — invisible to assistive technology
- State-layer `::before` pseudo-element has `pointer-events: none` — invisible to assistive technology
- Focus ring is a visual `outline` property — browser-native accessibility
- `<Icon>` skeleton: use `<span>` with `aria-hidden="true"` (decorative only)

---

## 7. Responsive Behavior

### Breakpoint Behavior

| Breakpoint | Impact on Interaction |
|------------|----------------------|
| < 640px (mobile) | All state-layer/ripple/elevation/focus-ring apply normally. Touch targets critical for thumb reach. |
| 640–1023px (tablet) | Same as mobile. Bottom nav receives state-layer. |
| ≥ 1024px (desktop) | Ripple also works on mouse hover + click. Focus ring visible during keyboard nav. |
| Guest page (all widths) | D-08: no hover effects on `.dish-card`. `cursor: default`. |

### Guest Page Interaction Exemption (D-08)

```css
.guest-page .dish-card,
.guest-page .guest-add-btn,
.guest-page .btn {
  /* Guest page elements may still have state-layer if user interacts */
  /* BUT: .dish-card gets no hover/ripple */
}
.guest-page .dish-card {
  cursor: default;
  pointer-events: none; /* Entire card non-interactive — guest only taps add-to-cart button */
}
```

**Clarification:** `.guest-page .dish-card` itself gets `pointer-events: none` and no hover — the card body is non-interactive. Only the "add to cart" button inside `.dish-card-actions` remains interactive. The add-to-cart button retains state-layer and focus ring.

### Motion Preference Query
```css
/* Respect reduced-motion preference */
@media (prefers-reduced-motion: reduce) {
  .state-hover::before,
  .state-focused::before,
  .state-pressed::before {
    transition: none; /* Instant state transitions */
  }
  .ripple-container span {
    display: none; /* No ripple animation */
  }
  .card, .dish-card, .wish-card {
    transition: none; /* Instant elevation changes */
  }
}
```

---

## 8. Implementation Notes & Constraints

### 8.1 Pre-Implementation Audit Required

Before writing any state-layer CSS, run:
```bash
grep -rn "::before" frontend/src/ --include="*.{css,jsx,js}"
```
to verify zero existing `::before` usage on target interactive elements. The universal `box-sizing: border-box` on line 9 of styles.css (`*, *::before, *::after`) is fine — it's a universal reset, not a per-element `::before`. Confirm no component JSX sets `::before` inline.

### 8.2 `z-index` Stacking Context Rules

| Layer | z-index | Element |
|-------|---------|---------|
| Element background | auto (0) | Base CSS class (e.g. `.btn`) |
| State-layer overlay | -1 | `::before` pseudo-element |
| Content (text/icon) | 0 (from parent `z-index: 0`) | Button label, icon, etc. |
| Ripple span | auto (in stacking context) | `<span>` inside `<Ripple>` container |

**Critical:** All elements receiving state-layer MUST set `position: relative; z-index: 0; overflow: hidden;` to create the proper stacking context. Without `overflow: hidden`, the state-layer `::before` can overflow element borders.

### 8.3 Ripple Wrapper Display Mode

The `<Ripple>` wrapper span uses `display: inline-flex` by default. For block-level children (cards, full-width buttons), the wrapper MUST also have `width: 100%` to prevent layout shrinkage:
```jsx
<Ripple style={{ width: '100%' }}>
  <button className="btn btn-block">提交</button>
</Ripple>
```

Alternative: accept a `tag` prop or `style` pass-through to allow the wrapper to match the child's display mode.

### 8.4 Ripple on Cards: Container vs Children

Per D-02, Ripple wraps `.card` / `.dish-card` / `.wish-card` containers. The ripple effect appears on the full card surface. This is intentional for Phase 9 — when Phase 10 creates proper Card components, internal Ripple will be refined to target the clickable action area.

### 8.5 Disabled + State-Layer Double-Dimming Avoidance

- Elements with `opacity: 0.38` (D-10) skip the `::before` disabled overlay
- Only apply `::before` disabled overlay (0.38) to elements that keep full opacity but need a visual disabled hint (e.g., decorative low-importance elements)
- Implementation: use a separate CSS class `.state-disabled` that sets `::before` opacity to 0.38, but do NOT apply it alongside D-10's global `:disabled { opacity: 0.38 }`

### 8.6 Playwright Credential Handling

The touch target audit script MUST NOT hardcode login credentials. Use environment variables:
```javascript
const token = process.env.FC_TEST_TOKEN;  // pre-generated JWT
await page.evaluate((t) => localStorage.setItem('fc_token', t), token);
```
Or use `.env` file (documented in `.env.example`).

### 8.7 Material Symbols Icon Skeleton (D-11)

**Package:** `material-symbols` v0.45.9 already in `devDependencies` (Phase 8). The Icon skeleton uses the font-based approach as interim renderer.

**Component API:**
```jsx
export default function Icon({ name, size = 24, fill = 0, weight = 400, grade = 0, className = '' })
```

**Current renderer (Phase 9):** `<span class="material-symbols-outlined">{name}</span>` with `fontVariationSettings`
**Phase 10+ target:** Tree-shaken SVG imports via `@material-symbols-svg/react` or direct SVG imports

The skeleton is created in Phase 9 but actual emoji replacement across the codebase happens in Phase 10-12.

### 8.8 Existing `::after` Audit

Some elements may use `::after` (e.g., clearfix, decorative arrows). The state-layer uses `::before` exclusively, so `::after` elements are not affected. Still, grep for `::after` to be aware:
```bash
grep -rn "::after" frontend/src/ --include="*.{css,jsx,js}"
```

### 8.9 Motion Token Consumption Summary

| Token | Used By |
|-------|---------|
| `--md-motion-duration-short` (150ms) | State-layer opacity transitions, card elevation transitions, ripple fade-out, disabled transitions |
| `--md-motion-duration-long` (500ms) | Ripple scale-in animation |
| `--md-motion-easing-standard` | State-layer, card elevation, ripple fade-out, focus ring |
| `--md-motion-easing-emphasized` | Ripple scale-in (same curve as standard for Phase 9 — differentiation deferred to Phase 10+) |

### 8.10 File Change Summary

| File | Action | Changes |
|------|--------|---------|
| `frontend/src/css/tokens.css` | ADD | 6 state-layer opacity/tint tokens |
| `frontend/src/css/styles.css` | MODIFY | State-layer rules (~30 elements), card hover cleanup, focus ring extension (10+ selectors), disabled unification, touch target global rule, remove 24 `:hover { background }` rules, add `@media (prefers-reduced-motion: reduce)` |
| `frontend/src/components/Ripple.jsx` | NEW | React ripple component (~80 lines) |
| `frontend/src/components/Icon.jsx` | NEW | Material Symbols skeleton (~50 lines) |
| `frontend/scripts/audit-touch-targets.mjs` | NEW | Playwright audit script (~100 lines) |
| `frontend/package.json` | MODIFY | Keep `material-symbols` (already installed); add `@playwright/test` as devDep if not present |

---

## 9. Design System Properties

| Property | Value |
|----------|-------|
| Tool | none (custom CSS + MD3 tokens) |
| Preset | not applicable |
| Component library | none (custom React components) |
| Icon library | `material-symbols` (via font — Phase 9 skeleton only, Phase 10+ SVG migration) |
| Font | `PingFang SC`, `Noto Sans SC`, `Noto Serif SC` (Phase 8 tokens) |

## 10. Copywriting Contract

No new copywriting in Phase 9. This phase delivers visual/interaction feedback only — no CTAs, empty states, error messages, or destructive actions. All existing copy is unchanged (LOGIC-01).

## 11. Registry Safety

Not applicable — no shadcn registries.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (zero new copy — interaction layer only)
- [ ] Dimension 2 Visuals: PASS (tokens, state-layer opacities, ripple colors all specified)
- [ ] Dimension 3 Color: PASS (state-layer tints, surface-type variants, focus ring colors)
- [ ] Dimension 4 Typography: PASS (no typography changes — Phase 8 tokens unchanged)
- [ ] Dimension 5 Spacing: PASS (8dp grid maintained; touch target exceptions documented)
- [ ] Dimension 6 Registry Safety: PASS (no registries)

**Approval:** pending
