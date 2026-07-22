---
phase: 05-data-foundation-wish-lifecycle-api
plan: "02"
subsystem: backend-service
tags: [fastapi, sqlalchemy, wish-lifecycle, state-machine, permissions]

# Dependency graph
requires:
  - 05-01
provides:
  - WishService singleton + WishPermissionError + 8 async @staticmethod methods
  - Atomic conditional UPDATE for concurrent claim safety (D-01)
  - Role-aware visibility query (D-05)
  - State machine valid_transitions (D-12)
  - WishPermissionError(ValueError) boundary for 403/400 distinction (D-04)
affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added:
    - sqlalchemy.ext.asyncio.AsyncSession (existing)
    - sqlalchemy update() statement API (existing, new usage pattern)
  patterns:
    - Service-as-singleton with @staticmethod async methods
    - WishPermissionError(ValueError) subclass for error-boundary separation
    - Atomic conditional UPDATE with rowcount==0 disambiguation
    - State machine via valid_transitions dict (mirrors OrderService)
    - Role-aware visibility query (D-05 admin/chef/user branches)
    - Phase 6 hook comment placeholders at transition tails
    - selectinload() for N+1 prevention on all list/detail queries

key-files:
  created:
    - backend/app/services/wish_service.py
  modified: []

key-decisions:
  - "D-01: claim_wish uses single atomic UPDATE WHERE id+status, first db.execute is the UPDATE (no SELECT-then-UPDATE), rowcount==0 disambiguates not-found vs already-claimed"
  - "D-04: WishPermissionError(ValueError) subclass lets router catch 403 before generic ValueError→400 conversion"
  - "D-05: list_wishes helper function _apply_filters() used by both main query and count query to guarantee consistent filtering"
  - "D-12: valid_transitions dict with 5 keys; terminal states (已上架/已拒绝/已撤销) have empty lists"

patterns-established:
  - "WishPermissionError(ValueError) error-boundary pattern"
  - "Atomic conditional UPDATE with existence-check disambiguation for race safety"
  - "State machine valid_transitions dict (5-state, terminal-state locking)"
  - "Role-aware visibility with shared filter helper for list+count query consistency"

requirements-completed: [DATA-08, PERM-01, PERM-02, PERM-03, PERM-04]

# Metrics
duration: 18min
completed: 2026-07-21
---

# Phase 05, Plan 02: WishService — Lifecycle State Machine + Permissions

**WishService with 8 methods implementing full wish lifecycle, atomic concurrent claim, role-aware visibility, and WishPermissionError 403/400 boundary**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-21T07:33:00Z
- **Completed:** 2026-07-21T07:51:00Z
- **Tasks:** 2
- **Files modified:** 1 (1 created)

## Accomplishments

- Task 1: `WishPermissionError(ValueError)` + 5 CRUD/visibility methods (`submit_wish`, `get_wish_by_id`, `list_wishes`, `update_wish`, `cancel_wish`) — role-aware visibility (D-05), D-03 None-for-both pattern, D-06 edit-window, D-07 soft-delete, selectinload N+1 prevention, Phase 6 hook comments
- Task 2: 3 workflow transition methods (`claim_wish`, `advance_wish`, `reject_wish`) — atomic UPDATE (D-01), rowcount disambiguation (D-02/D-03), valid_transitions state machine (D-12), DishChef published validation (D-09), WishPermissionError for PERM-03/D-04, Phase 6 hook comments

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | WishPermissionError + CRUD/visibility methods | `ae85897` | backend/app/services/wish_service.py |
| 2 | Workflow transitions — claim/advance/reject | `1efde62` | backend/app/services/wish_service.py |

## Files Created/Modified

- `backend/app/services/wish_service.py` — 363 lines; `WishPermissionError`, `WishService` class with `valid_transitions` dict + 8 `@staticmethod async` methods, module-level `wish_service = WishService()` singleton

## Decisions Made

- **D-01 claim atomicity:** First `db.execute` in `claim_wish` is `update(Wish).where(Wish.id == wish_id, Wish.status == "待处理").values(...)` — no SELECT before it. `rowcount == 0` triggers a single-column existence check to distinguish "not found" (→ None → 404) from "already claimed" (→ ValueError → 400). No `with_for_update()`.
- **D-04 WishPermissionError:** Thin `ValueError` subclass defined in the same module. Router catches it before generic `ValueError` to convert to HTTP 403. Generic `except ValueError` fallback still works (subclass relationship).
- **D-05 filter consistency:** Private `_apply_filters()` helper inside `list_wishes` applies visibility + optional filters to both the main query and the count query. This is the cleanest way to guarantee list and total always agree.
- **D-09 DishChef validation in advance_wish:** Uses `wish.claimed_by_chef_id or current_user.id` as the chef_id for DishChef lookup — handles both the normal case (wish has claimer) and edge case (admin advancing directly).
- **Phase 6 hooks:** `# Phase 6 hook: notify claiming chef/submitter` comments at transition tails in `update_wish`, `cancel_wish`, `claim_wish`, `advance_wish`, `reject_wish`. No `feishu_client` imported.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

All acceptance criteria met:

- `cd backend && uv run python -c "from app.services.wish_service import wish_service, WishPermissionError, WishService"` exits 0
- `WishPermissionError` subclasses `ValueError` ✓
- All 8 methods present on `WishService` ✓
- `valid_transitions` dict has 5 keys with correct D-12 values ✓
- `claim_wish` first `db.execute` is `update(Wish)...` (not `select`) ✓
- `claim_wish` contains `result.rowcount == 0` check ✓
- `advance_wish` raises `WishPermissionError` for non-claimer non-admin ✓
- `advance_wish` validates `DishChef.status == "published"` (D-09) ✓
- `reject_wish` raises `WishPermissionError` for non-claimer non-admin ✓
- `reject_wish` sets `wish.status = "已拒绝"` + `wish.reject_reason` ✓
- `grep -c 'feishu_client' backend/app/services/wish_service.py` → `0` ✓
- `grep -c 'with_for_update' backend/app/services/wish_service.py` → `0` ✓
- `# Phase 6 hook:` appears 5 times (update, cancel, claim, advance, reject) ✓
- `list_wishes` contains `or_(Wish.status == "待处理", Wish.claimed_by_chef_id == current_user.id)` (chef visibility) ✓
- `get_wish_by_id` returns `None` for unauthorized (not raise) ✓
- `cancel_wish` uses soft-delete `wish.status = "已撤销"` (no `db.delete`) ✓

## Next Phase Readiness

- Plan 03 (wishes router) can begin immediately — service interface is complete
- No blockers

---
*Phase: 05-data-foundation-wish-lifecycle-api / Plan 02*
*Completed: 2026-07-21*
