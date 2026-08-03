---
phase: 17-theme-system-foundation-engine-page-presets-persistence
plan: 02
subsystem: ui
tags: [react, vite, md3, material-color-utilities, esbuild, fouc, theme]

# Dependency graph
requires: []
provides:
  - "Synchronous MCU-backed light/dark MD3 theme CSS derivation with dark-mode surface-tint elevation overrides"
  - "Five frontend-only TonalSpot preset definitions and a theme barrel export"
  - "Classic esbuild-bundled FOUC bootstrap injected by Vite after generated CSS"
  - "Standalone Node regression tests for theme CSS shape, token parity, custom seeds, and elevation"
affects:
  - "17-04 ThemeContext and authenticated theme persistence"
  - "17-05 /theme page and card previews"
  - "17-06 frontend theme integration verification"
  - "Phase 18 custom editor and seasonal theme workflows"

# Tech tracking
tech-stack:
  added:
    - "esbuild ^0.28.1 as an explicit frontend devDependency"
    - "@material/material-color-utilities ^0.4.0 as a browser runtime dependency"
  patterns:
    - "Pure synchronous theme engine returns selector-scoped CSS; DOM application is isolated in injectThemeCss"
    - "Vite transformIndexHtml returns a classic inline script tag after generated stylesheet tags"
    - "FOUC bootstrap uses cached active-theme JSON with legacy fc_theme/default-preset fallback"

key-files:
  created:
    - "frontend/src/theme/theme-engine.js"
    - "frontend/src/theme/presets.js"
    - "frontend/src/theme/index.js"
    - "frontend/src/theme/fouc-bootstrap.js"
    - "frontend/src/theme/theme-engine.test.mjs"
    - "frontend/plugins/inline-theme-bootstrap.js"
  modified:
    - "frontend/vite.config.js"
    - "frontend/index.html"
    - "frontend/package.json"
    - "frontend/package-lock.json"

key-decisions:
  - "D-04: Keep all v1.5 presets on MCU TonalSpot while retaining the variant parameter for Phase 18."
  - "D-05/D-08: Generate one style payload with :root and [data-theme=\"dark\"] blocks and replace the existing style node by id."
  - "D-09/FND-06: Emit surface-tint in both mode blocks and only override elevation 0-5 inside the dark block with color-mix."
  - "D-10: Inline a classic (non-module) bootstrap through Vite/esbuild so it survives the Vite 8 production HTML transform."
  - "D-21/D-22: Keep the engine framework-free and promote MCU to runtime dependencies; esbuild is explicit tooling for the bootstrap plugin."

patterns-established:
  - "Theme source colors remain frontend preset inputs while derived semantic roles are generated at runtime."
  - "FOUC bootstrap and post-mount consumers share the exact theme-engine buildCssSync/injectThemeCss path."

requirements-completed: [FND-01, FND-02, FND-04]

# Metrics
duration: 18min
completed: 2026-08-03
---

# Phase 17 Plan 02: Theme System Foundation — Engine, Page, Presets & Persistence Summary

**Synchronous Material Design 3 runtime derivation with five presets and a stylesheet-ordered classic FOUC bootstrap.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-03T01:58:40Z
- **Completed:** 2026-08-03T02:16:23Z
- **Tasks:** 3 completed
- **Files modified:** 10

## Accomplishments

- Added `buildCssSync`/`buildCss` MCU derivation for light and dark semantic roles, including `surface-tint` in both blocks and dark-only elevation overrides using locked `color-mix` percentages.
- Added five concrete frontend preset themes, `DEFAULT_PRESET`, the theme barrel, and regression coverage for default parity, custom source colors, invalid input, idempotent injection shape, and elevation behavior.
- Promoted MCU to browser dependencies and installed explicit esbuild tooling; Vite now bundles `fouc-bootstrap.js` with `format: 'iife'` and emits it as a classic inline script after generated CSS assets.
- Added FOUC fallback handling for `fc_active_theme`, with legacy `fc_theme` read and the default preset used when no active theme JSON is available.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create theme-engine.js + presets.js + index.js barrel** - `44401cc` (`feat`)
2. **Task 2: Move MCU from devDependencies to dependencies + npm install** - `281ecab` (`chore`)
3. **Task 3: Create FOUC bootstrap, Vite plugin, placeholder, regression tests, and build verification** - `eb223eb` (`feat`)
4. **Task 3 corrective fix: Place bootstrap after generated styles** - `ba12ddd` (`fix`)

## Files Created/Modified

- `frontend/src/theme/theme-engine.js` - Pure MCU bridge emitting light/dark semantic CSS and dark elevation overrides.
- `frontend/src/theme/presets.js` - Five immutable frontend preset records with locked default seed colors.
- `frontend/src/theme/index.js` - Named barrel exports for engine and presets.
- `frontend/src/theme/fouc-bootstrap.js` - Pre-hydration active-theme reader and style injector.
- `frontend/src/theme/theme-engine.test.mjs` - Node built-in test suite for engine output and safeguards.
- `frontend/plugins/inline-theme-bootstrap.js` - esbuild/Vite classic-script HTML transform.
- `frontend/vite.config.js` - Registers the bootstrap plugin.
- `frontend/index.html` - Preserves the existing `fc_theme` script and adds `<!-- fc-bootstrap -->`.
- `frontend/package.json`, `frontend/package-lock.json` - Promotes MCU and adds esbuild.

## Key Links

- `theme-engine.js` → `@material/material-color-utilities`: named `argbFromHex` and `themeFromSourceColor` imports derive both schemes from source seeds.
- `theme-engine.js` → `tokens.css`: default seed emits the canonical light `#056d37` and dark `#81d997` primary roles and matching semantic role structure.
- `fouc-bootstrap.js` → `theme-engine.js`: bootstrap uses the same synchronous derivation and `injectThemeCss` path as later React consumers.
- `inline-theme-bootstrap.js` → `fouc-bootstrap.js`: esbuild bundles the ESM source into a classic IIFE through `transformIndexHtml`.
- `vite.config.js` → `inline-theme-bootstrap()`: plugin is registered alongside the React plugin for dev and production HTML transforms.

## Verification

- `cd frontend && npm ls esbuild` — PASS (`esbuild@0.28.1`).
- `cd frontend && npm ls @material/material-color-utilities` — PASS (`@material/material-color-utilities@0.4.0` under the project dependency root).
- `cd frontend && node --test src/theme/theme-engine.test.mjs` — PASS (6 tests).
- `cd frontend && npm run lint` — PASS.
- `cd frontend && npm run build` — PASS; Vite reports only the existing large-chunk advisory.
- `dist/index.html` inspection — PASS: generated stylesheet precedes the inline bootstrap, `fc_active_theme` is present, and the injected bootstrap has no `type="module"` attribute.
- Default semantic role parity and existing `fc_theme` inline block preservation checks — PASS.

## Decisions Made

- Kept the plan's locked hex source-color contract and TonalSpot v1.5 behavior; the engine accepts the variant argument for the Phase 18 extension point.
- Used Vite HTML tag injection rather than raw placeholder replacement for the final plugin output so `tokens.css` loads before the dynamic style node is created, while preserving the source placeholder and classic-script requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused FOUC catch binding**
- **Found during:** Task 3 (frontend lint verification)
- **Issue:** ESLint rejected the unused `error` binding in the intentionally silent bootstrap fallback.
- **Fix:** Switched to an optional catch binding while retaining the silent fallback behavior.
- **Files modified:** `frontend/src/theme/fouc-bootstrap.js`
- **Verification:** `npm run lint` and production build pass.
- **Committed in:** `eb223eb` (part of Task 3 commit)

**2. [Rule 1 - Bug] Ordered the injected bootstrap after generated styles**
- **Found during:** Task 3 (production HTML inspection)
- **Issue:** Direct placeholder string replacement placed the bootstrap before Vite's generated `tokens.css` link, allowing fallback token CSS to win the cascade.
- **Fix:** Returned a Vite `transformIndexHtml` `{ html, tags }` result and injected the classic script as a head tag after Vite asset tags.
- **Files modified:** `frontend/plugins/inline-theme-bootstrap.js`
- **Verification:** `dist/index.html` stylesheet position precedes the `fc_active_theme` bootstrap, while the bootstrap remains classic and React remains a deferred module.
- **Committed in:** `ba12ddd`

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs).
**Impact on plan:** Both fixes were directly required for lint correctness and FOUC/cascade correctness; no scope creep.

## Issues Encountered

- `npm install` reported five dependency-audit findings (2 low, 3 high). Dependency versions were locked by the plan, so no unrelated package upgrades or audit remediation were attempted.
- The repository contained pre-existing deleted Phase 16 planning artifacts and generated untracked audit outputs; they were left untouched and excluded from all plan commits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Runtime engine, presets, package placement, FOUC bootstrap, and regression tests are ready for Phase 17-03/17-04 consumers.
- `ThemeContext` can persist the full active-theme superset and re-apply through the exported engine without changing the bootstrap contract.

## Self-Check: PASSED

- All 10 planned files exist.
- Task commits `44401cc`, `281ecab`, `eb223eb`, and corrective commit `ba12ddd` exist in git history.
- Node tests, frontend lint, production build, dependency checks, stylesheet ordering, classic-script shape, token parity, and legacy `fc_theme` byte-preservation checks passed.

---
*Phase: 17-theme-system-foundation-engine-page-presets-persistence*
*Completed: 2026-08-03*
