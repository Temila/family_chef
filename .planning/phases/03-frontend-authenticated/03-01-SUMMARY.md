---
phase: 03-frontend-authenticated
plan: 01
subsystem: api
tags: [guest-invitation, orders, backend-schemas, frontend-client, chef-orders, badges]

# Dependency graph
requires:
  - phase: 02-backend-core
    provides: GuestInvitation model, GuestService, guest router skeleton, guest_invitation_id on Order model
provides:
  - Guest list/revoke invitation APIs (GET/PUT)
  - is_guest field on all order API responses
  - Frontend API client guest invitation methods
  - Guest badge and filter in ChefOrdersPage and OrderDetailPage
affects: [03-frontend-authenticated, 04-admin-invitation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Eager-load relationship fields for list response schemas"
    - "Inline function-body import to avoid circular dependency in routers"

key-files:
  created: []
  modified:
    - backend/app/services/guest_service.py
    - backend/app/schemas/guest.py
    - backend/app/routers/guest.py
    - backend/app/schemas/order.py
    - backend/app/routers/orders.py
    - frontend/src/api/client.js
    - frontend/src/utils/index.js
    - frontend/src/css/styles.css
    - frontend/src/pages/AdminChefsPage.jsx
    - frontend/src/pages/ChefOrdersPage.jsx
    - frontend/src/pages/OrderDetailPage.jsx

key-decisions:
  - "GuestInvitationListResponse extends chef_name via eager-loaded chef relationship rather than subquery join"
  - "AdminChefsPage switched from status-based Badge to text+type Badge to free up 'active' key for invitation status"

patterns-established:
  - "List response schemas with eager-loaded relationship fields follow GuestInvitationListResponse + inv.chef.display_name pattern"
  - "Inline import GuestInvitationListResponse in router function body to avoid circular imports (same pattern as existing code)"

requirements-completed: [NOTIF-02]

# Metrics
duration: 15min
completed: 2026-05-25
---

# Phase 3 Plan 01: Guest Invitation List/Revoke APIs + Frontend Guest Badge Integration

**Guest invitation list and revocation backend APIs, is_guest field on all order responses, and frontend guest-order badge/filter in chef views**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-25T21:00:00Z (approx)
- **Completed:** 2026-05-25T21:15:00Z (approx)
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Added `GuestInvitationListResponse` schema with `chef_name: Optional[str]` and two service methods (`list_invitations`, `revoke_invitation`) with ownership validation and lazy expiry check
- Added `GET /api/guest/invitations` and `PUT /api/guest/invitations/{id}/revoke` endpoints behind `require_role("chef", "user")` guard
- Extended `OrderListResponse` and `OrderDetailResponse` with `is_guest: bool` field; set via `order.guest_invitation_id is not None` in both response builders
- Added `getInvitations`, `createInvitation`, `revokeInvitation` to the frontend API client
- Extended `statusBadge` map with invitation states (active→活跃, used→已使用, expired→已过期, revoked→已撤销)
- Added `.badge-muted` CSS class for used-invitation badge
- Refactored `AdminChefsPage` to use `text`+`type` Badge props, freeing up `'active'` key for invitation status
- Added orange「访客订单」badge and guest filter chip to `ChefOrdersPage`
- Added orange「访客订单」badge to `OrderDetailPage`

## Task Commits

Each task was committed atomically:

1. **Task 1: GuestService + Schemas + Router — invitation list & revocation APIs** - `be5509a` (feat)
2. **Task 2: Order schemas + router — add is_guest field** - `f014e16` (feat)
3. **Task 3: Frontend — API client + Badge/utils/CSS + pages guest badge integration** - `43d6d92` (feat)

**Plan metadata:** (SUMMARY commit to follow)

## Files Modified
- `backend/app/services/guest_service.py` - Added `list_invitations` and `revoke_invitation` static methods; added `func` import for count query
- `backend/app/schemas/guest.py` - Added `GuestInvitationListResponse` schema with `chef_name: Optional[str]`
- `backend/app/routers/guest.py` - Added `GET /invitations` and `PUT /invitations/{id}/revoke` endpoints; imported `GuestInvitationListResponse`
- `backend/app/schemas/order.py` - Added `is_guest: bool = False` to `OrderListResponse`; added `is_guest: bool = False` and `guest_invitation_id: Optional[int]` to `OrderDetailResponse`
- `backend/app/routers/orders.py` - Set `is_guest` via `order.guest_invitation_id is not None` in `build_order_detail` and `list_orders`
- `frontend/src/api/client.js` - Added `getInvitations`, `createInvitation`, `revokeInvitation` methods
- `frontend/src/utils/index.js` - Updated `statusBadge`: `active`→`活跃`; added `used`/`expired`/`revoked` entries
- `frontend/src/css/styles.css` - Added `.badge-muted` CSS rule
- `frontend/src/pages/AdminChefsPage.jsx` - Changed Badge from `status={...}` to `text={...} type={...}` pattern (2 occurrences)
- `frontend/src/pages/ChefOrdersPage.jsx` - Added `guest` filter support in `filteredOrders`, guest filter chip, and guest order badge in order header
- `frontend/src/pages/OrderDetailPage.jsx` - Added orange「访客订单」badge next to order title

## Decisions Made
- **GuestInvitationListResponse as separate schema** rather than modifying GuestInvitationResponse — the base response is used in POST /invitations where chef_name is not available (no eager load), while the list endpoint always includes it
- **AdminChefsPage Badge refactor** — switching from `status={...}` to `text={...} type={...}` frees up the 'active'/'inactive' keys in statusBadge for invitation statuses. Visual output remains identical (badge-success green for active, badge-danger red for inactive)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues. Python virtual environment required `backend/.venv/bin/python` for import checks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend APIs for guest invitation list and revocation are ready for admin UI integration (Phase 4)
- Chef order views now show「访客订单」badges and have a guest filter — ready for user testing
- Frontend API client is ready for any invitation management pages

---

*Phase: 03-frontend-authenticated*
*Completed: 2026-05-25*

## Self-Check: PASSED

**Verification results:**
- ✅ Guest schema: GuestInvitationListResponse imports, chef_name field present as Optional[str]
- ✅ Order schemas: OrderListResponse and OrderDetailResponse have is_guest field, defaults to False
- ✅ Frontend assertions: all 6 files verified via Node assertion script
- ✅ Backend import: GuestInvitationListResponse imports without error
