---
phase: 11-composite-navigation-components
plan: 03
subsystem: ui
tags: [snackbar, list-item, divider, md3, react, playwright, compound-components]

# Dependency graph
requires:
  - phase: 11-01
    provides: Modal composite and composites/ co-located CSS structure
  - phase: 10-primitive-components
    provides: Icon, Ripple, Badge, Button, and IconButton primitives
  - phase: 09-motion-state-layers
    provides: md-interactive state-layer and 48dp touch-target rules
  - phase: 08-md3-design-token-foundation
    provides: inverse-surface, tone, elevation, radius, motion, and outline tokens
provides:
  - SnackbarProvider with a newest-first queue of three Rich tone notifications
  - Backward-compatible showToast(message, type) and useToast API from the preserved ToastContext.jsx path
  - 4s/6s per-tone auto-dismiss with hover pause, manual dismiss, queue eviction, and unmount cleanup
  - Compound ListItem with Leading/Content/Headline/Supporting/Trailing slots and 1/2/3-line variants
  - Semantic full-width and 56dp inset Divider variants
  - Three legacy list-item consumers migrated and legacy toast/list CSS removed
  - Playwright behavior coverage for Snackbar, ListItem, and Divider

affects: [12-page-level-refactor, frontend-composites, notification-feedback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backward-compatible context rewrite: preserved file/hook/call signature with renamed provider internals"
    - "Compound ListItem slots with row keyboard activation and Trailing event isolation"
    - "Timer records track remaining duration so hover pause resumes rather than restarting"
    - "Playwright fixture pages provide browser-level RED/GREEN coverage without new dependencies"

key-files:
  created:
    - frontend/src/components/composites/ListItem.jsx
    - frontend/src/components/composites/ListItem.css
    - frontend/src/components/composites/Divider.jsx
    - frontend/src/components/composites/Divider.css
    - frontend/playwright.config.js
    - frontend/tests/snackbar.spec.js
    - frontend/tests/list-item.spec.js
  modified:
    - frontend/src/contexts/ToastContext.jsx
    - frontend/src/App.jsx
    - frontend/src/pages/AdminHomePage.jsx
    - frontend/src/components/InvitationsModal.jsx
    - frontend/src/components/InvitationsSection.jsx
    - frontend/src/css/styles.css
    - .gitignore

key-decisions:
  - "ToastContext.jsx filename and useToast/showToast API remain stable; only App's provider import/tags changed to SnackbarProvider"
  - "Snackbar hover pause stores elapsed and remaining milliseconds per item, and queue eviction clears timers for items no longer visible"
  - "ListItem adds md-interactive only when clickable and keeps nested Trailing keyboard/click actions isolated from row activation"
  - "Existing @playwright/test dependency is used for browser behavior tests; no package or framework was added"

patterns-established:
  - "Rich tone Snackbar: inverse-surface card + 4dp tone bar + tone icon + message + 48dp close target"
  - "ListItem compound API: ListItem.Leading/Content/Headline/Supporting/Trailing"
  - "Wrapper-aware separators: last Ripple wrapper removes its child ListItem border"

requirements-completed: [COMPO-10, COMPO-11, COMPO-12, LOGIC-01, LOGIC-02, LOGIC-03]

# Metrics
duration: 21min
completed: 2026-07-28
---

# Phase 11 Plan 03: Snackbar, ListItem & Divider Summary

**MD3 Rich tone Snackbar queue with pause-aware 4s/6s timers, compound 1/2/3-line ListItem, semantic Divider, and all three legacy list consumers migrated without changing 169 showToast callsites**

## Performance

- **Duration:** 21 min
- **Started:** 2026-07-28T08:15:11Z
- **Completed:** 2026-07-28T08:36:21Z
- **Tasks:** 3
- **Files modified:** 18
- **Automated behavior tests:** 9 passed

## Accomplishments

- Rewrote `ToastContext.jsx` in place as `SnackbarContext`/`SnackbarProvider` while preserving all 169 `showToast(` occurrences, every caller import path, and the `useToast` hook.
- Delivered newest-first Rich tone Snackbar stacking (maximum three), primary/tertiary/error/secondary color roles, icons, manual close, 4s/6s timers, accurate hover pause/resume, eviction cleanup, and unmount cleanup.
- Created a full-width compound `<ListItem>` with five slots, 48/64/88dp variants, keyboard activation, MD3 state-layer/Ripple feedback, disabled handling, and automatic Trailing event isolation.
- Created semantic `<Divider />` and `<Divider inset />` variants using the outline-variant token and 56dp inset.
- Migrated AdminHomePage, InvitationsModal, and InvitationsSection to ListItem slots while preserving copy/revoke/date/role behavior, then removed all legacy `.list-item*`, `.toast*`, and `slideDown` CSS.
- Added browser-level Playwright fixtures/tests for Snackbar timing/queue behavior and ListItem/Divider interaction/layout behavior without adding dependencies.

## Task Commits

Each task was committed atomically; TDD tasks contain a RED test commit followed by a GREEN feature commit:

1. **Task 1: Rewrite ToastContext.jsx as SnackbarContext**
   - `b6dd2b5` (test) — failing Snackbar queue/timer/Rich tone behavior tests
   - `f640c31` (feat) — queued SnackbarProvider implementation and App provider rename
2. **Task 2: Create ListItem + Divider composites**
   - `e6c06f4` (test) — failing ListItem/Divider behavior tests
   - `04c6e0b` (feat) — compound ListItem and semantic Divider implementation
3. **Task 3: Migrate three list sites and remove legacy CSS**
   - `2757e0f` (feat) — consumer migrations, wrapper-aware separator fix, and CSS cleanup

## Files Created/Modified

- `frontend/src/contexts/ToastContext.jsx` — 303-line Snackbar context with queue, tone map, icons, pause-aware timers, dismiss, and cleanup.
- `frontend/src/App.jsx` — Renamed only the Toast provider import/opening/closing tags to SnackbarProvider.
- `frontend/src/components/composites/ListItem.jsx` — Compound slots, clickable/disabled behavior, keyboard activation, Ripple, and Trailing propagation guard.
- `frontend/src/components/composites/ListItem.css` — Token-driven 48/64/88dp variants, slot layout, focus/state behavior, and wrapper-aware separators.
- `frontend/src/components/composites/Divider.jsx` / `Divider.css` — Semantic full-width and 56dp inset separators.
- `frontend/src/pages/AdminHomePage.jsx` — Recent activity migrated to two-line ListItem Content/Headline/Supporting.
- `frontend/src/components/InvitationsModal.jsx` — Invitation records migrated to three-line Leading/Content/Trailing slots.
- `frontend/src/components/InvitationsSection.jsx` — Recent invitations migrated to the same three-line slot pattern.
- `frontend/src/css/styles.css` — Deleted legacy list-item/toast blocks, list focus rule, slideDown keyframes, and global 48dp list-item reference only.
- `frontend/playwright.config.js` and `frontend/tests/` — Browser fixtures and nine behavior tests.
- `.gitignore` — Ignores Playwright runtime reports/results.

## Decisions Made

- **Compatibility over file rename:** Retained `frontend/src/contexts/ToastContext.jsx`, `useToast`, and `showToast(message, type='success')`; only `SnackbarProvider` is new at the App integration point. This keeps all callers unchanged and build-verified.
- **Pause resumes remaining time:** Each timer record stores `remaining` and `startedAt`. Hover clears the timeout and subtracts elapsed time; mouse leave schedules only the remainder rather than granting a fresh full duration.
- **Known tone normalization:** Unknown Snackbar types fall back to `success`, preventing uncontrolled class suffixes while maintaining legacy default behavior.
- **Browser TDD without dependency changes:** Existing `@playwright/test` and Vite are sufficient for fixture-based component behavior tests, so no test package installation or architecture change was needed.
- **ListItem owns interaction semantics:** Row activation is attached only when `onClick` exists and is not disabled; nested control key events are ignored by the row, while Trailing stops click propagation before it reaches the row.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Protected clickable variant heights from the global 48dp selector**
- **Found during:** Task 2 GREEN verification
- **Issue:** The existing global `[role="button"], [tabindex]:not([tabindex="-1"])` rule appears later in the cascade and reset clickable two/three-line ListItems to `min-height: 48px`.
- **Fix:** Added a more specific clickable+variant selector so MD3 64dp/88dp line heights remain authoritative without `!important`.
- **Files modified:** `frontend/src/components/composites/ListItem.css`
- **Verification:** Playwright computed-style assertions report 48px/64px/88px; all four ListItem/Divider tests pass.
- **Committed in:** `04c6e0b`

**2. [Rule 1 - Bug] Restored pointer interaction through Ripple's shared overlay class**
- **Found during:** Task 2 GREEN verification
- **Issue:** `base.css` gives `.md-ripple-layer` `pointer-events: none`; the existing Ripple component uses that class on its wrapper, so ListItem's nested Trailing button could not receive pointer clicks after base.css was imported.
- **Fix:** Scoped `pointerEvents: 'auto'` to ListItem's Ripple wrapper while retaining disabled handling on the ListItem root.
- **Files modified:** `frontend/src/components/composites/ListItem.jsx`
- **Verification:** Playwright clicks the Trailing button and confirms trailing count increments while row count stays unchanged.
- **Committed in:** `04c6e0b`

**3. [Rule 1 - Bug] Made last-item border removal aware of the Ripple wrapper**
- **Found during:** Task 3 consumer migration
- **Issue:** `.md-list-item:last-child` matched every ListItem because each root is the only child of its Ripple wrapper, removing all inter-item borders instead of only the final border.
- **Fix:** Changed the selector to `.md-ripple-layer:last-child > .md-list-item`, so only the final wrapped item loses its divider.
- **Files modified:** `frontend/src/components/composites/ListItem.css`
- **Verification:** All nine Playwright tests and the production Vite build pass after all three real consumer migrations.
- **Committed in:** `2757e0f`

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs)
**Impact on plan:** All fixes are scoped correctness adjustments required by existing global CSS/Ripple behavior. No feature scope or dependency changes.

## TDD Gate Compliance

- Task 1 RED: `b6dd2b5` fails because SnackbarProvider/Rich tone queue behavior does not yet exist.
- Task 1 GREEN: `f640c31` passes all five Snackbar browser tests.
- Task 2 RED: `e6c06f4` fails because ListItem/Divider modules do not yet exist.
- Task 2 GREEN: `04c6e0b` passes all four ListItem/Divider browser tests after two in-scope bug fixes.
- Final suite: **9/9 Playwright tests pass**.

## Verification

- `npm exec playwright test -- --reporter=line` — **PASS, 9 tests**.
- `npm run build --prefix frontend` — **PASS, Vite 0 errors** (pre-existing chunk-size warning only).
- `rg 'className="list-item' frontend/src --glob '*.jsx'` — **PASS, 0 results**.
- `rg 'className="toast' frontend/src --glob '*.jsx'` — **PASS, 0 results**.
- Legacy `.list-item*`, `.toast*`, and `@keyframes slideDown` selectors in `styles.css` — **PASS, 0 results**.
- `showToast(` occurrences — **169**, and every containing source file imports from `contexts/ToastContext`; no missing import paths.
- App integration — only `SnackbarProvider` remains; no `ToastProvider` reference.

## Issues Encountered

- Vite continues to report the existing >500kB chunk-size warning; the build completes successfully and this plan adds no dependency or new bundle category.
- The plan/context count of 213 showToast calls was stale. Current source contains the user-specified 169 occurrences, all preserved and build-verified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 11 composite components are complete: Modal, Navigation Rail/Bar/Header, Snackbar, ListItem, and Divider are implemented and migrated.
- Ready for Phase 12 page-level refactor, 8dp grid cleanup, and HUMAN-UAT.
- No blockers or known goal-preventing stubs remain.

---
*Phase: 11-composite-navigation-components*
*Completed: 2026-07-28*

## Self-Check: PASSED

- All five key implementation artifacts and the Summary exist on disk.
- All five RED/GREEN/task commits are present in git history.
- All 169 `showToast(` occurrences are preserved with no missing ToastContext import path.
- Zero legacy list-item/toast JSX classes or styles.css selectors remain.
- Final Playwright suite passes 9/9 and Vite production build completes with 0 errors.
