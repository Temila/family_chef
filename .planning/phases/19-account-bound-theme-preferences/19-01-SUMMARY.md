---
phase: 19-account-bound-theme-preferences
plan: 01
subsystem: api
tags: [fastapi, sqlalchemy, alembic, pydantic-v2, sqlite, theme-preferences]

# Dependency graph
requires:
  - phase: 17-theme-system-foundation-engine-page-presets-persistence
    provides: CustomTheme model + service + router pattern mirrored for UserThemePreferences
provides:
  - "UserThemePreferences SQLAlchemy model (user_id PK + FK CASCADE + 4 fields + updated_at)"
  - "Alembic migration a3b4c5d6e7f8 (new head; down_revision=3bec850ed472)"
  - "GET /api/users/me/theme-preferences (404 when none, JWT-protected)"
  - "PUT /api/users/me/theme-preferences (upsert, server LWW whole-replace D-A1)"
  - "Pydantic V2 schemas with hemisphere/season/sourceColors validation + auto-fill season map"
  - "UserThemePreferencesService singleton (get_or_404 + upsert)"
affects: [19-account-bound-theme-preferences, theme-context-frontend-dual-write]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-row-per-user table keyed by user_id PK (not autoincrement) for 1:1 preferences"
    - "Pydantic V2 RootModel[dict] for season→theme map with model_validator"
    - "model_dump(mode='json') on nested pydantic models when assigning to JSON DB columns"

key-files:
  created:
    - backend/app/models/user_theme_preferences.py
    - backend/app/schemas/user_theme_preferences.py
    - backend/app/services/user_theme_preferences_service.py
    - backend/alembic/versions/a3b4c5d6e7f8_add_user_theme_preferences_table.py
    - backend/tests/test_user_theme_preferences.py
  modified:
    - backend/app/models/__init__.py
    - backend/app/routers/users.py
    - backend/tests/conftest.py

key-decisions:
  - "Single-row-per-user: user_id as PK (autoincrement=False), no separate id column — enforces 1:1 at schema level (D-A7)"
  - "GET returns 404 when no preferences exist (over null payload) so client can explicitly trigger D-A5 first-login migration upload"
  - "ActiveThemePayload accepts full {id,name,sourceColors,variant,kind} object to round-trip frontend fc_active_theme verbatim"
  - "season_theme_map auto-filled with black default (#000000) when omitted in PUT — server always persists complete map"
  - "Endpoints appended to existing /api/users router; main.py unchanged (router already registered at /api/users prefix)"

patterns-established:
  - "1:1 per-user preferences table: FK user_id as PK + ON DELETE CASCADE + updated_at LWW timestamp"
  - "Server LWW upsert: upsert service method replaces all fields wholesale (no field-level merge)"
  - "Nested Pydantic model → JSON column: use model_dump(mode='json') to serialize before DB assignment"

requirements-completed: [D-A7]

# Metrics
duration: 5min
completed: 2026-08-07
---

# Phase 19 Plan 01: Account-Bound Theme Preferences Backend Summary

**Server-side persistence layer for per-user theme preferences — UserThemePreferences model + Alembic migration + Pydantic V2 schemas + service + JWT-protected GET/PUT endpoints at /api/users/me/theme-preferences (server LWW, 1 row/user, FK CASCADE)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-07T05:27:51Z
- **Completed:** 2026-08-07T05:32:23Z
- **Tasks:** 3
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments
- `user_theme_preferences` table with exactly the D-A7 schema: user_id PK + FK CASCADE, active_theme JSON, season_enabled BOOL default 0, hemisphere VARCHAR(8) default 'north', season_theme_map JSON, updated_at TIMESTAMP
- Reversible Alembic migration (a3b4c5d6e7f8) — round-trip upgrade/downgrade/upgrade verified
- GET 404 + PUT 200 upsert endpoints under existing /api/users router (main.py untouched)
- Server LWW structurally enforced: PUT replaces entire payload, no merge fields exposed (D-A1)
- Pydantic V2 validation: hemisphere ∈ {north,south}, season keys ⊆ {spring,summer,autumn,winter}, sourceColors.primary/secondary/tertiary required non-empty
- 9 backend tests covering 401/404/422/upsert/isolation/cascade-delete — all pass, zero regression in test_themes.py

## Task Commits

Each task was committed atomically:

1. **Task 1: UserThemePreferences model + Alembic migration** - `33f5549` (feat)
2. **Task 2: Pydantic schemas + service + router endpoints** - `c502ebe` (feat)
3. **Task 3: Backend tests + conftest integration** - `0c0c2bd` (test)

## Files Created/Modified
- `backend/app/models/user_theme_preferences.py` - UserThemePreferences SQLAlchemy model (user_id PK + FK CASCADE + 4 fields + updated_at)
- `backend/app/schemas/user_theme_preferences.py` - Pydantic V2 schemas (ActiveThemePayload, SeasonThemeMapPayload, Update, Response) with validators
- `backend/app/services/user_theme_preferences_service.py` - UserThemePreferencesService singleton (get_or_404 + upsert)
- `backend/app/routers/users.py` - GET + PUT /me/theme-preferences endpoints appended
- `backend/alembic/versions/a3b4c5d6e7f8_add_user_theme_preferences_table.py` - Migration (create table + updated_at index)
- `backend/app/models/__init__.py` - Export UserThemePreferences (alphabetical)
- `backend/tests/conftest.py` - Import model in setup_database + add table to clean_all_tables
- `backend/tests/test_user_theme_preferences.py` - 9 tests (401/404/422/upsert/isolation/cascade)

## Decisions Made
- **404 over null payload for GET:** Chose 404 when no preferences exist (per CONTEXT D-A7 agent discretion) so the client can explicitly trigger the D-A5 first-login migration upload path — more explicit than a null payload.
- **Full theme object round-trip:** `ActiveThemePayload` includes `id/name/variant/kind` beyond the explicit `sourceColors` so the frontend `fc_active_theme` object round-trips verbatim through PUT→GET without field loss.
- **Auto-fill season_theme_map:** When PUT omits `season_theme_map`, the schema validator fills all four seasons with a black-default (#000000) theme — guaranteeing the DB always stores a complete map, so GET never returns a partial structure.
- **Endpoints on users router:** Appended GET/PUT to existing `routers/users.py` rather than creating a new router file — D-A7's `/api/users/me/theme-preferences` URL shape maps naturally to the users resource, and `main.py` already registers the `/api/users` prefix.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `alembic upgrade head` initially reported "table already exists" because the dev DB (`data/family_chef.db`) had the table created by app startup's `Base.metadata.create_all`. Resolved by `alembic stamp head` then performing the downgrade/upgrade round-trip to prove reversibility — this is a dev-environment artifact, not a migration defect. The migration's CREATE TABLE SQL (shown in the error output) matches D-A7 exactly.
- `ruff` and `pytest` are not installed in the default venv (they live in the `dev` extra). Used `uv run --extra dev python -m pytest` to run tests; lint was verified via Python import + schema validation instead.

## User Setup Required
None - no external service configuration required. Backend-only plan; migration runs via existing `alembic upgrade head` on app startup.

## Next Phase Readiness
- Plan 02 (frontend dual-write: localStorage + PUT, login-fetch, first-login-migration, logout cleanup) now has a complete server to call.
- GET 404 → PUT migration upload contract (D-A5) is established and tested.
- All D-A7 fields are persisted; the frontend `fc_*` localStorage keys can be mirrored to/from the server 1:1.

---
*Phase: 19-account-bound-theme-preferences*
*Completed: 2026-08-07*
