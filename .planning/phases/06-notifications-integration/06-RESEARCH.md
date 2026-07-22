# Phase 6: Notifications Integration - Research

**Researched:** 2026-07-22 [VERIFIED: system date]
**Domain:** FastAPI/SQLAlchemy backend notification state, SQLite migration, and Feishu interactive-card delivery [VERIFIED: Phase 6 scope]
**Confidence:** HIGH for implementation shape; MEDIUM for live Feishu readiness [VERIFIED: source/confidence audit]

<user_constraints>
## User Constraints (from CONTEXT.md)

> The Phase Boundary, Implementation Decisions, and Deferred Ideas below are copied verbatim from `.planning/phases/06-notifications-integration/06-CONTEXT.md`; this source note applies to the complete quoted material. [VERIFIED: `.planning/phases/06-notifications-integration/06-CONTEXT.md`]

### Locked Decisions

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

**D-H01 — Hook locations and unread-write boundary (LOCKED):** Phase 5 left `# Phase 6 hook:` comments at these 5 locations:
1. `update_wish()` line 177 — a content-only submitter edit while status is `准备中`; notify the claiming chef, but do **not** update submitter unread state
2. `cancel_wish()` line 214 — a successful status change to `已撤销`; update submitter unread state and notify the claiming chef when the wish was claimed
3. `claim_wish()` line 246 — a successful status change to `准备中`; update submitter unread state only
4. `advance_wish()` line 308 — a successful status change to `已上架`; update submitter unread state only
5. `reject_wish()` line 357 — a successful status change to `已拒绝`; update submitter unread state only

**Locked unread rule:** After the creation-time server default required by D-M01, only successful status-changing operations — `claim_wish()`, `advance_wish()`, `reject_wish()`, and `cancel_wish()` — may advance `last_status_change_at`. A content-only `update_wish()` edit must never write `last_status_change_at` and therefore must not create a submitter badge, even when the wish is claimed; it only sends NOTIF-06 to the claimer. Failed or invalid transitions must leave both notification timestamps unchanged. This rule is non-negotiable and overrides any interpretation that every Phase 6 hook updates the badge.

Hook responsibilities:
- `update_wish()` → claimed-wish Feishu notification only; no badge timestamp write
- `cancel_wish()` → badge timestamp write plus claimed-wish Feishu notification when applicable
- `claim_wish()` / `advance_wish()` / `reject_wish()` → badge timestamp write only; no submitter Feishu push

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

### the agent's Discretion

No `## the agent's Discretion` section is present in `06-CONTEXT.md`; implementation choices not explicitly locked must preserve the decisions above and existing code conventions. [VERIFIED: `.planning/phases/06-notifications-integration/06-CONTEXT.md`]

### Deferred Ideas (OUT OF SCOPE)

- **WISH-F04 (愿望状态历史记录)** — Full event log with who changed what when. If this is added later, the `WishEvent` table would replace/supplement the `last_status_change_at` approach. Phase 6's two-column approach is the minimum to satisfy NOTIF-03/04 without blocking future history.
- **Per-chef notification opt-out** — Chef can choose not to receive Feishu wish notifications. Would need a `chef.notify_wishes` boolean column on `User` and a filter in the fan-out query.
- **Submitter Feishu push for status changes** — Badge only in Phase 6. If good UX requires push notifications to submitter too, add a `send_wish_to_submitter()` call alongside badge updates (requires submitter `feishu_open_id`).
- **Deep link URL** — Phase 7 registers the wish detail URL. Phase 6 can include a placeholder like `https://family-chef.app/wishes/{id}` in Feishu cards; update once Phase 7 is built.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTIF-03 | 愿望状态变化时（认领/准备中/已上架/已拒绝），提交者在应用内看到红点未读提示 | Two persisted timestamps, a single UTC-naive clock convention, explicit transition hook mapping, and `has_unread` computation are specified below. [VERIFIED: `.planning/REQUIREMENTS.md`; codebase read] |
| NOTIF-04 | 用户查看愿望详情后，红点消除 | `routers/wishes.py::get_wish()` must mark only the submitter's view and rely on `get_db()` post-yield commit; tests cover submitter versus chef/admin views. [VERIFIED: `.planning/REQUIREMENTS.md`; `backend/app/database.py:39-49`; FastAPI yield docs] |
| NOTIF-05 | 新愿望提交时，飞书推送愿望信息给厨师端（复用 feishu_client） | `WishNotificationService.notify_new_wish()` fans out after `submit_wish()` flush/refresh to every chef with a non-NULL binding, using the new `FeishuClient.send_wish_notification()`. [VERIFIED: `.planning/REQUIREMENTS.md`; `06-CONTEXT.md`; codebase read] |
| NOTIF-06 | 愿望被用户编辑/撤销时，认领厨师收到飞书通知 | `update_wish()` and `cancel_wish()` capture pre-mutation state, then notify only the stored claimer after successful flush; missing bindings and Feishu failures are non-fatal. [VERIFIED: `.planning/REQUIREMENTS.md`; `06-CONTEXT.md`; codebase read] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Retain the existing FastAPI + React stack and do not introduce another framework; Phase 6 is backend/API-only and must make no frontend changes. [VERIFIED: `AGENTS.md:10-20`]
- Retain SQLite and deliver schema changes through an Alembic migration. [VERIFIED: `AGENTS.md:12-13`]
- Follow Router → Service → Model layering; services are stateless classes with async `@staticmethod` methods and module-level singleton instances. [VERIFIED: `AGENTS.md:145-155,248-281`]
- Use `AsyncSession`; services flush/refresh and routers or `get_db()` own commits and rollback. [VERIFIED: `AGENTS.md:121-155`; `backend/app/database.py:39-49`]
- Use Chinese for user-facing text, errors, comments, and docstrings; use English identifiers; Python modules and functions use `snake_case`, classes use `PascalCase`, and tests use `test_{module}.py`. [VERIFIED: `AGENTS.md:107-165,209-213`]
- Reuse YAML configuration through `backend/app/config.py`; do not introduce `.env`-based application configuration or expose secret values. [VERIFIED: `AGENTS.md:69-89,214-217`]
- Mirror the existing lazy-import pattern for cross-service/integration calls and the `try/except` + `print()` best-effort Feishu failure behavior. [VERIFIED: `AGENTS.md:334-348`; `backend/app/services/order_service.py:168-227,332-368`]
- Use pytest, pytest-asyncio, and HTTPX ASGI tests; keep all network delivery mocked. [VERIFIED: `AGENTS.md:41-44`; `backend/tests/conftest.py`; `backend/tests/test_feishu.py`]
- Development is required on `feature/guest_order`; the current checkout is `dev`, so execution must verify/switch to the required branch without discarding the existing untracked Phase 5 summary artifacts. [VERIFIED: `AGENTS.md:17`; `git status --short --branch` on 2026-07-22]
- No project-defined skills were found under the supported project skill directories. [VERIFIED: project skill directory audit; `AGENTS.md:352-355`]

## Summary

Phase 6 should remain an additive backend change with no new package: extend `Wish` with two timestamps, compute `has_unread` at serialization time, mark detail views only for the submitter, add a dedicated wish-card method to the existing `feishu_client`, and isolate recipient queries/failure handling in a new `WishNotificationService`. The exact Phase 5 integration points exist at `WishService.submit_wish()` and the five `# Phase 6 hook:` comments in `update_wish()`, `cancel_wish()`, `claim_wish()`, `advance_wish()`, and `reject_wish()`. [VERIFIED: `backend/app/services/wish_service.py:30-50,142-359`; `06-CONTEXT.md`]

The most important migration finding is that SQLite rejects `ALTER TABLE ... ADD COLUMN ... DEFAULT CURRENT_TIMESTAMP`; because D-M01 requires a persistent server default, the migration must use Alembic batch mode with `recreate="always"`. A local in-memory migration probe preserved the existing row, all four wish indexes, and all three foreign keys while populating `last_status_change_at` and leaving `submitter_last_viewed_at` NULL. [CITED: https://www.sqlite.org/lang_altertable.html#altertabaddcol] [CITED: https://alembic.sqlalchemy.org/en/latest/batch.html] [VERIFIED: local SQLite/Alembic migration probe]

The second critical finding is clock consistency: this host is UTC+08, while SQLite `CURRENT_TIMESTAMP` is UTC. Using project-style local `datetime.now()` for later writes would make timestamp ordering wrong by eight hours. Use one UTC-naive helper based on `datetime.now(UTC).replace(tzinfo=None)` for every application-written notification timestamp, matching the SQLite server default while retaining microseconds for strict `>` comparisons. [VERIFIED: local clock probe: local `09:19:18+08:00`, SQLite `01:19:18`; Python 3.11 runtime] [CITED: https://docs.python.org/3/library/datetime.html#datetime.datetime.now]

**Primary recommendation:** implement two ordered slices—(1) batch migration + UTC-consistent unread semantics, then (2) dedicated Feishu card/notification service + Phase 5 hook wiring—with all Feishu calls mocked and each recipient isolated from failures. [VERIFIED: locked decisions plus codebase patterns]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persist status-change/view state | Database / Storage | API / Backend service | `wishes` owns the two timestamps; service/router writes them. [VERIFIED: D-M01/D-B03] |
| Decide whether an item is unread | API / Backend router/presentation | Database / Storage | The DB stores timestamps but no computed field; `list_wishes()` serialization adds `has_unread`. [VERIFIED: D-B01/D-B02] |
| Clear unread state | API / Backend router | Database / Storage | Only authenticated submitter detail access has this side effect. [VERIFIED: D-B03; existing PERM-01 service gate] |
| Detect lifecycle events | API / Backend service | — | Existing `WishService` methods are the authoritative successful-transition boundaries. [VERIFIED: `wish_service.py`]
| Resolve recipients and build event payloads | API / Backend notification service | Database / Storage | The service queries `User.feishu_open_id`, captures old/new state, and invokes the integration adapter. [VERIFIED: D-A03/D-F04] |
| Render and transmit a wish card | External integration adapter | Feishu Open Platform | `FeishuClient.send_wish_notification()` builds an interactive card and delegates transport to existing `send_message()`. [VERIFIED: D-F01; `backend/app/integrations/feishu.py:47-80`]
| Display red-dot UI and wish-detail route | Browser / Client | — | Explicitly deferred to Phase 7; Phase 6 returns API data and a placeholder deep link only. [VERIFIED: Phase Boundary; ROADMAP Phase 7] |

## Standard Stack

### Core

| Library | Installed Version | Published | Purpose | Why Standard |
|---------|-------------------|-----------|---------|--------------|
| FastAPI | 0.136.1 | 2026-04-23 | Existing wishes endpoints, auth dependencies, and yield-based DB lifecycle. [VERIFIED: local `uv` runtime; PyPI JSON] | Locked application framework; no new route family is required. [VERIFIED: `backend/pyproject.toml`; `routers/wishes.py`] |
| SQLAlchemy | 2.0.49 | 2026-04-03 | Async ORM timestamps, role/recipient queries, atomic claim update. [VERIFIED: local `uv` runtime; PyPI JSON] | Existing ORM and direct Phase 5 implementation substrate. [VERIFIED: `backend/pyproject.toml`; `wish_service.py`] |
| Alembic | 1.18.4 | 2026-02-10 | Add the two columns through SQLite batch move-and-copy. [VERIFIED: local `uv` runtime; PyPI JSON] | Locked migration tool; current head is `72b56533bb6d`. [VERIFIED: `uv run alembic heads`]
| aiosqlite | 0.22.1 | 2025-12-23 | Async SQLite driver. [VERIFIED: local `uv` runtime; PyPI JSON] | Existing database driver; no replacement is permitted. [VERIFIED: `backend/pyproject.toml`; `database.py`] |
| Pydantic | 2.13.4 | 2026-05-06 | Extend `WishListResponse` with `has_unread: bool`. [VERIFIED: local `uv` runtime; PyPI JSON] | Existing schema layer uses `ConfigDict(from_attributes=True)`. [VERIFIED: `schemas/wish.py`] |
| HTTPX | 0.28.1 | 2024-12-06 | Existing Feishu async transport and ASGI test client. [VERIFIED: local `uv` runtime; PyPI JSON] | Already used by `FeishuClient` and test fixtures. [VERIFIED: `integrations/feishu.py`; `tests/conftest.py`] |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| pytest | 9.1.1 | Backend regression and notification integration tests. [VERIFIED: local `uv` runtime; PyPI JSON] | Run targeted wish suites for every implementation task. [VERIFIED: existing test setup] |
| pytest-asyncio | Existing project constraint `>=0.21.0` | Async fixtures/tests under `asyncio_mode = "auto"`. [VERIFIED: `backend/pyproject.toml:24-30,42-44`] | All route/service tests. [VERIFIED: `tests/test_wishes.py`] |
| `unittest.mock.AsyncMock` | Python 3.11 stdlib | Replace Feishu network calls and assert awaits. [CITED: https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock] | Every test that binds a `feishu_open_id`. [VERIFIED: existing `test_feishu.py` pattern] |

### Alternatives Considered

| Instead of | Rejected Alternative | Reason |
|------------|----------------------|--------|
| Two wish timestamps | `WishEvent` history table or a boolean unread flag | User locked the timestamp mechanism; history is deferred. [VERIFIED: `06-CONTEXT.md`]
| Dedicated wish card method | Adapting `send_order_notification()` | Explicitly forbidden by D-F01. [VERIFIED: `06-CONTEXT.md`]
| Existing synchronous best-effort hook | Event bus, task queue, durable outbox, retry worker | No background task system exists and the phase boundary does not authorize one. [VERIFIED: `AGENTS.md:334-339`; Phase Boundary]
| Router-computed field | DB generated/computed unread column | Explicitly rejected by D-B01. [VERIFIED: `06-CONTEXT.md`]

**Installation:**
```bash
# No installation command is required for Phase 6.
# Use the already-provisioned backend virtual environment.
cd backend && uv run python --version
```
The phase must not change `backend/pyproject.toml`, run a dependency sync as an implementation step, or introduce a notification/card package. [VERIFIED: complete implementation can use existing stack and Python stdlib]

## Package Legitimacy Audit

This phase installs no external package, so the Package Legitimacy Gate has no package to evaluate; `slopcheck 0.6.1` is available but is not needed for a zero-install phase. [VERIFIED: phase design; local command probe]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| None new | — | — | — | — | N/A | No install task |

**Packages removed due to slopcheck [SLOP] verdict:** none. [VERIFIED: no candidate packages]

**Packages flagged as suspicious [SUS]:** none. [VERIFIED: no candidate packages]

## Architecture Patterns

### System Architecture Diagram

```text
Authenticated HTTP request
        |
        +-- POST /api/wishes
        |      -> WishService.submit_wish
        |      -> INSERT + flush + refresh (timestamp server default)
        |      -> WishNotificationService.notify_new_wish
        |            -> SELECT all User(role="chef", feishu_open_id IS NOT NULL)
        |            -> for each recipient (separate try/except)
        |                 -> FeishuClient.send_wish_notification
        |                 -> Feishu /im/v1/messages boundary
        |      -> router commit -> 201
        |
        +-- PUT /api/wishes/{id} or DELETE /api/wishes/{id}
        |      -> capture claimed state + old note BEFORE mutation
        |      -> WishService mutation + flush + refresh
        |      -> claimed?
        |           +-- yes -> notify exactly claimed_by_chef_id (best effort)
        |           +-- no  -> skip Feishu
        |      -> DELETE/cancel also updates last_status_change_at
        |      -> router commit -> 200
        |
        +-- POST /{id}/claim | /advance | /reject
        |      -> successful state transition?
        |           +-- yes -> set last_status_change_at using UTC-naive clock
        |           +-- no  -> existing 400/403/404 path; no timestamp/notification
        |      -> router commit -> 200
        |
        +-- GET /api/wishes
        |      -> role-filtered Wish rows
        |      -> current user is submitter?
        |           +-- yes -> compute has_unread from two timestamps
        |           +-- no  -> expose false, not submitter state
        |      -> 200 PageResponse
        |
        +-- GET /api/wishes/{id}
               -> existing visibility gate
               -> current user is submitter?
                    +-- yes -> set submitter_last_viewed_at; flush only
                    +-- no  -> read only
               -> response
               -> get_db post-yield commit
```

The diagram follows the locked hook positions and the current Router → Service → Model/Integration flow; external delivery occurs inline before the mutation route returns. [VERIFIED: `06-CONTEXT.md`; current wish/order/guest service code]

### Recommended Project Structure

```text
config.example.yaml                        # CONDITIONAL: document app URL
backend/
├── alembic/versions/
│   └── <revision>_add_wish_notification_timestamps.py  # NEW; down_revision=72b56533bb6d
├── app/
│   ├── integrations/
│   │   └── feishu.py                  # EDIT: send_wish_notification()
│   ├── models/
│   │   └── wish.py                    # EDIT: two DateTime columns
│   ├── schemas/
│   │   └── wish.py                    # EDIT: WishListResponse.has_unread
│   ├── services/
│   │   ├── notification_service.py    # NEW: WishNotificationService singleton
│   │   └── wish_service.py            # EDIT: submit + five Phase 6 hooks
│   ├── routers/
│   │   └── wishes.py                  # EDIT: compute/clear unread state
│   ├── utils/
│   │   └── datetime_utils.py          # NEW: one UTC-naive clock helper
│   └── config.py                      # CONDITIONAL: APP_URL setting if placeholder is configurable
└── tests/
    └── test_wish_notifications.py     # NEW: timestamps, fan-out, cards, failure isolation
```

The migration filename/revision is generated by Alembic, while the listed ownership boundaries follow D-A03 and existing project naming conventions. [VERIFIED: `06-CONTEXT.md`; `AGENTS.md`; current tree]

### Exact Change Surface

| File | Existing Symbol / Location | Prescriptive Change |
|------|----------------------------|---------------------|
| `backend/app/models/wish.py` | `Wish` lines 18-28 | Add both nullable `DateTime` columns; retain `server_default=func.now()` only on `last_status_change_at`. [VERIFIED: D-M01] |
| `backend/alembic/versions/<revision>_add_wish_notification_timestamps.py` | New revision after `72b56533bb6d` | Use `batch_alter_table("wishes", recreate="always")` in upgrade/downgrade; do not accept raw autogenerated `op.add_column` for the server-default column. [VERIFIED: SQLite restriction; local migration probe] |
| `backend/app/utils/datetime_utils.py` | New | Define one `naive_utc_now()` helper used by service and router to align with SQLite UTC defaults. [VERIFIED: local timezone probe; Python docs] |
| `backend/app/schemas/wish.py` | `WishListResponse` lines 53-58 | Add `has_unread: bool = False`; do not expose either internal timestamp in API response models unless later explicitly required. [VERIFIED: D-B02/D-A01] |
| `backend/app/routers/wishes.py` | `list_wishes()` lines 46-79 | Set `has_unread` explicitly per item and only reveal true state to the item submitter. [VERIFIED: D-B02 plus Security Notes] |
| `backend/app/routers/wishes.py` | `get_wish()` lines 85-103 | After successful visibility lookup, if `wish.user_id == current_user.id`, set view timestamp and `await db.flush()`; do not explicitly commit. [VERIFIED: D-B03] |
| `backend/app/integrations/feishu.py` | `FeishuClient` after `send_order_notification()` | Add dedicated `send_wish_notification(receive_id, data) -> bool`; keep transport delegated to `send_message()`. [VERIFIED: D-F01; existing adapter] |
| `backend/app/services/notification_service.py` | New | Add `WishNotificationService.notify_new_wish()` and `notify_claimed_wish_change()` plus singleton; query recipients and isolate each send failure. [VERIFIED: D-A03/D-F04/D-H03] |
| `backend/app/services/wish_service.py` | `submit_wish()` lines 30-50 | After flush/refresh, invoke new-wish fan-out with `wish` and `current_user`. [VERIFIED: D-H02] |
| `backend/app/services/wish_service.py` | `update_wish()` lines 142-179 | Capture old note and pre-update claimed status, then notify the claimer after flush/refresh; per locked D-H01, a content-only edit must not write `last_status_change_at` or create submitter unread state. [VERIFIED: explicit user decision; D-H01] |
| `backend/app/services/wish_service.py` | `cancel_wish()` lines 182-216 | Capture claimed state/old note before status mutation, set status timestamp, flush/refresh, then notify the prior claimer. [VERIFIED: D-B01/D-F03/D-H01] |
| `backend/app/services/wish_service.py` | `claim_wish()` lines 219-254 | Put `last_status_change_at=<UTC now>` inside the same atomic `.values(...)` call so no second update weakens the claim boundary. [VERIFIED: D-01 Phase 5 contract; D-B01] |
| `backend/app/services/wish_service.py` | `advance_wish()` lines 257-310 | Assign timestamp with status/related dish before the existing flush. [VERIFIED: D-B01/D-H01] |
| `backend/app/services/wish_service.py` | `reject_wish()` lines 313-359 | Assign timestamp with status/reason before the existing flush. [VERIFIED: D-B01/D-H01] |
| `backend/tests/test_wish_notifications.py` | New | Cover unread lifecycle, authorization of clear side effect, fan-out/targeting, payload/card shape, and failure isolation with `AsyncMock`. [VERIFIED: requirement-to-hook analysis] |

No change is required in `backend/app/main.py`, `backend/app/models/__init__.py`, `backend/app/services/__init__.py`, frontend files, or `backend/tests/conftest.py`: the wishes router/model/table cleanup are already registered, and model metadata drives test `create_all()`. [VERIFIED: codebase read]

### Pattern 1: One clock domain for comparable timestamps

**What:** Store naive UTC in both new columns, because the existing `DateTime` columns are timezone-naive and SQLite `CURRENT_TIMESTAMP` is UTC. [VERIFIED: model style; local clock probe]

**When to use:** Every write to `last_status_change_at` or `submitter_last_viewed_at`. [VERIFIED: D-B01/D-B03]

```python
# Source: Python datetime docs + verified local SQLite UTC behavior
from datetime import UTC, datetime


def naive_utc_now() -> datetime:
    """返回与 SQLite CURRENT_TIMESTAMP 同一时区语义的无时区 UTC 时间。"""
    return datetime.now(UTC).replace(tzinfo=None)
```

Using local `datetime.now()` is unsafe on this deployment because local time is UTC+08 while the server default is UTC. [VERIFIED: local clock probe]

### Pattern 2: Batch recreate for a dynamic SQLite default

**What:** Force Alembic's move-and-copy path instead of direct `ADD COLUMN`. [CITED: https://alembic.sqlalchemy.org/en/latest/batch.html]

**When to use:** The Phase 6 upgrade and downgrade of `wishes`. [VERIFIED: SQLite direct-add failure probe]

```python
# Source: Alembic batch docs; down_revision verified locally
revision = "<generated>"
down_revision = "72b56533bb6d"


def upgrade() -> None:
    with op.batch_alter_table("wishes", recreate="always") as batch_op:
        batch_op.add_column(
            sa.Column(
                "last_status_change_at",
                sa.DateTime(),
                nullable=True,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            )
        )
        batch_op.add_column(
            sa.Column("submitter_last_viewed_at", sa.DateTime(), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("wishes", recreate="always") as batch_op:
        batch_op.drop_column("submitter_last_viewed_at")
        batch_op.drop_column("last_status_change_at")
```

A local probe confirmed this shape preserves an existing wish, four indexes, and three foreign keys. [VERIFIED: local Alembic 1.18.4 + SQLite 3.45.1 probe]

### Pattern 3: Compute unread only at the response boundary

**What:** Add a pure helper and explicitly mask the value for non-submitters. [VERIFIED: D-B01/D-B02 plus Security Notes]

```python
# Source: locked D-B01/D-A01; non-submitter masking is Assumption A2
def compute_has_unread(wish: Wish, current_user: User) -> bool:
    if wish.user_id != current_user.id:
        return False
    if wish.last_status_change_at is None:
        return False
    if wish.submitter_last_viewed_at is None:
        return True
    return wish.last_status_change_at > wish.submitter_last_viewed_at
```

The `last_status_change_at is None` guard implements D-A01's more precise wording and prevents an impossible/legacy both-NULL row from being reported unread. [VERIFIED: D-A01]

### Pattern 4: Recipient resolution separate from card rendering

**What:** `WishNotificationService` knows SQLAlchemy/users/events; `FeishuClient` knows Feishu card JSON/transport. [VERIFIED: D-A03/D-F01]

**When to use:** All three Feishu event types: `new`, `edit`, and `cancel`. [VERIFIED: D-F02/D-F03]

```python
# Source: D-A03/D-F04 and existing order_service lazy-import/failure pattern
class WishNotificationService:
    """愿望单通知服务"""

    @staticmethod
    async def notify_new_wish(db: AsyncSession, wish: Wish, submitter: User) -> None:
        result = await db.execute(
            select(User.feishu_open_id).where(
                User.role == "chef",
                User.feishu_open_id.is_not(None),
            )
        )
        receive_ids = list(result.scalars().all())
        payload = {
            "notification_type": "new",
            "wish_id": wish.id,
            "dish_name": wish.dish_name,
            "submitter_name": submitter.display_name or submitter.username,
            "reference_url": wish.reference_url,
            "note": wish.note,
        }

        from app.integrations.feishu import feishu_client

        for receive_id in receive_ids:
            try:
                sent = await feishu_client.send_wish_notification(receive_id, payload)
                if not sent:
                    print(f"愿望飞书通知发送失败: wish_id={wish.id}")
            except Exception as exc:
                print(f"愿望飞书通知发送失败: wish_id={wish.id}, error={exc}")


wish_notification_service = WishNotificationService()
```

The `try/except` belongs inside the recipient loop so one failure cannot prevent later recipients from receiving their cards. [VERIFIED: D-F04/D-H03]

### Pattern 5: Treat user content as plain text in cards

**What:** Render labels and user-controlled values in `plain_text`; reserve `lark_md` for the controlled HTTP(S) detail link. [CITED: https://open.feishu.cn/document/common-capabilities/message-card/message-cards-content/using-markdown-tags]

**When to use:** Dish names, submitter names, notes, reference URLs, and change descriptions. [VERIFIED: these fields originate from users/DB]

The official legacy-card documentation states that Markdown special characters require escaping and that links only support HTTP/HTTPS; `plain_text` avoids mention/link/format injection from user content. [CITED: https://open.feishu.cn/document/common-capabilities/message-card/message-cards-content/using-markdown-tags]

### Recommended Implementation Order

1. Add UTC helper, model fields, batch migration, and migration round-trip verification. [VERIFIED: dependency ordering]
2. Add `has_unread`, list computation, submitter-only detail clear, and unread lifecycle tests. [VERIFIED: NOTIF-03/04 dependency ordering]
3. Add `send_wish_notification()` and card-shape unit tests without DB/network. [VERIFIED: D-F01]
4. Add `WishNotificationService`, target/failure tests, then wire `submit_wish`, update, and cancel hooks. [VERIFIED: D-H01/D-H02]
5. Add timestamps to claim/advance/reject/cancel, run all Phase 5 wish regressions, then perform a credential-safe manual Feishu smoke only with a designated test recipient. [VERIFIED: hook map and security constraints]

### Anti-Patterns to Avoid

- **Direct `op.add_column(... server_default=CURRENT_TIMESTAMP)` on SQLite:** it fails with `Cannot add a column with non-constant default`; use forced batch recreation. [VERIFIED: local probe] [CITED: https://www.sqlite.org/lang_altertable.html#altertabaddcol]
- **Mixing `datetime.now()` local time with SQLite `CURRENT_TIMESTAMP`:** strict timestamp comparison becomes incorrect on UTC+08 hosts. [VERIFIED: local clock probe]
- **Updating `last_status_change_at` after the atomic claim UPDATE:** this creates an unnecessary second write; include it in the atomic `.values(...)`. [VERIFIED: Phase 5 D-01 invariant]
- **Clearing on any authorized detail read:** claimer/admin reads must not clear submitter state. [VERIFIED: D-B03]
- **Calling Feishu directly from the router:** recipient selection and event payload construction belong in a service; card JSON belongs in the integration. [VERIFIED: project layering; D-A03]
- **Wrapping the entire fan-out in one `try`:** the first exception would abort delivery to remaining chefs. [VERIFIED: D-F04/D-H03]
- **Using `lark_md` for raw user notes/dish names:** user content can be interpreted as links, mentions, or formatting. [CITED: official Feishu Markdown syntax/escaping docs]
- **Making Feishu success part of HTTP success:** D-H03 requires the wish mutation to succeed even when delivery raises or returns `False`. [VERIFIED: `06-CONTEXT.md`]
- **Adding frontend badge/toast code:** Phase 7 owns all UI work. [VERIFIED: Phase Boundary]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Feishu HTTP/auth transport | A second HTTP client or SDK wrapper | Existing `FeishuClient.send_message()` and tenant-token endpoint | The existing boundary already serializes interactive content and checks Feishu `code == 0`. [VERIFIED: `integrations/feishu.py:22-80`] |
| Order-shaped wish cards | Conditional branches inside `send_order_notification()` | Dedicated `send_wish_notification()` | Explicit D-F01 separation. [VERIFIED: `06-CONTEXT.md`]
| Notification event bus/queue | In-process registry, custom worker, retry scheduler | Direct `WishNotificationService` hook with best-effort send | No worker infrastructure exists and durable delivery is outside phase scope. [VERIFIED: architecture map; Phase Boundary]
| Unread history | Custom audit/event table | Two locked timestamp columns | WISH-F04 is deferred. [VERIFIED: Deferred Ideas]
| Markdown sanitizer package | New third-party parser/escaping dependency | `plain_text` card elements for user values | Removes parser context rather than attempting partial escaping; no package is needed. [CITED: Feishu card docs]
| SQLite schema rewrite SQL | Editing `sqlite_schema` or manual temp-table DDL | Alembic `batch_alter_table(..., recreate="always")` | Alembic implements and documents the safe move-and-copy sequence. [CITED: Alembic batch docs; SQLite ALTER docs]
| Custom auth/ownership checks | New notification authorization middleware | Existing JWT dependencies and `WishService.get_wish_by_id()` visibility | Phase 5 already enforces PERM-01 and returns 404 for unauthorized reads. [VERIFIED: `wish_service.py:53-78`; `wishes.py:85-103`]
| Wall-clock sleeps in tests | `asyncio.sleep()` to force timestamp order | Explicit DB timestamps or a patched `naive_utc_now()` | Sleeps make strict-order tests slow/flaky; the helper is patchable. [CITED: pytest monkeypatch docs]

**Key insight:** the only new abstraction needed is a thin wish-notification service; migration, authorization, transport, serialization, and testing facilities already exist. [VERIFIED: codebase inventory]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Active development DB `backend/data/family_chef.db` is at revision `72b56533bb6d`, has the 11-column `wishes` table, and currently has 0 wish rows; production row count/revision state is not observable from this checkout. [VERIFIED: read-only SQLite probe] | Run a data-preserving batch migration and verify revision, row count, and content before/after on a copy of every deployment DB. Existing rows receive migration-time UTC `last_status_change_at`; viewed time remains NULL. [VERIFIED: local batch probe] |
| Live service config | Feishu app ID/secret are configured in the active YAML, but bot capability, message scopes, app availability range, and recipient open-ID validity cannot be proven locally; no application base URL setting exists. [VERIFIED: boolean-only settings probe; `config.py`; official Feishu prerequisites] | Add/confirm the deep-link base URL and perform one designated-recipient smoke test; verify bot/scopes/availability in Feishu developer console. Never print secret values. [CITED: Feishu send-message docs] |
| OS-registered state | No Phase 6 service, worker, cron, systemd unit, or port is introduced; delivery remains inside the existing API process. [VERIFIED: Phase Boundary; codebase architecture] | None. Do not add an OS worker as part of this phase. [VERIFIED: scope]
| Secrets/env vars | `CONFIG_PATH` is unset, so runtime loads `/home/temila/family_chef/config.yaml`; existing Feishu credentials are reused and no new secret is required. [VERIFIED: runtime path/boolean probe] | If an app URL setting is added, it is non-secret YAML configuration; preserve existing secret values and update only documented config keys. [ASSUMED] |
| Build artifacts / installed packages | `backend/family_chef.db` is a zero-byte stale file, while `backend/data/family_chef.db` is active; the backend virtual environment is Python 3.11.11 and no package change is required. [VERIFIED: filesystem/runtime probe] | Do not validate migrations against the zero-byte DB; use a copy of `backend/data/family_chef.db`. No lockfile/package reinstall task. [VERIFIED: probe]

## Common Pitfalls

### Pitfall 1: Autogenerated migration uses unsupported SQLite DDL

**What goes wrong:** Alembic may render a simple `op.add_column` for the model delta, but SQLite prohibits adding a column whose default is `CURRENT_TIMESTAMP`. [CITED: https://www.sqlite.org/lang_altertable.html#altertabaddcol]

**How to avoid:** Manually convert the candidate migration to `batch_alter_table("wishes", recreate="always")` and inspect the generated table, indexes, foreign keys, and copied data. [CITED: Alembic batch docs] [VERIFIED: local migration probe]

**Warning sign:** `OperationalError: Cannot add a column with non-constant default`. [VERIFIED: local SQLite 3.45.1 probe]

### Pitfall 2: UTC server default compared with local application time

**What goes wrong:** On this host, a view written with local `datetime.now()` is eight hours ahead of a later SQLite UTC status timestamp, so `last_status_change_at > submitter_last_viewed_at` stays false. [VERIFIED: local UTC+08/SQLite UTC probe]

**How to avoid:** Route every application write through `naive_utc_now()` and never mix clock conventions in the two fields. [CITED: Python datetime docs]

**Warning sign:** claims/advance/reject complete, but viewed wishes never become unread again. [VERIFIED: timestamp-order consequence]

### Pitfall 3: Content edit creates a self-notification badge

**What goes wrong:** Treating every hook as a badge update violates locked D-H01/D-B01/NOTIF-03: writing `last_status_change_at` in `update_wish()` makes the submitter's own content edit unread. [VERIFIED: explicit user decision; timestamp formula consequence]

**How to avoid:** Follow locked D-H01 exactly: a content-only `update_wish()` sends NOTIF-06 when claimed but never touches `last_status_change_at`; only successful cancel/claim/advance/reject status changes advance it, and failed transitions leave it unchanged. [VERIFIED: explicit user decision; D-H01]

**Warning sign:** a user edits a note and immediately sees a red dot on the same wish. [VERIFIED: formula consequence]

### Pitfall 4: Unauthorized actor clears someone else's badge

**What goes wrong:** An admin or claiming chef is allowed to read some details, but their GET must not write `submitter_last_viewed_at`. [VERIFIED: Phase 5 visibility; D-B03]

**How to avoid:** Gate the write by exact identity (`wish.user_id == current_user.id`), not by role or successful visibility alone. [VERIFIED: D-B03]

**Warning sign:** submitter's unread flag disappears after the chef opens the wish. [VERIFIED: state consequence]

### Pitfall 5: Badge state leaks through shared list schema

**What goes wrong:** `WishListResponse` is also returned to chefs/admins; blindly computing the real value for every viewer exposes submitter engagement metadata. [VERIFIED: existing role-aware list; Security Notes]

**How to avoid:** Return `has_unread=False` for a viewer who is not that wish's submitter. [ASSUMED]

**Warning sign:** chef/admin list responses show `has_unread=true` for another user's wish. [VERIFIED: leak indicator]

### Pitfall 6: One Feishu exception stops fan-out

**What goes wrong:** A single `try/except` around the whole loop exits on the first raising recipient and skips all later chefs. [VERIFIED: Python control flow; D-F04 fan-out]

**How to avoid:** Catch per recipient, check a `False` return separately, and continue. [VERIFIED: D-H03; existing client returns bool]

**Warning sign:** mock side effect `[Exception("first"), True]` records only one await. [CITED: AsyncMock side-effect docs]

### Pitfall 7: Old values are captured after mutation

**What goes wrong:** `update_wish()` currently applies the patch in-place; reading `wish.note` after the loop loses the original note required by D-F03. `cancel_wish()` also overwrites status before notification routing. [VERIFIED: `wish_service.py:169-175,208-214`; D-F03]

**How to avoid:** Capture `old_note`, `was_claimed`, and `claimed_by_chef_id` before applying any patch/status change. [VERIFIED: required payload semantics]

**Warning sign:** Feishu card shows identical old/new notes or pending cancellation is misclassified. [VERIFIED: mutation consequence]

### Pitfall 8: Hardcoded or absent deep-link base URL

**What goes wrong:** `Settings` has no `APP_URL`; only name/version/debug/secret are loaded from the `app` YAML section. [VERIFIED: `backend/app/config.py:29-58`; settings probe]

**How to avoid:** Prefer a documented `app.url` → `settings.APP_URL` with the context-approved placeholder default, then normalize one trailing slash before appending `/wishes/{id}`. [ASSUMED]

**Warning sign:** cards point to `https://family-chef.app` in a different deployment or use a relative URL that Feishu cannot activate. [CITED: Feishu docs require HTTP/HTTPS schema]

### Pitfall 9: User content becomes card markup or exceeds limits

**What goes wrong:** Feishu `lark_md` recognizes links, mentions, and formatting, and interactive card content is limited to 30 KB; `Wish.note` currently has no maximum length. [CITED: Feishu send-message and Markdown docs] [VERIFIED: `schemas/wish.py:7-23`]

**How to avoid:** Use `plain_text` for user-controlled fields and truncate each displayed old/new note conservatively while retaining the detail link. A 1000-character per-note display cap is recommended. [ASSUMED]

**Warning sign:** `<at id=all>` in a note mentions users, formatting changes, or Feishu returns error 230025/230099. [CITED: Feishu send-message error table]

### Pitfall 10: Inline delivery happens before commit

**What goes wrong:** D-H02 places send after service flush/refresh, while `routers/wishes.py` commits only after service return; Feishu can succeed before a later DB commit fails, and network latency extends the request/transaction. [VERIFIED: D-H02; `wishes.py:30-40`; `database.py`]

**How to avoid:** Preserve the locked ordering, make delivery best effort, and document that Phase 6 provides neither durable nor exactly-once notification delivery; do not add an outbox silently. [VERIFIED: D-H03; Phase Boundary]

**Warning sign:** a card links to a row that did not commit, or POST latency scales with recipient count. [VERIFIED: ordering consequence]

### Pitfall 11: Tests accidentally call the real Feishu application

**What goes wrong:** Feishu credentials are configured locally; any test that gives a chef a binding and fails to patch the singleton can make a live network request. [VERIFIED: boolean credential probe; code path]

**How to avoid:** Patch `app.integrations.feishu.feishu_client.send_wish_notification` before creating/submitting the event and assert awaits. [CITED: unittest.mock “where to patch” guidance] [VERIFIED: lazy-import design]

**Warning sign:** test output contains token/message API errors or a real Feishu card appears. [VERIFIED: network boundary]

### Pitfall 12: Existing Feishu tests are already red

**What goes wrong:** `backend/tests/test_feishu.py` currently has 4 failures because tests send query parameters to an endpoint that expects a Pydantic request body; the failure-path test also expects 500 while the route declares 502. [VERIFIED: test run and source read]

**How to avoid:** Do not conflate those pre-existing failures with the new wish notification tests, and do not fix the old endpoint in Phase 6 unless explicitly added as a separate scope item. Record the baseline when running the full suite. [VERIFIED: scope and baseline]

**Warning sign:** phase verification reports `test_send_notify_*` failures before any Phase 6 source change. [VERIFIED: baseline run]

### Pitfall 13: Feishu token “cache” is not active

**What goes wrong:** `FeishuClient` has `_tenant_access_token` and `_token_expires_at` fields, but `get_tenant_access_token()` never checks them and stores the relative `expire` duration directly; every `send_message()` performs a token HTTP request, so new-wish fan-out performs one token request per recipient. [VERIFIED: `backend/app/integrations/feishu.py:16-45,47-58`]

**How to avoid:** Do not rely on those fields as a working cache when estimating fan-out latency. Keep token-cache repair outside Phase 6 unless the planner explicitly adds and tests a narrowly scoped integration fix. [VERIFIED: current scope and implementation]

**Warning sign:** mocked HTTP traces show alternating token/message requests for every chef instead of one token request followed by multiple messages. [VERIFIED: current call graph]

The official token response returns an `expire` duration in seconds and a token valid for at most two hours; any future cache repair must convert that duration to an actual deadline with a safety margin. [CITED: https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal]

### Pitfall 14: Application startup does not run Alembic

**What goes wrong:** `init_db()` calls only `Base.metadata.create_all()`, and neither `scripts/run.sh` nor the Docker command runs `alembic upgrade head`; adding model attributes without applying the migration leaves an existing `wishes` table without the columns and causes runtime SQL errors. Phase 5 already encountered an unstamped DB where replaying all migrations failed with “table already exists.” [VERIFIED: `backend/app/database.py:52-56`; `scripts/run.sh`; `docker/Dockerfile`; `05-01-SUMMARY.md:101-104`]

**How to avoid:** Make `alembic current` and an explicit `alembic upgrade head` a deployment step before starting the new application image. If a legacy DB has no revision row, back it up and verify its schema against revision `72b56533bb6d` before using `alembic stamp 72b56533bb6d`; never stamp blindly. [VERIFIED: Phase 5 incident and current migration head]

**Warning sign:** startup succeeds because `create_all()` does not alter the existing table, then the first wish query fails with “no such column: wishes.last_status_change_at”. [VERIFIED: SQLAlchemy/create_all behavior consequence]

## Code Examples

### Model and response additions

```python
# Source: locked D-M01/D-B02 + existing model/schema style
# backend/app/models/wish.py
last_status_change_at = Column(
    DateTime,
    nullable=True,
    server_default=func.now(),
)
submitter_last_viewed_at = Column(DateTime, nullable=True)

# backend/app/schemas/wish.py
class WishListResponse(WishResponse):
    model_config = ConfigDict(from_attributes=True)

    submitter_name: Optional[str] = None
    claimed_by_chef_name: Optional[str] = None
    has_unread: bool = False
```

The internal timestamps need not be added to `WishResponse`; only `has_unread` is part of D-A01. [VERIFIED: `06-CONTEXT.md`]

### Submitter-only detail clear

```python
# Source: locked D-B03 + existing get_wish handler
wish = await wish_service.get_wish_by_id(db, wish_id, current_user)
if not wish:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="愿望不存在",
    )

if wish.user_id == current_user.id:
    wish.submitter_last_viewed_at = naive_utc_now()
    await db.flush()

resp = WishDetailResponse.model_validate(wish)
resp.submitter_name = wish.submitter.display_name if wish.submitter else None
resp.claimed_by_chef_name = wish.claimer.display_name if wish.claimer else None
return resp
```

No explicit commit belongs here because D-B03 delegates commit to `get_db()` after the yield. FastAPI documents that default request-scoped dependency exit code runs after the response. [CITED: https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/] [VERIFIED: `database.py:39-49`]

### Atomic claim timestamp

```python
# Source: Phase 5 D-01 atomic update + Phase 6 D-B01
changed_at = naive_utc_now()
result = await db.execute(
    update(Wish)
    .where(Wish.id == wish_id, Wish.status == "待处理")
    .values(
        status="准备中",
        claimed_by_chef_id=current_user.id,
        last_status_change_at=changed_at,
    )
)
```

This preserves one statement as the claim winner boundary. [VERIFIED: Phase 5 context and current implementation]

### Edit/cancel pre-mutation capture

```python
# Source: D-F03/D-F04 plus locked D-H01 content-edit boundary
old_note = wish.note
was_claimed = wish.status == "准备中" and wish.claimed_by_chef_id is not None
claimed_by_chef_id = wish.claimed_by_chef_id

patch = update_data.model_dump(exclude_unset=True)
for field, value in patch.items():
    setattr(wish, field, value)

await db.flush()
await db.refresh(wish)

if was_claimed:
    from app.services.notification_service import wish_notification_service

    await wish_notification_service.notify_claimed_wish_change(
        db=db,
        wish=wish,
        submitter=current_user,
        notification_type="edit",
        claimed_by_chef_id=claimed_by_chef_id,
        old_note=old_note,
    )
```

For cancel, set `last_status_change_at = naive_utc_now()` before flush and pass `notification_type="cancel"`. [VERIFIED: D-B01/D-F03]

### Dedicated card method shape

```python
# Source: existing send_order_notification card structure + D-F01/F02/F03
async def send_wish_notification(self, receive_id: str, data: dict) -> bool:
    """发送愿望单通知（卡片消息）"""
    notification_type = data.get("notification_type", "new")
    wish_id = data["wish_id"]
    dish_name = str(data.get("dish_name") or "")
    detail_url = f"{settings.APP_URL.rstrip('/')}/wishes/{wish_id}"

    if notification_type == "new":
        header_content = "新愿望通知"
        fields = [
            ("愿望菜品", dish_name),
            ("提交者", str(data.get("submitter_name") or "未知用户")),
        ]
        if data.get("reference_url"):
            fields.append(("参考链接", str(data["reference_url"])))
        if data.get("note"):
            fields.append(("备注", truncate_note(str(data["note"]))))
    else:
        header_content = "愿望变更通知"
        fields = [
            ("菜品", dish_name),
            ("通知类型", notification_type),
            ("变更说明", str(data.get("change_description") or "")),
        ]
        if data.get("old_note"):
            fields.append(("原备注", truncate_note(str(data["old_note"]))))
        if data.get("note_changed"):
            fields.append(("新备注", truncate_note(str(data.get("new_note") or "（已清空）"))))

    elements = [
        {
            "tag": "div",
            "text": {
                "tag": "plain_text",
                "content": f"{label}：{value}",
            },
        }
        for label, value in fields
    ]
    elements.append(
        {
            "tag": "div",
            "text": {
                "tag": "lark_md",
                "content": f"[查看详情]({detail_url})",
            },
        }
    )

    return await self.send_message(
        receive_id,
        "interactive",
        {
            "config": {"wide_screen_mode": True},
            "header": {
                "title": {"tag": "plain_text", "content": header_content},
                "template": "blue",
            },
            "elements": elements,
        },
    )
```

`plain_text` for user values and a controlled `lark_md` link are supported by the official legacy-card documentation; card request `content` remains JSON-serialized by existing `send_message()`. [CITED: Feishu Markdown docs] [CITED: Feishu send-message docs] [VERIFIED: existing `send_message()`]

### Feishu mock boundary

```python
# Source: existing test_feishu.py + Python AsyncMock docs
from unittest.mock import AsyncMock, patch


with patch(
    "app.integrations.feishu.feishu_client.send_wish_notification",
    new_callable=AsyncMock,
    return_value=True,
) as send_mock:
    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "麻婆豆腐", "note": "微辣"},
    )
    assert response.status_code == 201
    assert send_mock.await_count == expected_bound_chef_count
```

Patch the symbol where the lazy import resolves it, before submitting the event. [CITED: https://docs.python.org/3/library/unittest.mock.html#where-to-patch]

## Testing and Verification Guidance

### Current Baseline

- `cd backend && uv run pytest tests/test_wishes.py -q` passes: 25 passed. [VERIFIED: local test run on 2026-07-22]
- `cd backend && uv run pytest tests/test_feishu.py -q` has a pre-existing baseline of 4 failed, 2 passed; failures are request-shape/status-expectation defects in the old `/api/feishu/notify` tests. [VERIFIED: local test run and source read]
- Ruff is configured but no `ruff` executable is available in the current backend environment; do not add a package solely for Phase 6. [VERIFIED: `pyproject.toml`; command probe]
- `.planning/config.json` explicitly sets `workflow.nyquist_validation=false`, so this research intentionally omits the formal `## Validation Architecture` section. [VERIFIED: `.planning/config.json:19-24`]

### Required Automated Cases

| Case | Requirement / Risk | Test Assertion |
|------|--------------------|----------------|
| New wish initial state | D-B01/D-A01 | New submitter list item has `has_unread=true` under the literal locked formula; detail GET then makes it false. [VERIFIED: formula consequence]
| Clear authorization | NOTIF-04/V4 | Submitter detail clears; claimer/admin detail does not alter submitter state. [VERIFIED: D-B03]
| Status transitions | NOTIF-03 | After a prior clear, claim, advance, reject, and cancel each make the submitter item unread; invalid transitions do not change timestamp. [VERIFIED: D-B01 hook map]
| Content-only edit | D-B01/D-H01 | A claimed edit sends Feishu to the claimer but leaves `last_status_change_at` unchanged and does not create submitter unread state. [VERIFIED: explicit user decision; locked D-H01]
| Shared response privacy | V4/V8 | Admin/chef list items expose `has_unread=false` for wishes they did not submit. [ASSUMED]
| New-wish fan-out | NOTIF-05 | Exactly one await per `role="chef"` row with non-NULL `feishu_open_id`; no await for unbound chefs or bound non-chefs. [VERIFIED: D-F04]
| Claimer targeting | NOTIF-06 | Claimed edit/cancel sends once to stored claimer; pending edit/cancel and missing binding send zero times. [VERIFIED: D-F04]
| Failure isolation | D-H03 | `False` and raised exceptions do not change HTTP success; first raising recipient does not prevent second await. [VERIFIED: D-H03]
| Payload/card content | D-F02/D-F03 | Required fields present; absent optional fields omitted; old/new notes correct; link ends `/wishes/{id}`. [VERIFIED: locked card contract]
| Card injection/size | V5/DoS | `<at id=all>` remains inside `plain_text`; long notes are truncated before `send_message`. [CITED: Feishu card docs] [ASSUMED]
| Atomic claim regression | DATA-08 | Existing concurrent claim still yields one 200 + one 400, and winner timestamp is non-NULL. [VERIFIED: Phase 5 test contract]
| Timezone regression | NOTIF-03 | A view timestamp followed by a transition compares in one UTC-naive domain; no local/UTC offset inversion. [VERIFIED: local clock finding]

### Commands

```bash
# Fast focused loop
cd backend && uv run pytest tests/test_wish_notifications.py -q

# Phase 5 regression plus Phase 6
cd backend && uv run pytest tests/test_wishes.py tests/test_wish_notifications.py -q

# Existing integration baseline (expect the documented pre-existing failures unless separately fixed)
cd backend && uv run pytest tests/test_feishu.py -q

# Migration graph
cd backend && uv run alembic heads
```

The new Alembic head must be exactly one revision whose `down_revision` is `72b56533bb6d`. [VERIFIED: current head probe]

### Migration Round-Trip on a Copy

1. Copy `backend/data/family_chef.db` to `/tmp/opencode/family_chef_phase6.db`; never test downgrade on the active DB. [VERIFIED: active/stale DB probe]
2. Use Alembic's Python `Config` API to override `sqlalchemy.url` to the copied file, then upgrade to head, downgrade one revision, and upgrade again. [VERIFIED: Alembic is installed; safe verification pattern]
3. Before/after each step record `SELECT count(*) FROM wishes`, representative row values, `PRAGMA table_info(wishes)`, `PRAGMA index_list(wishes)`, and `PRAGMA foreign_key_check`. [CITED: SQLite migration guidance]
4. Verify upgrade gives `last_status_change_at` non-NULL for every existing row and `submitter_last_viewed_at` NULL, and downgrade removes only those two fields. [VERIFIED: D-M01 and local probe]

### Deployment Preflight

1. Back up the SQLite volume/file and run `uv run alembic current`; startup scripts do not apply migrations automatically. [VERIFIED: `scripts/run.sh`; `database.py`; Docker command]
2. If the DB reports `72b56533bb6d`, run the new `uv run alembic upgrade head` before starting the Phase 6 code. [VERIFIED: current migration chain]
3. If the DB has no Alembic revision, compare tables/columns/indexes against the `72b56533bb6d` schema before any stamp; a blind stamp can hide missing historical migrations. [VERIFIED: Phase 5 incident]
4. After upgrade, verify both new columns, all four wish indexes, all three foreign keys, `PRAGMA foreign_key_check`, and the new revision row before starting Uvicorn. [VERIFIED: migration invariants]

### Manual Feishu Smoke

- Use one designated chef test account whose `feishu_open_id` belongs to the configured application; do not broadcast the first smoke to all real chefs. [CITED: Feishu recipient/app-availability requirements]
- Verify bot capability, one required message scope, and availability range before sending. [CITED: https://open.feishu.cn/document/server-docs/im-v1/message/create]
- Submit one wish containing all optional fields, then edit/cancel a claimed wish; visually check card labels, omission rules, and link. [VERIFIED: D-F02/D-F03]
- Confirm a deliberately invalid recipient or mocked failure does not fail the wish HTTP request. [VERIFIED: D-H03]

## State of the Art

| Old / Tempting Approach | Current / Required Approach | When / Source | Impact |
|-------------------------|-----------------------------|---------------|--------|
| Direct SQLite add-column with dynamic timestamp default | Alembic batch move-and-copy | Current SQLite restriction and Alembic 1.18 docs. [CITED: SQLite/Alembic docs] | Required for D-M01 server default and data preservation. [VERIFIED: local probe]
| Mixed local naive and DB UTC timestamps | One UTC-naive application clock matching server default | Python 3.11 `UTC` plus observed deployment timezone. [CITED: Python datetime docs] | Makes strict `>` unread logic correct. [VERIFIED: clock probe]
| Pydantic v1 ORM conversion | Existing Pydantic v2 `ConfigDict` + `model_validate()` | Already implemented in Phase 5. [VERIFIED: `schemas/wish.py`; runtime Pydantic 2.13.4] | Add only the computed boolean field; no schema migration library. [VERIFIED: codebase]
| Legacy Feishu card Markdown for every field | Existing legacy card envelope, but `plain_text` for untrusted values | Official Markdown page is marked no longer maintained and points to current rich text docs. [CITED: Feishu Markdown docs] | Do not migrate the whole order-card system in Phase 6; minimize new legacy-markdown exposure. [VERIFIED: locked reuse boundary]
| Reusing order notification payload | Dedicated wish notification method | User-locked D-F01. [VERIFIED: `06-CONTEXT.md`] | Wish card evolves independently. [VERIFIED: decision rationale]

**Deprecated/outdated:**
- The official page documenting legacy message-card Markdown explicitly says it is no longer maintained; nevertheless, the existing app and D-F01 use the legacy interactive-card envelope, so Phase 6 should preserve compatibility rather than silently migrate all cards to Card JSON 2.0. [CITED: Feishu Markdown docs] [VERIFIED: existing `send_order_notification()`]
- Python `datetime.utcnow()` is deprecated since Python 3.12; use `datetime.now(UTC)` and strip timezone only because the locked SQLite columns are naive. [CITED: Python datetime docs]

## Assumptions Log

The former A1 content-edit question is no longer an assumption: the user explicitly locked D-H01 so `update_wish()` never advances `last_status_change_at`, while successful claim/advance/reject/cancel transitions do. [VERIFIED: explicit user decision; `06-CONTEXT.md` D-H01]

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A2 | Non-submitters receive `has_unread=false` in the shared list schema rather than the submitter's real value. [ASSUMED] | Unread helper; Pitfall 5; tests | MEDIUM — protects engagement metadata and follows Security Notes, but CONTEXT does not state the serialized value for admin/chef viewers. |
| A3 | Add `app.url` / `settings.APP_URL` with a default `https://family-chef.app` placeholder rather than hardcoding the URL inside the card method. [ASSUMED] | Change Surface; Runtime State; Pitfall 8 | MEDIUM — wrong naming/default creates broken links or expands config scope. |
| A4 | Truncate each old/new note rendered in Feishu to 1000 characters and represent a cleared new note as `（已清空）`. [ASSUMED] | Card example; Pitfall 9; tests | LOW-MEDIUM — exact display cap/empty marker was not user-locked, though some cap is needed for the 30 KB API limit. |
| A5 | A user with `claimed_by_chef_id` receives NOTIF-06 by ID even if that claimant has role `admin`, because Phase 5 allows admins to claim. [ASSUMED] | Notification target implementation | LOW — filtering role=`chef` for the one-recipient path would silently skip an admin claimant. |

## Resolved Questions

The former content-edit ambiguity is resolved by the user's explicit decision now locked as D-H01 in `06-CONTEXT.md`; the planning artifacts must implement and test that decision rather than treating it as an assumption.

1. **RESOLVED BY USER DECISION — D-H01 locked content-edit boundary.** Only successful `claim_wish()`, `advance_wish()`, `reject_wish()`, and `cancel_wish()` may advance `last_status_change_at`. A content-only `update_wish()` edit must never write `last_status_change_at` (and therefore must not create a submitter badge) — even when the wish is currently claimed — and must only send NOTIF-06 to the stored claimer when `was_claimed` was true before the mutation. Failed or invalid transitions (concurrent-claim rowcount==0; D-09/D-12 rejection; empty reject_reason; cancel of an already-terminal wish) must leave both notification timestamps unchanged and must not send a Feishu card. No submitter Feishu push exists for any lifecycle event. **Plan 02 (`06-02-PLAN.md`, Task 2)** supplies the unread API plus tests for the submitter-only clear side-effect and the non-submitter masking; **Plan 03 (`06-03-PLAN.md`, Task 3)** must test (a) a content-only `update_wish()` on a claimed wish sends exactly one claimer Feishu call and does NOT advance `last_status_change_at`, (b) successful claim/advance/reject/cancel each flip the badge back to `true` after a prior submitter clear, and (c) invalid transitions leave timestamps untouched and send zero Feishu calls.

2. **RESOLVED — Use a configurable application base URL with the authorized placeholder default.** Plan 01 (`06-01-PLAN.md`) adds/defines `settings.APP_URL` from `app.url`; Plan 03 (`06-03-PLAN.md`, Task 1) normalizes it and constructs `/wishes/{id}` deep links. Production configuration must provide the deployed URL before relying on clickable cards.

3. **RESOLVED — Live Feishu readiness is a human smoke-test concern, not an implementation blocker.** Automated Phase 6 tests mock all Feishu calls; Plan 03 (`06-03-PLAN.md`, verification) includes the credential-safe designated-recipient smoke check after implementation. Bot capability, scopes, availability, and recipient open-ID validity remain deployment verification items.

4. **RESOLVED — A newly created wish is unread until the submitter views it.** D-M01/D-A01 make `last_status_change_at` non-NULL on creation and treat NULL `submitter_last_viewed_at` as unread. Plan 02 (`06-02-PLAN.md`) implements and tests this literal locked behavior; no additional product decision is required.

## Environment Availability

| Dependency | Required By | Available | Version / State | Fallback |
|------------|-------------|-----------|-----------------|----------|
| Python | Backend + UTC helper | Yes | Project venv 3.11.11; system 3.12.3. [VERIFIED: command probe] | — |
| uv | Commands/environment | Yes | 0.6.0. [VERIFIED: command probe] | — |
| SQLite | Storage/migration | Yes | Python module 3.45.1; host timezone UTC+08, SQLite clock UTC. [VERIFIED: command probe] | — |
| Alembic | Migration | Yes | 1.18.4; current head `72b56533bb6d`. [VERIFIED: command probe] | — |
| FastAPI/SQLAlchemy/Pydantic | API/model/schema | Yes | 0.136.1 / 2.0.49 / 2.13.4. [VERIFIED: runtime probe] | — |
| HTTPX | Existing Feishu transport/tests | Yes | 0.28.1. [VERIFIED: runtime probe] | — |
| pytest | Tests | Yes | 9.1.1. [VERIFIED: runtime probe] | — |
| Ruff CLI | Optional lint | No | Not installed in current venv. [VERIFIED: command probe] | Use targeted pytest and syntax/import checks; do not add dependency solely for this phase. [VERIFIED: no-install design] |
| Feishu credentials | Live push | Partial | App ID/secret configured; permissions and target validity unverified. [VERIFIED: boolean-only probe] | Mock for automated tests; human smoke for live verification. [CITED: official prerequisites] |
| Application base URL | Deep link | No | No `APP_URL` setting. [VERIFIED: code/settings probe] | Context-approved placeholder; preferably add configurable setting. [ASSUMED] |

**Missing dependencies with no automated fallback:** verified Feishu developer-console capability/scopes/availability for a live push. [CITED: Feishu API prerequisites]

**Missing dependencies with fallback:** app base URL can temporarily use the context-approved placeholder; Ruff is optional and targeted tests remain available. [VERIFIED: context and environment]

## Security Domain

`security_enforcement` is enabled at ASVS level 1, so access-control, output-safety, and external-service failure cases must be explicit in the plan. [VERIFIED: `.planning/config.json:49-51`]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes, unchanged | Reuse `get_current_user_from_token`; no unauthenticated notification route is added. [VERIFIED: existing wishes router]
| V3 Session Management | No new behavior | Existing stateless JWT handling remains unchanged. [VERIFIED: AGENTS architecture]
| V4 Access Control | Yes | Only exact submitter identity clears/reads true badge state; existing service visibility remains authoritative. [VERIFIED: D-B03; Phase 5 PERM rules]
| V5 Validation / Encoding | Yes | Keep Pydantic inputs; render DB/user strings as card `plain_text`; controlled deep link must be HTTP(S). [CITED: Feishu card docs]
| V6 Cryptography | No new behavior | Reuse tenant access token flow; do not build crypto/token logic. [VERIFIED: existing FeishuClient]
| V7 Error Handling / Logging | Yes | Catch per recipient; do not fail HTTP; log event ID/error but not notes, secrets, or full card content. [VERIFIED: D-H03 plus data-minimization recommendation]
| V8 Data Protection | Yes | New wish goes only to bound chefs; claimed edit/cancel goes only to stored claimer; non-submitters do not receive true unread state. [VERIFIED: D-F04/Security Notes; A2 is logged]
| V13 API / Web Services | Yes | Preserve authenticated REST endpoints; external Feishu API remains server-to-server. [VERIFIED: architecture]

### Known Threat Patterns for FastAPI + Feishu Notifications

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR clear-side-effect (`GET /wishes/{id}`) | Elevation of Privilege / Tampering | Existing visibility gate plus exact `wish.user_id == current_user.id` write check; unauthorized read remains 404. [VERIFIED: Phase 5 D-03; D-B03]
| Submitter engagement metadata leak | Information Disclosure | Mask `has_unread` for non-submitters. [ASSUMED]
| Broadcast to unintended account | Information Disclosure | New events select only `role="chef"` and non-NULL bindings; change events resolve exact `claimed_by_chef_id`; no arbitrary receive ID comes from request input. [VERIFIED: D-F04]
| Card markup/mention injection | Spoofing / Information Disclosure | Use `plain_text` for all user strings; use `lark_md` only for server-constructed HTTP(S) link. [CITED: Feishu Markdown syntax]
| Oversized note/card | Denial of Service | Truncate displayed notes; preserve full data in DB/detail API; honor Feishu 30 KB card limit. [CITED: Feishu send-message docs] [ASSUMED]
| External API exception/false result | Denial of Service | Per-recipient best-effort catch/check; wish transaction proceeds. [VERIFIED: D-H03]
| One bad recipient aborts fan-out | Denial of Service | Catch inside loop and continue. [VERIFIED: D-F04/D-H03]
| Secret/content leakage in logs | Information Disclosure | Do not print app secret, note, reference URL, or card payload; log only wish ID and exception summary. [VERIFIED: data fields and existing configuration sensitivity]
| Duplicate notification on retry | Repudiation | Accepted Phase 6 limitation: no outbox/event ID is in scope; do not claim exactly-once delivery. [VERIFIED: synchronous best-effort architecture; deferred history]
| SSRF through `reference_url` | Not applicable to delivery path | Display it as plain text and never fetch it server-side. [VERIFIED: proposed card path and existing schema]

## Sources

### Primary (HIGH confidence)

- `.planning/phases/06-notifications-integration/06-CONTEXT.md` — locked badge, card, targeting, hook, failure, model, API, security, and deferred decisions. [VERIFIED: local file]
- `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` — Phase 6 boundary, success criteria, and NOTIF-03..06. [VERIFIED: local files]
- Canonical Phase 5 artifacts: `05-CONTEXT.md`, `05-RESEARCH.md`, and `05-01/02/03-SUMMARY.md`. [VERIFIED: local files]
- Current implementation: `models/wish.py`, `schemas/wish.py`, `services/wish_service.py`, `routers/wishes.py`, `integrations/feishu.py`, `services/order_service.py`, `services/guest_service.py`, `models/user.py`, `database.py`, `config.py`, migration `72b56533bb6d`, wish/Feishu tests, `scripts/run.sh`, and `docker/Dockerfile`. [VERIFIED: direct code read]
- `.planning/codebase/CONCERNS.md` and `05-01-SUMMARY.md` — startup does not enforce migrations and Phase 5's unstamped-DB incident. [VERIFIED: local files]
- https://www.sqlite.org/lang_altertable.html — ADD COLUMN restrictions and safe generalized migration sequence. [CITED: official SQLite docs]
- https://alembic.sqlalchemy.org/en/latest/batch.html — SQLite batch move-and-copy behavior and `recreate="always"`. [CITED: official Alembic docs]
- https://docs.sqlalchemy.org/en/20/core/defaults.html — server defaults and update/default semantics. [CITED: official SQLAlchemy docs]
- https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/ — post-yield execution and request scope. [CITED: official FastAPI docs]
- https://open.feishu.cn/document/server-docs/im-v1/message/create — recipient IDs, scopes, bot/availability prerequisites, interactive content, limits, errors, and rate limits. [CITED: official Feishu docs]
- https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal — tenant token lifetime/response. [CITED: official Feishu docs]
- https://open.feishu.cn/document/common-capabilities/message-card/message-cards-content/using-markdown-tags — legacy card text/Markdown/link behavior and escaping. [CITED: official Feishu docs]
- https://docs.python.org/3/library/datetime.html#datetime.datetime.now — UTC-aware current time and `utcnow()` deprecation. [CITED: official Python docs]
- https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock — async mocking and await assertions. [CITED: official Python docs]

### Tool-Verified Evidence (HIGH confidence)

- `gsd-sdk query init.phase-op 6` — phase path, flags, and canonical input locations. [VERIFIED: command output]
- `uv run alembic heads/current` — `72b56533bb6d` is the current head. [VERIFIED: command output]
- Runtime version/PyPI probes — exact installed versions and release timestamps in Standard Stack. [VERIFIED: command output; PyPI JSON]
- SQLite direct-add probe — `DEFAULT CURRENT_TIMESTAMP` add fails on SQLite 3.45.1. [VERIFIED: command output]
- Alembic batch probe — existing row, 4 indexes, and 3 FKs preserved; timestamp backfilled. [VERIFIED: command output]
- Local clock probe — host UTC+08 versus SQLite UTC. [VERIFIED: command output]
- Read-only DB inventory — active DB revision/table/row count and stale zero-byte DB. [VERIFIED: command output]
- Targeted baseline tests — wishes 25 passed; Feishu 4 failed/2 passed. [VERIFIED: pytest output]

### Secondary (MEDIUM confidence)

- PyPI release JSON for installed versions — package publication timestamps; packages were independently established by official project docs and the existing codebase. [VERIFIED: PyPI registry]

### Tertiary (LOW confidence)

- None; unresolved design choices are explicitly tagged `[ASSUMED]` and listed in the Assumptions Log. [VERIFIED: assumptions audit]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies are existing, locally imported, version-probed, and registry dated; no install is proposed. [VERIFIED: runtime/PyPI probes]
- Data/migration architecture: HIGH — SQLite restriction and Alembic batch behavior are official and reproduced locally against the wish-shaped schema. [VERIFIED: official docs and probe]
- Unread behavior: HIGH — timestamp mechanics and the content-edit/status-transition boundary are now locked by D-B01/D-H01; tests must prove edit does not advance the timestamp and successful claim/advance/reject/cancel do. [VERIFIED: explicit user decision; context comparison]
- Feishu code integration: HIGH — existing adapter/service patterns and official API contract were read. [VERIFIED: code/docs]
- Live Feishu delivery: MEDIUM — credentials exist, but bot/scopes/availability/recipient validity were not authenticated in this research. [VERIFIED: environment limits]
- Security/pitfalls: HIGH — each maps to locked access/targeting rules, official card/API constraints, or a reproduced local failure. [VERIFIED: source audit]

**Research date:** 2026-07-22
**Valid until:** 2026-08-05 (14 days; backend stack is stable, but Feishu card/API documentation and deployment configuration require recheck before live rollout)
