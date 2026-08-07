---
phase: 19-account-bound-theme-preferences
verified: 2026-08-07T14:30:00Z
status: gaps_found
score: 7/10 must-haves verified
overrides_applied: 0
re_verification: false
gaps:
  - truth: "Migration is reversible; on user delete, the row is cascade-deleted (FK ON DELETE CASCADE)"
    status: failed
    reason: "ON DELETE CASCADE never fires in production. SQLite does not enforce FKs unless PRAGMA foreign_keys=ON is set per connection; backend/app/database.py has NO connect event listener (only PRAGMA journal_mode=WAL). Isolated repro on a fresh :memory: engine (no test harness) confirmed PRAGMA foreign_keys=0 and the preferences row was ORPHANED (count stayed 1) after hard-deleting the user. The phase's cascade-delete test is a FALSE POSITIVE: it passes only because conftest.clean_all_tables toggles PRAGMA foreign_keys OFF then ON (lines 69, 108) on the shared :memory: connection, and that pragma state persists into the test's own session. This same defect orphans every ondelete=CASCADE FK in the schema (custom_themes, orders, etc.), not just user_theme_preferences."
    artifacts:
      - path: backend/app/database.py
        issue: "No @event.listens_for(engine, 'connect') listener to run PRAGMA foreign_keys=ON; only WAL pragma present (line 22). Production connections default to foreign_keys=0."
      - path: backend/tests/conftest.py
        issue: "clean_all_tables toggles PRAGMA foreign_keys OFF (line 69) then ON (line 108); the ON state leaks into subsequent test sessions, masking the cascade test (test_user_theme_preferences.py:159-188)."
    missing:
      - "Add @event.listens_for(engine, 'connect') in backend/app/database.py that executes PRAGMA foreign_keys=ON on every new SQLite connection (production engine)."
      - "Add the same listener on test_engine.sync_engine in conftest.py and REMOVE the pragma toggles at lines 69 and 108 so the test validates real behavior, not harness state."
      - "Re-run test_cascade_delete_on_user_delete on a fresh engine to confirm the cascade genuinely works after the fix."
  - truth: "Logged-in users: theme preference setters dual-write to localStorage AND debounced-PUT to /api/users/me/theme-preferences (D-A1, D-A4)"
    status: failed
    reason: "skipNextPutRef.current = true is set in the 404 first-login-migration branch (theme-context.jsx:395) even though that branch contains ZERO setState calls (verified: only localStorage reads + upload PUT). The skip flag is therefore never consumed by the 404 flow and persists until the user's NEXT legitimate state change re-runs the debounced-PUT effect (lines 306-334). That effect sees skipNextPutRef=true, resets it to false, and returns early WITHOUT making the PUT — so the user's first theme change after first-login migration is silently NOT persisted to the server until a second change (whose full-state PUT happens to carry the lost value). The inline comment at line 404 ('后续 debounced PUT 会重试') is FALSE: the skip flag suppresses the very next debounced PUT. Breaks D-A1 dual-write contract for the first post-migration interaction."
    artifacts:
      - path: frontend/src/theme/theme-context.jsx
        issue: "Line 395 sets skipNextPutRef.current = true inside the err.status===404 branch, which has no preceding/following setState — the flag is meaningless here and leaks. The 200-branch skip at line 375 is correct (4 setState calls would echo back); the 404-branch skip is the defect."
    missing:
      - "Remove skipNextPutRef.current = true from the 404 branch (theme-context.jsx:395). The flag is only meaningful on the 200 path where setState would otherwise echo back; on 404 no state mutates so no suppression is needed."
  - truth: "On logout, removeItem 4 fc_* keys AND reset theme-context state to DEFAULT_PRESET / false / north / default map; preserve fc_theme + fc_last_season (D-A6)"
    status: partial
    reason: "The logout branch (theme-context.jsx:417-420) correctly calls localStorage.removeItem on all 4 keys and never touches fc_theme/fc_last_season. BUT the deferred setActiveThemeState(DEFAULT_PRESET) (line 422, inside queueMicrotask) re-runs the injectThemeCss effect (lines 294-303), which UNCONDITIONALLY calls writeActiveThemeToStorage(activeTheme) (line 298) — re-creating fc_active_theme with DEFAULT_PRESET within a microtask of being removed, whenever the logging-out user had a non-default active theme (different object ref than DEFAULT_PRESET). The other 3 keys (fc_season_enabled/fc_hemisphere/fc_season_theme_map) are correctly removed and stay removed. Functional impact is minimal (FOUC bootstrap renders DEFAULT_PRESET identically for null and default JSON) but the spec deviation is real and UAT-detectable (manual logout check will find fc_active_theme present, not absent)."
    artifacts:
      - path: frontend/src/theme/theme-context.jsx
        issue: "injectThemeCss effect (line 298) calls writeActiveThemeToStorage(activeTheme) unconditionally on every activeTheme change; the logout state reset triggers it, re-creating fc_active_theme."
    missing:
      - "Gate the storage write in the injectThemeCss effect on user presence: change line 298 to `if (user?.id) writeActiveThemeToStorage(activeTheme);` and add user?.id to the effect deps so logout's reset does not re-write the key."
---

# Phase 19: Account-Bound Theme Preferences Verification Report

**Phase Goal:** Persist per-user theme preferences server-side so a logged-in user's theme (active theme, season toggle, hemisphere, season-theme map) follows them across devices; wire the frontend to dual-write (localStorage + server) and hydrate on login.
**Verified:** 2026-08-07T14:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | GET /api/users/me/theme-preferences returns persisted row / 404 when none / 401 unauthenticated | ✓ VERIFIED | `routers/users.py:209-225` — `get_or_404` raises ValueError→404; `Depends(get_current_user_from_token)`→401. Tests `test_get_returns_404_when_none`, `test_unauthenticated_get_returns_401` pass. |
| 2 | PUT upserts (1 row/user); server LWW replaces entire payload (D-A1, D-A7) | ✓ VERIFIED | `user_theme_preferences_service.py:30-70` — SELECT then INSERT/UPDATE, replaces all 4 fields wholesale (no field merge). `test_put_upsert_no_duplicate_row` confirms 1 row stays after 2 PUTs. |
| 3 | Payload validates hemisphere ∈ {north,south}, season keys, active_theme {id,name,sourceColors,variant,kind} | ✓ VERIFIED | `schemas/user_theme_preferences.py` — `field_validator('hemisphere')` + `SeasonThemeMapPayload` enforces 4 season keys + `ActiveThemePayload` requires sourceColors.primary/secondary/tertiary. Behavioral check: hemisphere='east'→422, missing sourceColors→422, full object round-trips. |
| 4 | Unauthenticated PUT/GET returns 401; cross-user access structurally impossible (key=user_id from JWT) | ✓ VERIFIED | Both endpoints use `current_user.id` (JWT); no user_id in path/query. `test_user_isolation` confirms user2 GET→404 for user1's row. |
| 5 | Migration reversible; on user delete, row cascade-deleted (FK ON DELETE CASCADE) | ✗ FAILED | Migration round-trip (upgrade/downgrade/re-upgrade) PASSES. BUT cascade FAILS in production: isolated repro on fresh engine (no test harness) → `PRAGMA foreign_keys=0`, preferences row ORPHANED after user delete. Test is false positive (conftest pragma toggling masks it). See Gap 1. |
| 6 | Logged-in users: setters dual-write localStorage AND 200ms debounced PUT (D-A1, D-A4) | ✗ FAILED | Debounced PUT effect exists (theme-context.jsx:306-334), gated on `user && preferencesLoadedRef`, 200ms setTimeout. BUT `skipNextPutRef.current=true` at line 395 (404 branch, no setState) leaks and suppresses the user's NEXT legitimate debounced PUT — first post-migration change not persisted. See Gap 2. |
| 7 | On login, GET; 200 hydrates state+localStorage, 404 uploads local (D-A5) | ✓ VERIFIED | `refreshThemePreferences` (theme-context.jsx:371-410): 200 path hydrates 4 state vars + writes 4 localStorage keys (lines 379-386); 404 path reads local + calls `api.updateThemePreferences` (lines 389-405). Upload works; CR-02 skip-flag side-effect tracked under Truth 6. |
| 8 | On logout, removeItem 4 fc_* keys + reset state; preserve fc_theme + fc_last_season (D-A6) | ⚠️ PARTIAL | Logout branch (lines 417-420) removes all 4 keys; never touches fc_theme/fc_last_season. BUT deferred `setActiveThemeState(DEFAULT_PRESET)` re-runs injectThemeCss effect → `writeActiveThemeToStorage` re-creates fc_active_theme. 3 other keys correctly removed. See Gap 3. |
| 9 | Unauthenticated users do NOT see Header ThemeToggle or Palette (D-A2, D-A3) | ✓ VERIFIED | `Header.jsx:99` and `:108` — both IconButtons wrapped in `{user && (...)}`. 3 `user &&` guards total (avatar dropdown pre-existing). |
| 10 | Pre-existing fc_theme and fc_last_season survive login/logout untouched (D-A6) | ✓ VERIFIED | No code path writes or removes fc_theme (legacy) or fc_last_season during login/logout. Constants ACTIVE_THEME_KEY/SEASON_ENABLED_KEY/HEMISPHERE_KEY/SEASON_THEME_MAP_KEY are the only 4 touched. |

**Score:** 7/10 truths verified (2 FAILED, 1 PARTIAL)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `backend/app/models/user_theme_preferences.py` | UserThemePreferences model — user_id PK+FK CASCADE + 4 fields + updated_at | ✓ VERIFIED | Contains `class UserThemePreferences`; user_id PK+FK ondelete=CASCADE; 4 fields + updated_at with onupdate. |
| `backend/app/schemas/user_theme_preferences.py` | Pydantic V2 schemas with validators | ✓ VERIFIED | `UserThemePreferencesUpdate`, `UserThemePreferencesResponse` (from_attributes=True), `ActiveThemePayload`, `SeasonThemeMapPayload`; validators reject bad hemisphere/seasons/sourceColors. |
| `backend/app/services/user_theme_preferences_service.py` | get_or_404 + upsert static methods + singleton | ✓ VERIFIED | `user_theme_preferences_service` singleton; get_or_404 raises ValueError('NOT_FOUND'); upsert inserts/updates wholesale. |
| `backend/app/routers/users.py` | GET + PUT /me/theme-preferences (JWT-protected) | ✓ VERIFIED | Endpoints at lines 209-241; `Depends(get_current_user_from_token)`; no pagination; appended to existing router (main.py unchanged). |
| `backend/alembic/versions/a3b4c5d6e7f8_...py` | Migration: create_table PK+FK CASCADE + index; down_revision=3bec850ed472 | ✓ VERIFIED (reversible) / ⚠ CASCADE unenforced | Round-trip upgrade/downgrade/re-upgrade PASSES. CASCADE declared but NOT enforced in prod (see Gap 1). |
| `frontend/src/api/client.js` | getThemePreferences/updateThemePreferences on bare path; err.status | ✓ VERIFIED | Lines 312-318: `this.get('/users/me/theme-preferences')`, `this.put('/users/me/theme-preferences', payload)` (bare path, no /api double-prefix). err.status at line 58. |
| `frontend/src/theme/theme-context.jsx` | dual-write + login-fetch + logout cleanup + refreshThemePreferences | ✓ EXISTS / ⚠ CR-02 + WR-01 defects | All named symbols present; 3 refs declared; debounced PUT effect + refreshThemePreferences wired. Defects in skipNextPutRef (404) and logout fc_active_theme re-creation. |
| `frontend/src/components/composites/Header.jsx` | ThemeToggle + Palette guarded by `user &&` | ✓ VERIFIED | Lines 99 + 108: `{user && (<IconButton .../>)}` wraps. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `routers/users.py` | `user_theme_preferences_service` | `Depends(get_current_user_from_token)` + `await user_theme_preferences_service.{get_or_404,upsert}` | ✓ WIRED | users.py:219 + :238 call service methods with `current_user.id`. |
| `schemas/user_theme_preferences.py` | `models/user_theme_preferences.py` | `from_attributes=True` + nested validator | ✓ WIRED | `UserThemePreferencesResponse` ConfigDict(from_attributes=True); ActiveThemePayload validates sourceColors. |
| `theme-context.jsx` | `/api/users/me/theme-preferences` | `api.getThemePreferences` / `api.updateThemePreferences` | ✓ WIRED (with CR-02 defect) | refreshThemePreferences GET (line 374); debounced PUT effect (line 317). Skip-flag leak degrades but does not break wiring. |
| `Header.jsx` | `useAuth().user` | `user &&` conditional render | ✓ WIRED | 3 guards present (2 new + 1 pre-existing avatar). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| GET /me/theme-preferences response | `UserThemePreferencesResponse` | DB row via `get_or_404` (SELECT) | ✓ Yes — real DB query | ✓ FLOWING |
| PUT /me/theme-preferences response | upsert return | payload→DB (INSERT/UPDATE) | ✓ Yes — real DB write | ✓ FLOWING |
| theme-context refreshThemePreferences (200) | server.* fields | `api.getThemePreferences()` fetch | ✓ Yes — real HTTP call to DB-backed endpoint | ✓ FLOWING |
| theme-context debounced PUT effect | serializeActiveTheme(activeTheme) | `api.updateThemePreferences()` | ✓ Yes — real HTTP call | ✓ FLOWING (but 1st post-404 PUT dropped by CR-02) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Schema rejects bad hemisphere | `UserThemePreferencesUpdate(... hemisphere='east')` | ValidationError raised | ✓ PASS |
| Schema rejects missing sourceColors | `UserThemePreferencesUpdate(active_theme={sourceColors:{primary}})` | ValidationError raised | ✓ PASS |
| Schema auto-fills season_theme_map | valid payload with omitted map | all 4 season keys filled | ✓ PASS |
| Full active_theme round-trips | {id,name,sourceColors,variant,kind} | preserved in model_dump | ✓ PASS |
| Migration upgrade→downgrade→upgrade | `alembic upgrade head; downgrade -1; upgrade head` | all 3 succeed | ✓ PASS |
| Frontend lint clean | `npm run lint -- --quiet` | exit 0, no output | ✓ PASS |
| Frontend build succeeds | `npm run build` | exit 0, dist emitted | ✓ PASS |
| **Cascade delete in PRODUCTION-style engine** | isolated :memory: engine, no FK pragma listener, DELETE user | `PRAGMA foreign_keys=0`, **row ORPHANED (count=1)** | ✗ **FAIL (CR-01)** |
| Backend test suite (with harness) | `pytest tests/test_user_theme_preferences.py -v` | 9/9 pass (incl. cascade — false positive) | ✓ PASS (but cascade test invalid) |
| test_themes.py regression | `pytest tests/test_themes.py -q` | 13/13 pass | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` probes declared for this phase and success criteria do not reference runnable stage markers.

### Requirements Coverage

D-A1..D-A7 are CONTEXT decision IDs (ROADMAP Phase 19 "Requirements: TBD"; these decision IDs serve as the phase's requirement traceability per PLAN frontmatter).

| Requirement | Source Plan | Decision | Status | Evidence |
| ----------- | ---------- | -------- | ------ | -------- |
| D-A1 | 19-01, 19-02 | Server LWW (whole-replace) + dual-write | ⚠️ PARTIAL | Backend LWW wholesale-replace VERIFIED. Frontend dual-write present but CR-02 drops 1st post-migration PUT. |
| D-A2 | 19-02 | Hide theme entry when unauthenticated | ✓ SATISFIED | Header.jsx user guards on ThemeToggle + Palette. |
| D-A3 | 19-02 | No anonymous preference path | ✓ SATISFIED | No write path when !user; debounced PUT gated on user. |
| D-A4 | 19-02 | Login silent GET, brief inconsistency accepted, fetch failure silent | ✓ SATISFIED | refreshThemePreferences silent; catch blocks swallow without toast. |
| D-A5 | 19-02 | First-login 404 → upload localStorage | ✓ SATISFIED | 404 branch reads 4 keys + calls updateThemePreferences. (CR-02 is the skip-flag side effect, tracked under D-A1.) |
| D-A6 | 19-02 | Logout removes 4 fc_* keys, preserves fc_theme + fc_last_season | ⚠️ PARTIAL | 3 keys removed correctly; fc_active_theme re-created by injectThemeCss effect (WR-01). |
| D-A7 | 19-01 | Single-row table + GET/PUT + validators | ⚠️ PARTIAL | Schema/endpoints/validators VERIFIED; CASCADE unenforced in production (CR-01). |

### ROADMAP Success Criteria Coverage

| # | Criterion | Status | Evidence |
| - | --------- | ------ | -------- |
| 1 | 后端持久化活动主题/季节开关/半球/季节映射（DB 为真相源）；跨设备一致 | ⚠️ PARTIAL | Backend persists all 4 fields (GET/PUT work, tested). Cross-device consistency degraded by CR-02 (first post-migration change not synced) + CR-01 (orphaned rows on user delete). |
| 2 | FOUC 首帧引导仍能确定首帧主题（localStorage 缓存，零网络）；登录后异步校准 | ✓ VERIFIED | fouc-bootstrap.js untouched (reads fc_* keys); refreshThemePreferences hydrates on login. |
| 3 | fc_last_season 维持 localStorage | ✓ VERIFIED | Never written/removed in login/logout; readLastSeasonFromStorage/writeLastSeasonToStorage local-only. |
| 4 | 登出/换账号不串号 | ⚠️ PARTIAL | Per-user isolation (user_id key) VERIFIED. Logout key removal partial (WR-01 re-creates fc_active_theme). |
| 5 | 离线/后端不可用回退 localStorage，不阻塞 | ✓ VERIFIED | Fetch failures silent (catch blocks, no throw); state persists from localStorage. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `frontend/src/theme/theme-context.jsx` | 395 | `skipNextPutRef.current = true` in 404 branch with no preceding setState — flag leaks to next debounced PUT | 🛑 BLOCKER (CR-02) | First post-migration theme change silently not persisted; retry comment is false |
| `backend/app/database.py` | (missing) | No `PRAGMA foreign_keys=ON` connect listener | 🛑 BLOCKER (CR-01) | CASCADE never fires in prod; orphaned rows on user delete |
| `frontend/src/theme/theme-context.jsx` | 298 + 422 | injectThemeCss effect unconditionally writes fc_active_theme; logout reset triggers it | ⚠️ WARNING (WR-01) | fc_active_theme re-created after logout removeItem (D-A6 partial violation) |
| `backend/tests/conftest.py` | 69, 108 | PRAGMA foreign_keys OFF→ON toggle in clean_all_tables | ⚠️ WARNING | Masks cascade test; produces false-positive pass |
| `backend/app/services/user_theme_preferences_service.py` | 41-66 | Application-level SELECT-then-INSERT/UPDATE (no native upsert) | ℹ️ INFO (IN-01) | Concurrent same-user first-write races → IntegrityError 500 (PK still prevents dupes) |
| `backend/tests/test_user_theme_preferences.py` | 92 | 1.1s asyncio.sleep for updated_at change never asserted | ℹ️ INFO (IN-02) | Wastes ~20% test time |
| `frontend/src/theme/theme-context.jsx` | 334 | Debounced-PUT effect deps use `user` object not `user?.id` | ℹ️ INFO (IN-03) | Harmless (first guard returns); inconsistent with sibling effect |

**Debt marker gate:** No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any phase-modified file.

### Human Verification Required

The following require a running server + browser and cannot be fully verified by grep/static analysis. Note: CR-01 and CR-02 are BLOCKERs that MUST be fixed before UAT is meaningful; the items below assume fixes are applied.

### 1. Cross-device theme sync end-to-end

**Test:** Log in on device A, set a non-default theme + enable season toggle + south hemisphere + custom season map. Log in on device B (or fresh browser profile).
**Expected:** Device B hydrates the exact theme/season/hemisphere/map from the server within ~1 render cycle (brief flash acceptable per D-A4).
**Why human:** Requires two authenticated sessions + visual flash judgment; cannot be asserted via static analysis.

### 2. First-login migration from legacy localStorage

**Test:** As an existing user with fc_active_theme/fc_season_enabled/fc_hemisphere/fc_season_theme_map in localStorage but NO server row, log in fresh.
**Expected:** GET returns 404; client uploads local values via PUT; subsequent GET returns 200 with uploaded values. NOTE: after the CR-02 fix, the user's first manual theme change after this migration MUST also persist (verify it does).
**Why human:** Requires real JWT + DB state + timing of the 404 branch.

### 3. Logout key cleanup (post-WR-01 fix)

**Test:** Log in, set a non-default active theme, then log out. Inspect localStorage.
**Expected:** fc_active_theme, fc_season_enabled, fc_hemisphere, fc_season_theme_map are ABSENT (not present with default value). fc_theme + fc_last_season preserved.
**Why human:** localStorage inspection in DevTools after a real logout flow; depends on the WR-01 fix landing.

### Gaps Summary

Two BLOCKER defects block the phase goal, both independently reproduced against the live codebase (not relying on SUMMARY claims):

1. **CR-01 — Cascade delete is a no-op in production.** SQLite FK enforcement is OFF on every connection (`PRAGMA foreign_keys=0`), so `ON DELETE CASCADE` never fires. The must-have "on user delete, the row is cascade-deleted" is FALSE in production. The passing test is a false positive caused by conftest's pragma toggling leaking onto the shared `:memory:` connection. Fix: add a `connect` event listener in `database.py` (and conftest) that runs `PRAGMA foreign_keys=ON`, and remove the conftest toggles.

2. **CR-02 — `skipNextPutRef` leak on the 404 first-login-migration path drops the next legitimate PUT.** The 404 branch sets `skipNextPutRef.current=true` despite having no setState calls, so the flag is unconsumed and silently suppresses the user's first post-migration debounced PUT (data loss). The inline retry comment is false. Fix: delete line 395 (`skipNextPutRef.current = true` in the 404 branch).

3. **WR-01 (WARNING / partial gap) — Logout re-creates `fc_active_theme`.** The deferred `setActiveThemeState(DEFAULT_PRESET)` re-runs the injectThemeCss effect which writes the key back, partially defeating D-A6's `removeItem`. The 3 other keys are correctly removed. Fix: gate the storage write on `user?.id`.

All other must-haves (GET/PUT endpoints, validation, JWT isolation, dual-write wiring, login hydration, Header guards, migration reversibility, fc_theme/fc_last_season preservation, frontend lint/build, test_themes regression) are VERIFIED against the codebase. The backend service/router/schema/migration are clean and the frontend wiring is structurally correct — the defects are localized and each has a one-line-to-few-line fix.

---

_Verified: 2026-08-07T14:30:00Z_
_Verifier: the agent (gsd-verifier)_
