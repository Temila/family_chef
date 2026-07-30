---
phase: 15-navigation-restructure-test-data
plan: 01
subsystem: testing
tags: [playwright, e2e, regression-tests, nav-restructure]

# Dependency graph
requires:
  - phase: 12-ui-bugfix-sweep
    provides: D-BUG-02 Sidebar footer button + Header regression specs (the contracts being migrated)
  - phase: 12-ui-bugfix-sweep
    provides: D-UAT-02 MD3 compliance touch-target audit (md3-compliance.spec.js)
provides:
  - "NAV-03-aligned Playwright regression specs that assert the NEW Sidebar footer contract (version text node + zero footer buttons) and the relocated Header theme-toggle (.md-header__theme-toggle) — landed BEFORE Wave 1 feature code so tests assert the locked Phase 15 contract, not the removed controls"
affects:
  - 15-02 (Wave 1 — deletes Sidebar footer buttons + relocates theme toggle to Header; these migrated specs are the green-bar it must satisfy)
  - NAV-03 (Sidebar footer cleanup)

# Tech tracking
tech-stack:
  added: []  # pure test migration — zero new dependencies
  patterns:
    - "Wave 0 test-first migration: realign regression specs to the locked post-feature contract before any feature code lands, so the feature wave ships against passing (not stale-failing) tests"

key-files:
  created: []
  modified:
    - frontend/tests/phase12-bugfix.spec.js
    - frontend/tests/md3-compliance.spec.js

key-decisions:
  - "Adapted phase12 footer-pinning test into a nav-only 80dp invariant — the footer 48dp assertions were obsolete under NAV-03's zero-button footer contract"
  - "Lowered md3-compliance touch-target threshold 5→3 to match fixture reality (footer contributed 2 of the original 5 targets; removing it leaves 3 stable primitive targets: Button/IconButton/FAB)"
  - "Tests intentionally target the FUTURE (post-15-02) DOM: .md-header__theme-toggle and .md-sidebar__version do not exist in current code, so the specs fail today by design — Wave 0's success criterion is contract correctness, not current-code green"

patterns-established:
  - "Wave 0 spec migration: replace removed-control assertions with new-contract assertions in the same commit window, before the feature wave deletes the controls"

requirements-completed: [NAV-03]  # test-layer partial — feature code lands in 15-02

# Metrics
duration: 6min
completed: 2026-07-30
---

# Phase 15 Plan 01: Wave 0 Spec Migration Summary

**Migrated Phase 12 bugfix + MD3-compliance Playwright specs to assert the NAV-03 Sidebar-footer contract (version text + zero buttons) and relocated Header theme-toggle, ahead of Wave 1's footer-button deletion.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-30T03:54:55Z
- **Completed:** 2026-07-30T04:01:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- phase12-bugfix.spec.js now asserts the new Sidebar footer contract (`.md-sidebar__version` visible, `.md-sidebar__footer button` count 0) plus a Header theme-toggle test (`.md-header__theme-toggle` flips `document.documentElement.dataset.theme`)
- md3-compliance.spec.js no longer counts `.md-sidebar__footer button` as a touch target and adds a `vX.Y.Z` version-text regex assertion; all other touch-target audit coverage retained
- Both files pass `node --check` syntax validation; existing fixtures and imports preserved; tests intentionally fail against current pre-Phase-15 code (by design)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate phase12-bugfix.spec.js Sidebar footer assertions** - `c60d9dd` (test)
2. **Task 2: Migrate md3-compliance.spec.js footer button invariant** - `4116f8a` (test)

## Files Created/Modified
- `frontend/tests/phase12-bugfix.spec.js` — Replaced D-BUG-02 Sidebar footer theme/logout button tests with NAV-03 version-text + Header theme-toggle tests; converted footer-pinning test to nav-items-80dp invariant; updated module docstring
- `frontend/tests/md3-compliance.spec.js` — Removed `.md-sidebar__footer button` from touch-target audit, lowered threshold 5→3, added version-text regex test

## Decisions Made
- See `key-decisions` frontmatter above (footer-pinning adaptation, threshold recalibration, future-DOM targeting rationale)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted phase12 footer-pinning test (plan said "keep unchanged")**
- **Found during:** Task 1 (phase12-bugfix.spec.js migration)
- **Issue:** Plan action said "KEEP … D-BUG-05 footer pinning … unchanged," but the footer-pinning test (original lines 112-151) asserts `.md-sidebar__footer .md-sidebar__item` count `.toBe(2)` and that each footer item is 48dp. This directly violates two binding acceptance criteria: "No remaining test in phase12-bugfix.spec.js asserts that .md-sidebar__footer button count is positive" and must_haves truth "footer contains a version text node and zero buttons." After Wave 1 the footer has 0 items, so the assertion would also be factually false.
- **Fix:** Converted the test into a nav-only 80dp invariant — dropped all footer-item assertions (obsolete), kept the valid `.md-sidebar__nav .md-sidebar__item` height===80 assertion. Renamed to `导航项保持 80dp（footer 按钮已在 NAV-03 移除）`.
- **Files modified:** frontend/tests/phase12-bugfix.spec.js
- **Verification:** `rg` confirms no positive footer-item/button count remains; node --check passes
- **Committed in:** c60d9dd (Task 1 commit)

**2. [Rule 1 - Bug] Lowered md3-compliance touch-target threshold 5→3**
- **Found during:** Task 2 (md3-compliance.spec.js migration)
- **Issue:** Removing `.md-sidebar__footer button` from the touch-target selector list drops the shared fixture's representative-target count from 5 (3 primitives + 2 footer buttons) to 3 (primitives only). Leaving the `expect(targets.length).toBeGreaterThanOrEqual(5)` assertion would make the test assert a falsehood (3 < 5) both now and post-Wave-1.
- **Fix:** Lowered threshold to 3 — the stable interactive primitives (Button/IconButton/FAB) that always exist in the fixture. Post-Wave-1 the relocated Header theme-toggle IconButton adds a 4th, so ≥3 remains correct. Added an inline NAV-03 comment explaining the recalibration.
- **Files modified:** frontend/tests/md3-compliance.spec.js
- **Verification:** 48dp assertions retained (2); node --check passes; footer no longer counted
- **Committed in:** 4116f8a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 — bugs where the plan's literal action conflicted with its own binding acceptance criteria / contract correctness)
**Impact on plan:** Both fixes were necessary to satisfy the plan's own success criterion ("test file is CORRECT against the locked Phase 15 contract"). No scope creep; no feature code touched; pure test-contract alignment.

## Issues Encountered
- During Task 2 a self-introduced `node --check` syntax error (wrote `});` where the original closes both `.map(` and `page.evaluate(` with `}));`) was caught by the task's automated verify gate and fixed before the Task 2 commit — no committed defect.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 0 spec migration complete: both Playwright specs now assert the NAV-03 post-15-02 contract
- Ready for Wave 1 (15-02): when Sidebar footer buttons are deleted and `.md-header__theme-toggle` + `.md-sidebar__version` land, these specs flip from red (by design) to green
- Note for 15-02 verifier: phase12-bugfix `Header 主题按钮切换` and `Sidebar footer 仅显示版本号` tests, plus md3-compliance `版本号文本符合 vX.Y.Z` test, are the green-bar for the NAV-03 footer/theme-toggle migration

---
*Phase: 15-navigation-restructure-test-data*
*Completed: 2026-07-30*
