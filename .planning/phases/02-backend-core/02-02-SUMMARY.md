---
phase: 02-backend-core
plan: 02
subsystem: api
tags: [fastapi, sqlalchemy, pydantic, guest-order, atomic-transaction, feishu-notification, tdd]

# Dependency graph
requires:
  - phase: 02-backend-core/01
    provides: GuestService, guest router, guest schemas, guest_user fixture
provides:
  - POST /api/guest/{token}/orders — guest one-time order submission (atomic)
  - GET /api/guest/{token}/summary — used-link order summary (read-only)
  - Feishu notification is_guest support (orange header + 【访客订单】 tag)
  - GuestService.submit_guest_order (atomic check+create+update)
  - GuestService.get_used_invitation_summary
  - GuestService._send_guest_notification
  - 6 new integration tests for order submission and summary
affects: [frontend-guest-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [atomic-one-time-enforcement, guest-feishu-notification, used-link-summary]

key-files:
  created: []
  modified:
    - backend/app/services/guest_service.py
    - backend/app/routers/guest.py
    - backend/app/integrations/feishu.py
    - backend/app/services/order_service.py
    - backend/tests/test_guest.py
    - backend/tests/conftest.py

key-decisions:
  - "访客订单通过事务内状态检查+订单创建+状态更新实现原子性一次性使用（D-05/D-06/D-07）"
  - "飞书通知扩展 is_guest 标识，访客订单显示【访客订单】橙色标题（D-09）"
  - "虚拟访客用户通过 username='__guest__' 查询，不硬编码 ID（Pitfall 5）"
  - "飞书通知失败不阻塞订单创建，try/except 包裹（D-10）"
  - "访客端点不走 JWT 认证，仅通过路径参数 token 验证（D-12）"

patterns-established:
  - "atomic one-time enforcement: check status=active → create order → update status=used in single transaction"
  - "guest notification: is_guest flag in notification_data, Feishu card with orange template"
  - "used-link summary: token-based read-only order details after submission"

requirements-completed: [GORD-05, DATA-04, NOTIF-01, GUX-04]

# Metrics
duration: 45min
completed: 2026-05-24
---

# Phase 2 Plan 02: Guest Order Submission + Summary Summary

**Guest order submission with atomic one-time enforcement, Feishu notification with guest labeling, and used-link order summary**

## Performance

- **Duration:** 45 min
- **Started:** 2026-05-24T16:00:57Z
- **Completed:** 2026-05-24T16:46:46Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Guest can submit exactly one order per invitation via POST /api/guest/{token}/orders (double-submit returns 400)
- Order creation and invitation status update are atomic (single transaction, D-05/D-06/D-07)
- Guest order has guest_invitation_id set, user_id points to virtual __guest__ user
- Chef receives Feishu notification with 【访客订单】orange header when guest submits order
- Used invitation link returns read-only order summary via GET /api/guest/{token}/summary
- Expired/invalid tokens return appropriate 400 errors
- All 13 guest module tests pass (7 from Plan 01 + 6 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Feishu notification for guest orders and verify D-08** - `f25f2c8` (feat)
2. **Task 2 RED: Add failing tests for guest order submission and summary** - `bf9c00e` (test)
3. **Task 2 GREEN: Implement guest order submission, summary, and tests** - `87e4ffc` (feat)

## Files Created/Modified
- `backend/app/integrations/feishu.py` — Added is_guest support: orange header, 【访客订单】 tag, user_name="访客" override
- `backend/app/services/order_service.py` — Added D-08 verification comments at both notification call sites
- `backend/app/services/guest_service.py` — Added submit_guest_order, _get_guest_user_id, _send_guest_notification, get_used_invitation_summary
- `backend/app/routers/guest.py` — Added POST /{token}/orders and GET /{token}/summary endpoints
- `backend/tests/test_guest.py` — Added 6 new tests (submit, double-submit, expired, invalid dish, summary, unused summary)
- `backend/tests/conftest.py` — Fixed clean_all_tables (added dish_chefs, dish_semifinished_ingredients), reset rate limiter, commit PRAGMA

## Decisions Made
- Atomic one-time enforcement via single transaction: status check → order create → status update (per D-05/D-06/D-07)
- Virtual guest user queried by username "__guest__" instead of hardcoded ID (per Pitfall 5)
- Feishu notification failure does not block order creation (per D-10)
- Guest endpoints use no JWT auth, only path parameter token (per D-12)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed lazy-load crash in router response building**
- **Found during:** Task 2 (test_guest_submit_order failed with MissingGreenlet)
- **Issue:** Accessing `order.items` in router triggered SQLAlchemy lazy load in async context
- **Fix:** Use `order_data.items` (request data) instead of `order.items` (lazy-loaded relationship) in response
- **Files modified:** backend/app/routers/guest.py
- **Committed in:** 87e4ffc (Task 2 GREEN commit)

---

**2. [Rule 3 - Blocking] Fixed conftest.py missing tables in clean_all_tables**
- **Found during:** Task 2 (test_guest_submit_order_invalid_dish failed — dish_chefs data leaked between tests)
- **Issue:** `clean_all_tables` did not include `dish_chefs` and `dish_semifinished_ingredients` tables, causing DishChef records to persist across tests
- **Fix:** Added both tables to the cleanup list
- **Files modified:** backend/tests/conftest.py
- **Committed in:** 87e4ffc (Task 2 GREEN commit)

---

**3. [Rule 3 - Blocking] Fixed rate limiter persisting across tests**
- **Found during:** Task 2 (tests 9-13 failed with 429 Too Many Requests)
- **Issue:** `auth_limiter` RateLimiter singleton accumulated requests across tests, blocking login after ~10 requests
- **Fix:** Reset `auth_limiter._requests` in clean_db fixture
- **Files modified:** backend/tests/conftest.py
- **Committed in:** 87e4ffc (Task 2 GREEN commit)

---

**4. [Rule 3 - Blocking] Fixed uncommitted PRAGMA in clean_all_tables**
- **Found during:** Task 2 (investigated as potential cause of session contamination)
- **Issue:** `PRAGMA foreign_keys = ON` after commit started an implicit transaction that was never committed
- **Fix:** Added `await conn.commit()` after the PRAGMA statement
- **Files modified:** backend/tests/conftest.py
- **Committed in:** 87e4ffc (Task 2 GREEN commit)

---

**Total deviations:** 4 auto-fixed (1 bug, 3 blocking issues)
**Impact on plan:** All fixes in test infrastructure or response building. No scope creep.

## TDD Gate Compliance

- ✅ RED commit: `bf9c00e` — test(02-02): add failing tests
- ✅ GREEN commit: `87e4ffc` — feat(02-02): implement features, all tests pass
- No REFACTOR needed — code is clean

## Issues Encountered
None beyond the auto-fixed issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Guest order submission and summary endpoints ready for frontend integration
- All Phase 2 requirements (INV-01, INV-02, GORD-01, GORD-02, GORD-05, DATA-04, NOTIF-01, GUX-04) complete
- Ready for Phase 3 (Frontend) or Phase 4 as planned

---
*Phase: 02-backend-core*
*Completed: 2026-05-24*
