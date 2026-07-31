---
phase: 16-tech-debt-cleanup
plan: 16-02
subsystem: infra
tags: [version, alembic, startup-migration, react-state, config-truth, vite]

# Dependency graph
requires:
  - phase: 16-tech-debt-cleanup
    provides: "TD-05 batch-mode migration repair (render_as_batch=True in env.py, migration 8a258d50ee87 fixed) — guarantees the fresh-DB upgrade head path that TD-06 relies on"
provides:
  - "GET /api/version public endpoint returning {version, name} from config.yaml (single source of truth)"
  - "ApiClient.getVersion() + Sidebar runtime version fetch with 0.0.0 fallback"
  - "AUTO_MIGRATE-gated programmatic alembic upgrade head in startup (before init_db), skipped under pytest"
  - "ChefWishesPage modal targets + actingId cleared in finally before the reload await (stale-state residue closed)"
affects: [16-04 (TD-10 no-undef: vite define block removal eliminates the process reference), deployments (auto-migrate on startup)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Programmatic Alembic via command.upgrade(Config, 'head') in asyncio.to_thread inside a startup handler"
    - "Config.set_main_option('sqlalchemy.url', settings.DATABASE_URL) to pin the migration target independent of CWD"
    - "Env-gated startup work: AUTO_MIGRATE default-on, double-guarded by PYTEST_CURRENT_TEST detection"
    - "Runtime config fetch with safe fallback replacing build-time Vite define injection"

key-files:
  created:
    - backend/tests/test_version.py
  modified:
    - backend/app/main.py
    - frontend/src/api/client.js
    - frontend/src/components/composites/Sidebar.jsx
    - frontend/vite.config.js
    - frontend/src/pages/ChefWishesPage.jsx

key-decisions:
  - "Version source moved server-side to config.yaml (via GET /api/version) — eliminates the stale package.json build-time injection chain; 0.0.0 fallback keeps the sidebar rendering before/without the API response"
  - "Startup migration uses the programmatic Alembic API (command.upgrade) inside asyncio.to_thread, NOT a subprocess — keeps the event loop free during batch table rebuilds and avoids shell-escape concerns"
  - "AUTO_MIGRATE default-on for production, double-gated by PYTEST_CURRENT_TEST so the test ASGITransport never triggers migrations; failures are warn-and-continue (init_db still runs)"
  - "Modal-target clears moved INTO finally and ordered before the reload await — a guard-blocked or failing wish action can never strand actingId or leave a stale advance/reject target"

patterns-established:
  - "Pattern: public metadata endpoints (/api/health, /api/version) return only non-sensitive data and require no auth — needed pre-login by the SPA"
  - "Pattern: programmatic Alembic in startup pins sqlalchemy.url to settings.DATABASE_URL via set_main_option so a foreign alembic.ini cannot redirect the migration target"
  - "Pattern: all state resets in a finally block execute BEFORE any await that could reject — prevents permanently-stuck UI state when the reload throws"

requirements-completed: [TD-02, TD-06, TD-08]

# Metrics
duration: ~3min
completed: 2026-07-31
---

# Phase 16 Plan 16-02: Medium Tech-Debt Fixes Summary

**Closed the three medium-weight debt items: TD-02 (config.yaml as single version source via a public GET /api/version endpoint + runtime Sidebar fetch, removing the stale Vite build-time injection), TD-06 (programmatic AUTO_MIGRATE-gated alembic upgrade head in startup before init_db, skipped under pytest), and TD-08 (ChefWishesPage stale modal-target/actingId residue — modal clears moved into finally and reordered before the reload await).**

## Performance

- **Duration:** ~3 min
- **Tasks:** 3 (all executed in a single atomic fix commit)
- **Files modified:** 5 source + 1 new test

## Accomplishments
- TD-02: Added `GET /api/version` (public, no auth — returns `{"version": settings.APP_VERSION, "name": settings.APP_NAME}`); added `ApiClient.getVersion()`; Sidebar now fetches the version at runtime in a `useEffect` with a `'0.0.0'` fallback (lint-clean `.then().catch({})` shape, empty deps); removed the `define: { 'import.meta.env.VITE_APP_VERSION': ... }` block from vite.config.js (Sidebar was the only consumer). config.yaml `app.version: "0.1.0"` is now the single source of truth.
- TD-06: Added `_run_migrations()` module-level sync function that builds an Alembic `Config` pinned to `settings.DATABASE_URL` (via `set_main_option`, ignoring CWD) and calls `command.upgrade(cfg, "head")`. The startup handler now runs `await asyncio.to_thread(_run_migrations)` BEFORE `await init_db()`, env-gated by `AUTO_MIGRATE` (default `"1"`) and skipped when `PYTEST_CURRENT_TEST` is set. Failures are warn-and-continue (consistent with the model-download pattern). The old NOTE(07-04) manual-migration comment is gone.
- TD-08: In all three ChefWishesPage handlers (`handleClaim`, `handleAdvance`, `handleReject`), `setActingId(null)` now executes BEFORE `await loadWishes(...)` in the `finally` block; `setAdvanceTarget(null)` / `setRejectTarget(null)` were moved out of `try` INTO `finally`. A guard-blocked or failing action can no longer leave a stuck actingId or a surviving modal target.

## Task Commits

This plan used a single atomic fix commit for all three tasks (the plan is autonomous, wave-1, single-repo):

1. **Tasks 1-3: TD-02/06/08 medium fixes** — `9a7c672` (fix)

**Plan metadata:** this SUMMARY commit (docs) — to follow.

## Files Created/Modified
- `backend/app/main.py` — added `pathlib.Path` / `alembic.command` / `alembic.config.Config` imports; added `_run_migrations()` function; replaced the NOTE(07-04) block with the env-gated `asyncio.to_thread(_run_migrations)` call before `init_db()`; added `GET /api/version` endpoint.
- `backend/tests/test_version.py` (new) — `test_version_endpoint` asserts `GET /api/version` returns 200 with `version == settings.APP_VERSION` and `name == settings.APP_NAME`.
- `frontend/src/api/client.js` — added `getVersion()` method in the new `Version` section.
- `frontend/src/components/composites/Sidebar.jsx` — replaced the build-time `APP_VERSION` const with `useState('0.0.0')` + a `useEffect` runtime fetch; updated the D-NAV03-01 comment; render now shows `v{appVersion}`.
- `frontend/vite.config.js` — removed the `define: { ... }` block (also closes one TD-10 `no-undef` error for `process`).
- `frontend/src/pages/ChefWishesPage.jsx` — reordered the three `finally` blocks: state resets (`setActingId(null)` + modal-target clears) now run before `await loadWishes(...)`; `setAdvanceTarget(null)` / `setRejectTarget(null)` moved from `try` to `finally`.

## Decisions Made
- **Programmatic Alembic over subprocess:** `command.upgrade` in `asyncio.to_thread` keeps the event loop free and avoids shell-escape concerns; the URL is pinned via `set_main_option` so CWD differences or a foreign alembic.ini cannot redirect the migration target (threat T-16-02-T mitigated).
- **Double env gate:** `AUTO_MIGRATE` default-on (`"1"`) for production plus a `PYTEST_CURRENT_TEST` hard-skip so the test `ASGITransport`/`TestClient` never fires migrations — verified with a logic check across all three scenarios (pytest / production / AUTO_MIGRATE=0).
- **Warn-and-continue on migration failure:** consistent with the existing model-download failure pattern (`main.py:202-206`); `init_db()` still runs so `create_all` covers any missing tables. Startup stays observable.
- **0.0.0 fallback retained:** the Sidebar must render before/without the API response, so the version string falls back to `0.0.0` rather than blank.

## Deviations from Plan

None — plan executed exactly as written. One process note (not a deviation): the user's commit instruction said `git add -A`, but the working tree contained an unrelated pre-existing modification to `frontend/src/components/primitives/Card.css` (`width: 100%`) that this plan does not touch. Per the scope-boundary rule, only the 6 task-related files were staged individually (`git add <files>`), leaving the Card.css change and the untracked GSD tooling/test-artifact files untouched.

## Issues Encountered
None. All verification commands from the plan's `<verification>` section passed:
- `pytest tests/test_version.py -q` → 1 passed
- `npx eslint src/api/client.js src/components/composites/Sidebar.jsx src/pages/ChefWishesPage.jsx` → 0 errors (exit 0)
- `grep AUTO_MIGRATE backend/app/main.py` → gate present (2 occurrences: comment + condition)
- `python -c "from app.main import _run_migrations; _run_migrations()"` → idempotent (no-op at head)
- `grep -n 'setActingId(null)' ChefWishesPage.jsx` → 3 occurrences (lines 229, 247, 266), each in `finally` before the `loadWishes` await; `setAdvanceTarget(null)` / `setRejectTarget(null)` each 1 occurrence in `finally`
- vite.config.js `define:` key removed (only `defineConfig` function name remains)
- Frontend production build (`npm run build`) → success (exit 0)
- Env-gate logic verified across pytest / production / AUTO_MIGRATE=0 scenarios

## User Setup Required
None. `AUTO_MIGRATE` defaults to on; operators who want to disable startup migrations set `AUTO_MIGRATE=0` (the warn-and-continue message prints the manual fallback command `cd backend && uv run alembic upgrade head`).

## Next Phase Readiness
- The vite.config.js `define` block removal also eliminates one TD-10 `no-undef` error (`process`) — partial overlap noted in the plan.
- TD-05 (16-01) guarantees the fresh-DB `alembic upgrade head` path that TD-06 relies on; together they close the "fresh deployment" gap.
- All frontend changes remain lint-clean; the frontend lint baseline is preserved.

## Self-Check: PASSED

- Files verified on disk:
  - FOUND: backend/app/main.py (GET /api/version + _run_migrations + AUTO_MIGRATE gate)
  - FOUND: backend/tests/test_version.py (test_version_endpoint present)
  - FOUND: frontend/src/api/client.js (getVersion() present)
  - FOUND: frontend/src/components/composites/Sidebar.jsx (runtime fetch, no import.meta.env.VITE_APP_VERSION)
  - FOUND: frontend/vite.config.js (define block removed)
  - FOUND: frontend/src/pages/ChefWishesPage.jsx (3 setActingId(null) in finally; modal clears in finally)
- Commits verified:
  - FOUND: 9a7c672 (fix(16-02): TD-02/06/08 medium fixes)

---
*Phase: 16-tech-debt-cleanup*
*Completed: 2026-07-31*
