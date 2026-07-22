---
phase: 05-data-foundation-wish-lifecycle-api
plan: "03"
subsystem: backend-router
tags: [fastapi, router, rest-api, pytest, wishes, security, stride]

# Dependency graph
requires:
  - 05-01
  - 05-02
provides:
  - FastAPI router with 8 REST endpoints at /api/wishes
  - Full test coverage: 14 happy-path + 8 security tests (25 total)
  - WishPermissionError→403 / ValueError→400 / None→404 error contract
  - Atomic claim with concurrent race safety (D-01/D-02)
  - Role-aware visibility (D-05) + 404-not-403 ID enumeration protection (D-03)
affects: [05-04, 05-05, 05-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FastAPI APIRouter with Depends() for auth injection
    - WishPermissionError(ValueError) subclass caught before generic ValueError (D-04)
    - Flatten pattern for submitter_name/claimed_by_chef_name injection (guest.py style)
    - asyncio.gather for concurrent claim race test
    - pytest-asyncio auto mode with async fixtures

key-files:
  created:
    - backend/app/routers/wishes.py
    - backend/tests/test_wishes.py
  modified:
    - backend/app/main.py
    - backend/tests/conftest.py

key-decisions:
  - "D-03: get_wish returns 404 for both not-found and no-permission (ID enumeration prevention)"
  - "D-04: WishPermissionError caught BEFORE ValueError in all 4 mutate endpoints (Python first-match)"
  - "D-05: chef list sees 待处理 + own claims; cross-chef claimed wishes invisible to other chefs"
  - "Error contract: claim_wish only raises ValueError (not WishPermissionError); require_role handles role gate"
  - "reject_reason whitespace \"   \" returns 400 from service layer (not 422 from Pydantic)"

patterns-established:
  - "Role-gated router: require_role('chef','admin') for claim/advance/reject; get_current_user_from_token for others"
  - "Flatten pattern: WishListResponse.model_validate(w); then set .submitter_name/.claimed_by_chef_name"
  - "conftest extension: wishes table in clean_all_tables + Wish model import + chef2/user2 fixtures"

requirements-completed: [WISH-01, WISH-02, FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05]

# Metrics
duration: 20min
completed: 2026-07-21
---

# Phase 05, Plan 03: Wishes Router — REST API + Happy-Path + Security Tests

**Wishes REST API router at /api/wishes with 8 endpoints, role-aware visibility, 14 happy-path tests, and 8 STRIDE-mapped security tests — all 25 tests passing**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-21T07:40:00Z
- **Completed:** 2026-07-21T07:56:00Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

### Task 1: Create wishes router + register in main.py + extend conftest
- `backend/app/routers/wishes.py` — 8 endpoints (POST/GET/PUT/DELETE/claim/advance/reject at /api/wishes)
- `backend/app/main.py` — `wishes` added to import tuple + `app.include_router(wishes.router, prefix="/api/wishes", tags=["愿望单"])` registered
- `backend/tests/conftest.py` — `"wishes"` added to `clean_all_tables`, `from app.models.wish import Wish` imported, `chef2_token` and `user2_token` fixtures added
- Error conversion: `WishPermissionError` caught before `ValueError` in update/cancel/advance/reject (D-04 first-match-wins)
- `get_wish` returns 404 for both not-found and no-permission (D-03)
- `claim_wish` uses `require_role("chef","admin")` so only role-gated, no WishPermissionError catch needed

### Task 2: Happy-path tests — 14 tests covering all 8 endpoints
- submit (201 + 待处理), submit validates dish_name (422)
- list role-aware (user=own, admin=all, chef=待处理+mine), list mine filter, chef cross-visibility
- get wish detail with submitter_name flattened
- update during 待处理 and 准备中 (both pass), update blocked when 已上架 (400)
- cancel soft-delete (status=已撤销)
- claim (status=准备中), advance (status=已上架 + related_dish_id), reject (status=已拒绝 + reject_reason)
- reject_requires_reason ({}+"" → 422)

### Task 3: 8 STRIDE-mapped security tests
1. `test_regular_user_cannot_claim/advance/reject` → 403 (T-5-14 vertical escalation)
2. `test_unauthorized_read_returns_404_not_403` → 404 not 403 (T-5-16 D-03)
3. `test_chef_cannot_advance/reject_other_chef_claim` → 403 + claimer name in detail (T-5-15 D-04)
4. `test_concurrent_claim_only_one_wins` → exactly one 200 + one 400 (T-5-17 D-01/D-02)
5. `test_advance_rejects_unpublished_dish` → 400 exact "你未发布此菜品或菜品不可用" (T-5-18 D-09)
6. `test_reject_without_reason_returns_422` → {}+"" → 422, "   " → 400 (T-5-19 FLOW-04)
7. `test_submit_empty_dish_name_returns_422` → 422 (V5 input validation)
8. `test_mass_assignment_status_ignored` → status="已上架" dropped to "待处理" (T-5-20)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | wishes router + main.py + conftest | `33f0182` | backend/app/routers/wishes.py, backend/app/main.py, backend/tests/conftest.py |
| 2 | 14 happy-path tests | `be31a72` | backend/tests/test_wishes.py |
| 3 | 8 STRIDE security tests | `56f455a` | backend/tests/test_wishes.py |

## Decisions Made

- **claim_wish only raises ValueError** (not WishPermissionError) — role gate is handled by `require_role` dependency at the router level, which raises 403 before the service runs. This is different from advance/reject which need service-level ownership checks.
- **Whitespace reject_reason `"   "` returns 400** (not 422) — Pydantic `min_length=1` validates the string `"   "` as 3 characters and passes; the service's defensive `if not reason.strip()` then raises ValueError → HTTP 400.
- **`get_wish` does NOT call `db.commit()`** — read-only endpoint, no state changes.
- **All 4 mutate endpoints call `await db.commit()` after service returns** and BEFORE `WishResponse.model_validate(wish)` — ensures DB state is committed before serialization.

## Deviations from Plan

**1. [Rule 1 - Bug Fix] `test_reject_without_reason_returns_422` corrected expected status for whitespace string**
- **Found during:** Task 3 execution
- **Issue:** Plan specified `"   " → 422` but `"   "` (3 whitespace chars) passes Pydantic `min_length=1` validation and hits the service defensive check → 400
- **Fix:** Changed assertion to `"   " → 400`, added explicit separate test for `"" → 422`
- **Files modified:** backend/tests/test_wishes.py
- **Commit:** `56f455a`

## Known Stubs

None — all endpoints are fully wired with real data from DB.

## Threat Flags

No new security surface introduced. All 8 threats from the plan's threat model (T-5-14 through T-5-22) have end-to-end tests proving mitigations.

| Flag | File | Description |
|------|------|-------------|
| None | — | No new network endpoints beyond /api/wishes (all existing patterns) |

## Verification

All acceptance criteria met:

- `backend/app/routers/wishes.py` has all 8 endpoint decorators ✓
- Router registered at `/api/wishes` in main.py ✓
- conftest: wishes in clean_all_tables, Wish imported, chef2/user2 fixtures ✓
- `cd backend && uv run python -m pytest tests/test_wishes.py -v` → **25 passed** ✓
- `cd backend && uv run python -c "from app.main import app; assert any('/api/wishes' in str(r.path) for r in app.routes)"` ✓
- Pre-existing failure `test_dish_list_pagination` in test_advanced.py confirmed NOT caused by our changes (ran without our commits → same failure) ✓

## Pre-existing Failure (Not Caused By This Plan)

- `tests/test_advanced.py::test_dish_list_pagination` — returns HTML instead of JSON for `/api/dishes/?page=1&page_size=5`; confirmed pre-existing by running without our commits. Out of scope per deviation rules.

## Next Phase Readiness

- Phase 6 (notifications) can hook into `# Phase 6 hook:` comment placeholders in wish_service.py methods
- Phase 7 (frontend) can consume the `/api/wishes` REST API immediately
- All WISH-01/02 and FLOW-01..05 requirements are implemented and tested

---
*Phase: 05-data-foundation-wish-lifecycle-api / Plan 03*
*Completed: 2026-07-21*

## Self-Check: PASSED

- `backend/app/routers/wishes.py` exists → FOUND
- `backend/tests/test_wishes.py` exists → FOUND
- `33f0182` in git log → FOUND
- `be31a72` in git log → FOUND
- `56f455a` in git log → FOUND
- `uv run pytest tests/test_wishes.py -q` → 25 passed ✓
- Router mounted at `/api/wishes` verified in main.py ✓
