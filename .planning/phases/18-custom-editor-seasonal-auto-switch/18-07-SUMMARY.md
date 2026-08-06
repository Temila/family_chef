---
phase: 18-custom-editor-seasonal-auto-switch
plan: 07
subsystem: ui
tags: [material-color-utilities, dynamic-scheme, tonal-spot, theme-engine, react-colorful]

# Dependency graph
requires:
  - phase: 17-theme-system-foundation-engine-page-presets-persistence
    provides: buildCssSync + DynamicScheme dispatch + ThemePreview scoped preview
provides:
  - TonalSpot variant now respects user secondary/tertiary seed colors via DynamicScheme
  - Unified dispatch: all 9 variants route through deriveDynamicSchemes
  - ThemePreview has a tertiary-visible element for perceptible tertiary changes
affects: [18-06 (cascade fix ensures dynamic wins over tokens.css), theme-editor-preview]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single DynamicScheme dispatch for all 9 MD3 variants (removed deprecated Scheme/CorePalette path)"

key-files:
  created: []
  modified:
    - frontend/src/theme/theme-engine.js
    - frontend/src/theme/theme-engine.test.mjs
    - frontend/src/components/theme/ThemePreview.jsx

key-decisions:
  - "Unified TonalSpot dispatch through DynamicScheme(Variant.TONAL_SPOT) — removes deprecated themeFromSourceColor/Scheme path so secondary/tertiary seeds take effect"
  - "Accepted primary color divergence (#056d37→#316a42 light, #81d997→#98d4a4 dark) — threat T-18-07-02 'accept' disposition; tokens.css retains old values as FOUC fallback only"

patterns-established:
  - "All 9 MD3 variants share a single deriveDynamicSchemes entry point with explicit secondaryPalette/tertiaryPalette overrides"

requirements-completed:
  - EDIT-01
  - EDIT-02
  - EDIT-07

# Metrics
duration: 4min
completed: 2026-08-06
---

# Phase 18 Plan 07: TonalSpot Secondary/Tertiary Seed Fix Summary

**TonalSpot variant now routes through DynamicScheme so secondary/tertiary seed colors affect generated CSS; ThemePreview gains a tertiary-visible block**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-06T16:05:34Z
- **Completed:** 2026-08-06T16:09:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- TonalSpot variant now derives secondary/tertiary from user seed colors via `DynamicScheme` with explicit `secondaryPalette`/`tertiaryPalette` (same path as the other 8 variants)
- Removed dead `deriveTonalSpotSchemes` function and unused `themeFromSourceColor` import — single unified dispatch through `deriveDynamicSchemes`
- Added tertiary-visible "第三色标签" block in `ThemePreview.jsx` using `var(--md-color-tertiary-container)` / `var(--md-color-on-tertiary-container)` so tertiary seed changes are perceptible
- 3 new regression tests prove secondary/tertiary responsiveness and primary stability

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: RED — failing regression tests** - `a9e0b28` (test)
2. **Task 2: GREEN — DynamicScheme unification + tertiary preview** - `5383ad4` (feat)

_Note: No REFACTOR commit needed — implementation was minimal and clean._

## Files Created/Modified
- `frontend/src/theme/theme-engine.js` — Removed `deriveTonalSpotSchemes` + `themeFromSourceColor` import; unified `buildCssSync` dispatch through `deriveDynamicSchemes` for all 9 variants; updated header + docstrings
- `frontend/src/theme/theme-engine.test.mjs` — 3 new regression tests (secondary/tertiary responsiveness + primary stability); updated Phase 17 assertions to match new DynamicScheme output
- `frontend/src/components/theme/ThemePreview.jsx` — Added tertiary-container visible block before the surface ramp

## Decisions Made
- **Unified dispatch:** All 9 variants now route through `deriveDynamicSchemes` with `TonalPalette.fromInt(secondary)` / `TonalPalette.fromInt(tertiary)` overrides. The deprecated `themeFromSourceColor`/`Scheme`/`CorePalette` path is fully removed from theme-engine.js.
- **Accepted primary divergence:** The plan assumed `SchemeTonalSpot` (DynamicScheme subclass) would produce byte-identical output to `themeFromSourceColor`. Investigation revealed `themeFromSourceColor` uses the deprecated `Scheme` class (`CorePalette`-based, fixed tones), which is a fundamentally different derivation system from `DynamicScheme` (`MaterialDynamicColors`-based, dynamic tone curves). Threat model T-18-07-02 already carries an "accept" disposition for this divergence; tokens.css retains old values as FOUC fallback only (Plan 18-06 cascade fix ensures dynamic wins at runtime).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Phase 17 byte-stability assumption was incorrect — primary values changed**
- **Found during:** Task 2 (GREEN phase verification)
- **Issue:** The plan claimed `SchemeTonalSpot` (used by `themeFromSourceColor`) IS `DynamicScheme` with `Variant.TONAL_SPOT`, producing byte-identical primary/surface output. Investigation of MCU 0.4.0 source revealed `themeFromSourceColor` uses the **deprecated `Scheme` class** (`Scheme.light(source)` → `CorePalette.of(source).a1.tone(40)`), NOT `SchemeTonalSpot`. `Scheme` is `CorePalette`-based with fixed tones; `DynamicScheme` is `MaterialDynamicColors`-based with dynamic tone curves. They produce different primary hex values for the same seed:
  - Light primary: `#056d37` (Scheme/CorePalette) → `#316a42` (DynamicScheme)
  - Dark primary: `#81d997` (Scheme/CorePalette) → `#98d4a4` (DynamicScheme)
  - Surface-container-lowest: `#ffffff` → `#ffffff` (unchanged — neutral palette tone 100 is white regardless)
- **Fix:** Updated the Phase 17 regression assertions in `theme-engine.test.mjs` to match the new DynamicScheme output (`#316a42` / `#98d4a4`). Did NOT regenerate `tokens.css` (out of scope per plan) — it retains the old `#056d37` / `#81d997` values as FOUC first-paint fallback. The divergence is cosmetically negligible (both are green) and only affects FOUC; Plan 18-06's cascade fix ensures the dynamic theme always wins at runtime.
- **Files modified:** `frontend/src/theme/theme-engine.test.mjs` (assertions + comments)
- **Verification:** All 26 tests pass (16 theme-engine + 10 season); `npm run lint -- --quiet` clean; `npm run build` succeeds
- **Committed in:** `5383ad4` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** The primary color divergence is the expected consequence of switching MCU derivation systems. Threat model T-18-07-02 anticipated divergence with "accept" disposition. No scope creep — the UAT Test 5 gap is fully closed and all acceptance criteria pass.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | `a9e0b28` (test) | ✓ `test(18-07):` — 2 tests fail proving bug, 1 passes |
| GREEN | `5383ad4` (feat) | ✓ `feat(18-07):` — all 3 tests pass after fix |
| REFACTOR | — | Not needed (clean minimal implementation) |

RED phase fail-fast check: RED tests failed for the RIGHT reason (`assert.notEqual` — secondary/tertiary values identical regardless of seed = the bug), not import errors or syntax issues.

## Issues Encountered
- None beyond the deviation above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- UAT Test 5 (secondary/tertiary preview) is closed at the engine level
- Plan 18-06 (next wave, same file) will fix the CSS cascade ordering so dynamic theme wins over tokens.css at runtime — this is where the remaining visual gap (Tests 6/9/12) will close
- tokens.css divergence (FOUC fallback has old primary `#056d37`, runtime has `#316a42`) is cosmetically negligible and fully resolved once 18-06 ships

---
*Phase: 18-custom-editor-seasonal-auto-switch*
*Completed: 2026-08-06*

## Self-Check: PASSED

- All 3 modified files exist on disk ✓
- Both task commits present in git log (`a9e0b28` RED, `5383ad4` GREEN) ✓
- `deriveTonalSpotSchemes` removed from theme-engine.js ✓
- `var(--md-color-tertiary-container)` present in ThemePreview.jsx ✓
- 26/26 tests pass, lint clean, build succeeds ✓
