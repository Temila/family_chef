---
phase: 19-account-bound-theme-preferences
plan: 02
subsystem: ui
tags: [react, theme-context, dual-write, debounce, account-bound, fastapi-client]

# Dependency graph
requires:
  - phase: 19-account-bound-theme-preferences
    provides: "GET/PUT /api/users/me/theme-preferences (404 upsert trigger, server LWW, camelCase sourceColors)"
  - phase: 17-theme-system-foundation-engine-page-presets-persistence
    provides: "theme-context.jsx lifecycle hooks + refreshCustomThemes pattern mirrored for refreshThemePreferences"
  - phase: 18-custom-editor-seasonal-auto-switch
    provides: "seasonEnabled/hemisphere/seasonThemeMap state + set-state-in-effect queueMicrotask pattern"
provides:
  - "ApiClient.getThemePreferences() + updateThemePreferences() (bare /users/me/theme-preferences path, no snake↔camel transform)"
  - "ApiClient error.status attached on non-ok responses (404 detection for first-login migration)"
  - "ThemeContext dual-write: localStorage (existing) + 200ms debounced PUT to server (D-A1)"
  - "Login GET hydration: 200 → hydrate state+localStorage; 404 → upload local fc_* as initial payload (D-A4/D-A5)"
  - "Logout cleanup: removes 4 fc_* keys, resets state, preserves fc_theme + fc_last_season (D-A6)"
  - "Header ThemeToggle + Palette IconButtons hidden when unauthenticated (D-A2/D-A3)"
affects: [theme-context-frontend, header-composite, fouc-bootstrap-cache-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Refs (not state) for sync bookkeeping that must NOT trigger re-renders: preferencesLoadedRef/skipNextPutRef/debouncedPutTimerRef"
    - "skipNextPutRef one-shot flag: server→state hydration sets true; debounced PUT effect consumes it to avoid echo-back PUT"
    - "200ms debounced PUT effect gated on user && preferencesLoadedRef to coalesce rapid consecutive state changes"
    - "404-as-signal: first-login migration uploads localStorage when server has no preferences (D-A5 explicit trigger)"
    - "set-state-in-effect mitigation via queueMicrotask (established Phase 18 pattern) applied to logout state reset"

key-files:
  created: []
  modified:
    - frontend/src/api/client.js
    - frontend/src/theme/theme-context.jsx
    - frontend/src/components/composites/Header.jsx

key-decisions:
  - "Bare path /users/me/theme-preferences in ApiClient (baseURL=/api prepends /api) — matches every other method in the file; no double /api prefix"
  - "No snake_case↔camelCase transform in new methods — wire format (camelCase sourceColors) matches backend ActiveThemePayload and theme-context serialize helpers exactly"
  - "All 3 sync bookkeeping values are refs (preferencesLoadedRef/skipNextPutRef/debouncedPutTimerRef) to avoid re-render storms during hydration"
  - "refreshThemePreferences defined before the user-keyed useEffect to avoid temporal-dead-zone on the deps array reference"
  - "Logout setState wrapped in queueMicrotask to satisfy react-hooks/set-state-in-effect lint (matches file's existing pattern at injectThemeCss catch)"
  - "fetch failures silent (no new toast) per D-A4; refreshCustomThemes existing toast behavior preserved unchanged"
  - "Header user guards are defense-in-depth for AuthProvider initial-load window; /theme route already ProtectedRoute-gated"

patterns-established:
  - "Dual-write to localStorage + debounced server PUT with skipNextPutRef echo suppression"
  - "404-triggered one-time first-login migration upload (local→server)"
  - "Refs for cross-effect bookkeeping flags that gate async sync without causing re-renders"

requirements-completed: [D-A1, D-A2, D-A3, D-A4, D-A5, D-A6]

# Metrics
duration: 5min
completed: 2026-08-07
---

# Phase 19 Plan 02: Account-Bound Theme Preferences Frontend Summary

**Frontend dual-write wiring (localStorage + 200ms debounced server PUT) with login-fetch hydration, 404 first-login migration upload, logout 4-key cleanup, and unauthenticated Header button hiding — all additive, rendering pipeline byte-identical**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-07T05:35:10Z
- **Completed:** 2026-08-07T05:40:51Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- ApiClient exposes `getThemePreferences` (GET) + `updateThemePreferences` (PUT) on bare `/users/me/theme-preferences` path; HTTP errors now carry `.status` so theme-context detects 404 for first-login migration (D-A5)
- ThemeContext dual-writes: existing localStorage writes preserved; new 200ms debounced PUT to server gated on `user && preferencesLoadedRef`, with `skipNextPutRef` one-shot flag to suppress echo-back after server hydration (D-A1, D-A4)
- Login triggers silent GET: 200 → hydrate state + localStorage from server; 404 → read local 4 fc_* keys and PUT as initial payload (D-A4, D-A5); fetch failures silent (no toast)
- Logout removes 4 account-bound fc_* keys (`fc_active_theme`, `fc_season_enabled`, `fc_hemisphere`, `fc_season_theme_map`) + resets context state to defaults; preserves `fc_theme` (legacy) + `fc_last_season` (rendering cache) (D-A6)
- Header light/dark ThemeToggle + Palette IconButtons conditionally rendered only when `user` is logged in (D-A2, D-A3)
- injectThemeCss / applyCurrentSeason / useMemo value / mutex-gated setActiveTheme+resetToDefault all untouched — rendering pipeline byte-identical for any given fc_* state

## Task Commits

Each task was committed atomically:

1. **Task 1: ApiClient methods + err.status** - `87c3b6f` (feat)
2. **Task 2: ThemeContext dual-write + login-fetch + logout cleanup** - `47a0b5b` (feat)
3. **Task 3: Header auth guard hide ThemeToggle + Palette** - `a446647` (feat)

## Files Created/Modified
- `frontend/src/api/client.js` - Added getThemePreferences/updateThemePreferences (bare path); err.status attached on non-ok responses; auth/themes/401 blocks unchanged
- `frontend/src/theme/theme-context.jsx` - Added serialize helpers, 3 sync refs, debounced PUT effect, refreshThemePreferences (GET 200 hydrate / 404 upload), extended user-keyed useEffect (login fetch + logout cleanup); injectThemeCss/applyCurrentSeason/memoValue/mutex setters untouched
- `frontend/src/components/composites/Header.jsx` - Wrapped ThemeToggle + Palette IconButtons in `{user && (...)}` guards; avatar guard/PAGE_TITLES/handleToggleTheme unchanged

## Decisions Made
- **Refs not state for sync bookkeeping:** preferencesLoadedRef/skipNextPutRef/debouncedPutTimerRef are `useRef` because they gate async server sync without triggering re-renders (state would cause render storms during hydration).
- **refreshThemePreferences ordering:** Defined before the user-keyed useEffect so its inclusion in the deps array does not hit the temporal dead zone (const not yet initialized during render).
- **Logout setState via queueMicrotask:** The 4 reset setState calls on logout are deferred via queueMicrotask to satisfy `react-hooks/set-state-in-effect` — mirrors the established pattern already used at the injectThemeCss catch (line 301). localStorage.removeItem stays synchronous (external side effect = appropriate in effect body).
- **Bare API paths:** `/users/me/theme-preferences` without `/api` prefix because `ApiClient.request()` does `fetch(this.baseURL + url)` with `baseURL='/api'` — matches every other method in the file.
- **Silent fetch failures:** No new toast calls per D-A4; refreshCustomThemes' existing toast-on-failure behavior preserved untouched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Logout setState deferred via queueMicrotask for set-state-in-effect lint**
- **Found during:** Task 2 (ThemeContext dual-write)
- **Issue:** Synchronous `setActiveThemeState`/`setSeasonEnabledState`/`setHemisphereState`/`setSeasonThemeMapState` in the logout branch of the user-keyed useEffect triggered `react-hooks/set-state-in-effect` lint error, blocking `npm run lint --quiet` (plan verification requires exit 0).
- **Fix:** Wrapped the 4 setState calls in `queueMicrotask(() => {...})`, matching the established pattern already used at line 301 (injectThemeCss catch) and documented in STATE.md Phase 18 decisions. localStorage.removeItem and ref mutations stay synchronous (external side effects + refs, not React state).
- **Files modified:** frontend/src/theme/theme-context.jsx
- **Verification:** `npm run lint -- --quiet` exits 0; `npm run build` exits 0; logout still removes 4 fc_* keys + resets state + clears timer.
- **Committed in:** 47a0b5b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking lint)
**Impact on plan:** Auto-fix necessary to satisfy the plan's own lint-exit-0 verification gate. Follows existing codebase pattern; no behavior change to the logout cleanup semantics (state reset still happens synchronously within the same microtask before any PUT effect can fire, since `preferencesLoadedRef.current=false` is set synchronously and the PUT effect guards on it).

## Issues Encountered
None — the only blocker was the lint rule, resolved via the deviation above using the file's own established pattern.

## User Setup Required
None - no external service configuration required. Frontend-only plan; backend endpoints from Plan 19-01 are already live.

## Next Phase Readiness
- Phase 19 (account-bound-theme-preferences) is now functionally complete: backend persistence (Plan 01) + frontend dual-write wiring (Plan 02).
- Ready for human UAT: login as testuser → verify GET 200/PUT 200 cycle, first-login 404→PUT migration, logout fc_* key removal + fc_theme/fc_last_season preservation, and Header button hiding when unauthenticated.
- Manual end-to-end test (requires running server + JWT) deferred to `/gsd-verify-work` UAT.

---
*Phase: 19-account-bound-theme-preferences*
*Completed: 2026-08-07*

## Self-Check: PASSED

- SUMMARY.md exists at expected path ✓
- All 3 modified files exist on disk (client.js, theme-context.jsx, Header.jsx) ✓
- All 3 task commit hashes present in git log (87c3b6f, 47a0b5b, a446647) ✓
- `npm run lint -- --quiet` exits 0 ✓
- `npm run build` exits 0 ✓
- Plan verification greps: client.js (3 matches), theme-context.jsx (25 matches), Header.jsx 'user &&' (3 matches, ≥3 required) ✓
