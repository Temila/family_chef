---
phase: 06-notifications-integration
plan: 03
subsystem: api
tags: [fastapi, feishu, notification, badge, async, pydantic]

# Dependency graph
requires:
  - phase: 06-notifications-integration
    provides: naive_utc_now() clock helper, Wish.last_status_change_at + Wish.submitter_last_viewed_at columns, Wish notification columns (viewed_at, noted_at etc.)
provides:
  - FeishuClient.send_wish_notification() card method with plain_text user content, lark_md deep link, 1000-char note truncation
  - WishNotificationService singleton — notify_new_wish (fan-out to all bound chefs) + notify_claimed_wish_change (single recipient by claimed_by_chef_id)
  - wish_service.py: 5 hook locations wired (claim/advance/reject/cancel write last_status_change_at; update_wish content-edit explicitly does NOT) + submit_wish fan-out + atomic claim timestamp via .values()
  - Full test coverage (30 tests): fan-out targeting, failure isolation, service payloads, card rendering (3 card shapes + truncation), badge lifecycle
affects: [phase-7-frontend, feishu-card-customization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy import of feishu_client inside notification_service to avoid circular dependencies at module load time"
    - "Per-recipient try/except for Feishu fan-out — one failure does not block delivery to others"
    - "Pre-mutation capture of old_note and claimed_by_chef_id before flush (Pitfall 7 pattern)"
    - "Atomic last_status_change_at via update(Wish).values() in claim to avoid concurrent-window race (D-01 boundary)"
    - "Targeted db.refresh(wish, ['updated_at']) after flush to avoid MissingGreenlet from onupdate expiry"

key-files:
  created:
    - backend/app/services/notification_service.py
    - backend/tests/test_wish_notifications.py
  modified:
    - backend/app/integrations/feishu.py
    - backend/app/services/wish_service.py

key-decisions:
  - "WishNotificationService is a separate module (not methods on FeishuClient) to keep recipient resolution + failure isolation out of the integration layer"
  - "Caught pre-mutation capture pattern (Pitfall 7) for claimed_by_chef_id BEFORE flush in update_wish/cancel_wish — the ORM resets relationships post-flush"
  - "update_wish on a claimed wish sends a Feishu card but NEVER writes last_status_change_at (locked D-H01 rule 2)"
  - "claim_wish writes last_status_change_at inside atomic update(Wish).values() — single SQL statement, no concurrent window"

requirements-completed: [NOTIF-03, NOTIF-05, NOTIF-06]

# Metrics
duration: 18min
completed: 2026-07-22
---

# Phase 06 Plan 03: Feishu Card + Notification Service + Hook Wiring Summary

**Feishu wish notification delivery layer: dedicated card method (plain_text/lark_md/truncation), WishNotificationService with fan-out and failure isolation, and 5 hook locations wired in wish_service.py with atomic claim timestamp — 30-test regression suite covering targeting, rendering, and badge lifecycle**

## Performance

- **Duration:** 18min (excluding previous-session work pre-committed before continuation)
- **Started:** 2026-07-22 (Plan 06-03 started)
- **Completed:** 2026-07-22
- **Tasks:** 3 (all committed)
- **Files modified:** 4

## Accomplishments

- **Feishu card method:** `send_wish_notification(receive_id, payload)` with 3 card templates (new/edit/cancel) using `plain_text` for user content, `lark_md` only for the controlled deep link, and `_truncate_note` enforcing the 1000-char cap (Pitfall 9)
- **Notification service:** `WishNotificationService` singleton with `notify_new_wish` (fan-out to all chefs with `feishu_open_id IS NOT NULL`) and `notify_claimed_wish_change` (single recipient by `claimed_by_chef_id`). Each recipient wrapped in its own try/except — failure isolation per Pitfall 6.
- **Hook wiring (5 locations + submit fan-out):** `submit_wish` → `notify_new_wish` fan-out; `claim_wish` → atomic `last_status_change_at` via `.values()`; `update_wish` → pre-mutation capture + `notify_claimed_wish_change` (NO status timestamp per D-H01 rule 2); `cancel_wish` → pre-mutation capture + status timestamp + `notify_claimed_wish_change`; `advance_wish`/`reject_wish` → status timestamp assignment before flush with targeted refresh
- **Comprehensive test suite (30 tests):** Section A (fan-out targeting, role filtering, unbound skip, failure isolation), Section B (service payload structure for new/edit/cancel), Section C (card rendering — 3 shapes, optional omission, truncation, plain_text enforcement, deep link), Section D (badge lifecycle — unread restore on claim/advance/reject/cancel, invalid transitions preserve timestamps, content-edit no timestamp advance)
- **Pre-committed tasks preserved:** Task 1 (`send_wish_notification` + `_truncate_note` in feishu.py) and Task 2 (`WishNotificationService` in notification_service.py) were committed in prior sessions and carried forward.

## Task Commits

Each task was committed atomically:

1. **Task 1: send_wish_notification() card method with plain_text + truncation** — `02fd476` (feat) *(pre-commited in prior session)*
2. **Task 2: WishNotificationService with fan-out and failure isolation** — `e81438d` (feat) *(pre-commited in prior session)*
3. **Task 3: Wire 5 hook locations + submit fan-out + atomic claim** — `924c421` (feat) *(pre-commited in prior session)*
   - Test file: `331728d` (test) — 30-test regression suite

## Files Created/Modified

- `backend/app/integrations/feishu.py` — Added `send_wish_notification()` card method + `_truncate_note()` helper (Task 1)
- `backend/app/services/notification_service.py` — NEW: `WishNotificationService` with `notify_new_wish` + `notify_claimed_wish_change` (Task 2)
- `backend/app/services/wish_service.py` — 5 hook locations wired + submit fan-out + atomic claim timestamp + content-edit boundary (Task 3)
- `backend/tests/test_wish_notifications.py` — NEW: 30-test suite covering Sections A-D (part of Task 3)

## Decisions Made

- **Pre-mutation capture before flush (Pitfall 7):** In `update_wish` and `cancel_wish`, capture `old_note`, `was_claimed`, and `claimed_by_chef_id` *before* mutating ORM attributes. Post-flush, the ORM may have changed relationships — pre-flush capture ensures the hook has the correct pre-mutation state.
- **Lazy import pattern for feishu_client:** Following the existing codebase convention (e.g., `order_service.py`), notification_service uses `from app.integrations.feishu import feishu_client` inside method bodies to avoid circular imports at module load time.
- **Atomic claim timestamp:** `claim_wish` writes `last_status_change_at` inside the same `update(Wish).values()` call that sets `status` and `claimed_by_chef_id` — a single SQL statement eliminating the concurrent-window race between the WHERE check and the SET.
- **update_wish NEVER writes status timestamp:** Per locked D-H01 rule 2, content-only edits on claimed wishes send a Feishu notification card but must not advance `last_status_change_at` (badge should not re-appear for a content edit).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test claimed-wish edit/cancel silently skipped notification because claiming chef had no feishu_open_id**

- **Found during:** Task 3 (test verification after commit)
- **Issue:** Four tests (`test_edit_claimed_notifies_claimer`, `test_cancel_claimed_notifies_claimer`, `test_edit_service_payload_includes_old_and_new_note`, `test_cancel_service_payload_omits_note_fields`) claimed the wish using the `chef_token` fixture, which creates a chef user *without* `feishu_open_id`. When `notify_claimed_wish_change` queried `User.feishu_open_id` for `claimed_by_chef_id`, it found `None` and silently skipped the notification — causing `assert mock_send.await_count == 1` to fail (actual: 0).
- **Fix:** Added `_bind_chef_feishu()` helper that sets `feishu_open_id = "open_id_chef"` on the default chef user, and called it in all four failing tests after `_setup_two_bound_chefs()`.
- **Files modified:** `backend/tests/test_wish_notifications.py`
- **Verification:** All 30 tests pass after fix.
- **Committed in:** `331728d` (part of test commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for test correctness. No scope creep.

## Issues Encountered

- **Test chef had no feishu_open_id:** The `chef_token` fixture creates a bare chef user without `feishu_open_id`. Tests that claim a wish via this chef and expect `notify_claimed_wish_change` to call `send_wish_notification` need the chef to have `feishu_open_id` set. Fixed by adding `_bind_chef_feishu()` helper.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Backend notification wiring complete: Feishu cards are sent on wish submit (fan-out to bound chefs), claimed-wish edit/cancel (to claiming chef). Badge lifecycle fully wired: every status transition writes `last_status_change_at`.
- Phase 7 (frontend integration) can rely on:
  - Stable `has_unread` computed boolean on `WishListResponse`
  - `GET /api/wishes/{id}` submitter-only badge clear side-effect
  - Feishu card delivery for new wishes and claimed-wish changes
  - Atomic claim timestamp preventing concurrent-window badge issues
- Threat model concerns: Feishu credentials (`FEISHU_APP_ID`, `FEISHU_APP_SECRET`) must be configured in production for actual card delivery; mocked in tests.

---

## Self-Check: PASSED

All commits (02fd476, e81438d, 924c421, 331728d) and files (4 modified, 2 created) verified.

---

*Phase: 06-notifications-integration*
*Completed: 2026-07-22*
