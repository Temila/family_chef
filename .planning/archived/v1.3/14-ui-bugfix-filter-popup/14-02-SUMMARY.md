---
phase: 14-ui-bugfix-filter-popup
plan: 02
subsystem: ui
tags: [css, md3, responsive-layout, react, flexbox]

# Dependency graph
requires:
  - phase: 13-bugfix-sweep
    provides: v1.2 MD3 token + Card primitive + .pc-data-table baseline (BUG-01/02/03 were open defects at v1.2 close)
provides:
  - "Full-viewport-width md-bottom-bar on mobile/tablet (BUG-01 fix in BottomBar.css)"
  - ".compact-interactive-target CSS override class (D-08, 9 selectors, 12dp min) available for Wave 3 JSX mounting"
  - ".pc-data-table th::before width bumped 32px→48px (BUG-02 header/column alignment)"
  - "Flex-column card roots + margin-top:auto footers on WishCard + DishCard (BUG-03 uniform-height grid)"
affects: [14-ui-bugfix-filter-popup (Plan 03 consumes D-08 class), 15-navigation-restructure (card consistency)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compact-interactive-target CSS override: opt-in 12dp min-size class placed AFTER the 48dp global rule so cascade 'later wins'; mounted via explicit JSX className (Wave 3), never blanket-applied"
    - "Grid-stretch + flex-column card layout: container CSS-Grid (align-items:stretch default) + per-card display:flex/flex-direction:column + footer margin-top:auto pins actions to card bottom regardless of content height"

key-files:
  created: []
  modified:
    - "frontend/src/components/composites/BottomBar.css — BUG-01: removed left:50%/translateX(-50%)/max-width caps; anchored left:0 width:100%"
    - "frontend/src/css/styles.css — D-08 compact-interactive-target reset (9 selectors, 12dp) + BUG-02 th::before 48px"
    - "frontend/src/components/WishCard.jsx — BUG-03: cardStyle flex column + footer marginTop:auto"
    - "frontend/src/components/DishCard.jsx — BUG-03/D-05: cardStyle const + style prop + footer marginTop:auto"

key-decisions:
  - "BUG-01 verify scoped to .md-bottom-bar block: plan's whole-file <automated> regex false-negatives on .md-tab--active::before (64×32 active-pill centering legitimately uses left:50%/translateX(-50%)) — corrected verification scopes absence checks to the .md-bottom-bar rule only while proving the active-pill is preserved"
  - "D-08 selector list = exactly 9 per CONTEXT D-08 (verbatim from PLAN.md, not extended/contracted/renamed); placed after the 48dp global rule (lines 519-527) so cascade order 'later wins'"
  - "BUG-03 layout strategy = existing CSS-Grid align-items:stretch container + new per-card flex-column root + margin-top:auto footer (no container change needed — Risk 6 confirmed grid stretch already handles row height)"
  - "BUG-04 (dropdown radius shrink) is delivered as a PRECURSOR only: the D-08 CSS class exists; Plan 03 mounts className=\"compact-interactive-target\" on the dropdown triggers — so BUG-04 requirement stays pending until Wave 3"

patterns-established:
  - "Pattern: compact interactive target exemption — opt-in className (not element selector) for sub-48dp targets, documented with D-08 rationale comment"
  - "Pattern: card footer pinning under grid stretch — display:flex/flex-direction:column on card root + margin-top:auto on footer slot"

requirements-completed: [BUG-01, BUG-02, BUG-03]

# Metrics
duration: 4 min
completed: 2026-07-29
---

# Phase 14 Plan 02: Bugfix Sweep (BottomBar + table th + card uniformity + D-08 CSS reset) Summary

**Full-width mobile bottom-bar, 48px table-header placeholder, D-08 compact-interactive-target CSS reset class, and flex-column wish/dish card roots with footer pinned to bottom — 4 files, 3 atomic commits**

## Performance

- **Duration:** ~4 min (08:33:03Z → 08:37:01Z)
- **Started:** 2026-07-29T08:33:03Z
- **Completed:** 2026-07-29T08:37:01Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- BUG-01 fixed: `.md-bottom-bar` now spans full viewport width (360px–1023px) — `left:0; transform:none; width:100%`, `max-width:420px`/`768px` caps and the `@media(min-width:640px)` tablet-cap removed; `@media(min-width:1024px)` desktop-hide preserved
- BUG-02 fixed: `.pc-data-table th::before` width bumped 32px→48px (D-13 fallback) so headers align with first content column on all 7 admin tables (audit confirmed all already carry `.pc-data-table`)
- BUG-03 fixed: WishCard + DishCard now declare `display:flex; flexDirection:column` and footer `marginTop:auto` — grid-stretch container + flex-column card + auto-margin footer pins actions to card bottom for uniform row height
- BUG-04 precursor delivered: D-08 `.compact-interactive-target` override class (exactly 9 selectors per CONTEXT D-08, 12dp min) is available in styles.css, placed after the 48dp global rule so Wave 3 Plan 03 can mount it on dropdown triggers via JSX className

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix BUG-01 BottomBar width** — `b4b7037` (fix)
2. **Task 2: styles.css — D-08 reset + BUG-02 th::before width bump** — `825d4cf` (fix)
3. **Task 3: BUG-03 wish/dish card uniform-height with footer pinned to bottom** — `d4b18b5` (fix)

## Files Created/Modified
- `frontend/src/components/composites/BottomBar.css` — BUG-01/D-12: removed left:50%/translateX(-50%)/max-width caps + deleted 640px tablet-cap media query; kept width:100%, desktop-hide rule, and all `.md-tab*` rules untouched
- `frontend/src/css/styles.css` — D-08 compact-interactive-target reset (9 selectors, 12dp min, after the 48dp global rule) + BUG-02 `.pc-data-table th::before` width 32px→48px; 48dp global rule (UX-04) preserved
- `frontend/src/components/WishCard.jsx` — BUG-03: cardStyle declares `display:flex; flexDirection:column` (always-applies, after highlight/opacity spreads) + footer `marginTop:auto` (was `var(--md-spacing-2)`)
- `frontend/src/components/DishCard.jsx` — BUG-03/D-05 cross-card consistency: new `cardStyle` const `{display:flex, flexDirection:column}` passed via `style` prop to `<Card>`; footer outer div gets `marginTop:auto`

## Decisions Made
- Scoped the BUG-01 `<automated>` verification to the `.md-bottom-bar` rule block (see Deviations). The corrected check confirms both the BUG-01 removal AND active-pill preservation.
- D-08 selector list copied verbatim (9 selectors) from CONTEXT D-08 / PLAN.md — no extension, contraction, or rename per locked spec.
- BUG-03 reuses the existing CSS-Grid `align-items:stretch` container (no container edit) — only per-card flex-column + auto-margin was missing (PATTERNS.md Risk 6).
- BUG-04 marked as precursor only — CSS class delivered here, JSX mounting deferred to Plan 03; BUG-04 requirement stays pending.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan Task 1 `<automated>` verify false-negatives on preserved `.md-tab--active::before` centering**
- **Found during:** Task 1 (Fix BUG-01 BottomBar width)
- **Issue:** The plan's `<automated>` verify script runs `c.includes('left: 50%')` and `c.includes('translateX(-50%)')` against the ENTIRE BottomBar.css file. But `.md-tab--active::before` (the 64×32 active-pill indicator, lines 56-57) legitimately uses `left: 50%` + `transform: translateX(-50%)` to center the pill, and the plan's `<done>` criteria + PATTERNS.md Risk 1 explicitly REQUIRE it to be preserved unchanged. Running the script as-written throws `residual translateX(-50%)` on a correct implementation, blocking commit.
- **Fix:** Wrote a corrected verification that scopes the absence checks to the `.md-bottom-bar` rule block only (matching the `<done>` criteria's ".md-bottom-bar" scope), and additionally asserts `.md-tab--active::before` STILL retains `left:50%`/`translateX(-50%)` (proving preservation). Confirmed `.order-bar`/`.cart-bar`/`.cart-detail-panel` in styles.css are also untouched (Risk 1).
- **Files modified:** none (verification-only deviation; code change matches D-12 + done criteria exactly)
- **Verification:** Corrected scoped script prints 12/12 PASS including active-pill preservation; the 3 sibling bars in styles.css confirmed unchanged.
- **Committed in:** b4b7037 (Task 1 commit; the BottomBar.css change itself is faithful to D-12/PATTERNS.md)

---

**Total deviations:** 1 auto-fixed (1 blocking verify-tooling defect)
**Impact on plan:** None to the production code — the BottomBar.css change is exactly per D-12. The deviation corrects only the verification gate. No scope creep; all done criteria satisfied.

## Issues Encountered
None — the only wrinkle was the false-negative verify script (documented above as a deviation); the actual code edits applied cleanly and all 3 tasks' corrected verifications pass on first implementation.

## User Setup Required
None — pure CSS + inline-style changes; no external service configuration required.

## Next Phase Readiness
- BUG-01/02/03 fully resolved; their success criteria (SC1/SC2/SC3) are met.
- BUG-04 precursor (D-08 CSS class) is in place — Wave 3 Plan 03 can now mount `className="compact-interactive-target"` on the AdminIngredientsPage/AdminDishesPage dropdown triggers + apply the Portal z-index fix.
- Ready for **Plan 03 (14-03)**: advanced-filter Sheet migration + Portal dropdown z-index fix. Plan 03 consumes both the Sheet composite (Plan 01) and the `.compact-interactive-target` class (this plan).

## Self-Check: PASSED

- All 4 modified source files exist on disk (BottomBar.css, styles.css, WishCard.jsx, DishCard.jsx)
- SUMMARY.md created at `.planning/phases/14-ui-bugfix-filter-popup/14-02-SUMMARY.md`
- All 3 task commits present in git log: `b4b7037`, `825d4cf`, `d4b18b5`
- Task 1 scoped verify: 12/12 PASS (BUG-01 removal + active-pill preservation + sibling-bar preservation)
- Task 2 verify: D-08 base + theme-toggle dual selector + min-width 12px + th::before 48px + 7 tables — PASS; 9 D-08 selectors confirmed; 48dp global rule preserved
- Task 3 verify: WishCard + DishCard display:flex / flexDirection:column / marginTop:auto — PASS; structural checks PASS

---
*Phase: 14-ui-bugfix-filter-popup*
*Completed: 2026-07-29*
