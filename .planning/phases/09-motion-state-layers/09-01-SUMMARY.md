---
phase: 09-motion-state-layers
plan: 01
subsystem: ui
tags: [md3, state-layer, ripple, material-symbols, css, react, accessibility, focus-ring]

# Dependency graph
requires:
  - phase: 08-md3-design-token-foundation
    provides: "MD3 color/elevation/motion/focus-ring tokens (--md-color-primary, --md-elevation-*, --md-motion-duration-*, --md-focus-ring-*)"
provides:
  - "State-layer CSS toolkit (.state-hover/.state-pressed/.state-focused/.state-disabled + per-element ::before rules)"
  - "React <Ripple> component (onPointerDown -> CSS animation span -> auto-remove)"
  - "Material Symbols <Icon> skeleton component (font-based, Phase 10-12 SVG migration target)"
  - "6 --md-state-layer-* tokens (hover/pressed/focused/disabled/primary/on-surface)"
  - "Card elevation-1->2 hover transition (no translateY/border-color per D-07)"
  - "Global :disabled rule (opacity 0.38, no pointer-events:none per D-10)"
  - "12 new focus-ring consumer selectors (MOTION-04)"
  - "@media (prefers-reduced-motion: reduce) block"
affects: [09-02, "phase-10-buttons", "phase-11-navigation", "phase-12-final-cleanup"]

# Tech tracking
tech-stack:
  added: ["@playwright/test ^1.52.0 (devDependency — Wave 2 audit prep)", "material-symbols font (already in devDeps, now imported via index.css)"]
  patterns: ["CSS ::before state-layer overlay (z-index:-1, opacity-driven)", "React <Ripple> wrapper component with document.createElement span lifecycle", "Global :disabled rule (no pointer-events:none for a11y)", "prefers-reduced-motion media query", "CSS entry consolidation in index.css"]

key-files:
  created:
    - "frontend/src/components/Ripple.jsx — onPointerDown ripple component"
    - "frontend/src/css/ripple.css — .ripple-container base rules"
    - "frontend/src/components/Icon.jsx — Material Symbols skeleton"
  modified:
    - "frontend/src/css/tokens.css — +6 state-layer tokens"
    - "frontend/src/css/styles.css — state-layer toolkit, elevation cleanup, disabled unification, focus ring extension, reduced-motion"
    - "frontend/src/index.css — consolidated CSS entry (tokens + styles + material-symbols)"
    - "frontend/src/App.jsx — removed duplicate styles.css import"
    - "frontend/package.json — +@playwright/test, +audit:touch script"
    - "frontend/src/components/Sidebar.jsx — Ripple-wrapped nav + logout buttons"
    - "frontend/src/components/Header.jsx — Ripple-wrapped header-back"
    - "frontend/src/components/DishCard.jsx — Ripple-wrapped dish-card"
    - "frontend/src/components/WishCard.jsx — Ripple-wrapped wish-card (conditional disabled)"

key-decisions:
  - "Font-based Material Symbols (material-symbols package) for Icon skeleton instead of @material-symbols/svg-400 — svg-400 is 4 years stale (2022), font avoids Vite SVG loader complexity in Phase 9; SVG tree-shaking deferred to Phase 10"
  - "Consolidated CSS entry in index.css — removed duplicate styles.css JS import from App.jsx to avoid double-bundling when adding material-symbols @import"
  - "Card transition split into box-shadow + border-color explicit properties (was transition:all) — enables independent state-layer opacity transition via ::before"

patterns-established:
  - "State-layer ::before pattern: position:relative + overflow:hidden + z-index:0 on parent, ::before with z-index:-1 sits between bg and content"
  - "Ripple wrapper convention: <Ripple style={{width:'100%'}}> for block-level children, <Ripple disabled={bool}> for conditional interactivity"
  - "Disabled unification: global :disabled/[disabled]/[aria-disabled=true] rule, opacity 0.38, NO pointer-events:none (retains keyboard focusability)"

requirements-completed: [TOKEN-11, MOTION-01, MOTION-02, MOTION-03, MOTION-04]

# Metrics
duration: 6min
completed: 2026-07-27
---

# Phase 9 Plan 1: State-Layer Toolkit + Ripple + Icon Skeleton Summary

**MD3 interaction feedback layer: CSS ::before state-layer system (hover 8%/pressed 10%/focused 12%/disabled 38%), React <Ripple> component with pointer-position-aware primary 12% ripples, card elevation-1→2 transition cleanup, 12 new focus-ring consumers, and Material Symbols <Icon> skeleton**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-27T04:14:11Z
- **Completed:** 2026-07-27T04:20:01Z
- **Tasks:** 3
- **Files modified:** 10 (3 created, 7 modified)

## Accomplishments
- Built complete MD3 state-layer CSS toolkit: 6 tokens + 4 tool classes + per-element `::before` rules on 18 interactive classes, replacing 24 legacy `:hover { background }` rules
- Created React `<Ripple>` component (onPointerDown → createElement span → 500ms emphasized scale → 150ms fade-out → auto-remove) with `disabled` prop for conditional interactivity
- Card hover cleaned to pure elevation-1→2 box-shadow transition (removed translateY/border-color per D-07)
- Unified disabled styling globally (opacity 0.38, no pointer-events:none — retains keyboard focusability per D-10 a11y)
- Extended MD3 focus ring to 12 new interactive element selectors (header-back, tab-item, pc-sidebar-item, theme-toggle, modal-close, qty-stepper button, menu-item, chef-select-item, wish-picker-item, guest-add-btn, preference-tag button, wish-card)
- Added `@media (prefers-reduced-motion: reduce)` block for motion-sensitive users
- Created Material Symbols `<Icon>` skeleton component (font-based, D-11) ready for Phase 10-12 progressive emoji replacement
- Wired `<Ripple>` into 4 core components (Sidebar nav + logout, Header back, DishCard, WishCard with conditional disabled)

## Task Commits

Each task was committed atomically:

1. **Task 1: State-layer CSS toolkit + tokens + elevation + disabled + focus ring** — `f06771d` (feat)
2. **Task 2: Ripple.jsx + ripple.css + Icon.jsx + package.json + index.css** — `c2abd50` (feat)
3. **Task 3: Wire Ripple into Sidebar/Header/DishCard/WishCard** — `b0bb449` (feat)

## Files Created/Modified
- `frontend/src/css/tokens.css` — +6 `--md-state-layer-*` tokens (hover/pressed/focused/disabled/primary/on-surface)
- `frontend/src/css/styles.css` — state-layer `::before` toolkit + per-element rules (18 classes), card elevation transition cleanup, global `:disabled` rule, 12 focus-ring extensions, `prefers-reduced-motion` block
- `frontend/src/components/Ripple.jsx` — React ripple wrapper component (onPointerDown → CSS animation span → auto-remove)
- `frontend/src/css/ripple.css` — `.ripple-container` base rules
- `frontend/src/components/Icon.jsx` — Material Symbols font-based skeleton (name/size/fill/weight/grade props)
- `frontend/src/index.css` — consolidated CSS entry: tokens.css + styles.css + material-symbols/outlined.css
- `frontend/src/App.jsx` — removed duplicate `styles.css` JS import (now via index.css @import)
- `frontend/package.json` — `@playwright/test` ^1.52.0 devDep + `audit:touch` script
- `frontend/src/components/Sidebar.jsx` — Ripple-wrapped nav items + logout button
- `frontend/src/components/Header.jsx` — Ripple-wrapped header-back button
- `frontend/src/components/DishCard.jsx` — Ripple-wrapped dish-card div
- `frontend/src/components/WishCard.jsx` — Ripple-wrapped wish-card div (conditional `disabled={!canTap}`)

## Decisions Made
- **Font-based Material Symbols over SVG package:** Used already-installed `material-symbols` (v0.45.9) font import instead of D-11's original `@material-symbols/svg-400` (last published 2022, 4 years stale). Font approach avoids Vite SVG loader config complexity in Phase 9; SVG tree-shaking deferred to Phase 10 per RESEARCH.md:96.
- **CSS entry consolidation:** Moved `styles.css` import from `App.jsx` (JS side-effect import) to `index.css` (CSS `@import`) to avoid double-bundling when adding the `material-symbols/outlined.css` import. `index.css` is now the single CSS entry point.
- **Card transition property split:** Changed `transition: all` to explicit `transition: box-shadow ..., border-color ...` on `.card`/`.dish-card` to allow the `::before` state-layer opacity transition to operate independently.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed duplicate styles.css import from App.jsx**
- **Found during:** Task 2 (index.css modification)
- **Issue:** Plan instructed adding `@import './css/styles.css';` to index.css, but `styles.css` was already imported via `import './css/styles.css';` in `App.jsx:30`. Adding the CSS @import would cause Vite to process the same stylesheet through two pipelines (JS import + CSS @import), risking duplicate CSS in the bundle.
- **Fix:** Added the imports to index.css per plan intent (consolidating CSS entry), AND removed the JS import from App.jsx. `index.css` is now the single CSS entry point: tokens.css → styles.css → material-symbols/outlined.css.
- **Files modified:** `frontend/src/index.css`, `frontend/src/App.jsx`
- **Verification:** `npm run build` succeeds; module count went from 75 → 74 (styles.css no longer double-counted); CSS bundle size stable (52.02 KB)
- **Committed in:** `c2abd50` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for correct CSS bundling — prevents duplicate stylesheet loading. No scope creep; aligns with plan's intent of index.css as CSS entry point.

## Issues Encountered
None

## User Setup Required
None — no external service configuration required. The `@playwright/test` devDependency is for Wave 2 (09-02) touch-target audit; `npm install` will pick it up automatically.

## Next Phase Readiness
- **Ready for 09-02 (Wave 2):** `@playwright/test` added to devDependencies, `audit:touch` script registered. Wave 2 can create `scripts/audit-touch-targets.mjs` and run touch-target measurement immediately.
- **Ready for Phase 10-12 component reskin:** `<Ripple>` and `<Icon>` components available for import. State-layer CSS classes auto-apply to all existing `.btn`/`.card`/`.dish-card`/etc. selectors — no additional wiring needed for Phase 10 Button/Card components.
- **Material Symbols font bundled:** 3.96 MB woff2 font included in production build. Phase 10 may want to investigate tree-shaking to subset only used icons (deferred per D-11).

## Self-Check: PASSED

**Files verified:**
- `frontend/src/css/tokens.css` — FOUND (6 state-layer tokens present)
- `frontend/src/css/styles.css` — FOUND (state-layer toolkit + 18 per-element ::before rules + global :disabled + 12 focus-ring extensions + prefers-reduced-motion)
- `frontend/src/components/Ripple.jsx` — FOUND (default export, onPointerDown handler)
- `frontend/src/css/ripple.css` — FOUND (.ripple-container rule)
- `frontend/src/components/Icon.jsx` — FOUND (default export, Material Symbols skeleton)
- `frontend/src/index.css` — FOUND (3 imports: tokens + styles + material-symbols)
- `frontend/package.json` — FOUND (@playwright/test + audit:touch)
- `frontend/src/components/Sidebar.jsx` — FOUND (2 `<Ripple>` wrappers)
- `frontend/src/components/Header.jsx` — FOUND (1 `<Ripple>` wrapper)
- `frontend/src/components/DishCard.jsx` — FOUND (1 `<Ripple>` wrapper)
- `frontend/src/components/WishCard.jsx` — FOUND (1 `<Ripple>` wrapper)

**Commits verified:**
- `f06771d` — Task 1 (state-layer CSS toolkit)
- `c2abd50` — Task 2 (Ripple + Icon + package.json + index.css)
- `b0bb449` — Task 3 (wire Ripple into 4 components)

**Build verified:** `npm run build` succeeds (76 modules, 52.02 KB CSS, 494.27 KB JS)

---
*Phase: 09-motion-state-layers*
*Completed: 2026-07-27*
