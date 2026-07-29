---
phase: 14-ui-bugfix-filter-popup
plan: 01
subsystem: ui
tags: [react, md3, css, modal, bottom-sheet, dark-mode, responsive]

# Dependency graph
requires:
  - phase: 11-composite-navigation-components
    provides: Modal composite (focus trap, ESC, scroll lock, focus return) — Sheet delegates to it
provides:
  - Sheet composite — responsive centered-modal/bottom-sheet primitive for Wave 3 filter migration
  - Modal D-11 dark-mode outline-variant border (visible edges in dark mode)
  - Modal variant API now accepts 'bottom-sheet' alongside 'basic'/'full-screen'
affects: [14-03 (advanced-filter Sheet migration), Phase 15 nav/filter restructure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin pass-through composite delegation (Sheet → Modal variant) — single source of MD3 modal behavior"
    - "Responsive CSS variant via media-query override (mobile bottom-sheet → desktop centered-modal)"
    - "Themed border via outline-variant token for dark-mode contrast without light-mode noise"

key-files:
  created:
    - frontend/src/components/composites/Sheet.jsx
    - frontend/src/components/composites/Sheet.css
  modified:
    - frontend/src/components/composites/Modal.css
    - frontend/src/components/composites/Modal.jsx

key-decisions:
  - "Sheet = Path A thin wrapper: renders <Modal variant='bottom-sheet' {...props} />, dropping variant from public API so callers can't override responsive behavior"
  - "D-11 border applied to .md-modal base via outline-variant token; excluded from full-screen + bottom-sheet (full-bleed variants don't need edges)"
  - "Sheet.css desktop override re-applies border-bottom outline-variant to coexist with Modal.css D-11 exclusion (centered modal on desktop needs visible edges)"

patterns-established:
  - "Composite-as-variant-delegation: new responsive surfaces delegate to Modal via a variant string, reusing ESC/scroll-lock/focus-trap with zero logic duplication"
  - "MD3 dark-mode contrast border pattern: outline-variant token is near-invisible in light mode (#c1c9bf) and visible in dark mode (#414941) — single rule serves both themes"

requirements-completed: [UI-02, UI-03, BUG-07]

# Metrics
duration: 1min
completed: 2026-07-29
---

# Phase 14 Plan 01: Sheet Composite + D-11 Dark-Mode Border Summary

**Responsive Sheet composite (centered modal on desktop / bottom sheet on mobile) delegating to Modal, plus themed outline-variant border on Modal for dark-mode edge contrast — zero new dependencies, all MD3 tokens.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-29T08:28:30Z
- **Completed:** 2026-07-29T08:29:54Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Sheet composite ships as a ~45-line pass-through wrapper: renders `<Modal variant="bottom-sheet" {...props} />`, inheriting all MD3 modal behavior (focus trap, ESC close, scroll lock, focus return) with zero state/logic duplication
- Sheet.css responsive variant: mobile (<1024px) renders bottom-anchored sheet with slide-in animation (translateY + emphasized easing); desktop (≥1024px) collapses to centered 480px modal matching the basic Modal visual
- Modal.css gains D-11 outline-variant border on `.md-modal` base — provides visible edge contrast in dark mode (#414941) while near-invisible in light mode (#c1c9bf); full-screen and bottom-sheet variants excluded via additive override
- Modal.jsx docblock extended to document `'bottom-sheet'` in the variant union (text-only change; existing `md-modal--${variant}` class construction handles it via CSS lookup)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Sheet composite (Sheet.jsx + Sheet.css)** - `cfc1e6c` (feat)
2. **Task 2: Apply D-11 dark-mode border to Modal.css + extend Modal.jsx variant API** - `6ca1da4` (feat)

## Files Created/Modified
- `frontend/src/components/composites/Sheet.jsx` (NEW) — Thin pass-through wrapper delegating to `<Modal variant="bottom-sheet">`; forwards all Modal props except `variant`
- `frontend/src/components/composites/Sheet.css` (NEW) — 5 selector blocks: mobile overlay, mobile modal (slide-in animation), desktop ≥1024px centered override, `@keyframes md-sheet-in`, reduced-motion fallback
- `frontend/src/components/composites/Modal.css` (MODIFIED) — D-11 border added to `.md-modal` base; new exclusion rule for full-screen + bottom-sheet variants
- `frontend/src/components/composites/Modal.jsx` (MODIFIED) — Docblock variant union extended to include `'bottom-sheet'`

## Decisions Made
- **Sheet implementation path (Path A):** Chose the thin-wrapper delegation over inline-JSX duplication (Path B) per PATTERNS.md recommendation. Sheet becomes a single source of MD3 modal behavior — any future Modal fix automatically benefits Sheet. ~45 lines including docblock, zero useState/useEffect/useRef.
- **Desktop border-bottom in Sheet.css:** The desktop `@media (min-width: 1024px)` override re-applies `border-bottom: 1px solid var(--md-color-outline-variant)` because Modal.css's D-11 exclusion rule (`border: none`) applies to `.md-modal--bottom-sheet .md-modal` globally. On desktop the sheet is visually a centered modal and needs the edge contrast; the desktop-specific border-bottom restores it. The plan's `<done>` criteria explicitly required this coexistence.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sheet foundation exists — Wave 3 (Plan 14-03) can now migrate AdminDishesPage + AdminIngredientsPage advanced-filter accordions to `<Sheet>`
- D-11 dark-mode border live — all existing Modal consumers gain dark-mode edge contrast immediately (additive, no visual regression in light mode)
- Full visual verification (360px bottom-sheet + 1280px centered-modal viewports) deferred to Wave 3 consumer integration, per plan SC7

## Self-Check: PASSED

**Files created/modified verified on disk:**
- FOUND: frontend/src/components/composites/Sheet.jsx
- FOUND: frontend/src/components/composites/Sheet.css
- FOUND: frontend/src/components/composites/Modal.css
- FOUND: frontend/src/components/composites/Modal.jsx

**Commits verified in git log:**
- FOUND: cfc1e6c (feat(14-01): add Sheet composite)
- FOUND: 6ca1da4 (feat(14-01): apply D-11 dark-mode border to Modal)

**Plan-level `<verification>` re-run:** all 4 checks PASS (no forbidden hooks in Sheet.jsx, 5 selector blocks present in Sheet.css, D-11 border + exclusion in Modal.css, bottom-sheet in Modal.jsx variant union). Stylelint clean (exit 0) on both CSS files. ESLint clean (exit 0) on both JSX files.

---
*Phase: 14-ui-bugfix-filter-popup*
*Completed: 2026-07-29*
