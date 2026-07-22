---
phase: 06-notifications-integration
plan: 01
subsystem: database
tags: [alembic, sqlite, sqlalchemy, migration, utc-clock, timestamps]

# Dependency graph
requires:
  - phase: 05-data-foundation-wish-lifecycle-api
    provides: Wish model with 11 columns, 4 indexes, 3 FKs; wishes migration 72b56533bb6d
provides:
  - naive_utc_now() UTC-naive clock helper for all Phase 6 timestamp writes
  - Wish.last_status_change_at column (nullable, server_default=CURRENT_TIMESTAMP)
  - Wish.submitter_last_viewed_at column (nullable, no default)
  - Settings.APP_URL with placeholder default https://family-chef.app
  - Reversible Alembic batch migration (3a41e4977098) chained from 72b56533bb6d
affects: [06-02, 06-03, badge-api, feishu-hooks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single UTC-naive clock helper (naive_utc_now) for all notification timestamp writes"
    - "Alembic batch_alter_table(recreate='always') for SQLite non-constant defaults"
    - "command.stamp() + direct SQL for migration testing on fresh DB (avoids pre-existing chain bug)"

key-files:
  created:
    - backend/app/utils/datetime_utils.py
    - backend/alembic/versions/3a41e4977098_add_wish_notification_timestamps.py
    - backend/tests/test_datetime_utils.py
    - backend/tests/test_wish_notification_migration.py
  modified:
    - backend/app/models/wish.py
    - backend/app/config.py

key-decisions:
  - "naive_utc_now() returns datetime.now(UTC).replace(tzinfo=None) to match SQLite CURRENT_TIMESTAMP semantics"
  - "Migration uses batch_alter_table(recreate='always') because SQLite rejects ADD COLUMN with CURRENT_TIMESTAMP default"
  - "Test creates pre-Phase-6 schema via SQL + command.stamp() due to pre-existing f94f55868e87 batch constraint bug"

patterns-established:
  - "Pattern: all Phase 6 timestamp writes route through naive_utc_now() — no bare datetime.now() in model/service code"
  - "Pattern: batch_alter_table(recreate='always') is the SQLite-safe migration shape for columns with dynamic defaults"
  - "Pattern: migration round-trip tests use fresh per-test temp DB with assertion-based schema/data verification"

requirements-completed: [NOTIF-03, NOTIF-04]

# Metrics
duration: 12min
completed: 2026-07-22
---

# Phase 6 Plan 01: Wish Notification Data Foundation Summary

**UTC-naive clock helper, two nullable Wish timestamp columns, Settings.APP_URL, and a reversible Alembic batch migration with full round-trip verification — the data foundation that Phase 6 hook code will write into.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-22T07:03:49Z
- **Completed:** 2026-07-22T07:16:19Z
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments
- Added `naive_utc_now()` — the single UTC-naive clock helper that all Phase 6 notification timestamp writes must use, preventing the local-time-vs-SQLite-UTC strict-comparison bug (Pitfall 2)
- Added `Wish.last_status_change_at` (nullable, `server_default=func.now()`) and `Wish.submitter_last_viewed_at` (nullable, no default) per D-M01
- Added `Settings.APP_URL` reading `app.url` from YAML with placeholder default `https://family-chef.app` for Feishu deep links
- Created reversible Alembic migration `3a41e4977098` using `batch_alter_table(recreate="always")` — preserves all rows, 4 indexes, and 3 FKs through upgrade → downgrade → upgrade
- Verified the full round-trip with assertion-based tests on a fresh per-test temp DB (legacy wish preserved, column defaults/indexes/FKs correct at every checkpoint)

## Task Commits

Each task was committed atomically (TDD: RED → GREEN):

1. **Task 1 RED: failing test for helper/config/columns** — `60f51bd` (test)
2. **Task 1 GREEN: naive_utc_now + APP_URL + Wish columns** — `025381f` (feat)
3. **Task 2 RED: failing migration round-trip test** — `f4baf04` (test)
4. **Task 2 GREEN: reversible batch migration** — `a9341f7` (feat)

## Files Created/Modified
- `backend/app/utils/datetime_utils.py` — Single `naive_utc_now()` helper; UTC-naive to match SQLite CURRENT_TIMESTAMP
- `backend/app/models/wish.py` — Two new nullable DateTime columns on Wish (last_status_change_at, submitter_last_viewed_at)
- `backend/app/config.py` — Settings.APP_URL with `app.url` YAML key and placeholder default
- `backend/alembic/versions/3a41e4977098_add_wish_notification_timestamps.py` — Reversible batch migration chained from 72b56533bb6d
- `backend/tests/test_datetime_utils.py` — 8 tests for helper/config/column behavior
- `backend/tests/test_wish_notification_migration.py` — 2 tests for migration round-trip (upgrade, downgrade, upgrade)
- `.planning/phases/06-notifications-integration/deferred-items.md` — Logs pre-existing f94f55868e87 migration bug

## Decisions Made
- **Test DB setup via SQL + stamp:** The migration round-trip test creates the pre-Phase-6 wishes schema directly via SQL and uses `command.stamp(cfg, "72b56533bb6d")` instead of running the full migration chain. This is because the pre-existing migration `f94f55868e87` has a batch constraint bug on SQLite that prevents fresh-DB chain application (documented in deferred-items.md). The stamp approach achieves the same test goal: verifying the new migration on a pre-Phase-6 schema.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration test cannot apply full Alembic chain due to pre-existing migration bug**
- **Found during:** Task 2 (migration round-trip test)
- **Issue:** The plan's `_fresh_temp_db` helper specified "applies the existing Alembic history UP TO `72b56533bb6d`". However, migration `f94f55868e87` (Phase 5) uses `op.batch_alter_table('taste_preferences', schema=None)` with default `recreate="auto"`, which fails on SQLite fresh-DB application with `NotImplementedError: No support for ALTER of constraints in SQLite dialect`. This is a pre-existing bug masked by `init_db()` using `Base.metadata.create_all()` (confirmed by 06-RESEARCH.md Pitfall 14).
- **Fix:** The test creates the pre-Phase-6 wishes schema directly via raw SQL (users + dishes + wishes tables with 4 indexes and 3 FKs matching migration `72b56533bb6d`), seeds a legacy wish, then uses `command.stamp(cfg, "72b56533bb6d")` so `upgrade head` applies only the new Phase 6 migration. This preserves all test assertions (rows, columns, defaults, indexes, FKs at every checkpoint).
- **Files modified:** `backend/tests/test_wish_notification_migration.py`
- **Verification:** Both migration round-trip tests pass; legacy wish preserved through upgrade → downgrade → upgrade with 4 indexes and 0 FK violations at every step.
- **Committed in:** `f4baf04`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation adapts the test setup to work around a pre-existing migration bug without modifying any existing migration. The test still fully verifies the new migration's reversibility, data preservation, and schema correctness. No scope creep.

## Issues Encountered
- Pre-existing migration `f94f55868e87` batch constraint bug on SQLite — logged in `deferred-items.md` for future fix (change to `recreate="always"` or add `render_as_batch=True` to env.py). Out of scope for this plan.

## User Setup Required

None — no external service configuration required. `Settings.APP_URL` defaults to the placeholder `https://family-chef.app`; production deployments should set `app.url` in `config.yaml` before relying on Feishu deep links.

## Next Phase Readiness
- Data foundation complete: `naive_utc_now()`, both Wish columns, `APP_URL` setting, and reversible migration are in place
- Plan 06-02 (badge API) can now compute `has_unread` from the two timestamps and implement the submitter-only `submitter_last_viewed_at` clear side-effect
- Plan 06-03 (Feishu hooks) can now write `last_status_change_at` via `naive_utc_now()` at the 5 hook locations and construct deep links from `settings.APP_URL`
- **Deployment note:** Run `alembic upgrade head` before starting the new application image (startup scripts do not auto-apply migrations — Pitfall 14)

---
*Phase: 06-notifications-integration*
*Completed: 2026-07-22*

## Self-Check: PASSED

- All 7 created/modified files exist on disk ✓
- All 4 task commits found in git log (60f51bd, 025381f, f4baf04, a9341f7) ✓
- Task 1 verify command outputs 4 truthy values ✓
- Migration round-trip tests: 2 passed ✓
- Existing wish regression: 25 passed ✓
