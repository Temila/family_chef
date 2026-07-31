---
phase: 16-tech-debt-cleanup
plan: "03"
subsystem: testing
tags: [fastapi, asgi-middleware, pytest, pypinyin, sqlite, test-remediation]

# Dependency graph
requires:
  - phase: 16-tech-debt-cleanup/02
    provides: "AUTO_MIGRATE pytest gate (TD-06) so migrations stay skipped under PYTEST_CURRENT_TEST"
provides:
  - "Trailing-slash normalization ASGI middleware for /api/* (collapses ~80 cascade failures)"
  - "Smart ingredient extractor graceful fallback to basic extractor when llama-cpp-python absent"
  - "Restored green backend test suite (0 failed / 0 errors) as project regression net"
affects: [test-suite, dish-search, order-creation, smart-extractor]

# Tech tracking
tech-stack:
  added: []  # uv sync --extra dev materialized already-pinned pytest 9.0.3 etc. from uv.lock; no new packages
  patterns:
    - "ASGI path-rewriting middleware scoped strictly to /api/* trailing slashes (SPA catch-all preserved)"
    - "Optional-dependency graceful degradation (smart extractor → basic extractor on ImportError)"

key-files:
  created: []
  modified:
    - backend/app/main.py
    - backend/app/services/dish_service.py
    - backend/app/services/order_service.py
    - backend/app/services/smart_ingredient_extractor.py
    - backend/tests/test_comprehensive.py
    - backend/tests/test_dishes.py
    - backend/tests/test_feishu.py
    - backend/tests/test_misc_extra.py
    - backend/tests/test_orders.py
    - backend/tests/test_routes_extra.py
    - backend/tests/test_routes_final.py
    - backend/tests/test_services.py
    - backend/tests/test_services_extra.py
    - backend/tests/test_users.py

key-decisions:
  - "Single-point trailing-slash middleware in main.py rather than rewriting ~140 test URLs or changing router paths — keeps frontend contract untouched"
  - "Smart extractor degrades to basic extractor instead of crashing when llama-cpp-python is missing (smart features are optional per config.yaml)"
  - "App is source of truth for response-shape/behavior drift; tests aligned to shipped envelopes, not the reverse"
  - "Dish.status accepts only enabled/disabled (DishChef.status is published/hidden) — tests that conflated the two were corrected"

patterns-established:
  - "Trailing-slash middleware: normalize /api/* paths before routing; never touch non-API or bare /api/"
  - "create_* service methods return the created entity (create_order return bug fixed)"

requirements-completed: [TD-09]

# Metrics
duration: ~45min
completed: 2026-07-31
---

# Phase 16 Plan 03: Test Suite Remediation Summary

**Restored the backend test suite from 108 failed / 8 errors to 0 failed / 0 errors via one ASGI trailing-slash middleware, an extractor graceful-fallback, and response-shape alignment across 10 test files — without regressing any router, service, or model**

## Performance

- **Duration:** ~45 min
- **Tasks:** 3
- **Files modified:** 14 (4 source, 10 test)

## Final Test Counts

- **Passed:** 350
- **Failed:** 0 (was 108)
- **Errors:** 0 (was 8)
- **Skipped:** 7 (all pre-existing conditional `pytest.skip()` — fixture-state / lazy-load MissingGreenlet issues, out of scope)

## Accomplishments
- Trailing-slash normalization middleware collapses the ~80-failure cascade where `/api/foo/` hit the SPA catch-all (405) instead of redirecting
- Smart ingredient extractor degrades to the basic pypinyin extractor when llama-cpp-python is unavailable (no ImportError leakage to callers)
- Removed dead `Ingredient.pinyin` references from dish_service search (column dropped in commit 13864e6)
- Aligned all drifting test assertions with shipped app behavior (feishu 422 body validation, order auto-split list response, auth-before-existence ordering, Dish vs DishChef status semantics)

## Task Commits

This plan used a single combined commit per the user's explicit instruction (test-fix work that resists atomic per-task splitting):

1. **All tasks (middleware + extractor fallback + pinyin drift + response-shape alignment)** - `307a63f` (fix)

## Files Created/Modified
- `backend/app/main.py` - `normalize_api_trailing_slash` ASGI middleware (scoped to `/api/*`, defensive `scope.get("raw_path")`)
- `backend/app/services/smart_ingredient_extractor.py` - `try/except ImportError` around `_ensure_model_loaded()` → basic extractor fallback
- `backend/app/services/dish_service.py` - removed dead `Ingredient.pinyin.like()` search clauses (2 sites)
- `backend/app/services/order_service.py` - added `return order` to `create_order` (was returning None)
- `backend/tests/test_feishu.py` - `/notify` tests send JSON body (not query params); failure status 502
- `backend/tests/test_users.py` - added admin auth headers to list lookups; 401 for unauthenticated get-not-found
- `backend/tests/test_orders.py` - `sample_dish` status enabled; order-create response is a list → `[0]`
- `backend/tests/test_routes_extra.py` - `create_published_dish` uses `/chef-publish`; valid Dish statuses; order list indexing; auth before existence
- `backend/tests/test_routes_final.py` - `/chef-publish` instead of invalid `/status published`; order list indexing
- `backend/tests/test_comprehensive.py` - `/chef-publish` for publish flow; order list indexing
- `backend/tests/test_dishes.py` - admin forces status=enabled; `status=all` for search; valid status update
- `backend/tests/test_services.py` - `DishUpdate(status="enabled")` (not "published")
- `backend/tests/test_services_extra.py` - removed `Ingredient(pinyin=)`; Dish status enabled; DishChef published for listing
- `backend/tests/test_misc_extra.py` - removed `Ingredient(pinyin=)` kwargs

## Decisions Made
- **Combined commit over per-task commits:** Per explicit user instruction for this plan (test remediation is not cleanly splittable without intermediate red states)
- **Middleware over test-URL rewrite:** One ~10-line middleware fixes ~80 failures; rewriting 140 URLs would be noise and would diverge from how the real frontend calls the API
- **Dish.status vs DishChef.status:** The app distinguishes admin-level Dish.status (enabled/disabled) from per-chef DishChef.status (published/hidden). Tests that used "published"/"hidden" as Dish statuses were corrected to use `/chef-publish` or valid Dish statuses

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dead `Ingredient.pinyin` references in dish_service search**
- **Found during:** Task 3 (response-shape alignment)
- **Issue:** `dish_service.py` lines 133 & 251 referenced `Ingredient.pinyin.like(...)` but the `Ingredient.pinyin` column was removed in commit 13864e6 — any dish search crashed with AttributeError
- **Fix:** Removed the dead `Ingredient.pinyin.like()` clauses (search by `Ingredient.name` is retained)
- **Files modified:** backend/app/services/dish_service.py
- **Verification:** test_dishes::test_search_dishes and test_advanced::test_dish_search_by_name pass
- **Committed in:** 307a63f

**2. [Rule 1 - Bug] `create_order` missing return statement**
- **Found during:** Task 3 (order tests AttributeError: 'NoneType')
- **Issue:** `OrderService.create_order` created and flushed an order but returned `None` (no return statement), while `create_order_auto_split` returns its orders — the `create_*` contract is to return the created entity
- **Fix:** Added `return order` (+ flush/refresh) to `create_order`. The router uses `create_order_auto_split`, so this is safe and regresses nothing
- **Files modified:** backend/app/services/order_service.py
- **Verification:** test_services_extra order lifecycle tests pass
- **Committed in:** 307a63f

**3. [Rule 3 - Blocking] Dish status semantics drift in tests**
- **Found during:** Task 3
- **Issue:** ~15 tests used `/api/dishes/{id}/status` with `"published"`/`"hidden"`/`"draft"` — invalid Dish statuses (valid: enabled/disabled). Those are DishChef statuses, set via `/chef-publish`. Caused ValueError cascades across order/favorite/search tests
- **Fix:** Switched publish-flow tests to `/chef-publish`; switched status-update tests to `enabled`/`disabled`
- **Files modified:** test_routes_extra.py, test_routes_final.py, test_comprehensive.py, test_dishes.py, test_services.py, test_services_extra.py, test_orders.py
- **Committed in:** 307a63f

**4. [Rule 3 - Blocking] Order create returns a list (auto-split) but tests indexed as dict**
- **Found during:** Task 3
- **Issue:** `POST /api/orders/` returns a list (auto-split per chef), but tests did `resp.json()["id"]` → TypeError
- **Fix:** Updated indexing to `resp.json()[0]["id"]` (or list-aware access)
- **Files modified:** test_orders.py, test_routes_extra.py, test_routes_final.py, test_comprehensive.py
- **Committed in:** 307a63f

**5. [Rule 3 - Blocking] Feishu /notify expects JSON body, not query params**
- **Found during:** Task 3
- **Issue:** `/api/feishu/notify` takes `FeishuNotifyRequest` as a Pydantic body model, but tests sent params as query string → 422. Also failure returns 502 not 500
- **Fix:** Tests send JSON body; failure assertion → 502
- **Files modified:** test_feishu.py
- **Committed in:** 307a63f

**6. [Rule 3 - Blocking] Auth-before-existence in user routes**
- **Found during:** Task 3
- **Issue:** `GET /api/users/99999` without auth returns 401 (auth dependency runs before existence check), but tests expected 404. List lookups also lacked auth headers → 401 → KeyError 'items'
- **Fix:** Added admin auth headers to list lookups; unauthenticated not-found → 401
- **Files modified:** test_users.py, test_routes_extra.py
- **Committed in:** 307a63f

---

**Total deviations:** 6 auto-fixed (2 Rule 1 bugs, 4 Rule 3 blocking). All necessary for correctness; no scope creep, no app regression, no tests skipped/disabled to force green.

## Issues Encountered
- The plan's research attributed test_services_extra order failures to "ValueError Chinese message drift" but the actual root causes were the Dish.status semantics (published vs enabled) and `create_order` returning None — both resolved above
- 7 pre-existing skips remain (conditional `pytest.skip()` for lazy-load MissingGreenlet / fixture-state); they are out of scope for TD-09 and documented inline in the test files

## User Setup Required
None - no external service configuration required. `uv sync --extra dev` is the test-env bootstrap (materializes already-pinned pytest 9.0.3 / pytest-asyncio 1.3.0 / pytest-cov 7.1.0 from uv.lock).

## Next Phase Readiness
- Backend test suite is green and can serve as the project's regression net again
- The trailing-slash middleware is the canonical fix — future tests may use either `/api/foo` or `/api/foo/` interchangeably
- The 7 remaining skips point at two app-layer preload issues (ingredient aliases, DishIngredient) that could be addressed in a future tech-debt plan if desired

---
*Phase: 16-tech-debt-cleanup*
*Completed: 2026-07-31*

## Self-Check: PASSED

- All 4 modified source files exist on disk
- SUMMARY.md exists at expected path
- Commit `307a63f` present in git log
- `normalize_api_trailing_slash` middleware present in main.py (1 match)
- `except ImportError` fallback present in smart_ingredient_extractor.py (2 matches)
- Full suite: 350 passed, 7 skipped, 0 failed, 0 errors
