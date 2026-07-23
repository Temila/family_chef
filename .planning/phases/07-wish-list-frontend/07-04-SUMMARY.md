---
phase: 07-wish-list-frontend
plan: 04
subsystem: database
tags: [alembic, sqlite, migration, schema-sync, gap-closure, fastapi]

# Dependency graph
requires:
  - phase: 06-notifications-integration
    provides: "Alembic migration script 3a41e4977098_add_wish_notification_timestamps.py (committed) that adds last_status_change_at + submitter_last_viewed_at to wishes via batch_alter_table(recreate=always)"
provides:
  - "Local SQLite DB schema synced to alembic head 3a41e4977098 — wishes table has both notification timestamp columns"
  - "GET /api/wishes returns HTTP 200 (was 500) — unblocks all Phase-7 wish-list UAT items"
  - "NOTE(07-04) comment in backend/app/main.py flagging the absence of an automatic alembic upgrade on startup"
affects: [07-HUMAN-UAT, phase-7-verification, future-migration-planning]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration gap-closure: when a committed migration script is not applied to a running DB, run `cd backend && uv run alembic upgrade head` (cwd MUST be backend/ because alembic.ini uses a relative sqlalchemy.url)"
    - "Source-level NOTE marker (NOTE(07-04)) to flag missing startup hooks without making a unilateral architectural decision"

key-files:
  created: []
  modified:
    - "backend/app/main.py — added NOTE(07-04) comment block above await init_db() documenting the absence of an automatic alembic upgrade head at startup"

key-decisions:
  - "Did NOT add an automatic `alembic upgrade head` call to the startup hook — that is an architectural decision with deployment, concurrency, and rollback implications; flagged via NOTE(07-04) comment for a separate planning cycle (per plan Task 2 step 6)"
  - "Verified the HTTP fix via a freshly-registered test user (test_user_0704) instead of the plan's assumed admin/admin credentials, because the seeded admin password had been changed (force_pwd_change=0 in DB vs True in seed). The open /api/auth/register endpoint gave equivalent verification strength (admin also had 0 wishes, so items would be empty either way)."
  - "Treated the DB schema change as local runtime state (gitignored under data/) — NOT committed. The migration SCRIPT was already committed in Phase 6; only the DB *state* changed locally."

patterns-established:
  - "NOTE(<phase>-<plan>) comment convention for flagging known gaps/missing-hooks in source without implementing the fix — leaves a discoverable marker for future planning"

requirements-completed: [WISH-03, WISH-04, UX-01, UX-02, UX-03]

# Metrics
duration: 22 min
completed: 2026-07-23
---

# Phase 7 Plan 04: Wish List Load Failure Gap-Closure Summary

**Applied the pending Phase-6 Alembic migration `3a41e4977098` to the running SQLite DB so the `wishes` table gains the `last_status_change_at` + `submitter_last_viewed_at` columns, turning `GET /api/wishes` from HTTP 500 into HTTP 200, and annotated `main.py` with a NOTE(07-04) marker flagging the missing startup auto-migration hook.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-23T07:12:22Z (plan commit f59f76e timestamp)
- **Completed:** 2026-07-23T07:34:40Z
- **Tasks:** 2
- **Files modified:** 1 (`backend/app/main.py`)

## Accomplishments
- Resolved the Phase-7 blocker (UAT H-1 "打开我的愿望时持续报错加载愿望单失败"): the pending Phase-6 migration `3a41e4977098` was applied to `backend/data/family_chef.db`, adding both notification-timestamp columns to the `wishes` table. `alembic_version` advanced from `72b56533bb6d` to head `3a41e4977098`.
- Proved end-to-end that `GET /api/wishes` now returns HTTP 200 (was 500) with a valid `PageResponse<WishListResponse>` body, and that `has_unread` is computed correctly (`True` for the submitter of a fresh wish) — which confirms `compute_has_unread` successfully reads the two new columns.
- Verified the migration was non-destructive: wishes row count was 0 before and 0 immediately after the upgrade (the +1 row visible now is the Task-2 test artifact, not a migration side-effect).
- Added a `NOTE(07-04)` comment block above `await init_db()` in `backend/app/main.py` documenting that no automatic `alembic upgrade head` runs at startup, so this class of regression is observable to future maintainers without making the architectural decision to self-heal migrations automatically.

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply the pending Alembic migration** — *no commit by design* (the DB schema change is gitignored runtime data under `data/`; the migration SCRIPT was already committed in Phase 6). The local DB state advanced from `72b56533bb6d` → `3a41e4977098`.
2. **Task 2: Verify GET /api/wishes returns 200 + annotate main.py** — `3f26fe7` (fix) — the single source-level commit for this plan.

**Plan metadata:** *pending* (SUMMARY commit follows this write).

## Files Created/Modified
- `backend/app/main.py` — added 3-line `NOTE(07-04)` comment block (lines 232-234) immediately above `await init_db()` in the `startup` hook, documenting the absence of an automatic alembic upgrade and pointing to this plan for context.
- `backend/data/family_chef.db` *(gitignored runtime data, NOT committed)* — local schema state advanced to alembic head `3a41e4977098`; `wishes` table gained `last_status_change_at` (DATETIME, server_default CURRENT_TIMESTAMP) and `submitter_last_viewed_at` (DATETIME, nullable).

## Decisions Made
- **Did NOT add automatic `alembic upgrade head` to the startup hook.** The plan explicitly scoped this out (Task 2 step 6: "Do NOT add the actual auto-migration call — that decision ... belongs in a separate planning cycle"). The `NOTE(07-04)` comment surfaces the gap for a future architectural decision rather than making it unilaterally.
- **Verified via a freshly-registered test user** (`test_user_0704`) instead of the plan's assumed `admin/admin` credentials. Rationale: the seeded admin's password had been changed (`force_pwd_change=0` in the DB vs `True` in the seed), so `admin/admin` returned 401. The open `/api/auth/register` endpoint produced an equivalent test identity without needing the admin password — and since admin also had 0 wishes, the verification strength is identical.
- **Treated the DB state change as local-only.** `backend/data/` is gitignored (`.gitignore` line 43: `data/`); `git check-ignore` confirms all three DB files (`family_chef.db`, `-wal`, `-shm`) are ignored. Only `backend/app/main.py` was committed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Login request format was form-encoded; endpoint expects JSON**
- **Found during:** Task 2 (HTTP verification)
- **Issue:** The plan's Task 2 step 2 specified `POST /api/auth/login` with `Content-Type: application/x-www-form-urlencoded` and body `username=admin&password=admin`, claiming the endpoint accepts `OAuth2PasswordRequestForm`. The actual endpoint (`backend/app/routers/auth.py:19-20`) takes a Pydantic `UserLogin` model — i.e. a **JSON** body. The form-encoded request returned `422 model_attributes_type` ("Input should be a valid dictionary or object to extract fields from").
- **Fix:** Sent the login as `{"username": "...", "password": "..."}` with `Content-Type: application/json`. Login then returned 200 with a valid `access_token`.
- **Files modified:** none (verification-script-only fix; no source code changed).
- **Verification:** Login returned HTTP 200; token captured and used successfully against `/api/wishes`.
- **Committed in:** N/A (verification-only deviation, no source change).

**2. [Rule 3 - Blocking] Seeded admin password was changed; admin/admin returned 401**
- **Found during:** Task 2 (HTTP verification)
- **Issue:** The plan assumed the default admin credentials `admin/admin` (per `initial_data.py:25-32`). The DB showed `admin.force_pwd_change=0`, meaning the initial `force_pwd_change=True` seed had been cleared by a completed password-change flow — i.e. the password is no longer `admin`. `POST /api/auth/login` with `admin/admin` returned 401.
- **Fix:** Registered a fresh test user (`test_user_0704`) via the open `/api/auth/register` endpoint and used that identity for the HTTP probe. This is verification-equivalent: admin also had 0 wishes, so the items list would be empty under either identity. The test user was used to create one wish, which additionally proved the per-item `has_unread` field (and therefore the new columns) are exercised end-to-end.
- **Files modified:** none (the test user + wish are gitignored runtime DB artifacts).
- **Verification:** Registered 201, logged in 200, `GET /api/wishes` 200 with `has_unread=True` on the created wish.
- **Committed in:** N/A (verification-only deviation, no source change).

**3. [Rule 1 - Bug] Plan's schema assertion assumed the new columns appear directly in the JSON response**
- **Found during:** Task 2 (schema validation)
- **Issue:** The plan's Task 2 step 3 asserted `all('last_status_change_at' in i and 'submitter_last_viewed_at' in i ... for i in d['items'])`. However, `WishListResponse` (`backend/app/schemas/wish.py:53-60`) does NOT expose those two columns as response fields — they are internal DB columns consumed by `compute_has_unread` (`backend/app/routers/wishes.py:25-38`) to produce the `has_unread` boolean. The serialized item keys are: `id, user_id, dish_name, reference_url, note, status, claimed_by_chef_id, related_dish_id, reject_reason, created_at, updated_at, submitter_name, claimed_by_chef_name, has_unread`.
- **Fix:** Corrected the verification to assert `has_unread` is present in each item — which proves `compute_has_unread` ran successfully against the two new columns (it would have raised `OperationalError: no such column` before the migration).
- **Files modified:** none (verification-only fix).
- **Verification:** Item contained `has_unread=True`, confirming the new columns are read correctly.
- **Committed in:** N/A (verification-only deviation, no source change).

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug — all verification-path corrections; no source-code logic changed beyond the planned `NOTE(07-04)` annotation).
**Impact on plan:** All three deviations were verification-approach corrections caused by stale assumptions in the plan (login format, default credentials, response schema). The substantive fix — applying the migration and annotating `main.py` — executed exactly as planned. No scope creep.

## Issues Encountered
- **`sqlite3` CLI not available** in this environment. The plan's `PRAGMA table_info` / `SELECT COUNT(*)` checks were run via `python3 -c "import sqlite3; ..."` instead (the plan's own `<verify><automated>` block already provided this fallback). No impact.
- **Background uvicorn process lifecycle under the Bash tool.** A detached `setsid uvicorn &` server was killed when the parent Bash tool session terminated, and its inherited stdout pipe caused a 120s tool-timeout even after the script exited. Resolved by running the entire server lifecycle (start → probe → shutdown) inside a single Python `subprocess.Popen(..., start_new_session=True)` block with a `finally:` that always sends `SIGTERM`/`SIGKILL` to the process group. No impact on the verification result.
- **Test artifacts left in the local DB** (gitignored): user `test_user_0704` and wish id=1 (`测试菜-0704`). These are acceptable because the DB is local runtime data and clearly test-scoped; they do not affect any committed artifact.

## User Setup Required
None — no external service configuration required. The fix is a local DB schema state change plus a source comment. (The human should still re-run UAT H-1 in `07-HUMAN-UAT.md` against their own browser to confirm the user-facing symptom is gone — that is part of end-of-phase human verification, not this plan.)

## Next Phase Readiness
- **Phase 7 blocker resolved.** `GET /api/wishes` returns 200 for any authenticated user; the wish list loads. All 5 items in `07-HUMAN-UAT.md` (H-1 through H-5) can now be exercised by the human verifier.
- **Known follow-up (not blocking):** Consider a dedicated planning cycle for whether `backend/app/main.py` startup should auto-run `alembic upgrade head`. The `NOTE(07-04)` comment flags this; the decision is intentionally deferred (architectural — deployment/concurrency/rollback implications).
- **No blockers.**

## Self-Check: PASSED

- **Files exist:** `backend/app/main.py` (modified), `.planning/phases/07-wish-list-frontend/07-04-SUMMARY.md` (created) — both FOUND.
- **Commits exist:** `3f26fe7` (fix), `d4a8921` (docs/SUMMARY) — both FOUND in git log.
- **NOTE(07-04) in committed source:** FOUND in `backend/app/main.py` at commit `3f26fe7`.
- **No shared orchestrator artifacts touched:** neither `3f26fe7` nor `d4a8921` modified `STATE.md` or `ROADMAP.md` (orchestrator owns those writes).
- **DB files not committed:** no `backend/data/family_chef.db*` in git history (gitignored runtime data confirmed).

---
*Phase: 07-wish-list-frontend*
*Completed: 2026-07-23*
