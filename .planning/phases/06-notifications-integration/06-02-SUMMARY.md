---
phase: 06-notifications-integration
plan: 02
subsystem: api
tags: [fastapi, pydantic, sqlalchemy, badge, notifications, access-control]

# Dependency graph
requires:
  - phase: 06-notifications-integration
    provides: naive_utc_now() clock helper, Wish.last_status_change_at + Wish.submitter_last_viewed_at columns
provides:
  - WishListResponse.has_unread computed boolean (submitter-only disclosure)
  - compute_has_unread() helper with D-B01 formula + Pitfall 5 non-submitter masking
  - GET /api/wishes/{id} submitter-only clear side-effect (submitter_last_viewed_at write)
  - test_wish_badge.py — 6 regression tests covering badge lifecycle, clear authorization, viewer masking
affects: [06-03, phase-7-frontend, badge-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Router-computed derived boolean at serialization boundary (no DB computed column)"
    - "Exact-identity gate (wish.user_id == current_user.id) for badge clear side-effect, not role-based"
    - "Targeted db.refresh(wish, ['updated_at']) after flush to avoid MissingGreenlet from onupdate expiry in async ORM"

key-files:
  created:
    - backend/tests/test_wish_badge.py
  modified:
    - backend/app/schemas/wish.py
    - backend/app/routers/wishes.py

key-decisions:
  - "has_unread disclosed ONLY to the wish's submitter via compute_has_unread identity masking (Pitfall 5)"
  - "Badge clear uses exact identity check wish.user_id == current_user.id — chef (post-claim) and admin reads never write submitter_last_viewed_at (Pitfall 4)"
  - "Targeted db.refresh(wish, ['updated_at']) after flush fixes onupdate expiry without expiring selectinload relationships"

patterns-established:
  - "Pattern: derived badge fields computed in the router layer via a pure helper, not persisted or computed in SQL"
  - "Pattern: side-effect writes that trigger onupdate expiry use targeted attribute refresh in async SQLAlchemy"

requirements-completed: [NOTIF-03, NOTIF-04]

# Metrics
duration: 15min
completed: 2026-07-22
---

# Phase 6 Plan 02: Wish Unread Badge API Summary

**Read-side contract for NOTIF-03/04: `WishListResponse.has_unread` computed per-item with submitter-only disclosure, and `GET /api/wishes/{id}` clears the badge as a side effect exclusively for the wish's submitter — enforced by 6 regression tests covering the submitter, claimer, and admin viewer paths.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-22T07:26:52Z
- **Completed:** 2026-07-22T07:42:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Added `WishListResponse.has_unread: bool = False` — a computed field set per-item in the router, never persisted or exposed as a raw timestamp (D-B02)
- Added `compute_has_unread(wish, current_user)` module-level helper implementing the locked D-B01 unread formula with Pitfall 5 non-submitter masking (returns `False` for any viewer whose `id != wish.user_id`)
- Wired per-item `has_unread` computation in `list_wishes` via the helper — only submitters see real unread state; admins and chefs always see `False`
- Added submitter-only clear side-effect in `get_wish`: when `wish.user_id == current_user.id`, sets `submitter_last_viewed_at = naive_utc_now()` and flushes (no commit — `get_db()` owns the commit per D-B03). Chef (post-claim) and admin reads never trigger this write (Pitfall 4)
- Created `test_wish_badge.py` with 6 tests covering: initial unread state, submitter detail clears badge, chef detail does NOT clear (claim precondition enforced), admin detail does NOT clear, admin list masks unread, chef list masks unread

## Task Commits

Each task was committed atomically:

1. **Task 1: schema field + router compute/clear** — `3d11d2c` (feat)
2. **Task 2: badge lifecycle + authorization tests** — `bb0fa9e` (test)

## Files Created/Modified
- `backend/app/schemas/wish.py` — Added `has_unread: bool = False` to `WishListResponse` (last field after `claimed_by_chef_name`)
- `backend/app/routers/wishes.py` — Added `naive_utc_now` import, `compute_has_unread` helper, per-item `has_unread` in `list_wishes`, submitter-only clear side-effect in `get_wish`
- `backend/tests/test_wish_badge.py` — 6 regression tests (224 lines) covering badge lifecycle, clear authorization, and viewer masking

## Decisions Made
- **Targeted `db.refresh(wish, ['updated_at'])` after flush:** The plan specified `await db.flush()` for the clear side-effect. However, `Wish.updated_at` has `onupdate=func.now()`, so after flush SQLAlchemy expires that column. When `WishDetailResponse.model_validate(wish)` reads `updated_at`, it triggers a synchronous lazy-load that fails in async context (`MissingGreenlet`). A targeted refresh of just `updated_at` (using `attribute_names=['updated_at']`) reloads the column without expiring the `selectinload`-populated `submitter`/`claimer` relationships that the response also needs. This is the minimal fix — no commit, no full-object refresh, no relationship re-query.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed MissingGreenlet async lazy-load error after db.flush() in get_wish**
- **Found during:** Task 1 (running existing `test_get_wish_detail` regression)
- **Issue:** The plan's clear side-effect code (`wish.submitter_last_viewed_at = naive_utc_now(); await db.flush()`) causes `Wish.updated_at` to be expired by SQLAlchemy (due to `onupdate=func.now()`). When Pydantic's `WishDetailResponse.model_validate(wish)` subsequently reads `updated_at`, SQLAlchemy attempts a synchronous lazy-load, which raises `MissingGreenlet: greenlet_spawn has not been called` in the async context.
- **Fix:** Added `await db.refresh(wish, ["updated_at"])` immediately after `await db.flush()`. This reloads only the expired `updated_at` column from the DB without expiring other attributes (critically, the eagerly-loaded `submitter` and `claimer` relationships accessed later in the same handler). The acceptance criterion "calls naive_utc_now() then db.flush() (no db.commit) only when wish.user_id == current_user.id" is preserved — the refresh is a read-only reload, not a commit.
- **Files modified:** `backend/app/routers/wishes.py`
- **Verification:** `test_get_wish_detail` (Phase 5) now passes; all 25 existing wish tests + 6 new badge tests pass (31 total).
- **Commit:** `3d11d2c`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The deviation is a necessary async-ORM correctness fix. The refresh is additive and does not change the badge logic, identity gate, or commit boundary. No scope creep.

## Issues Encountered
- Pre-existing test failures in unrelated modules (`test_orders.py`, `test_users.py`, `test_tools.py`, `test_services_extra.py`) — documented in plan critical_context as out of scope. Confirmed: `test_wishes.py` and `test_wish_badge.py` are fully green.

## User Setup Required

None — this plan adds no external service configuration. The `has_unread` field is a derived computation over existing timestamp columns (added in Plan 06-01). Plan 06-03 will wire the write-side hooks that advance `last_status_change_at` on status changes; until then, new wishes show `has_unread=True` to submitters (creation-time `server_default` vs NULL `submitter_last_viewed_at`), and the clear side-effect works immediately.

## Next Phase Readiness
- Read-side badge contract complete: `WishListResponse.has_unread` is computed correctly with submitter-only disclosure, and `GET /api/wishes/{id}` clears it for the submitter only
- Plan 06-03 (Feishu hooks) can now wire the write side: `claim_wish()`, `advance_wish()`, `reject_wish()`, and `cancel_wish()` will advance `last_status_change_at`, causing the badge to re-appear for submitters after a prior clear
- Phase 7 frontend can render red dots by reading `has_unread` from the list response without any further backend changes

---
*Phase: 06-notifications-integration*
*Completed: 2026-07-22*

## Self-Check: PASSED

- All 3 created/modified files exist on disk ✓
- Both task commits found in git log (3d11d2c, bb0fa9e) ✓
- test_wish_badge.py: 6 tests pass ✓
- test_wishes.py: 25 tests pass (no regression) ✓
- Combined: 31 tests pass ✓
