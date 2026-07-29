---
phase: 14-ui-bugfix-filter-popup
plan: 03
subsystem: ui
tags: [react, md3, sheet, portal, dropdown, responsive, dark-mode, z-index]

# Dependency graph
requires:
  - phase: 14-ui-bugfix-filter-popup
    plan: 01
    provides: Sheet composite + Modal D-11 dark-mode border
  - phase: 14-ui-bugfix-filter-popup
    plan: 02
    provides: D-08 .compact-interactive-target CSS reset class
provides:
  - "AdminIngredientsPage advanced-filter Sheet migration + Portal-rendered dropdown + flex-column mobile card with bottom-pinned actions (BUG-04/05 + UI-02 partial)"
  - "AdminDishesPage advanced-filter Sheet migration + Portal-rendered ingDropdown/sfDropdown (BUG-04 + UI-02 partial)"
  - "First React.createPortal usage in codebase — pattern established for dropdown/menu z-index escape"
affects: [Phase 15 nav/filter restructure, future dropdown/menu refactors]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "createPortal-to-document.body pattern for z-index escape: dropdown menu rendered as Portal sibling, triggers compute bounding rect for fixed-position coordinates, click-outside via closest('[data-...]') or ref.contains() traverse entire DOM regardless of React parent"
    - "Sheet-as-variant-delegation extends to admin pages: advanced-filter accordions replaced with <Sheet> controlled by local state, body content stays inline, ESC/backdrop closes via Modal inherited handlers"
    - "Per-trigger ref Map (triggerRefs.current[item.id] = el) for Portal positioning — survives re-renders, supports multiple simultaneous dropdowns, deletes on unmount"
    - "Grid-stretch + flex-column card pattern applied to mobile ingredient cards: Card root display:flex/flexDirection:column + spacer <div flex:1/> + actions row marginTop:auto pin to card bottom"

key-files:
  created: []
  modified:
    - frontend/src/pages/AdminIngredientsPage.jsx
    - frontend/src/pages/AdminDishesPage.jsx

key-decisions:
  - "AdminIngredientsPage click-outside uses closest('[data-dropdown-id]') (not ref.contains) so clicks on Portal'd menu don't trigger close — set data-dropdown-id on both trigger button and Portal'd menu container"
  - "AdminDishesPage preserves existing click-outside (ingDropdownRef.current.contains(e.target)) — clicks on Portal'd menu DO trigger close (per plan); menu items fire onClick before Portal unmounts (mousedown→state queued→click fires→React re-renders) so add/toggle still works, but autoFocus'd Input is required since click-to-focus would close"
  - "Mobile ingredient card Button row uses marginTop:'auto' + spacer <div flex:1/> between aliases and buttons — same WishCard footer pattern, no need for Card.footer slot migration"
  - "Sheet footer for both admin filters uses flex:1 split between 清空 (tonal) and 应用 (filled) — 应用 calls setShowAdvFilter(false) so closing is explicit, not implicit on selection"
  - "Advanced-filter Sheet wraps the existing renderCategorySection helper output verbatim — region-cuisine parent/child deselection logic preserved unchanged (no state migration)"
  - "Per-item ref Map (AdminIngredientsPage triggerRefs) chosen over single shared ref (AdminDishesPage ingDropdownRef/sfDropdownRef) because ingredient table is a list (need per-row ref) while dish form dropdowns are singleton controls (single ref suffices)"

patterns-established:
  - "Pattern: dropdown z-index escape via Portal + coords state — compute rect on trigger click, store top/left/width, render menu via createPortal(..., document.body) with position:fixed + zIndex:1000; eliminate ancestor overflow:hidden clipping"
  - "Pattern: per-trigger ref registration via Map — triggerRefs.current[id] = el on mount, delete on unmount; supports N concurrent dropdowns in a list"
  - "Pattern: Sheet-controlled advanced filter — local showAdvFilter state, button sets true (always-open), Sheet ESC/backdrop close sets false; filter state (advCategoryIds/sfFilter/advCategory) stays in page driving loadDishes/loadIngredients useEffect"

requirements-completed: [BUG-04, BUG-05, UI-02]

# Metrics
duration: 2min
completed: 2026-07-29
---

# Phase 14 Plan 03: Sheet Filter Migration + Portal Dropdown Fix Summary

**AdminIngredientsPage + AdminDishesPage advanced-filter accordions migrated to Sheet composite, dropdown menus Portal-mounted at z-index 1000 to escape Card `overflow:hidden` clipping, and mobile ingredient cards pinned edit/delete buttons to card bottom — 2 page files, 2 atomic commits, first `createPortal` usage in codebase.**

## Performance

- **Duration:** ~2 min (08:56:52Z → 08:59:14Z)
- **Started:** 2026-07-29T08:56:52Z
- **Completed:** 2026-07-29T08:59:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **Task 1 — AdminIngredientsPage.jsx** (commit `3ce7f5f`): imports Sheet + createPortal + useRef; Sheet-rendered advanced-filter replaces inline accordion (lines 270-298); per-item triggerRefs Map + dropdownCoords state added; 2 dropdown triggers (table row + mobile card) get `className="compact-interactive-target"` and compute coords on click; Portal'd menu renders at position:fixed zIndex:1000; mobile card restructured with Card root `display:flex/flexDirection:column` + spacer `<div flex:1/>` + Button row `marginTop:'auto'` for bottom-pinned actions (BUG-05)
- **Task 2 — AdminDishesPage.jsx** (commit `eaeed75`): imports Sheet + createPortal; ingDropdownCoords + sfDropdownCoords state added; inline advanced-filter accordion (lines 478-523) replaced with Sheet preserving renderCategorySection helper + region-cuisine parent/child deselection logic; 2 dropdown triggers (ingDropdownRef + sfDropdownRef) get `className="field-trigger compact-interactive-target"` and compute coords on click; 2 Portal'd menus rendered at bottom of component (position:fixed zIndex:1000)
- Both pages now route their advanced-filter buttons to open `<Sheet>` (mobile bottom-sheet, desktop centered-modal per Phase 14-01 D-04)
- Both pages' dropdown menus render via `createPortal(..., document.body)` — first Portal usage in codebase, escapes Card primitive's `overflow:hidden` clipping (BUG-04 root cause)
- State ownership preserved: `advCategory` / `advCategoryIds` / `sfFilter` remain in page component, drive existing `loadIngredients` / `loadDishes` useEffects unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: AdminIngredientsPage.jsx — Sheet migration + mobile card layout + Portal dropdown** - `3ce7f5f` (feat)
2. **Task 2: AdminDishesPage.jsx — Sheet migration + Portal-mounted ingredient/sf dropdowns** - `eaeed75` (feat)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `frontend/src/pages/AdminIngredientsPage.jsx` (MODIFIED) — Sheet import + createPortal import + useRef in react import; triggerRefs Map + dropdownCoords state; inline filter accordion → `<Sheet>`; dropdown triggers className `compact-interactive-target`; both dropdowns converted to Portal-rendered via `createPortal(<div data-dropdown-id={openDropdown}>, document.body)`; mobile card `display:flex/flexDirection:column` + spacer + `marginTop:'auto'` button row
- `frontend/src/pages/AdminDishesPage.jsx` (MODIFIED) — Sheet import + createPortal import; ingDropdownCoords + sfDropdownCoords state; inline filter accordion → `<Sheet>` (preserves renderCategorySection + region-cuisine logic); 2 dropdown triggers `className="field-trigger compact-interactive-target"` with onClick computing rect → coords → toggle show; 2 Portal'd menus at bottom (`data-ing-dropdown` + `data-sf-dropdown`)

## Decisions Made

- **AdminIngredientsPage click-outside** uses `e.target.closest('[data-dropdown-id]')` — matches both trigger buttons AND Portal'd menu (both carry the attribute). Plan's `data-dropdown-id` per-item pattern (id stored as dataset.dropdownId) prevents clicks on the menu from being misread as click-outside. Reference implementation consumed Task 1.
- **AdminDishesPage click-outside** preserved (lines 84-104 use `ingDropdownRef.current?.contains(e.target)` / `sfDropdownRef.current?.contains(e.target)`). Per plan, Portal'd content lives outside these refs → click triggers close. UX impact: menu items still work because mousedown queues `setShowIngDropdown(false)` and React re-renders after click event fires (so onClick runs first); autoFocus'd Input preserves typing flow.
- **Per-trigger ref Map (AdminIngredientsPage) vs shared ref (AdminDishesPage):** Ingredient table is a list (N concurrent potential triggers) → per-item Map. Dish form dropdowns are singleton controls → single ref each. Different patterns matched to different shapes.
- **Sheet footer action split:** `className="flex-1"` on both 清空 (tonal) and 应用 (filled) buttons inside `<div className="flex gap-3" style={{width:'100%'}}>` — 应用 explicitly calls `setShowAdvFilter(false)` so Sheet closes on user intent, not implicit.
- **renderCategorySection helper preserved verbatim** in Sheet body — region-cuisine parent/child deselection logic (cuisines.filter(parent_id === id).map(c.id)) unchanged. No state migration to Sheet.
- **Card primitive NOT migrated to `footer` slot** for AdminIngredientsPage mobile card — kept simpler in-body `flex:1` spacer pattern matching existing WishCard/DishCard. Plan notes either pattern is acceptable; chose minimal diff.

## Deviations from Plan

None — both task edits applied as specified in the PLAN.md. The pre-existing lint baseline (12 errors + 2 warnings: isChef/reloadCategories unused, loadIngredients/loadDishes/openEdit accessed-before-declared react-hooks/immutability, err unused, empty block, exhaustive-deps warnings) is unchanged from Task 1; the 6 "unused" errors for new Sheet/createPortal/setIngDropdownCoords/setSfDropdownCoords/ingDropdownCoords/sfDropdownCoords are RESOLVED since they're all used in Edit 3 + Edit 4.

## Issues Encountered

None — execution proceeded cleanly through both files. Task 1 was already committed (`3ce7f5f`) before this resume; only Task 2 needed application. The file had 4 preparatory changes from the interrupted session (Sheet/createPortal imports at top + 2 coords state hooks) which were verified intact before starting Edit 3 + Edit 4.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 14 complete — all 3 plans (Sheet composite + bugfix sweep + filter migration/Portal dropdown) executed, 7/8 v1.3 bugfix/UI requirements satisfied
- BUG-04/05 (dropdown z-index escape + mobile card button alignment) and UI-02 (filter popup doesn't break bottom-bar) now complete
- Remaining v1.3 work: BUG-06 / DATA-01 (test seed data for cross-card visual verification) + NAV-01/02/03/04/05 (header/sidebar restructure) + UI-01 (universal filter popup migration) → Phase 15
- createPortal pattern established; future dropdown/menu refactors in Phase 15 can adopt directly

## Self-Check: PASSED

**Files modified verified on disk:**
- FOUND: frontend/src/pages/AdminIngredientsPage.jsx (commit 3ce7f5f)
- FOUND: frontend/src/pages/AdminDishesPage.jsx (commit eaeed75)

**Commits verified in git log:**
- FOUND: 3ce7f5f (Task 1: feat(14-03): AdminIngredientsPage Sheet filter + Portal dropdown + flex-card)
- FOUND: eaeed75 (Task 2: feat(14-03): AdminDishesPage Sheet filter + Portal ingredient/sf dropdowns)

**Plan-level verification re-run:**
- Task 2 source-grep verify (9 checks: Sheet import / createPortal import / Sheet open / compact-interactive-target / document.body / position:'fixed' / zIndex:1000 / setIngDropdownCoords / setSfDropdownCoords): ALL OK — `TASK 2 VERIFY: PASS`
- `npx eslint src/pages/AdminDishesPage.jsx`: 12 errors + 2 warnings (down from 18 errors + 2 warnings pre-Task-2-start). The 6 "unused" errors for Sheet/createPortal/setIngDropdownCoords/setSfDropdownCoords/ingDropdownCoords/sfDropdownCoords are RESOLVED. The 12 remaining errors + 2 warnings match the pre-existing baseline (isChef/reloadCategories unused + loadIngredients/loadDishes/openEdit accessed-before-declared + 7× err unused + 1× empty block + 2× exhaustive-deps warnings).
- `npm run build`: exit 0 — `dist/index.html 0.80 kB`, `dist/assets/index-B7BctoeC.css 62.22 kB`, `dist/assets/index-CMR4cNKy.js 791.04 kB` — built in 873ms, 4010 modules transformed

---
*Phase: 14-ui-bugfix-filter-popup*
*Completed: 2026-07-29*