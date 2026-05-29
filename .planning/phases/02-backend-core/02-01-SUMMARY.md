---
phase: 02-backend-core
plan: 01
subsystem: api
tags: [fastapi, sqlalchemy, pydantic, uuid, guest-invitation, token-auth]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: GuestInvitation model, Order FK, virtual guest user, Alembic migration
provides:
  - POST /api/guest/invitations — create invitation (chef auto-binds, user specifies chef_id)
  - GET /api/guest/{token}/dishes — guest dish browsing without JWT auth
  - GuestService with create_invitation, validate_invitation, get_guest_dishes
  - DishService.list_dishes target_chef_id parameter for per-chef filtering
  - 7 integration tests covering invitation creation and guest dish browsing
affects: [02-02, frontend-guest-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [token-based-guest-access, lazy-expiry-check, target-chef-filtering]

key-files:
  created:
    - backend/app/schemas/guest.py
    - backend/app/services/guest_service.py
    - backend/app/routers/guest.py
    - backend/tests/test_guest.py
  modified:
    - backend/app/services/dish_service.py
    - backend/app/main.py
    - backend/tests/conftest.py

key-decisions:
  - "Chef 角色自动绑定自己为 chef_id，User 角色必须提供 chef_id（INV-01/INV-02）"
  - "复用 DishService.list_dishes 的 target_chef_id 参数过滤厨师上架菜品（D-02/D-03）"
  - "惰性过期检查：每次 validate_invitation 时检查 expires_at 并更新 status（Pitfall 3）"
  - "访客端点不使用 JWT 认证，通过路径参数 token 验证权限（D-12）"

patterns-established:
  - "GuestService: @staticmethod 单例模式，与现有 service 一致"
  - "token-based access: 访客端点只用 Depends(get_db)，通过 UUID4 token 验证"
  - "lazy expiry: validate_invitation 时检查 expires_at < now，过期则更新 status='expired'"

requirements-completed: [INV-01, INV-02, GORD-01, GORD-02]

# Metrics
duration: 13min
completed: 2026-05-24
---

# Phase 2 Plan 01: Guest Invitation + Dish Browsing Summary

**Guest invitation API with UUID4 token creation and unauthenticated chef-specific dish listing via target_chef_id filter**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-24T15:34:05Z
- **Completed:** 2026-05-24T15:47:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Chef users can create guest invitations (auto-binds to themselves) via POST /api/guest/invitations
- User role users can create invitations by specifying a chef_id (validated against active chefs)
- Guests can browse bound chef's published dishes via GET /api/guest/{token}/dishes without authentication
- Expired/invalid tokens return 400 with Chinese error messages ("已过期"/"无效的邀请链接")
- Lazy expiry check updates invitation status on each validation
- All 7 integration tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create guest schemas, test infrastructure, and failing tests** - `af6cb9f` (test)
2. **Task 2: Implement GuestService, extend DishService, create guest router** - `c5bab55` (feat)

## Files Created/Modified
- `backend/app/schemas/guest.py` — Pydantic V2 schemas: GuestInvitationCreate, GuestInvitationResponse, GuestOrderItemCreate, GuestOrderCreate, GuestOrderSummaryResponse
- `backend/app/services/guest_service.py` — GuestService with create_invitation, validate_invitation, get_guest_dishes
- `backend/app/routers/guest.py` — Guest API endpoints: POST /invitations, GET /{token}/dishes
- `backend/app/services/dish_service.py` — Extended list_dishes with target_chef_id parameter
- `backend/app/main.py` — Registered guest router at /api/guest
- `backend/tests/conftest.py` — Added GuestInvitation import, guest_invitations table, guest_user fixture
- `backend/tests/test_guest.py` — 7 integration tests for invitation and dish browsing

## Decisions Made
- Chef role auto-binds chef_id=current_user.id (per INV-01), User role must provide chef_id (per INV-02)
- Reused DishService.list_dishes with new target_chef_id parameter instead of creating separate query (per D-02)
- Lazy expiry: validate_invitation checks expires_at on each call and updates status (per Pitfall 3)
- Guest endpoints use only Depends(get_db), no JWT dependency (per D-12)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed trailing slash in test fixture URL**
- **Found during:** Task 2 (test_guest_list_dishes failing)
- **Issue:** POST /api/dishes/ (with trailing slash) returned 405 because dishes router uses "" (no slash)
- **Fix:** Changed fixture to POST /api/dishes (without trailing slash)
- **Files modified:** backend/tests/test_guest.py
- **Verification:** All 7 tests pass
- **Committed in:** c5bab55 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor fix in test fixture. No scope creep.

## Issues Encountered
None beyond the trailing slash fix above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Invitation creation and dish browsing endpoints ready for Plan 02 (guest order submission)
- GuestOrderCreate and GuestOrderSummaryResponse schemas pre-created for Plan 02
- GuestService.validate_invitation ready to be reused for order submission atomicity check
- guest_user fixture available in conftest.py for order tests

---
*Phase: 02-backend-core*
*Completed: 2026-05-24*

## Self-Check: PASSED
