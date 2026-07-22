# Phase 6: Notifications Integration — Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the notification layer for the Wish List (v1.1) feature:

- **NOTIF-03/04:** In-app unread badge for wish submitters — backend API that tells the frontend whether a wish has unread status changes
- **NOTIF-05:** Feishu push to all chefs when a new wish is submitted
- **NOTIF-06:** Feishu push to the claiming chef when a submitter edits or cancels a claimed wish

**Out of scope:**
- Phase 7 frontend (WishCard, badge UI, notification toasts)
- Submitter receiving Feishu push for status changes (badge only per NOTIF-03/04)
- Per-chef notification preferences / opt-out (Phase 6 sends to all chefs with feishu_open_id)
- Full wish history audit log (WISH-F04 — deferred to future phase)
- Phase 6 is purely backend/API — no frontend changes

</domain>

<decisions>
## Implementation Decisions

### Unread Badge Tracking (NOTIF-03/04)

**D-B01 — Badge tracking mechanism:** Two timestamp columns on the `Wish` model:
- `last_status_change_at` — updated by the service whenever the wish's status changes (claim, advance, reject, cancel). Set on wish creation too (so a brand-new wish has no stale "change" time).
- `submitter_last_viewed_at` — set to current datetime when the submitter calls `GET /api/wishes/{id}` (their own wish detail). Initially `NULL` (never viewed = treated as unread until first status change).

**Unread logic (for frontend):** A wish is **unread** for its submitter when:
```
wish.submitter_last_viewed_at is NULL
  OR wish.last_status_change_at > wish.submitter_last_viewed_at
```
No computed field in the DB — the service layer or router computes this for API responses.

**D-B02 — Badge API surface:** The `GET /api/wishes` list response (as `WishListResponse`) gets a computed field `has_unread: bool` — computed per-item using the logic above. The `GET /api/wishes/{id}` handler (when called by the submitter) updates `submitter_last_viewed_at` to now (clearing the badge). No separate endpoint needed.

**D-B03 — `get_wish` side effect:** When the submitter retrieves their own wish detail (`GET /api/wishes/{id}`), the router updates `wish.submitter_last_viewed_at = now()` before returning. This is a write that flushes but does NOT commit (commit happens at end of request as usual).

### Feishu Notifications (NOTIF-05/06)

**D-F01 — Dedicated method:** Add `send_wish_notification()` to `FeishuClient` in `backend/app/integrations/feishu.py`. Do NOT reuse `send_order_notification()`. Wish notifications are structurally different from order notifications (different fields, different card layout).

**D-F02 — Card content (NOTIF-05 — new wish to chefs):**
Fields in the wish Feishu card:
- `愿望菜品`: {dish_name}
- `提交者`: {submitter_display_name}
- `参考链接`: {reference_url} (if present, otherwise omitted)
- `备注`: {note} (if present, otherwise omitted)
- `查看详情`: {app_url}/wishes/{wish_id} (placeholder deep link; Phase 7 frontend registers this route)

**D-F03 — Card content (NOTIF-06 — edit/cancel to claiming chef):**
Fields:
- `菜品`: {dish_name}
- `通知类型`: {edit / cancel}
- `变更说明`: "{submitter_name} {'修改了' if edit else '撤回了'}愿望: {dish_name}"
- `原备注`: {old_note} (if was set)
- `新备注`: {new_note} (if edit and changed)
- `查看详情`: {app_url}/wishes/{wish_id}

**D-F04 — Notification targets:**
- **NOTIF-05 (new wish):** Fan out to ALL chefs with `feishu_open_id` IS NOT NULL. Each chef gets a separate Feishu card. No per-chef opt-out in Phase 6.
- **NOTIF-06 (edit/cancel):** Send to the ONE chef who has `claimed_by_chef_id` on the wish. Requires `feishu_open_id` of that chef. If chef has no `feishu_open_id`, the notification is silently skipped (same pattern as order notifications).
- **Submitter Feishu:** Submitter does NOT receive Feishu push for claim/reject/advance. Only in-app badge per NOTIF-03/04.

### Phase 6 Hook Wiring

**D-H01 — Hook locations and unread-write boundary (LOCKED, non-negotiable):** Phase 5 left `# Phase 6 hook:` comments at these 5 locations, each with an explicit responsibility pinned by this decision. The mapping below is the **only** correct mapping; no implementation may add, remove, or reinterpret any row.

| # | Hook location | Service method | Status transition | Notify claimer (NOTIF-06) | Write `last_status_change_at` | Submitter Feishu |
|---|---------------|----------------|-------------------|---------------------------|--------------------------------|-------------------|
| 1 | `update_wish()` line 177 | `WishService.update_wish` | None (content-only patch while status is `待处理` or `准备中`) | **Yes** when `was_claimed` (claim was already true pre-mutation) | **No** — must never write | No |
| 2 | `cancel_wish()` line 214 | `WishService.cancel_wish` | `待处理`/`准备中` → `已撤销` (successful) | **Yes** when `was_claimed` | **Yes** — write before flush | No |
| 3 | `claim_wish()` line 246 | `WishService.claim_wish` | `待处理` → `准备中` (atomic UPDATE wins rowcount==1) | No | **Yes** — write inside the same atomic `.values(...)` | No |
| 4 | `advance_wish()` line 308 | `WishService.advance_wish` | `准备中` → `已上架` (successful, status machine allows) | No | **Yes** — write before flush | No |
| 5 | `reject_wish()` line 357 | `WishService.reject_wish` | `准备中` → `已拒绝` (successful, reason non-empty) | No | **Yes** — write before flush | No |

**Locked unread rule (the content-edit boundary — explicit, testable, non-negotiable):**

1. After the creation-time `server_default=func.now()` from D-M01, **only successful status-changing operations** — `claim_wish()`, `advance_wish()`, `reject_wish()`, and `cancel_wish()` — may advance `last_status_change_at`. No other code path may write it.
2. A content-only `update_wish()` edit **must never write `last_status_change_at`** and therefore must not create a submitter badge — even when the wish is currently claimed. It only sends NOTIF-06 to the stored claimer (D-F03/D-F04) when the wish was claimed before the mutation. A badge after a submitter's own edit is a bug.
3. **Failed or invalid transitions** (e.g., a second concurrent `claim_wish` returning rowcount==0; an `advance_wish` blocked by D-09/D-12; a `reject_wish` with empty reason; a `cancel_wish` already in `已上架`) **must leave both notification timestamps unchanged**. They never touch `last_status_change_at` and never send a Feishu card.
4. **No submitter Feishu push** for any of these lifecycle events. Submitters learn about status changes only through NOTIF-03/04 (the in-app badge backed by the two timestamps).

This rule overrides any interpretation that "every Phase 6 hook updates the badge" and overrides any future proposal to write `last_status_change_at` inside `update_wish()`. Tests in `06-02-PLAN.md` and `06-03-PLAN.md` exist specifically to enforce both sides of this boundary — a content-only edit never flips the badge, and every successful status transition does flip it back after a prior clear.

Hook responsibilities (verbal summary; the table above is authoritative):
- `update_wish()` → claimed-wish Feishu notification only when pre-claim was true; **no** badge timestamp write, ever
- `cancel_wish()` → badge timestamp write plus claimed-wish Feishu notification when pre-claim was true
- `claim_wish()` / `advance_wish()` / `reject_wish()` → badge timestamp write only; no submitter Feishu push, no claimer Feishu push

**D-H02 — submit_wish Feishu fire location:** When `submit_wish` completes, AFTER the `flush()` and `refresh()`, fire NOTIF-05 Feishu push to all chefs. Query all chefs with `feishu_open_id IS NOT NULL` and fan out.

**D-H03 — Feishu failure handling:** Wrap every `feishu_client.send_wish_notification()` in try/except. On failure, log the error with `print()` and continue — same pattern as `order_service.py` line 363 (swallow Feishu failures, don't fail the HTTP request).

### Data Model Additions

**D-M01 — New columns on `Wish`:**
```python
last_status_change_at = Column(DateTime, nullable=True)  # NULL = never changed since creation
submitter_last_viewed_at = Column(DateTime, nullable=True)  # NULL = never viewed by submitter
```

Both columns are nullable. `last_status_change_at` is set to `server_default=func.now()` on INSERT (so new wishes auto-populate it). `submitter_last_viewed_at` stays NULL until first view.

### API Changes

**D-A01 — Modified endpoints:**
- `GET /api/wishes/{id}` — when submitter calls it: update `submitter_last_viewed_at = now()` before returning
- `GET /api/wishes` — add `has_unread: bool` to each `WishListResponse` item (computed: `last_status_change_at > submitter_last_viewed_at` when both are set, or `last_status_change_at is not None` when `submitter_last_viewed_at` is NULL)

**D-A02 — New model:** `Wish` gets two new columns (D-M01). Alembic migration required.

**D-A03 — New service methods:** `WishNotificationService` (or add to `WishService`) — methods to fire notifications at hook points. Recommended: keep notification logic in a separate service (`notification_service.py`) to avoid circular imports with `feishu_client`.

### Security Notes

- Feishu notifications only fire to chefs who have `feishu_open_id` bound — no broadcast to unknown users
- Notification content (dish names, notes) is visible only to bound chefs — same confidentiality as order notifications
- Badge state is per-wish and only visible to the wish's submitter (enforced by existing PERM-01/PERM-02)
- `submitter_last_viewed_at` write is gated to the submitter only (enforced in the router layer)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — v1.1 requirements: NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06 (Phase 6), plus WISH-01..04 and FLOW-01..05 (Phase 5)
- `.planning/ROADMAP.md` §Phase 6 — Goal, Depends on (Phase 5), Success Criteria
- `.planning/PROJECT.md` — Constraints (FastAPI + SQLite + Alembic), v1.1 scope boundary

### Phase 5 Context (prerequisite)
- `.planning/phases/05-data-foundation-wish-lifecycle-api/05-CONTEXT.md` — Phase 5 decisions including D-08 (Phase 6 hook points), D-03 (404/403 distinction), FeishuClient singleton reference
- `.planning/phases/05-data-foundation-wish-lifecycle-api/05-RESEARCH.md` — Research findings on notification patterns, Feishu API details
- `.planning/phases/05-data-foundation-wish-lifecycle-api/05-01-SUMMARY.md` — Wish model schema (field names/types for D-M01)
- `.planning/phases/05-data-foundation-wish-lifecycle-api/05-02-SUMMARY.md` — WishService method signatures and hook locations

### Codebase Maps
- `.planning/codebase/STACK.md` — Python 3.11 / FastAPI / SQLAlchemy 2.0 async
- `.planning/codebase/INTEGRATIONS.md` — Feishu `feishu_client` pattern, tenant token auth
- `.planning/codebase/CONVENTIONS.md` — Chinese-first error messages, service singleton pattern

### Existing Patterns to Mirror
- `backend/app/integrations/feishu.py` — `send_order_notification()` as template for `send_wish_notification()` (card structure, element pattern)
- `backend/app/services/order_service.py:171-225` — Feishu fire pattern with try/except + `print()` failure handling
- `backend/app/services/wish_service.py` — Phase 5 hook comment locations (D-H01 above)
- `backend/app/routers/wishes.py` — existing 8 endpoints; `get_wish` handler is where D-A01 side effect goes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`feishu_client` singleton** (`backend/app/integrations/feishu.py`): Phase 6 adds `send_wish_notification()` here — follows same tenant token + card message pattern as `send_order_notification()`
- **`WishService` hook comments**: Phase 5 left 5 `# Phase 6 hook:` comments as placeholders — these are the insertion points for notification logic
- **Existing notification fire pattern** (`order_service.py:171-225`): lazy import of `feishu_client`, try/except, failure silently swallowed

### Integration Points
- **New columns**: `Wish.last_status_change_at`, `Wish.submitter_last_viewed_at` — D-M01
- **New service**: `backend/app/services/notification_service.py` (recommended) — isolates notification logic from `wish_service.py` to avoid circular imports
- **Alembic migration**: Chain from current head; add two nullable datetime columns to `wishes` table
- **Router change**: `get_wish` handler in `wishes.py` updates `submitter_last_viewed_at` on submitter visit

### Established Patterns
- **Lazy import** for `feishu_client` to avoid circular deps
- **Silent Feishu failure**: try/except + print; don't fail the HTTP request
- **Badge computation**: happens in router/presentation layer, not in SQL

</code_context>

<deferred>
## Deferred Ideas

- **WISH-F04 (愿望状态历史记录)** — Full event log with who changed what when. If this is added later, the `WishEvent` table would replace/supplement the `last_status_change_at` approach. Phase 6's two-column approach is the minimum to satisfy NOTIF-03/04 without blocking future history.
- **Per-chef notification opt-out** — Chef can choose not to receive Feishu wish notifications. Would need a `chef.notify_wishes` boolean column on `User` and a filter in the fan-out query.
- **Submitter Feishu push for status changes** — Badge only in Phase 6. If good UX requires push notifications to submitter too, add a `send_wish_to_submitter()` call alongside badge updates (requires submitter `feishu_open_id`).
- **Deep link URL** — Phase 7 registers the wish detail URL. Phase 6 can include a placeholder like `https://family-chef.app/wishes/{id}` in Feishu cards; update once Phase 7 is built.

</deferred>

---

*Phase: 6-Notifications Integration*
*Context gathered: 2026-07-22*
