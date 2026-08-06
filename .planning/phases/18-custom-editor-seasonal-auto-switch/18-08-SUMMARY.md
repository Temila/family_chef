---
phase: 18-custom-editor-seasonal-auto-switch
plan: 08
subsystem: ui
tags: [react, toast, snackbar, theme-editor, gap-closure]

# Dependency graph
requires:
  - phase: 17-theme-system-foundation-engine-page-presets-persistence
    provides: CustomTheme CRUD API, /theme/editor page, ThemeEditorPage.jsx catch block, SnackbarProvider + showToast
provides:
  - Duplicate-name save error now surfaces both inline Input error AND top-of-screen red error Snackbar
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-channel error feedback: showToast(..., 'error') alongside setNameError for field-level + global notification"

key-files:
  created: []
  modified:
    - frontend/src/pages/ThemeEditorPage.jsx

key-decisions:
  - "Reused existing showToast('error') pattern from sibling catch branches (color-validation, fallback); no new imports or Provider needed"

patterns-established:
  - "Every catch branch in ThemeEditorPage handleSave now calls showToast for global visibility — duplicate-name was the last gap"

requirements-completed: [EDIT-04]

# Metrics
duration: 1min
completed: 2026-08-06
---

# Phase 18 Plan 08: Duplicate-Name Error Snackbar Summary

**One-line fix adding `showToast('error')` alongside `setNameError` so duplicate theme names trigger both inline Input error AND red Snackbar popup (closes UAT Test 8)**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-08-06T16:12:41Z
- **Completed:** 2026-08-06T16:13:31Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Duplicate-name catch branch in ThemeEditorPage handleSave now calls `showToast(\`已存在同名主题：${finalName}\`, 'error')` immediately after `setNameError`
- Mirrors the dual-channel error pattern already established in color-validation (line 270) and fallback (line 272) branches
- Lint passes (zero errors), production build succeeds, grep confirms exactly one matching call
- Closes UAT Test 8: duplicate-name error is now prominent via top-of-screen red Snackbar (6s auto-dismiss) in addition to inline Input error

## Task Commits

Each task was committed atomically:

1. **Task 1: Add showToast call to duplicate-name catch branch** - `cacabc3` (fix)
   - Includes Task 2 verification (lint + build + grep) since Task 2 modifies no files

## Files Created/Modified
- `frontend/src/pages/ThemeEditorPage.jsx` - Added `showToast(\`已存在同名主题：${finalName}\`, 'error')` at line 266 in the duplicate-name catch branch (matching `/同名|已存在|duplicate/i`), immediately after the existing `setNameError` call

## Decisions Made
- Combined Task 1 (the one-line fix) and Task 2 (verification-only) into a single commit, since Task 2 explicitly modifies no files — it only confirms lint/build/grep pass. This keeps the one-line behavioral change atomic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT Test 8 (duplicate-name Snackbar) is structurally fixed; the inline Input error and Snackbar call are both present
- The Snackbar popup visual (red bar + error icon, 6s auto-dismiss) cannot be verified in CI — requires browser DOM interaction
- Human UAT re-testing of Test 8 is the final gate: save/rename a theme to a duplicate name and confirm the top-of-screen red Snackbar appears alongside the inline Input error

## Self-Check: PASSED

- FOUND: `.planning/phases/18-custom-editor-seasonal-auto-switch/18-08-SUMMARY.md`
- FOUND: commit `cacabc3` in git log
- CONFIRMED: `rg -c "showToast.*已存在同名主题.*error" frontend/src/pages/ThemeEditorPage.jsx` returns 1
- CONFIRMED: `npm run lint -- --quiet` exits 0 (zero errors)
- CONFIRMED: `npm run build` exits 0 (build succeeds)
