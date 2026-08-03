---
phase: 17-theme-system-foundation-engine-page-presets-persistence
plan: 01
subsystem: api, database, testing
tags: [sqlalchemy, alembic, pydantic, fastapi, jwt, per-user-isolation, pytest]

# Dependency graph
requires:
  - phase: 16-tech-debt-cleanup
    provides: Alembic env.py with render_as_batch + TD-09 backend test suite green (350 baseline)
provides:
  - "CustomTheme SQLAlchemy model with per-user FK + JSON source_colors + (user_id, name) unique index"
  - "Alembic migration 3bec850ed472 chained after 3a41e4977098 — creates custom_themes table + 2 indexes"
  - "Pydantic V2 schemas (SourceColors / ThemeCreate / ThemeUpdate / ThemeResponse) with hex + variant validation"
  - "CustomThemeService with ThemePermissionError + 5 @staticmethod methods enforcing WHERE user_id == current_user.id"
  - "FastAPI router at /api/themes with 4 JWT-protected endpoints (GET list / POST / PUT / DELETE)"
  - "main.py registration at prefix /api/themes tag 自定义主题"
  - "12-case pytest suite covering CRUD, isolation, ownership 403, duplicate, validation, JWT required"
affects:
  - "Phase 17 plan 17-04 (frontend /theme page consuming GET /api/themes)"
  - "Phase 17 plan 17-05 (ThemeContext mount-fetching from GET /api/themes for SYNC-03)"
  - "Phase 18 EDIT-* plans (custom editor POST/PUT/DELETE /api/themes)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ThemePermissionError(ValueError) — router 403 mapping, mirroring WishPermissionError"
    - "Pydantic field_validator hex regex (^#[0-9a-fA-F]{6}$) with lowercase normalization"
    - "Per-user ownership via WHERE user_id == current_user.id in every service query"
    - "Variant validation against frozenset of all 9 MCU variants (forward-compat with Phase 18 EDIT-02)"

key-files:
  created:
    - "backend/app/models/custom_theme.py"
    - "backend/alembic/versions/3bec850ed472_add_custom_themes_table.py"
    - "backend/app/schemas/theme.py"
    - "backend/app/services/custom_theme_service.py"
    - "backend/app/routers/themes.py"
    - "backend/tests/test_themes.py"
  modified:
    - "backend/app/models/__init__.py"
    - "backend/app/main.py"
    - "backend/tests/conftest.py"
    - "backend/tests/test_wish_notification_migration.py"

key-decisions:
  - "D-12: CustomTheme model with user_id FK ON DELETE CASCADE + JSON source_colors + variant + timestamps"
  - "D-13: Alembic migration creates custom_themes + ix_custom_themes_user_id + uq_custom_themes_user_name"
  - "D-14: REST API /api/themes — JWT-protected, 4 endpoints, no pagination (count cap = unlimited)"
  - "Used `from sqlalchemy.sql import text as sa_text` and `sa.text('CURRENT_TIMESTAMP')` (matching wish.py pattern, NOT func.now()) per the plan spec"
  - "Variant validator accepts all 9 MCU variants (TonalSpot/Vibrant/Expressive/Content/Mono/Neutral/Fidelity/Rainbow/FruitSalad) for forward-compat with Phase 18 EDIT-02"
  - "SourceColors check_hex returns v.lower() — uppercase hex normalized on the way in"
  - "delete_theme uses SQL DELETE with rowcount check → 403 on 0 rows (combines 403/404 to prevent ID enumeration)"
  - "Migration test (test_downgrade_then_upgrade_round_trip) pinned to explicit revision 72b56533bb6d instead of `downgrade -1` so it remains correct as new migrations land on top"

requirements-completed: [SYNC-01, SYNC-02, SYNC-04]

# Metrics
duration: 16min
completed: 2026-08-03
---

# Phase 17 Plan 01: CustomTheme Backend Foundation Summary

**CustomTheme model + Alembic migration + Pydantic schemas + JWT-protected REST API at /api/themes with per-user ownership enforcement, validated by 12 passing pytest cases with no regressions across the 350-case baseline suite.**

## Performance

- **Duration:** 16 min (15m 35s)
- **Started:** 2026-08-03T01:43:05Z
- **Completed:** 2026-08-03T01:58:40Z
- **Tasks:** 3
- **Files modified:** 10 (6 created + 4 modified)

## Accomplishments

- `custom_themes` table on disk with 2 indexes (per-user + unique user-name), chained after the wish notification migration head (`3a41e4977098` → `3bec850ed472`)
- Full CRUD REST API with 4 JWT-protected endpoints; per-user isolation enforced at the service layer (`WHERE user_id == current_user.id`) on every query
- Cross-user 403 enforced for non-owner PUT and DELETE; duplicate-name POST returns 400; unauthenticated requests return 401
- All 12 new pytest cases pass + the full 350-case baseline remains green (362 passed, 7 skipped, 0 failed)

## Task Commits

Each task was committed atomically:

1. **Task 1: CustomTheme model + migration + alembic upgrade head** — `395f8fc` (feat)
2. **Task 2: Schemas + service + router + main.py wiring** — `5ba330b` (feat)
3. **Task 3: Conftest + test_themes.py + migration test fix** — `6ace4df` (test)

## Files Created/Modified

- `backend/app/models/custom_theme.py` — CustomTheme ORM model (user_id FK + name + JSON source_colors + variant + 4 timestamps + 2 indexes)
- `backend/alembic/versions/3bec850ed472_add_custom_themes_table.py` — Alembic migration (create_table + 2 indexes)
- `backend/app/models/__init__.py` — re-export CustomTheme
- `backend/app/schemas/theme.py` — SourceColors (hex validator) + ThemeCreate + ThemeUpdate + ThemeResponse (ConfigDict from_attributes)
- `backend/app/services/custom_theme_service.py` — ThemePermissionError(ValueError) + CustomThemeService with 5 @staticmethod methods (create/list/get/update/delete) + module-level singleton
- `backend/app/routers/themes.py` — APIRouter with GET/POST/PUT/DELETE, JWT-protected, 403/400/401 mapped
- `backend/app/main.py` — themes added to router import tuple + `app.include_router(themes.router, prefix="/api/themes", tags=["自定义主题"])`
- `backend/tests/test_themes.py` — 12 pytest cases (CRUD + isolation + ownership 403 + duplicate + validation + unauth)
- `backend/tests/conftest.py` — CustomTheme added to setup_database imports + clean_all_tables list
- `backend/tests/test_wish_notification_migration.py` — `downgrade -1` → `downgrade "72b56533bb6d"` for chain resilience

## Decisions Made

- **All 9 MCU variants accepted in validator:** Phase 17 only uses TonalSpot, but the validator accepts Vibrant/Expressive/Content/Mono/Neutral/Fidelity/Rainbow/FruitSalad for forward-compat with Phase 18 EDIT-02 (no schema or migration needed later)
- **SourceColors lowercase normalization:** uppercase hex like `#F5B43C` becomes `#f5b43c` on the way in (test_create_theme asserts this); keeps canonical form consistent in DB
- **delete_theme combines 403/404:** rowcount == 0 raises ThemePermissionError → 403 to prevent ID enumeration; matches favorite_service delete pattern
- **Hard delete (not soft):** Per D-14 (data: v1.5 CustomTheme hard delete per CONTEXT.md agent discretion); cascade to nothing else since no other table FKs into custom_themes
- **Migration test pinned to explicit revision:** test_downgrade_then_upgrade_round_trip uses `downgrade "72b56533bb6d"` (pre-wish-notification revision) instead of `downgrade -1` so the test remains correct regardless of how many migrations land on top

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] conftest.py model imports deleted by `ruff --fix`**

- **Found during:** Task 3 verification (full test suite run after `ruff check --fix`)
- **Issue:** Running `uv run ruff check --fix tests/conftest.py` removed the 12 `from app.models.X import Y` lines from `setup_database()` because ruff flagged them as F401 (unused). But these imports are NOT unused — they are required to register each model class with `Base.metadata` so `Base.metadata.create_all` can create the corresponding table. After the auto-fix, all tests that touched the DB failed with `sqlite3.OperationalError: no such table: users` because `create_all` created zero tables.
- **Fix:** Restored all 12 imports with `# noqa: F401` comments so SQLAlchemy model registration still works and ruff stops flagging them. Verified: 12/12 theme tests pass + 362/362 full suite passes.
- **Files modified:** `backend/tests/conftest.py`
- **Committed in:** `6ace4df` (Task 3 commit)

**2. [Rule 3 - Blocking] Pre-existing migration round-trip test broken by new chain step**

- **Found during:** Task 3 full suite run (`uv run pytest -q`)
- **Issue:** `tests/test_wish_notification_migration.py::test_downgrade_then_upgrade_round_trip` assumed the head was `3a41e4977098` and used `downgrade -1` to roll back the wish notification migration. With my new migration `3bec850ed472` chained on top, `downgrade -1` only rolls back the custom themes table — leaving the wish notification timestamps in place. The test then asserted `assert "last_status_change_at" not in cols` which now fails.
- **Fix:** Changed the test to use the explicit target revision `command.downgrade(cfg, "72b56533bb6d")` instead of `"-1"`. The test's intent (verify the wish notification migration's upgrade→downgrade→upgrade round-trip preserves data and schema) is preserved regardless of how many subsequent migrations land on top.
- **Files modified:** `backend/tests/test_wish_notification_migration.py`
- **Verification:** `uv run pytest tests/test_wish_notification_migration.py -v` shows 2 passed
- **Committed in:** `6ace4df` (Task 3 commit)

### Not Fixed (Out of Scope)

- **Pre-existing `B008` / `BLE001` ruff errors project-wide:** Every router in `app/routers/` (favorites/wishes/orders/dishes/...) uses the standard FastAPI `Depends(get_current_user_from_token)` and `Depends(get_db)` defaults — ruff flags these as B008. `app/main.py` has BLE001 `except Exception` in the auto-migration try/except. These are project-wide pre-existing (151 B008 errors + 4 BLE001 in main.py), not introduced by my changes. My new files (`schemas/theme.py`, `services/custom_theme_service.py`) pass ruff cleanly; only `routers/themes.py` carries the same B008 markers as every other router. The plan's "ruff check app/ tests/ exits 0" criterion cannot be met without modifying pre-existing files outside scope — documented here rather than attempting a project-wide lint pass.

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking)
**Impact on plan:** Both auto-fixes necessary for the test suite to remain green. No scope creep. The pre-existing lint state remains unchanged.

## Issues Encountered

None — both deviations auto-resolved on first attempt.

## User Setup Required

None - no external service configuration required. Backend only.

## Next Phase Readiness

- ✅ SYNC-01 (model + migration): satisfied — `custom_themes` table on disk with 2 indexes
- ✅ SYNC-02 (REST API): satisfied — 4 JWT-protected endpoints at `/api/themes`
- ✅ SYNC-04 (per-user isolation): satisfied — enforced at service layer with `WHERE user_id == current_user.id`
- ⏳ SYNC-03 (cross-device sync, last-write-wins): not in this plan — handled in Phase 17 plan 17-05 (ThemeContext mount-fetch + updatedAt re-apply toast)

Ready for Phase 17 plan 17-02 (theme-engine.js + presets.js + ThemeContext frontend foundation) or any plan that depends on the backend REST API.

---

*Phase: 17-theme-system-foundation-engine-page-presets-persistence*
*Plan: 01*
*Completed: 2026-08-03*

## Self-Check: PASSED

- All 6 created files exist on disk (model + migration + schema + service + router + test_themes.py)
- All 3 task commits present in git log (395f8fc, 5ba330b, 6ace4df)
- 12/12 theme tests pass
- 362/362 full backend test suite passes (no regressions)