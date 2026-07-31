---
phase: 16-tech-debt-cleanup
plan: 16-01
subsystem: infra
tags: [cors, alembic, sqlite, batch-migration, config, deep-link, react-router]

# Dependency graph
requires:
  - phase: 14-ui-bugfix-filter-popup
    provides: "TD-01 override record awaiting operator sign-off (the ::before → padding-left substitution)"
  - phase: 06-system-logs
    provides: "Migration 8a258d50ee87 (the SQLite-incompatible raw ALTER that needed batch-mode repair)"
provides:
  - "Signed TD-01 override record (operator accepted the padding-left substitute for th::before)"
  - "Hardened CORS_ORIGINS fallback default (dev origins, never [\"*\"])"
  - "Explicit app.url key for Feishu deep-link construction"
  - "SQLite-compatible batch-mode migration 8a258d50ee87 + render_as_batch=True in env.py (unblocks TD-06)"
  - "Encoded wish deep-link redirect (encodeURIComponent(id))"
affects: [16-02 (TD-06 startup migrations depend on TD-05 batch fix), feishu deep-link consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Alembic batch_alter_table for SQLite constraint DDL (copy-and-move table rebuild)"
    - "render_as_batch=True in both offline+online context.configure sites"
    - "encodeURIComponent on route-param-derived query strings to prevent param injection"

key-files:
  created: []
  modified:
    - config.yaml
    - config.example.yaml
    - backend/app/config.py
    - backend/tests/test_datetime_utils.py
    - backend/alembic/env.py
    - backend/alembic/versions/8a258d50ee87_phase_6_add_system_logs_indexes.py
    - frontend/src/App.jsx
    - .planning/archived/v1.3/14-ui-bugfix-filter-popup/14-VERIFICATION.md

key-decisions:
  - "CORS fallback hardened to dev origins rather than a permissive wildcard — [\"*\"] + allow_credentials=True is an invalid Starlette combination that crashes startup and is insecure for deployments missing the cors: section"
  - "config.yaml edited on disk but left gitignored (contains real dev secret_key); config.example.yaml carries the tracked template change for new-deployment parity"
  - "Migration edit limited to 8a258d50ee87 only — touching other already-applied migrations would increase regression surface"
  - "TD-01 override accepted: th:first-child padding-left substitute satisfies the SC2 intent; the literal ::before pseudo-element is deliberately gone"

patterns-established:
  - "Pattern: SQLite ALTER operations (constraints, column types) must use op.batch_alter_table — raw op.create_unique_constraint / op.alter_column raise NotImplementedError on SQLite"
  - "Pattern: render_as_batch=True in env.py both offline+online configure sites so future autogenerate output is batch-safe"
  - "Pattern: encode any route-param value flowing into a query string via encodeURIComponent to prevent &-separated param injection"

requirements-completed: [TD-01, TD-03, TD-04, TD-05, TD-07]

# Metrics
duration: ~15min
completed: 2026-07-31
---

# Phase 16 Plan 16-01: Quick Tech-Debt Fixes Summary

**Closed 5 accumulated tech-debt items with minimal diffs: TD-01 operator sign-off, TD-03 CORS wildcard hardening, TD-04 explicit app.url, TD-05 SQLite batch-mode migration repair, and TD-07 deep-link param encoding.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 4 (Task 1 was completed by the orchestrator before this execution; Tasks 2-4 executed here)
- **Files modified:** 7 source + 1 verification record (config.yaml edited on disk but gitignored)

## Accomplishments
- TD-01: Operator accepted the override record — the `th:first-child` padding-left substitute satisfies SC2's intent; the literal `::before` pseudo-element is gone for good.
- TD-03: CORS `["*"]` fallback removed; Settings now defaults to `["http://localhost:5173", "http://localhost:3000"]` when the `cors:` section is absent — eliminates the Starlette `allow_credentials=True` + wildcard assertion crash and hardens the default for minimal deployments.
- TD-04: `app.url` key added to both config.yaml (on disk) and config.example.yaml (tracked); the existing `APP_URL` getter in config.py already consumes it for Feishu deep links.
- TD-05: Migration `8a258d50ee87` converted to `op.batch_alter_table` (upgrade AND downgrade mirrored); `render_as_batch=True` added to both `context.configure` sites in env.py. Fresh-DB `alembic upgrade head` from base now succeeds (verified with backup/restore of the dev DB) — unblocks TD-06.
- TD-07: `WishDeepLinkRedirect` now encodes `id` via `encodeURIComponent(id)` — prevents wish-id query-param injection.

## Task Commits

This plan used a single atomic fix commit for Tasks 2-4 (Task 1 was a docs-only checkpoint handled by the orchestrator):

1. **Task 1: TD-01 operator sign-off** — handled by orchestrator (14-VERIFICATION.md frontmatter filled: `accepted_by: "operator"`, `accepted_at: "2026-07-30T10:10:00Z"`); not part of this executor's commit.
2. **Tasks 2-4: TD-03/04/05/07 quick fixes** — `09e59cc` (fix)

**Plan metadata:** this SUMMARY commit (docs) — to follow.

## Files Created/Modified
- `config.yaml` (on-disk, gitignored) — added `app.url: "https://family-chef.app"` with Chinese inline comment under the `app:` section.
- `config.example.yaml` — same `app.url` addition (tracked template parity).
- `backend/app/config.py` — `CORS_ORIGINS` fallback changed from `["*"]` to dev origins with Chinese explanatory comment.
- `backend/tests/test_datetime_utils.py` — added `test_cors_origins_defaults_to_dev_origins` regression test.
- `backend/alembic/versions/8a258d50ee87_phase_6_add_system_logs_indexes.py` — wrapped `uq_user_ingredient_pref` constraint create/drop in `op.batch_alter_table('taste_preferences')` blocks (upgrade + downgrade).
- `backend/alembic/env.py` — added `render_as_batch=True` to both `context.configure` calls (offline `run_migrations_offline` + online `do_run_migrations`).
- `frontend/src/App.jsx` — `WishDeepLinkRedirect` Navigate target now uses `encodeURIComponent(id)`.
- `.planning/archived/v1.3/14-ui-bugfix-filter-popup/14-VERIFICATION.md` — TD-01 override signed by operator (orchestrator's commit, not this executor's).

## Decisions Made
- **CORS fallback choice:** dev origins (`localhost:5173`, `localhost:3000`) over wildcard. Rationale: matches the explicit origins already in config.yaml, is safe for `allow_credentials=True`, and forces operators deploying without a `cors:` section to confront the default explicitly.
- **Migration scope:** only `8a258d50ee87` edited. Other already-applied migrations left untouched to minimize regression surface.
- **config.yaml handling:** edited on disk so the running dev instance picks up `app.url`, but left gitignored (real secret_key present); `config.example.yaml` is the tracked change for new deployments.

## Deviations from Plan

None — plan executed exactly as written. The only environmental note is that `config.yaml` is gitignored in this repo, so its on-disk edit is correct but not committable; the tracked `config.example.yaml` carries the change for new-deployment parity, which matches the plan's threat model (T-16-01-T accepted: operator replaces placeholder URL at deploy time).

## Issues Encountered
None. All verification commands from the plan's `<verification>` section passed on the first run:
- `app.url` present in both YAMLs (2 hits)
- `["*"]` wildcard fallback gone from config.py (0 hits)
- `render_as_batch=True` count = 2 (both env.py sites)
- `with op.batch_alter_table` count = 2 (upgrade + downgrade)
- `alembic upgrade head` from fresh DB succeeded (backup restored)
- `encodeURIComponent(id)` present; `npx eslint src/App.jsx` → 0 errors

## User Setup Required
None — no external service configuration. Deploy-time note only: replace `app.url: "https://family-chef.app"` with the actual public URL (the inline Chinese comment instructs this).

## Next Phase Readiness
- TD-05 batch-mode fix is in place → TD-06 (Plan 16-02: startup migrations) is unblocked.
- CORS hardening + app.url make the config layer safe for the TD-06 startup path.
- App.jsx remains lint-clean; the encodeURIComponent change preserves the frontend lint baseline.

## Self-Check: PASSED

- Files verified on disk:
  - FOUND: config.example.yaml (app.url present)
  - FOUND: backend/app/config.py (hardened CORS fallback)
  - FOUND: backend/tests/test_datetime_utils.py (new test present)
  - FOUND: backend/alembic/env.py (render_as_batch=True x2)
  - FOUND: backend/alembic/versions/8a258d50ee87_phase_6_add_system_logs_indexes.py (batch_alter_table x2)
  - FOUND: frontend/src/App.jsx (encodeURIComponent(id) present)
- Commits verified:
  - FOUND: 09e59cc (fix(16-01): TD-03/04/05/07 quick fixes)

---
*Phase: 16-tech-debt-cleanup*
*Completed: 2026-07-31*
