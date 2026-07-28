---
phase: 12
slug: page-level-refactor-8dp-grid-human-uat
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-28
reviewed_at: 2026-07-28
created_by: gsd-ui-researcher
---

# Phase 12 — UI Design Contract

> Visual and interaction contract for **Page-Level Refactor + 8dp Grid + HUMAN-UAT**.
> This is the FINAL phase of v1.2 MD3 重构. Tokens / motion / primitives / composites shipped in Phases 8–11.
> This spec is NOT designing new components — it is **locking the final acceptance gates** that will be enforced by stylelint + CI grep + HUMAN-UAT.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (custom MD3 + CSS variables; not shadcn) |
| Preset | not applicable |
| Component library | Custom React primitives at `frontend/src/components/primitives/` (Button, IconButton, Card, Input, FAB, Badge, Chip, Ripple, Icon); composites at `frontend/src/components/composites/` (Modal, Sidebar, BottomBar, Snackbar/ToastContext, ListItem, Divider, Header) |
| Icon library | `@material-symbols-svg/react@0.13.0` (Material Symbols, SVG tree-shaking via Vite) — auto-discovered in `frontend/src/components/primitives/Icon.jsx` |
| Font | `--md-font-display: 'PingFang SC', 'Noto Serif SC', serif` (headers); `--md-font-body: 'PingFang SC', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif` (body) — `frontend/src/css/tokens.css:177-178` |
| Token source | `frontend/src/css/tokens.css` — single source of truth, locked in Phase 8 |

**Pre-populated from:** CONTEXT.md (Phase 8/9/10/11 canonical_refs); styles.css + tokens.css direct read; VERIFIED each `--md-*` token list above.

---

## Spacing Contract (UX-01 — 8dp Grid)

> **Enforcement target:** every padding / margin / gap / top / right / bottom / left / row-gap / column-gap value in `frontend/src/` MUST resolve to one of the 8 `--md-spacing-*` tokens. Hard-coded px is a CI failure.

### Declared Scale (multiples of 4)

| Token | Value | MD3 Slot | Reserved For |
|-------|-------|----------|--------------|
| `--md-spacing-1` | 4px | MD3 layout grid 4dp hairline | Icon gaps, ultra-compact padding |
| `--md-spacing-2` | 8px | MD3 layout grid 8dp | Compact element spacing (chip inner padding, menu-item vertical) |
| `--md-spacing-3` | 12px | MD3 layout grid 12dp | Form field horizontal padding, card grid row gap |
| `--md-spacing-4` | 16px | MD3 layout grid 16dp | Default card padding, section inner padding |
| `--md-spacing-5` | 24px | MD3 layout grid 24dp | Section spacing, major page section gap |
| `--md-spacing-6` | 32px | MD3 layout grid 32dp | Layout gaps, page padding |
| `--md-spacing-7` | 40px | MD3 layout grid 40dp | Hero block gaps, large component spacing |
| `--md-spacing-8` | 56px | MD3 layout grid 56dp | Page-level spacing, modal bottom safe area |

**Source:** `frontend/src/css/tokens.css:152-159` (Phase 8 D-Tokens-12, COMPLETE).

### Rounding Map for Off-Scale Source Values (D-GRID-01)

When source code has a non-standard value (e.g., legacy 10px / 14px / 18px), the planning agent **MUST round to the nearest token** per the table below. Visual micro-adjustment (≤ 2px) is acceptable — MD3 8dp grid compliance wins over pixel-fidelity.

| Source px | → Token | Value | Rationale |
|-----------|---------|-------|-----------|
| `1px` | keep bare `1px` | 1px | Border hairline only — not a spacing |
| `2px` | keep bare `2px` | 2px | Focus-ring outline-offset — not a spacing |
| `3px` | keep bare `3px` | 3px | Spinner border ring (decorative) |
| `4px` | `var(--md-spacing-1)` | 4px | 1:1 |
| `6px` | `var(--md-spacing-1)` | 4px | Round down (≤ 2px visual diff) |
| `8px` | `var(--md-spacing-2)` | 8px | 1:1 |
| `9px` | `var(--md-spacing-2)` | 8px | qty-stepper inner centering — round |
| `10px` | `var(--md-spacing-2)` | 8px | `.btn-search` padding, `.filter-section-label` margin |
| `12px` | `var(--md-spacing-3)` | 12px | 1:1 |
| `14px` | `var(--md-spacing-4)` | 16px | `ChefDishesPage` search row — round up |
| `16px` | `var(--md-spacing-4)` | 16px | 1:1 |
| `18px` | `var(--md-spacing-4)` | 16px | Rare inline padding — round down |
| `20px` | `var(--md-spacing-5)` | 24px | Modal padding row |
| `24px` | `var(--md-spacing-5)` | 24px | 1:1 |
| `32px` | `var(--md-spacing-6)` | 32px | 1:1 |
| `36px` | `var(--md-spacing-6)` | 32px | Search-input left padding — round (use 8/24 tokens) |
| `40px` | `var(--md-spacing-7)` | 40px | 1:1 |
| `44px` | `var(--md-spacing-2)` (inline) | 8px | Search-input left padding for icon — replace with `padding-left: var(--md-spacing-5)` (24dp) |
| `56px` | `var(--md-spacing-8)` | 56px | 1:1 |
| `60px` | `var(--md-spacing-8)` | 56px | `.guest-confirm` padding-top — round |
| `80px` | `var(--md-spacing-8)` (concept) | 56px | `.pc-main padding-bottom` — keep `80px` as BottomBar safe-area context (or migrate to `calc(var(--md-nav-height) + var(--md-spacing-4))`) |

### Forbidden (CI-failed)

- Any `padding|margin|gap|top|right|bottom|left|row-gap|column-gap: <num>px` where `<num>` is not in the scale above (exceptions: `1px` borders, `2px` outline-offset, `3px` spinner decorative)
- Any `padding|margin|gap: calc(...)` with embedded px values (use token arithmetic instead)
- Inline `style={{ padding: 12, gap: 8 }}` numeric literals (must be string `var(--md-spacing-N)`)

### Allowed Bare Px (Not Spacing)

- `1px` borders / divider lines (`.md-divider`, `.modal-header border-bottom`, `.ingredient-item border-bottom`)
- `2px` focus-ring `outline-offset` only
- `3px` `.loading-spinner` border decorative ring
- `80px` BottomBar safe-area padding (special: `--md-nav-height: 80px`, documented in `tokens.css:193`)

**Pre-populated from:** CONTEXT.md D-GRID-01..03; RESEARCH.md §3 (enumerated 242 declarations, 123 in styles.css alone). Uses status: **PENDING** (final gate ships in 12-01 / 12-02 plans).

---

## Shape Contract (TOKEN-13 — 5-Tier Radius)

> **Enforcement target:** no `border-radius: <num>px` outside the MD3 scale in any CSS file or JSX inline style. Stylelint blocks regressions; CI grep blocks legacy.

### Declared Scale

| Token | Value | Reserved For |
|-------|-------|--------------|
| `--md-radius-xs` | 8px | Tags, badges, dietary pills, ultra-small chips |
| `--md-radius-sm` | 12px | Buttons, inputs, selection controls, `.form-input` (legacy select) |
| `--md-radius-md` | 16px | Cards, FAB (Phase 8 D-08), Sidebar active-pill (currently `16px` hard-coded — to migrate), BottomBar active-pill (same) |
| `--md-radius-lg` | 24px | Modals, dialogs, large sheets |
| `--md-radius-xl` | 28px | X-large surface (unused; reserved) |
| `--md-radius-full` | 9999px | Pills, avatars, qty-stepper (circle) |

**Source:** `frontend/src/css/tokens.css:144-149` (Phase 8 D-04).

### Hard-Coded Residue Targets (D-RADIUS-01 + RESEARCH.md §4)

| File | Line | Current | Migration |
|------|------|---------|-----------|
| `frontend/src/components/composites/Sidebar.css` | 79 | `border-radius: 16px` (active-pill) | `var(--md-radius-md)` (1:1) |
| `frontend/src/components/composites/BottomBar.css` | 60 | `border-radius: 16px` (active-pill) | `var(--md-radius-md)` (1:1) |

**2 total hard-coded corners remaining.**

### Allowed Exceptions

- `0` (no radius, sharp corners, dividers)
- `50%` (circle — for avatars, fully circular buttons, ring loader)
- `9999px` (full pill — captured by `--md-radius-full`)

### Forbidden (CI-failed + stylelint-failed)

- `border-radius: <num>px` where `<num>` is a number other than in the scale
- Inline `style={{ borderRadius: '16px' }}` numeric literals (must be string `var(--md-radius-N)`)

### LoginPage 4px Residue (D-RADIUS-01 + Specifics line 255)

The user's reported "登陆页面的输入框还有 4px 直角残留" is **NOT in the current LoginPage input** — `LoginPage.jsx:49-70` uses `<Input>` primitive which already applies `var(--md-radius-sm)` (12px). The "4px 直角" memory likely refers to a stale Phase 8 pre-rename state.

What Phase 12 **MUST verify anyway** during HUMAN-UAT (Flow 1):

- LoginPage inputs render at 12px radius (`var(--md-radius-sm)`)
- LoginPage error states use `<Input error>` prop path
- `ForceChangePasswordPage` triple-password fields render at 12px

**Pre-populated from:** CONTEXT.md D-RADIUS-01, Specifics line 255; RESEARCH.md §4. Uses status: **PENDING** (2 files to migrate in 12-01-PLAN Task 2).

---

## Motion Contract (MOTION-05)

> **Enforcement target:** every `transition` / `animation` declaration MUST reference `var(--md-motion-duration-*)` + `var(--md-motion-easing-*)`. Decorative `spin` rotations use `linear` (mechanical, not MD3 transition).

### Declared Tokens

| Token | Value | Reserved For |
|-------|-------|--------------|
| `--md-motion-duration-short` | 150ms | State-layer opacity, focus ring, hover elevation transition, ripple fade-out |
| `--md-motion-duration-medium` | 250ms | Card elevation 1→2, sheet enter (default surface transitions) |
| `--md-motion-duration-long` | 500ms | Ripple expand, emphasized motion, page-level choreography |
| `--md-motion-easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default — all surfaces, opacity, color |
| `--md-motion-easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Emphasized — cards entering, FAB press, large surface transition |

> **NOTE:** Phase 8 D-12 set `standard` and `emphasized` to the same `cubic-bezier(0.2, 0, 0, 1)` per Google's MD3 spec simplification (only 2 curves: standard + emphasized-decelerate, both use the same bezier). Keep as-is; do NOT "fix" to add a separate emphasized value.

**Source:** `frontend/src/css/tokens.css:170-174` (Phase 8 D-12).

### Hard-Coded Duration Residue (D-MOTION-01 + RESEARCH.md §5)

| File | Line | Current | Token Target |
|------|------|---------|--------------|
| `frontend/src/components/primitives/Ripple.jsx` | 45-46 | `transition: transform 500ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms cubic-bezier(0.2, 0, 0, 1)` | `var(--md-motion-duration-long)` + `var(--md-motion-duration-short)` + `var(--md-motion-easing-emphasized)` |
| `frontend/src/contexts/ToastContext.jsx` | 63 | `animation: md-snackbar-in 0.3s var(--md-motion-easing-standard)` | `var(--md-motion-duration-medium)` (250ms ≈ 300ms MD3 enter) |
| `frontend/src/css/styles.css` | 140 | `animation: fadeInUp 0.5s ease-out both` | `var(--md-motion-duration-medium)` + `var(--md-motion-easing-emphasized)` (ease-out → standard MD3) |
| `frontend/src/css/styles.css` | 256 | `.loading-spinner { animation: spin 0.8s linear infinite }` | keep `linear` (mechanical); duration tokenisable as `var(--md-motion-duration-long)` — **planner's call** (0.8s established UX rhythm vs 500ms MD3-aligned) |
| `frontend/src/components/primitives/Button.css` | 102 | `animation: md-spin 0.8s linear infinite` (button loading spinner) | Same as above — `linear` keep, duration tokenisable |

**5 total hard-coded motion consumers.** Stagger delays (0.1s/0.2s/0.3s/0.4s in `styles.css:141`) and `prefers-reduced-motion` sentinels (`0.01ms` at line 483-485) are intentionally kept as bare values (decorative sequence + accessibility sentinel).

### Forbidden (CI-failed)

- `transition: ... <num>(s|ms)` literals in CSS (must use `var(--md-motion-duration-*)`)
- `animation: ... <num>(s|ms)` literals for non-spin animations (must use `var(--md-motion-duration-*)`)
- Bare `ease` / `ease-in` / `ease-out` / `ease-in-out` keyword easing tokens (must use `var(--md-motion-easing-{standard,emphasized})`)

### Allowed Exceptions

- `linear` easing for `spin` / mechanical rotation only
- Stagger animation delays (decorative sequences ≤ 500ms — bare `0.1s` is fine)
- `prefers-reduced-motion: 0.01ms` sentinel (a11y escape hatch)

**Pre-populated from:** CONTEXT.md D-MOTION-01; RESEARCH.md §5. Uses status: **PENDING** (5 hard-coded to migrate in 12-01-PLAN Task 3).

---

## Color & State-Layer Contract

> **Enforcement target:** all colors via `--md-color-*` tokens; state-layer opacity rules from Phase 9 D-04..D-06 must be the ONLY state-feedback mechanism on interactive surfaces.

### Color Roles (Phase 8 D-01..02, COMPLETE)

**Source:** `frontend/src/css/tokens.css:1-200` (full MD3 palette generated from key colors).

| Role | Token Pattern | Purpose |
|------|---------------|---------|
| Primary | `--md-color-primary` / `-on-primary` / `-container` / `-on-container` | Filled buttons, FAB, active indicators, brand emphasis |
| Secondary | `--md-color-secondary` / `-container` | Tonal buttons, secondary nav |
| Tertiary | `--md-color-tertiary` / `-container` | Warn tones, dietary dislike tag |
| Error | `--md-color-error` / `-container` | Destructive actions, allergies, error states |
| Surface | `--md-color-surface`, `-container-{lowest,low,medium,high,highest}` | Background tiers, card surfaces, modal scrim |
| Outline | `--md-color-outline`, `-outline-variant` | Borders, dividers, focus rings |
| Inverse | `--md-color-inverse-surface`, `-inverse-on-surface`, `-inverse-primary` | Snackbar dark surfaces |

### Accent Reservation (60/30/10 applied to MD3 container colors)

| Element (Accent reserved for) | Token |
|-------------------------------|-------|
| `<FAB>` filled body | `--md-color-primary-container` |
| `<Button variant="filled">` | `--md-color-primary` + `--md-color-on-primary` |
| Sidebar active-pill | `--md-color-primary-container` |
| BottomBar active-pill | `--md-color-secondary-container` |
| Status badge (warn) | `--md-color-tertiary-container` |
| Status badge (error) | `--md-color-error-container` |
| RIPPLE color | `--md-color-primary` (12% opacity) |

**Accent is NEVER used for:** body text, page backgrounds, card surfaces (use `--md-color-surface-*`), borders.

### State-Layer Rules (Phase 9 D-04..D-06, COMPLETE)

> All consumer in `frontend/src/components/primitives/base.css`. Token-driven — Phase 12 does NOT touch this layer (already shipped).

| State | Opacity | Background |
|-------|---------|------------|
| `hover` | `0.08` (8%) | `--md-state-layer-primary` (surface) or `--md-state-layer-on-surface` (container) |
| `pressed` | `0.10` (10%) | same |
| `focused` (`:focus-visible`) | `0.12` (12%) | same + `--md-focus-ring-{outer,inner}` |
| `disabled` | `0.38` (38%) | `opacity: 0.38` on whole element + `cursor: not-allowed` |

**Source:** `frontend/src/css/tokens.css:185-190` (Phase 9 D-04): `--md-state-layer-hover/pressed/focused/disabled/primary/on-surface`.

### Forbidden (CI-failed)

- Raw hex/rgb/hsl values in component CSS (only allowed in `tokens.css`)
- `:hover { background: <hex> }` without going through `::before` + state-layer opacity

### Allowed Exceptions

- `rgba(0,0,0,0.x)` shadow values in `--md-elevation-1..5` definitions (already tokenized)
- `currentColor` for icon stroke / fill inside `<Icon>` (MD3 spec — icons inherit text color)

**Pre-populated from:** Phase 8 tokens.css direct read. Status: **COMPLETE** (no Phase 12 changes to color/state-layer system).

---

## Iconography Contract

> **Enforcement target:** all page-level emoji replaced with `<Icon name="..." size={...} />`. Allowed inline character: structural separators only.

### Icon Component

`<Icon name={string} size={number} fill={0..1} weight={number} grade={number} />` at `frontend/src/components/primitives/Icon.jsx`. Internally maps `name → SVG component from @material-symbols-svg/react@0.13.0`.

### Current Coverage (Phase 10 D-07 + RESEARCH.md §6)

**30-icon baseline (Phase 10):**

```
home / search / add / edit / delete / check / close / restaurant / menu / person /
favorite / star / schedule / notifications / share / settings / logout / arrow-back /
arrow-forward / more-vert / more-horiz / chef / visibility / visibility-off / info /
warning / error / refresh / filter / sort / place
```

**3 new icons required (Phase 12 D-EMOJI-01):**

| Icon Name | Replaces | Purpose | Verified |
|-----------|----------|---------|----------|
| `new-label` | 🆕 | Matched-ingredient indicator (DishDetailPage) | ✅ `dist/icons/new-label.js` exists |
| `ramen-dining` | 🍲 | Soup-pot metaphor (empty state, chef pages) | ✅ `dist/icons/ramen-dining.js` exists |
| `circle` | 🔴 | Allergy/error dot (dietary warning) | ✅ `dist/icons/circle.js` exists |

### Emoji → Icon Mapping (D-EMOJI-01 + RESEARCH.md §6, 106 clusters / 41 unique)

| Emoji | Icon | Note |
|-------|------|------|
| 🍽️ / 🍳 / 🥗 / 🥩 / 🦐 / 🍎 | `set-meal` | Dish categories reuse |
| 📋 / 📦 | `inventory-2` | Order/wish containers |
| 🔍 | `search` | Already mapped |
| 👨‍🍳 / `chef` | `chef` → `soup-kitchen` (already aliased) | Keep existing |
| ✅ | `check` | Already mapped |
| 📝 | `edit` | Already mapped |
| 📭 | `mail` | Empty inbox / empty state default |
| 🥬 / 🍎 | `eco` | Vegetables / fruit reuse |
| 👥 | `group` | Already mapped |
| ❤️ / 💛 | `favorite` (filled, optional `style={{color:'yellow'}}`) | Already mapped |
| 🛒 | `shopping-cart` | Already mapped |
| 🆕 | **`new-label`** | NEW — add to Icon.jsx |
| ➕ | `add` | Already mapped |
| 📂 | `folder` | Already mapped |
| 📊 | `bar-chart` | Already mapped |
| 💡 | `lightbulb` | Already mapped |
| 🔒 | `lock` | Already mapped |
| 🧂 / 🧄 | `spa` | Seasoning reuse |
| ⚠️ | `warning` | Already mapped |
| 🍲 | **`ramen-dining`** | NEW — add to Icon.jsx |
| 😔 | `mood-bad` | Already mapped |
| 🔴 | **`circle`** | NEW — add to Icon.jsx |
| ⚙️ | `settings` | Already mapped |
| 🚪 | `logout` | Already mapped |
| ⚡ | `bolt` | Already mapped |
| 📅 | `schedule` | Already mapped |
| 📈 | `trending-up` | Already mapped |
| ❌ | `close` | Already mapped |
| 🚀 | `send` | Already mapped |
| 🙈 | `visibility-off` | Already mapped |
| 👁️ | `visibility` | Already mapped |

### Non-Icon Characters (KEEP)

| Char | Codepoint | Reason |
|------|-----------|--------|
| `·` | U+00B7 | Structural separator (list, breadcrumb) — character, not pictographic |
| `•` | U+2022 | Structural bullet — character |
| `…` | U+2026 | Ellipsis loading affordance — character |
| `›` `▼` `▲` | U+203A / U+25BC / U+25B2 | UI affordance glyphs — character |
| `✕` | U+2715 | Some Modal close paths use literal `✕`; PHASE 12 may migrate these to `<Icon name="close">` per Phase 11 discretion (preferred) |

### `<EmptyState>` API Change (D-EmptyState, RESEARCH.md §6)

Current: `icon = '📭'` (emoji literal default).
New: `icon = string | ReactNode`, defaulting to `<Icon name="mail" size={48} />`.

```
icon="mail"                     (string → <Icon>)
icon={<Icon name="search" />}   (already a ReactNode)
```

Breaking — 8 call sites need update. Acceptable scope (Phase 10 already audited EmptyState is internal).

### Loading Affordance

Replace any `加载中...` text-only indicator with `<CircularProgress />` MD3 progress (Phase 10 D-17 already provides `<Button loading>` with built-in spinner; page-level loading uses `<Loading>` component from `components/Loading.jsx` — verify it renders the spinner not text).

**Pre-populated from:** CONTEXT.md D-EMOJI-01; RESEARCH.md §6 (106 clusters / 31 files). Uses status: **PENDING** (3 new icons + 106 emoji sweeps in 12-01-PLAN Task 5).

---

## Typography Contract

> **Enforcement target:** all typography (font-family, font-size, font-weight, line-height) MUST route through `--md-font-*` tokens. No raw `font-size: <num>px` in component CSS (with documented exceptions).

### Declared Tokens (Phase 8 D-Tokens-12 + Phase 8 E-Typo)

| Token | Value | Reserved For |
|-------|-------|--------------|
| `--md-font-display` | `'PingFang SC', 'Noto Serif SC', serif` | Page titles, hero text, `.login-logo`, `.profile-name`, `.stat-value`, `.section-title` |
| `--md-font-body` | `'PingFang SC', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif` | All body text, form fields, buttons, lists |
| `--md-font-weight-medium` (in components, e.g. `Button.css`) | `500` | Body emphasis |
| `--md-font-weight-semibold` | `600` | Headings, labels |

**Source:** `frontend/src/css/tokens.css:177-178` (Phase 8 D-12 font stacks).

### Sizes (used in components)

Component-internal font sizes use MD3 typescale ratios, not tokens, because Phase 8 did NOT create `--md-typescale-*` (verified — grep returned 0 hits). **Agent's discretion for Phase 12:** add `--md-typescale-display-large: 57px ... --md-typescale-label-small: 11px` tokens OR continue with raw `font-size: 14px` style on primitives (more flexible, less token sprawl). **Recommendation:** KEEP primitives using raw `font-size` (already shipped) and ONLY require that font-size changes for content body go through component primitives, not inline styles.

> **Decision lock:** Phase 12 does NOT introduce new `--md-typescale-*` tokens. Existing component CSS is the canonical font-size source.

### Body Line Height

`body { line-height: 1.6; }` in `styles.css:11` — applies globally. Headings inherit but emphasize via weight + size, not separate line-height.

### Weight Limit (UX-05)

- Body: 400 (regular)
- Emphasis / label / button: 500 (medium)
- Heading / display: 600 (semibold)

No 700 / 800 / 900 weights are MD3 compliant — restrict to these 3 (regular / medium / semibold).

### Forbidden (CI-failed)

- `font-family: <literal>` in component CSS (must use `var(--md-font-*)`)
- `font-weight: 700` / `800` / `900` (MD3 compliance — use 400/500/600 only)
- Inline `style={{ fontSize: 16 }}` numeric literals (let component primitives decide)

### Allowed Exceptions

- `font-size: <num>px` in **`primitives/*.css`** files (Button / IconButton / Card / Input / FAB / Badge / Chip / ListItem own their MD3 typescale values — these are the canonical source)
- `.emojis` raw font sizing (e.g., emoji display in EmptyState via `<Icon size={48} />` prop — not via CSS font-size)

**Pre-populated from:** tokens.css direct read (Phase 8 D-12); Phase 10/11/12 components are the runtime source of truth. Status: **COMPLETE** for existing tokens; **PENDING** for HUMAN-UAT typographic walk-through.

---

## Touch Target Contract (UX-03)

> **Enforcement target:** every interactive element ≥ 48dp hit area. Min-width / min-height / padding compensation acceptable for visual preservation.

### Source

Phase 9 D-09 (COMPLETE) — global CSS rule + 7 padding-compensated elements (qty-stepper, theme-toggle, header-back, modal-close, dish-fav-btn, etc.).

### Verification Approach

**Playwright script:** `frontend/scripts/audit-touch-targets.mjs` (Phase 9 09-02 deliverable) — measures all 12 pages. Phase 12 EXTENDS this script (not replaces) for Ripple regression + 8dp sampling + Header-single check.

### Reserved Min Sizes

| Element | Min Width | Min Height | Notes |
|---------|-----------|------------|-------|
| `<Button>` (any variant) | 48px | 48px | MD3 button hit area |
| `<IconButton>` | 48px | 48px | Default FAB-density |
| `<IconButton size="default">` | 40px visual | 48px hit (via padding) | Compensated per Phase 9 |
| `<FAB>` | 56px | 56px | MD3 standard |
| `<FAB size="small">` | 40px | 40px | With active-area compensation if needed |
| `<ListItem>` (clickable) | full width | 56px+ | 1-line at least 56dp |
| `<Chip>` (clickable) | 48px | 32px (visual) + 16dp padding above/below = 48dp hit | MD3 spec |
| `<Sidebar>` item | 80px | 80px | MD3 nav rail item |
| `<BottomBar>` tab | full grid | 80px | MD3 nav bar |

### Forbidden (CI-failed)

- Any interactive element with hit area < 48dp×48dp WITHOUT padding compensation

**Pre-populated from:** Phase 9 D-09; RESEARCH.md §11 (Playwright extension plan). Status: **COMPLETE** in styles.css; **PENDING** Playwright extension in 12-02-PLAN.

---

## Component Adoption Contract (UX-02 — Phase 12 Final Gate)

> **Enforcement target:** every interactive surface on the page uses Phase 10/11 primitives. Zero legacy `.btn-*` / `.card-*` etc. classes remain in JSX or CSS.

### Required Primitives (must be used)

| Primitive | Location | Replaces |
|-----------|----------|----------|
| `<Button variant="filled\|tonal\|outlined\|text" size="sm\|md\|lg">` | `frontend/src/components/primitives/Button.jsx` | `.btn-primary` / `.btn-secondary` / `.btn-outline` / `.btn-sm` / `.btn-lg` |
| `<IconButton>` | `frontend/src/components/primitives/IconButton.jsx` | `.btn-icon` (visual) |
| `<FAB variant="standard\|extended" size="default\|small">` | `frontend/src/components/primitives/FAB.jsx` | `.fab` (visual; placement class is OK) |
| `<Card variant="elevated\|filled\|outlined">` | `frontend/src/components/primitives/Card.jsx` | `.card` (top-level), `.dish-card` (top-level), `.wish-card` (top-level) |
| `<Input variant="outlined\|filled" label? error?>` | `frontend/src/components/primitives/Input.jsx` | `.form-input` (non-select) |
| `<Modal variant="basic\|full-screen">` | `frontend/src/components/composites/Modal.jsx` | `.modal-overlay` / `.modal-content` / `.modal-header` / `.modal-body` / `.modal-footer` / `.modal-close` |
| `<SnackbarProvider>` + `useToast()` | `frontend/src/contexts/ToastContext.jsx` | `.toast` / `.toast-success` / `.toast-error` + `Toast` UI |
| `<Sidebar>` | `frontend/src/components/composites/Sidebar.jsx` | `.pc-sidebar(-item\|header\|logo\|subtitle\|nav\|footer\|user\|icon\|footer-actions)` |
| `<BottomBar>` | `frontend/src/components/composites/BottomBar.jsx` | `.bottom-bar` / `.tab-item` / `.tab-icon` / `.tab-label` |
| `<ListItem variant="1-line\|2-line\|3-line">` | `frontend/src/components/composites/ListItem.jsx` | `.list-item(img\|info\|name\|meta)` |
| `<Divider>` (or inset) | `frontend/src/components/composites/Divider.jsx` | Inherited `.list-item { border-bottom }` |
| `<Icon name size>` | `frontend/src/components/primitives/Icon.jsx` | All inline emoji (`📭`, `🍽`, `📊`, etc.) |
| `<Badge variant="assist\|filter\|state" tone>` | `frontend/src/components/primitives/Badge.jsx` | `.badge-(warn\|danger\|success\|info\|accent\|gold\|muted\|count)` |
| `<Chip variant="assist\|filter\|input\|suggestion">` | `frontend/src/components/primitives/Chip.jsx` | `.filter-chip` |

### Zero-Residue Classes (CI grep MUST return 0)

Each of the following must have **0 CSS selector definitions** in `frontend/src/css/styles.css` + `frontend/src/css/App.css` AND **0 JSX className consumers** in `frontend/src/`:

```
.btn-primary  .btn-secondary  .btn-outline  .btn-icon  .btn-sm  .btn-lg
.card  .dish-card  .dish-card-*  .wish-card  .wish-card-*  .guest-dish-card*
.badge-warn  .badge-danger  .badge-success  .badge-info  .badge-accent
.badge-gold  .badge-muted  .badge-count
.filter-chip
.modal-overlay  .modal-content  .modal-header  .modal-body  .modal-footer  .modal-close
.pc-sidebar(-item|header|logo|subtitle|nav|footer|user|icon|footer-actions)
.bottom-bar  .tab-item  .tab-icon  .tab-label
.list-item(img|info|name|meta)
.toast  .toast-success  .toast-error  @keyframes slideDown
```

### Known Intentional Residuals (documented as DEVIATIONS in 12-UAT-REPORT.md)

| Class | Why Kept | Plan |
|-------|----------|------|
| `.form-input` | Used by **9 `<select className="form-input">` sites** (AdminDishesPage.jsx:886/1053/1064; ChefDishesPage.jsx:909/1078/1089; OrderPage.jsx:338/645; AdminIngredientsPage.jsx:497/615/627/639; AdminCategoriesPage.jsx:230; AdminUsersPage.jsx:304/313). **Select primitive NOT in v1.2 scope** (deferred per Phase 11 D-15 — only ListItem shipped). The `.form-input` rule already uses `var(--md-radius-sm)` (12px) — **not a TOKEN-13 violation**. | Document as scope deviation. Future phase: `<Select>` primitive. |
| `.fab` (placement class) | 1 site: `pages/UserWishesPage.jsx:332` uses `<FAB icon="add" variant="extended" label="新建愿望" className="fab" />`. The `.fab` class is **reduced to placement-only** (Phase 10 D-09): `position: fixed; bottom: calc(var(--md-nav-height) + var(--md-spacing-4)); right: var(--md-spacing-5); z-index: 150;`. Visual is `.md-fab` primitive. | Keep — design-intentional (per Phase 10 D-09). Document in UAT-REPORT. |
| `.btn-search` (utility class) | 6 sites: `AdminDishesPage.jsx`, `AdminIngredientsPage.jsx`, `ChefDishesPage.jsx`. Compact search button variant (4dp / 8dp padding). The class itself is fine — but its internal `padding: 4px 10px` MUST be tokenised to `padding: var(--md-spacing-1) var(--md-spacing-2)` per D-GRID-01. | Migrate padding to tokens (12-01-PLAN Task 1 is in scope). |
| `.pc-main padding-bottom: 80px` | 1 site. BottomBar safe-area context — value matches `--md-nav-height: 80px`. | Migrate to `padding-bottom: var(--md-nav-height)` (12-01-PLAN Task 1). |

### Required Verification

```
# Test command
grep -rnE "className=['\"][^'\"]*\b(btn-primary|btn-secondary|btn-outline|btn-icon|card\b|dish-card\b|wish-card\b|form-input\b|badge-(warn|danger|success|info|accent|gold|muted|count)|filter-chip\b|modal-(overlay|content|header|body|footer|close)|pc-sidebar(-item|...)|bottom-bar\b|tab-item\b|list-item\b|toast\b|tab-icon|tab-label)\b" frontend/src/

# Expected output
(empty)

# Same for CSS defs
grep -rnE "\.(btn-primary|btn-secondary|btn-outline|btn-icon|btn-sm|btn-lg|card\b|dish-card\b|wish-card\b|form-input|badge-(warn|danger|success|info|accent|gold|muted|count)|filter-chip|modal-(overlay|content|header|body|footer|close)|pc-sidebar(-item|header|logo|subtitle|nav|footer|user|icon|footer-actions)|bottom-bar\b|tab-(item|icon|label)\b|list-item\w*|toast\w*)\b" frontend/src/css/

# Expected output
(empty)
```

**Pre-populated from:** CONTEXT.md D-AUDIT-01 (verbatim grep); RESEARCH.md §7 (13 of 13 categories clean post-Phase 11 except 4 documented residuals). Status: **PENDING** (final audit in 12-02-PLAN Task 1).

---

## Layout Contract (UX-01 + UX-02, Page-Level)

> **Enforcement target:** page-level padding/margin/gap/grid all in 8dp grid; section rhythm consistent across the app.

### Page Container

```
.page-container {
  width: 100%;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--md-color-surface);
  position: relative;
  padding-bottom: var(--md-nav-height);  /* safe area for mobile BottomBar */
}

@media (max-width: 639px) {
  .page-container { max-width: 420px; box-shadow: var(--md-elevation-3); }
}
```

(Already in `styles.css:18-19`. Verify during 12-01 audit.)

### Responsive Gutters

| Breakpoint | Width | Section Spacing | Card Grid Gap |
|------------|-------|-----------------|---------------|
| Mobile (< 420px) | 100% / 420px-max | `var(--md-spacing-4)` (16dp) | `var(--md-spacing-2)` (8dp) |
| Tablet (420-768px) | 100% / 768px-max | `var(--md-spacing-5)` (24dp) | `var(--md-spacing-3)` (12dp) |
| Desktop (> 768px) | 100% / 1200px-centered | `var(--md-spacing-5)` (24dp) | `var(--md-spacing-4)` (16dp) |

**Source:** existing media queries at `frontend/src/css/styles.css`. Phase 12 verify doesn't break.

### Section Spacing (Page-Level)

| Section Type | Token | Value |
|--------------|-------|-------|
| Hero / page header | `var(--md-spacing-6)` | 32dp top/bottom |
| Major section break | `var(--md-spacing-5)` | 24dp top/bottom |
| Card list vertical gap | `var(--md-spacing-3)` | 12dp |
| Card grid horizontal gap | `var(--md-spacing-2)` or `-3` | 8-12dp responsive |
| Inline label / text gap | `var(--md-spacing-2)` | 8dp |

### Card Grid Pattern

```
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--md-spacing-3);  /* 12dp default */
}

@media (max-width: 639px) {
  .card-grid { gap: var(--md-spacing-2); }  /* 8dp mobile */
}
```

> **Decision lock:** keep auto-fill grid pattern (verified in `styles.css` existing rules). Phase 12 does NOT redesign layout system.

### Modal Padding (Page-Level)

- Modal inner padding: `var(--md-spacing-5)` (24dp) horizontal, `var(--md-spacing-4)` (16dp) vertical
- Modal action row spacing: `var(--md-spacing-3)` (12dp) gap between buttons

**Pre-populated from:** Phase 8 + Phase 11 layout tokens; `styles.css` direct read. Status: **PENDING** (12-01-PLAN Task 1 sweep).

---

## HUMAN-UAT Visual Gates (D-UAT-01..04 — 6 Flows)

> **Enforcement target:** all 6 flows pass visual MD3 compliance + functional regression (zero business-logic breakage).

### Gate Definition

Each flow must pass **both**:

1. **Visual compliance** — 6-dimension walkthrough (spacing / radius / motion / color / state-layer / typography all conform to this UI-SPEC)
2. **Functional regression** — original business flow completes without breakage (button clicks fire, data persists, navigation works, JWT auth works)

### Flow 1 — Register / Login (D-UAT-01 §1, F1)

**Touchpoints:**
- `pages/LoginPage.jsx`
- `pages/ForceChangePasswordPage.jsx` (if first-login redirect)

**Visual must-haves:**
- Login card uses `--md-color-surface-container-lowest` background, `--md-radius-lg` (24px) corners, `--md-elevation-3` shadow
- Inputs are `<Input>` primitive — `--md-radius-sm` (12px) corners, floating labels
- `<ThemeToggle>` (top-right of login card) works — click flips `[data-theme]` and re-renders
- Login button (`<Button variant="filled">`) has Ripple on click; focus ring visible on Tab
- Logo `家味` uses `var(--md-font-display)`, size 2rem

**Functional regression:**
- Login → access token stored → redirect to role home
- Force change password (if applicable) → new password accepted → access re-granted

### Flow 2 — Dish CRUD (D-UAT-01 §2, F2)

**Touchpoints:**
- `pages/AdminDishesPage.jsx`
- `pages/ChefDishesPage.jsx`
- `pages/DishDetailPage.jsx`

**Visual must-haves:**
- Dish cards use `<Card variant="elevated">` with elevation-1→2 hover transition (`--md-motion-duration-short` + standard easing)
- Card grid gap: `var(--md-spacing-3)` (12dp desktop), `var(--md-spacing-2)` (8dp mobile)
- Edit / delete IconButtons in card actions use `<Icon>` (not text emoji)
- Search input: `.btn-search` utility with tokenized `padding: var(--md-spacing-1) var(--md-spacing-2)`
- Ripple on every primary CTA

**Functional regression:**
- Admin creates dish with image upload → persists in DB
- Chef publishes/unpublishes → status reflects on user-visible list
- Detail page shows dietary warning card if applicable

### Flow 3 — Order Create (D-UAT-01 §3, F3)

**Touchpoints:**
- `pages/OrderPage.jsx`
- `pages/OrderDetailPage.jsx`
- `pages/UserOrdersPage.jsx`
- `pages/ChefOrdersPage.jsx`

**Visual must-haves:**
- Cart bar at bottom uses fixed positioning with `var(--md-nav-height)` safe area
- Dish cards in OrderPage use `<Card>` primitive
- Order submit button uses `<Button loading={isPending}>` — shows spinner not "提交中..." text
- Order cards use `<ListItem variant="3-line">` (where order list appears)
- Ripple works on every action button

**Functional regression:**
- User adds multiple dishes → submits → auto-split by chef per order_service.create_order_auto_split
- Order detail loads with right items / right chef
- Chef status update persists

### Flow 4 — Wish Lifecycle (D-UAT-01 §4, F4)

**Touchpoints:**
- `pages/UserWishesPage.jsx`
- `pages/ChefWishesPage.jsx`
- `pages/AdminWishesPage.jsx`

**Visual must-haves:**
- Wish cards use `<Card variant="elevated">` — domain wrapper at `components/WishCard.jsx`
- Status badges use `<Badge variant="state" tone={...}>` mapping per Phase 10 D-15 (semantic tones for pending / 准备中 / 已上架 / 已拒绝 / 已撤销)
- Action buttons (claim / advance / reject) use `<Button>` or `<IconButton>` with Ripple
- Deep-link highlight via `?wish=:id` works (Phase 7 07-05 fix)
- FAB for "新建愿望" uses `<FAB variant="extended" label="新建愿望" className="fab" />` — placement class OK

**Functional regression:**
- User submits wish → chef sees in queue
- Chef claims → status flips to 准备中 + Feishu push
- Chef advances (links dish) → status 已上架
- Chef rejects (with reason) → status 已拒绝
- User can cancel own non-published wish

### Flow 5 — Guest Order (D-UAT-01 §5, F5)

**Touchpoints:**
- `components/InvitationsSection.jsx` (inside `pages/UserProfilePage.jsx`)
- `pages/GuestOrderPage.jsx`

**Visual must-haves:**
- Mobile viewport (≤ 420px) is the canonical view
- All interactive elements ≥ 44dp hit area (relaxed from 48dp for mobile per Material Accessibility guideline for guest flow)
- Ripple works on mobile touch
- Guest dish cards disable hover (`cursor: default; transform: none;`) per Phase 9 D-08
- No Sidebar / BottomBar in guest viewport (Phase 11 D-13)

**Functional regression:**
- User creates invitation → one-time URL returned
- Guest opens URL on phone → can browse all published dishes
- Guest submits order → chef sees with `is_guest` badge
- Token consumed / link expires after use

### Flow 6 — Preferences (D-UAT-01 §6, F6)

**Touchpoints:**
- `pages/PreferencesPage.jsx`

**Visual must-haves:**
- Taste chips (dislikes / allergies) use `<Chip variant="filter">` with state-layer hover
- Add chip input uses `<Input variant="outlined">` with tokenized radius
- Remove (✕) button uses `<IconButton>` size="default"
- Ripple on all chips
- `<Button loading={isPending}>` on save

**Functional regression:**
- User adds dislike/allergy → persists in preferences API
- Page reflects changes immediately after save
- Removed chip → API delete succeeds

### UAT Report Format

```
File: .planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UAT-REPORT.md

Per flow:
- Flow [N] — [Name]
  - Screenshots: [link to N.png ×N]
  - Visual issues: [bullets — each with screenshot annotation]
  - Functional issues: [bullets]
  - Pass/Fail: [PASS | FAIL — fix in 12-02]
```

**Pre-populated from:** CONTEXT.md D-UAT-01..04 (verbatim). Status: **PENDING** (human walkthrough in 12-02-PLAN Task 3).

---

## Bug-Fix Visual Contracts (D-BUG-01..02)

> **Enforcement target:** 2 v1.2 regression bugs fixed in 12-00-BUGFIX plan, then verified visually + programmatically.

### D-BUG-01: Ripple Click Propagation

**Symptom:** All `<IconButton>` / `<Button>` mouse-click fails (no click handler fire); keyboard `Tab + Enter` works.

**Root cause (RESEARCH.md §1, HIGH confidence):**

```
Ripple.jsx:74-83 wraps children in <span class="md-ripple-layer">
  base.css:32-37 sets .md-ripple-layer { pointer-events: none; isolation: isolate; overflow: hidden; }
  base.css:26-29 sets .md-interactive > :not(.md-ripple-layer) { z-index: 2 }
```

The redundant span layer creates a stacking-context trap that swallows `pointerdown` events on the inner `<button>` in some Chrome layouts.

**Fix:** REFACTOR `<Ripple>` to two-mode API (`mode="wrap"` default for external consumers + `mode="self"` for primitive button wrappers). Option 3 in RESEARCH.md §1 — uses `React.cloneElement` to inject `onPointerDown` directly on the child `<button>`, removing the stack-trap span.

**Visual contract for fix:**
- Button click registers as `click` event on `<button>` (not on span wrapper)
- Ripple visual still renders correctly (pointer coordinates, expand, fade)
- Keyboard Tab + Enter path continues to work
- Focus ring + state-layer unaffected
- External consumers (`Sidebar`, `BottomBar`, `ListItem`, `Card` clickable variants) still work via `mode="wrap"` default

**Verification (Playwright in 12-02):**
```
Test: page.click('button[aria-label="..."]')
Assert: parent state changes (Snackbar closes, sidebar navigates, search clears)
```

### D-BUG-02: Sidecar Header Duplicate

**Symptom:** DOM contains two `<header>` elements per page:
1. `/html/body/div/div/header` — `App.jsx:80` PcLayout's `<Header />` (Phase 11 COMPO-09)
2. `/html/body/div/div/main/div/header` — page-level `<Header title="...">` (21 sites)

**Fix per D-BUG-02:** KEEP page-level header; DELETE PcLayout's `<Header />` from `App.jsx:80`.

**Relocation for theme toggle + logout (was in Sidecar Header dropdown):** add to `<Sidebar>` footer (per RESEARCH.md §2 recommendation). Sidebar CSS already has `.md-sidebar__footer` padding 8px 0, so two ripple-wrapped icon buttons stack naturally.

**Visual contract for fix:**
- Exactly ONE `<header>` element per page (verified via `document.querySelectorAll('header').length === 1`)
- Theme toggle visible in Sidebar footer (light/dark icon swap based on current theme)
- Logout button visible in Sidebar footer
- LoginPage keeps its existing `<ThemeToggle />` (no change)
- Mobile BottomBar already has logout as a tab (no change)

**Verification (Playwright in 12-02):**
```
Test: page.evaluate(() => document.querySelectorAll('header').length)
Assert: === 1
```

**Pre-populated from:** CONTEXT.md D-BUG-01..02; RESEARCH.md §1..§2. Status: **PENDING** (12-00-BUGFIX execution before 12-01).

---

## Enforcement Layer (CI / Stylelint / Grep)

> **Enforcement target:** three concentric gates prevent regression — stylelint for live-feedback, npm scripts for CI integration, HUMAN-UAT as final gate.

### stylelint Setup (D-RADIUS-01 + D-FILE-01)

**New file:** `frontend/.stylelintrc.json`

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
      ]
    }
  },
  "ignoreFiles": [
    "node_modules/**/*",
    "dist/**/*"
  ]
}
```

**stylelint scope:** ONLY `border-radius` rule on this initial rollout. Other properties (width, padding, font-size) remain coverage of grep CI scripts — keeps the long-running feedback loop tight.

**New dependencies (package.json devDependencies):**

```
stylelint@^16.0.0
stylelint-config-standard@^36.0.0
```

> **Note:** Planners MUST verify exact versions with `npm view stylelint version` before installing (RESEARCH.md Open Question §14.1 — context7 claim based on training data).

### CI Grep Script (D-GRID-03 + D-FILE-02)

**New file:** `frontend/scripts/check-m3-tokens.sh` (rename from existing `scripts/check-tokens.sh`, extend with Check #8-10)

**Existing checks (Phase 8):**
- Check #1-2: old token names
- Check #3: hex colors outside `tokens.css`
- Check #4: raw `rgba()` in `styles.css`
- Check #5: `border-radius: <N>px` in `styles.css`
- Check #6: `borderRadius: <N>px` in JSX
- Check #7: tokens.css completeness

**Phase 12 additions:**
- Check #8: hard-coded `padding|margin|gap: <N>px` outside `--md-spacing-*` across all CSS + JSX
- Check #9: hard-coded `transition: ... <N>(s|ms)` across CSS
- Check #10: emoji cluster (`\X` grapheme + Extended_Pictographic) in JSX outside primitives/ + EmptyState

**Script template:**

```bash
#!/usr/bin/env bash
set -euo pipefail
FRONTEND_DIR="frontend"
FAIL=0

check() {
  local label="$1"
  local output="$2"
  if [ -n "$output" ]; then
    echo "❌ FAIL: $label"
    echo "$output" | head -20
    echo "..."
    FAIL=1
  else
    echo "✅ PASS: $label"
  fi
}

# Check #8: hard-coded spacing
SPACING_OUTPUT=$(rg -n --no-heading "(padding|margin|gap|top|right|bottom|left|row-gap|column-gap)\s*:\s*[0-9]+px" \
  "$FRONTEND_DIR/src/css/" "$FRONTEND_DIR/src/components/" "$FRONTEND_DIR/src/pages/" \
  | rg -v "var\(--md-spacing" | rg -v "// " || true)
check "硬编码 padding/margin/gap px (Check #8)" "$SPACING_OUTPUT"

# Check #9: hard-coded motion duration
MOTION_OUTPUT=$(rg -n --no-heading "transition[^:]*:\s*[^;]*[0-9]+(s|ms)" \
  "$FRONTEND_DIR/src/css/" "$FRONTEND_DIR/src/components/" || true)
check "硬编码 transition 时长 (Check #9)" "$MOTION_OUTPUT"

# Check #10: emoji in JSX pages + composites
EMOJI_OUTPUT=$(rg -lP --no-heading "(?=\p{Extended_Pictographic})\X" \
  "$FRONTEND_DIR/src/pages/" "$FRONTEND_DIR/src/components/composites/" 2>/dev/null \
  | rg -v "EmptyState" || true)
check "页面/组件 emoji 残留 (Check #10)" "$EMOJI_OUTPUT"

exit $FAIL
```

**Wired into npm:**

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:css": "stylelint \"frontend/src/**/*.css\"",
    "check:md3": "bash frontend/scripts/check-m3-tokens.sh",
    "check:all": "npm run lint && npm run lint:css && npm run check:md3"
  }
}
```

### CI Verification Stack (D-UAT-03)

Four gates must all return 0 for HUMAN-UAT to claim "all green":

| Gate | Tool | Pass Criteria |
|------|------|---------------|
| ESLint | `npm run lint` | 0 new errors (baseline ≥90 errors per STATE.md; Phase 12 must not increase) |
| Vite Build | `npm run build` | 0 errors |
| Stylelint | `npm run lint:css` | 0 errors |
| MD3 grep | `npm run check:md3` | 0 violations across Check #1-10 |
| Playwright | `node scripts/audit-md3-compliance.mjs` | Ripple + single-Header + 8dp sampling all green |

### Playwright Compliance Script (D-UAT-02 — NEW)

**New file:** `frontend/scripts/audit-md3-compliance.mjs`

Three test families:

1. **Ripple click regression** — click `<IconButton>` selectors via `page.click()`, assert parent state changes (Snackbar closes, sidebar navigates, search clears) → catches D-BUG-01
2. **Single Header check** — `document.querySelectorAll('header').length === 1` on each page → catches D-BUG-02
3. **8dp grid sampling** — sample 10 random elements per page for `padding` / `margin` / `gap` computed values; assert multiples of 4 (border 1-3px excluded) → catches D-GRID-01

**Extends:** Phase 9 `audit-touch-targets.mjs` for Ripple click target contexts.

**Output:** `frontend/scripts/md3-compliance-results.json` (parsed by UAT-REPORT.md generator)

### HUMAN-UAT Gate Stack (D-UAT-03)

Final 4 stacked gates:

1. **Manual browser walkthrough** — user runs Chrome DevTools across 6 flows, records issues to UAT-REPORT.md
2. **`npm run check:all`** — lint + stylelint + check:md3 + build all green
3. **Playwright DOM check** — Ripple click + single-Header + 8dp sampling
4. **Console clean** — Chrome DevTools Console shows 0 warnings / errors during all 6 flows

**All 4 must pass before v1.2 milestone closure.**

**Pre-populated from:** CONTEXT.md D-FILE-01..02, D-AUDIT-01, D-UAT-02..03; RESEARCH.md §8..§9 + §11. Status: **PENDING** (12-01-PLAN Tasks 6/7 + 12-02-PLAN Tasks 1/2/3).

---

## Spacing & Layout — Page-Level Examples (Appendix)

### Card Grid Pattern

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--md-spacing-3);
}

@media (max-width: 639px) {
  .card-grid { gap: var(--md-spacing-2); }
}
```

### Section Rhythm

```css
.page-section { margin-bottom: var(--md-spacing-5); }
.page-section-title { margin-bottom: var(--md-spacing-3); }
```

### Modal Padding

```css
.md-modal__body { padding: var(--md-spacing-4) var(--md-spacing-5); }
.md-modal__actions { gap: var(--md-spacing-3); }
```

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: **N/A — phase is gate-locking, not new copy design** (Chinese error / button labels retained per CONVENTIONS §"Language"; LOGIC-01 frozen)
- [ ] Dimension 2 Visuals: PASS — MD3 visual contract locked via token enforcement
- [ ] Dimension 3 Color: PASS — full `--md-color-*` palette enforced
- [ ] Dimension 4 Typography: PASS — `--md-font-*` + component primitives enforced
- [ ] Dimension 5 Spacing: PASS — 8dp grid enforced via Check #8
- [ ] Dimension 6 Registry Safety: **N/A — no new components, no third-party registries**

**Approval:** pending — gated by 12-00-BUGFIX (Ripple + Header) → 12-01-PLAN (token sweeps) → 12-02-PLAN (UAT 6-flow pass)

---

## Pre-Population Audit

| Section | Source | Decisions Used | Status |
|---------|--------|----------------|--------|
| Design System | tokens.css direct read, Phase 10/11 CONTEXT | 7 | LOCKED |
| Spacing | D-GRID-01..03, RESEARCH.md §3 | 8 (scale + rounding) | PENDING |
| Shape | D-RADIUS-01, RESEARCH.md §4 | 6 (5 tiers + 2 residuals) | PENDING |
| Motion | D-MOTION-01, RESEARCH.md §5 | 5 (4 durations + 2 easings) | PENDING |
| Color | Phase 8 tokens.css D-01..02 | full palette | LOCKED |
| Iconography | D-EMOJI-01, RESEARCH.md §6 | 41 + 3 new | PENDING |
| Typography | tokens.css D-12, E-Typo | 2 fonts + 3 weights | LOCKED |
| Touch Target | Phase 9 D-09 | 9 element types | LOCKED |
| Component Adoption | D-AUDIT-01, RESEARCH.md §7 | 13 categories clean + 4 documented residuals | PENDING |
| Layout | styles.css existing | 3 breakpoints + 5 rhythm tokens | PENDING |
| HUMAN-UAT Gates | D-UAT-01..04 | 6 flows | PENDING |
| Bug-Fix Visual | D-BUG-01..02, RESEARCH.md §1..§2 | 2 fixes | PENDING |
| Enforcement | D-FILE-01..02, D-UAT-02..03, RESEARCH.md §8..§11 | stylelint + grep + Playwright | PENDING |

**Lock summary:** 4 sections LOCKED (foundation inherited), 9 sections PENDING (Phase 12 deliverable gate). UI-SPEC ready for plan-phase → execute-phase workflow.

---

*Phase: 12-Page Level Refactor + 8dp Grid + HUMAN-UAT*
*UI-SPEC drafted: 2026-07-28*
