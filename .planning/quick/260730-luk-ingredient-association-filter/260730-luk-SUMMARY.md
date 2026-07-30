---
phase: quick
quick_id: 260730-luk
slug: ingredient-association-filter
date: 2026-07-30
status: complete
description: 食材管理页增加已关联/未关联互斥筛选按钮（基于菜品关联数）
---

# Quick Task 260730-luk: 食材管理页「已关联/未关联」互斥筛选 Summary

**Added 已关联/未关联 mutual-exclusion filter buttons to AdminIngredientsPage, backed by SQLAlchemy EXISTS/NOT EXISTS filtering on DishIngredient**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-30T11:00Z (approx)
- **Completed:** 2026-07-30T11:05Z (approx)
- **Tasks:** 5
- **Files modified:** 5 (3 backend, 2 frontend)

## Accomplishments

- Backend `IngredientService.list_ingredients` accepts `has_dishes: Optional[bool] = None` and applies SQL-level EXISTS / NOT EXISTS subquery against `dish_ingredients` for efficient filtering
- Backend `/api/ingredients` router exposes `has_dishes` query parameter (snake_case, Optional[bool])
- API client `getIngredients(category, search, hasDishes = null)` forwards `has_dishes` only when not null, preserving the existing `!== null` semantics
- Frontend `AdminIngredientsPage` adds a single `assocFilter` state (null/true/false) with a `toggleAssoc` helper that enforces mutual exclusion at the state-machine level
- Two new buttons (已关联 / 未关联) render in `filter-action-row` immediately after 高级筛选, sharing `space-between` layout with the right-side action group
- Button visual: `variant="filled"` when selected, `variant="outlined"` when not — toggle-off achieved by re-clicking the active button (state goes back to `null`)
- New `useEffect([advCategory, assocFilter])` dependency auto-refreshes list when toggling
- Pytest case `test_filter_ingredients_by_has_dishes` covers all three filter states (true / false / unset) with isolated setup via direct `test_session_factory` inserts

## Task Commits

Each task was committed atomically:

1. **Task 1: backend service has_dishes** - `f7bcc2a` (feat)
2. **Task 2: backend router has_dishes** - `0a6b213` (feat)
3. **Task 3: backend test for has_dishes** - `f03c9a7` (test)
4. **Task 4: frontend API client hasDishes** - `7366fa2` (feat)
5. **Task 5: frontend page state + UI** - `7badf0e` (feat)

## Files Created/Modified

- `backend/app/services/ingredient_service.py` - Extended `list_ingredients` with `has_dishes` param + SQLAlchemy `select(...).exists()` clauses for True (EXISTS) and False (NOT EXISTS)
- `backend/app/routers/ingredients.py` - Added `has_dishes: Optional[bool] = Query(None, ...)` query parameter, threaded into service call
- `backend/tests/test_ingredients.py` - Added `test_filter_ingredients_by_has_dishes` covering all three states (also imported `text` cleanup; rewritten test list rendering)
- `frontend/src/api/client.js` - `getIngredients(category, search, hasDishes)` signature; `hasDishes !== null` guard passes `has_dishes` snake_case param
- `frontend/src/pages/AdminIngredientsPage.jsx` - New `assocFilter` state + `toggleAssoc` helper, updated `useEffect` deps, threaded into `loadIngredients`, two new buttons in `filter-action-row`

## Decisions Made

- **Single source of truth for filter state** — `assocFilter: null | true | false` rather than two booleans. Eliminates the impossible "both selected" state and makes toggle-off behavior trivial (`prev === value ? null : value`)
- **SQL EXISTS/NOT EXISTS rather than Python-side filtering** — push the predicate into the query so the database only returns matching rows, avoiding loading all ingredients into memory
- **Button variant chosen for visual hierarchy**: `filled` (active, matches the 添加 button style) vs `outlined` (inactive, visually distinct from `tonal` so it doesn't look "available but unused" like the 高级筛选 trigger button)
- **Re-clicking the active button toggles off** — matches user expectation that filter chips behave like toggle switches; no separate "全部" button needed
- **Test setup uses direct `test_session_factory` inserts** — keeps the test focused on the new filter behavior rather than dragging in the full dish-creation path; matches existing patterns in `test_routes_extra.py`

## Deviations from Plan

None - plan executed exactly as written. The plan's exact code snippets were followed verbatim for JSX, API client signature, and SQL EXISTS clauses.

## Issues Encountered

- pytest not installed in this environment — verification limited to `python3 -m py_compile` (which passes for all 3 backend files). This matches the plan's contingency: "If pytest is not available in this env, ensure `py_compile` succeeds on the test file."
- Pre-existing 500 kB chunk size warning from `npm run build` is unrelated to this plan (single new piece of state + 2 buttons add <0.5 kB to the bundle).

## Next Phase Readiness

- Backend has_dishes filter ready for use by other endpoints if needed
- Frontend mutual-exclusion pattern can be reused for other admin filters (e.g., categories with multiple-choice semantics → use the same toggle-on-same-value-nulls-out pattern)
- 如果未来需要「全部」显式按钮（例如在 mobile 上更醒目），可在 filter-action-row 内添加第三个 toggle：`assocFilter === null ? 'filled' : 'outlined'`，`onClick={() => setAssocFilter(null)}`
