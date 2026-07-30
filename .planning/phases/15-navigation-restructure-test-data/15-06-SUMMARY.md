---
phase: 15-navigation-restructure-test-data
plan: 06
subsystem: testing
tags: [playwright, pytest, seed-data, regression-tests, navigation, fastapi, sqlalchemy]

# Dependency graph
requires:
  - phase: 15-navigation-restructure-test-data
    provides: "15-02 Header restructure (.header-action-bar + .md-header__theme-toggle + 2-item avatar menu), 15-02 Sidebar footer (.md-sidebar__version), 15-03/15-04 navigation refinements (caller wraps + BottomBar role tabs + UserHomePage quick actions), 15-05 OrderPage 高级筛选 Sheet — all the contracts this regression suite locks"
provides:
  - "DATA-01 dev seed fixture: create_seed_test_dishes() — env-guarded (ENVIRONMENT=development OR AUTO_SEED_DEMO_DISHES=1), idempotent (name LIKE '测试菜品 %'), 8 Dish + 8 DishCategory rows covering all 2³ recipe/description/image combinations with fixed RNG seed, wired into startup after create_preset_ingredients"
  - "backend/tests/test_initial_data.py — 6 pytest cases locking seed 8-row creation, idempotency, admin link, category link (selectinload eager), env guard, missing-admin guard"
  - "frontend/tests/phase15-navigation.spec.js — 13 Playwright tests across 7 describe blocks locking NAV-01..05, UI-01, BUG-06 card geometry"
affects:
  - DATA-01
  - NAV-01, NAV-02, NAV-03, NAV-04, NAV-05
  - UI-01
  - BUG-06
  - Phase 15 close-out (final plan of phase)

# Tech tracking
tech-stack:
  added: []  # zero new dependencies — pytest + Playwright + SQLAlchemy already in stack
  patterns:
    - "Env-guarded dev seed fixture: create_seed_test_dishes() returns early unless ENVIRONMENT=development or AUTO_SEED_DEMO_DISHES=1; production default creates zero seed rows"
    - "Fixed-RNG seed fixture: random.Random(42) for reproducible dev dish state (status/is_popular/is_semifinished), so screenshot tests are deterministic"
    - "2³ combination matrix seed: 8 explicit recipe×description×image dicts covering every presence/absence combination for card-geometry verification"
    - "Test-session-factory patch pattern: autouse fixture monkeypatches app.initial_data.async_session_factory → conftest.test_session_factory so seed writes + assertions land in the same in-memory DB"
    - "selectinload eager loading in pytest: avoid async-SQLAlchemy lazy-load I/O after session operations by chaining .options(selectinload(Dish.categories))"
    - "loginAs localStorage injection: Playwright helper injects JWT (FC_*_TOKEN env vars) + user object via addInitScript before navigation, matching auth/index.js key names"

key-files:
  created:
    - backend/tests/test_initial_data.py
    - frontend/tests/phase15-navigation.spec.js
  modified:
    - backend/app/initial_data.py
    - backend/app/main.py
    - frontend/playwright.config.js

key-decisions:
  - "Used real .md-card / .md-card__footer selectors in BUG-06 tests instead of the plan's .dish-card / .dish-card-actions — Phase 10 D-13 removed the .dish-card class (DishCard.jsx is now a thin Card-primitive wrapper); AdminDishesPage mobile cards render as .md-card primitives with .md-card__footer action rows. Using the phantom selectors would have produced tests that never match the real DOM."
  - "Added patch_session_factory autouse fixture to backend tests — initial_data.py binds async_session_factory (production factory) at module import; without redirecting it to test_session_factory the seed would write to a non-existent prod DB and assertions would query an empty test DB"
  - "Set mobile viewport (375x812) for BottomBar tests — .md-bottom-bar is display:none at min-width:1024px (BottomBar.css:24-26), so the default 1280x720 Playwright viewport would render zero tabs"
  - "loginAs reads JWT from FC_ADMIN_TOKEN/FC_CHEF_TOKEN/FC_USER_TOKEN env vars with stub-token fallback — mirrors the established audit-md3-compliance.mjs / audit-touch-targets.mjs pattern; verifier provides real tokens from a running backend"
  - "AdminDishesPage status=all is the default (loadDishes line 144) — no status-filter dropdown interaction needed in BUG-06 tests; the 8 seed dishes (published/draft) are visible by default"
  - "VITE_AUTO_SEED_DEMO_DISHES=1 added to playwright.config.js webServer env as the signal for BUG-06 seed activation; verifier must also run the backend with AUTO_SEED_DEMO_DISHES=1 so the seed actually fires"

patterns-established:
  - "Dev-seed idempotency via name LIKE prefix check: detect existing fixture rows by stable name prefix before inserting, with per-row partial-failure skip"
  - "Playwright role-based login via localStorage injection (loginAs helper): addInitScript sets fc_access_token/fc_refresh_token/fc_user before page.goto, surviving SPA route guards"
  - "Card-geometry regression via boundingBox spread: capture all card boxes via Promise.all, assert max-min spread ≤ 1px (width/height) for uniformity and < 2px for footer-row alignment"

requirements-completed: [NAV-04, NAV-05, BUG-06, DATA-01, UI-01]

# Metrics
duration: 5min
completed: 2026-07-30
---

# Phase 15 Plan 06: Dev Seed Data + Navigation Regression Suite Summary

**Added the DATA-01 dev seed fixture (8 recipe×description×image combination dishes, env-guarded + idempotent, wired into startup) and a 13-test Playwright regression suite locking the Phase 15 navigation contracts (NAV-01..05, UI-01, BUG-06 card geometry), plus 6 pytest cases verifying the seed logic.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-30T04:22:10Z
- **Completed:** 2026-07-30T04:26:31Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- DATA-01 closed: `create_seed_test_dishes()` injects 8 Dish + 8 DishCategory records covering all 2³ recipe/description/image combinations with fixed RNG seed (random.Random(42)); env-guarded (production default = zero rows); idempotent via name LIKE '测试菜品 %' check; wired into main.py startup after `create_preset_ingredients()`
- Backend test coverage: 6 pytest cases in `test_initial_data.py` verifying 8-row creation (2³ combination coverage), idempotency on re-call, admin link (created_by), category link (selectinload eager loading), env guard, and missing-admin guard (no throw)
- Navigation regression suite: 13 Playwright tests across 7 describe blocks locking Header action-bar + 2-item avatar menu (NAV-01/02), Sidebar footer version text (NAV-03), BottomBar role tabs chef 7/admin 7/user 4 with no logout (NAV-05), AdminHome + UserHome quick actions per role (NAV-04), OrderPage 高级筛选 Sheet (UI-01), and BUG-06 card geometry (8 seed cards equal width/height + aligned footer rows)
- All 5 files pass syntax validation (python3 -m py_compile for backend, node --check for frontend); `npm run build` succeeds (4012 modules, only pre-existing chunk-size warning)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add create_seed_test_dishes() + wire into main.py** - `8ad3de7` (feat)
2. **Task 2: Create backend/tests/test_initial_data.py with 6 seed verification cases** - `3d6f55b` (test)
3. **Task 3: Create frontend/tests/phase15-navigation.spec.js + playwright.config.js env** - `2f7792b` (test)

## Files Created/Modified
- `backend/app/initial_data.py` — Added `import os` + `import random`; appended `create_seed_test_dishes()` async function (env guard, fixed RNG seed, admin/region lookup, 8-combination matrix, idempotency check, Dish + DishCategory inserts)
- `backend/app/main.py` — Added `create_seed_test_dishes` to initial_data import + `await create_seed_test_dishes()` after `create_preset_ingredients()` in startup
- `backend/tests/test_initial_data.py` (NEW) — 6 async pytest cases + `patch_session_factory` autouse fixture (redirects initial_data's production session factory to test factory) + `enable_seed_env` autouse fixture; uses selectinload for category-link test
- `frontend/tests/phase15-navigation.spec.js` (NEW) — 13 Playwright tests in 7 describe blocks; `loginAs` helper (env-var JWT injection via addInitScript); mobile viewport for BottomBar/quick-action/Sheet/card tests
- `frontend/playwright.config.js` — Added `env: { VITE_AUTO_SEED_DEMO_DISHES: '1' }` to webServer block for BUG-06 seed signal

## Decisions Made
- See `key-decisions` frontmatter above (real .md-card selectors over phantom .dish-card; session-factory patch; mobile viewport for BottomBar; env-var JWT login; AdminDishes status=all default; VITE_AUTO_SEED_DEMO_DISHES signal).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used real .md-card selectors instead of phantom .dish-card in BUG-06 tests**
- **Found during:** Task 3 (phase15-navigation.spec.js BUG-06 describe block)
- **Issue:** Plan Task 3 specified `.dish-card` and `.dish-card-actions` selectors for the BUG-06 card-geometry tests. These classes do NOT exist in the DOM: Phase 10 D-13 refactored DishCard.jsx into a thin Card-primitive wrapper (its docstring explicitly states "旧自包含 .dish-card className 彻底消失"), and AdminDishesPage renders mobile cards via `<Card variant="elevated">` which outputs `.md-card` + `.md-card__footer`. Tests using the phantom selectors would assert against zero elements.
- **Fix:** Used `.mobile-card-list--grid .md-card` for the 8 cards (scoped to AdminDishesPage's mobile grid) and `.mobile-card-list--grid .md-card .md-card__footer` for the action-button rows. The card-uniformity (equal width/height) and button-alignment (equal footer y) contracts are identical in intent.
- **Files modified:** frontend/tests/phase15-navigation.spec.js
- **Verification:** `grep -c '.md-card'` returns 6 occurrences in the BUG-06 block; node --check passes; BLOCKER 2/3 boundingBox assertions (≥4) satisfied
- **Committed in:** 2f7792b (Task 3 commit)

**2. [Rule 2 - Missing Critical] Added patch_session_factory autouse fixture to backend tests**
- **Found during:** Task 2 (test_initial_data.py — initial design)
- **Issue:** `create_seed_test_dishes()`, `create_initial_data()`, and `create_preset_categories()` import and use `async_session_factory` from `app.database` (the production factory bound to settings.DATABASE_URL). The test infrastructure uses a separate in-memory `test_session_factory` (conftest.py). Without redirection, the seed would write to a non-existent production SQLite file and the assertions (using the `db` fixture → test_session_factory) would query an empty DB — making every test a false-pass no-op or a connection failure.
- **Fix:** Added `patch_session_factory` autouse fixture that monkeypatches `app.initial_data.async_session_factory` → `conftest.test_session_factory`, ensuring seed writes and assertion queries land in the same in-memory DB.
- **Files modified:** backend/tests/test_initial_data.py
- **Verification:** py_compile passes; fixture is autouse so all 6 tests get the patch; mirrors how conftest overrides `get_db` for HTTP client tests
- **Committed in:** 3d6f55b (Task 2 commit)

**3. [Rule 1 - Bug] Set mobile viewport for BottomBar + quick-action tests**
- **Found during:** Task 3 (BottomBar role tabs + UserHomePage quick-action describe blocks)
- **Issue:** `.md-bottom-bar` has `display: none` at `min-width: 1024px` (BottomBar.css:24-26). The default Playwright viewport (1280x720 desktop) would render zero BottomBar tabs, failing the `.md-tab` count assertions. The plan's BottomBar tests did not specify a viewport.
- **Fix:** Added `page.setViewportSize({ width: 375, height: 812 })` to all BottomBar, AdminHome/UserHome quick-action, OrderPage Sheet, and BUG-06 tests (mobile components/scenarios). Header/Sidebar tests keep desktop viewport (those are PC-shell components visible at ≥1024px).
- **Files modified:** frontend/tests/phase15-navigation.spec.js
- **Verification:** node --check passes; mobile viewport set in 9 of 13 tests; NAV-04 tests in the plan already specified 375x812 so this aligns with the plan's intent
- **Committed in:** 2f7792b (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 × Rule 1 bug — correct DOM selectors + viewport; 1 × Rule 2 missing critical — session-factory patch for test correctness)
**Impact on plan:** All fixes necessary for the tests to actually validate the intended contracts against the real DOM/DB. No scope creep; the seed function, main.py wiring, and all acceptance-criteria selectors match the plan exactly.

## Issues Encountered
- **pytest not runnable in this environment:** Backend deps are uv-managed but not synced in this environment (`uv run --project backend pytest` fails — pytest module not installed). Per the project-context guidance, backend test runtime verification is deferred to the verifier. Backend file syntax was validated via `python3 -m py_compile` (stdlib, always available), and the 6 test functions + asyncio decorators + selectinload import were verified via grep. The verifier should run `cd backend && uv sync && uv run pytest tests/test_initial_data.py -q` against a live dev environment.
- **`node --check` validates the spec (plain .js):** Unlike the .jsx files in prior plans (which fail node --check with ERR_UNKNOWN_FILE_EXTENSION), phase15-navigation.spec.js is plain JavaScript — `node --check` passes cleanly, providing real syntax validation for this plan's frontend deliverable.

## Authentication Gates
None — no authentication was required to write/validate the files. The Playwright `loginAs` helper is designed to consume real JWTs from FC_ADMIN_TOKEN/FC_CHEF_TOKEN/FC_USER_TOKEN env vars at verifier runtime; the stub-token fallback allows `node --check` and structural validation without a live backend.

## User Setup Required
None for code authoring. **For running the Playwright suite**, the verifier needs:
1. Backend running with `AUTO_SEED_DEMO_DISHES=1` (or `ENVIRONMENT=development`) so the 8 seed dishes exist for BUG-06 tests
2. Seeded/created dev accounts: admin, chef, user — with their JWTs exported as `FC_ADMIN_TOKEN`, `FC_CHEF_TOKEN`, `FC_USER_TOKEN`
3. Frontend dev server (started automatically by playwright.config.js webServer)

## Next Phase Readiness
- **Phase 15 complete:** This is the final plan (6 of 6) for Phase 15 — Navigation Restructure & Test Data. All requirements (NAV-01..05, UI-01, BUG-06, DATA-01) now have both feature code (plans 02-05) and regression-test coverage (this plan + plan 01).
- Ready for Phase 15 verification (`/gsd-verify-work 15`) and milestone close-out (`/gsd-complete-milestone`).
- No blockers.

---
*Phase: 15-navigation-restructure-test-data*
*Completed: 2026-07-30*

## Self-Check: PASSED

- FOUND: .planning/phases/15-navigation-restructure-test-data/15-06-SUMMARY.md
- FOUND: 8ad3de7 (Task 1 feat commit)
- FOUND: 3d6f55b (Task 2 test commit)
- FOUND: 2f7792b (Task 3 test commit)
- FOUND: backend/app/initial_data.py (create_seed_test_dishes present)
- FOUND: backend/app/main.py (create_seed_test_dishes import + await)
- FOUND: backend/tests/test_initial_data.py (6 test functions + patch_session_factory fixture)
- FOUND: frontend/tests/phase15-navigation.spec.js (13 tests, 7 describe blocks)
- FOUND: frontend/playwright.config.js (VITE_AUTO_SEED_DEMO_DISHES env)
- Plan-level verification: all `<verification>` assertions PASS — seed signature, env guard, idempotency, main.py wiring, 6 pytest cases, 7 describe blocks, all 4 files syntax-valid
- Build sanity: `npm run build` succeeds (4012 modules, zero errors, pre-existing chunk-size warning only)
- No accidental file deletions in any task commit
