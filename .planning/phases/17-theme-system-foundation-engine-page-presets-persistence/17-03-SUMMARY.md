---
phase: 17-theme-system-foundation-engine-page-presets-persistence
plan: 03
subsystem: testing
tags: [bash, ripgrep, jsx, md3, ci]

requires:
  - phase: 17-02
    provides: Runtime theme engine and legitimate JavaScript hex emitters
provides:
  - JSX-only hardcoded color gate for component and page style props
  - Verified zero-match baseline and synthetic violation failure path
affects: [theme-components, theme-page, ci-token-checks]

tech-stack:
  added: []
  patterns:
    - JSX-only ripgrep lint scope naturally exempts JavaScript theme color sources
    - Token checks aggregate violations through the shared check helper

key-files:
  created:
    - .planning/phases/17-theme-system-foundation-engine-page-presets-persistence/17-03-SUMMARY.md
  modified:
    - scripts/check-tokens.sh

key-decisions:
  - "Check #8 scans only .jsx files under components and pages, so presets.js and theme-engine.js remain legitimate hex emitters."
  - "The regex is restricted to color/background style-object properties rather than matching unrelated JSX strings or comments."

patterns-established:
  - "JSX style color enforcement: raw #RRGGBB values in color/background properties fail the token gate."

requirements-completed: [FND-07]

duration: 2min
completed: 2026-08-03
---

# Phase 17 Plan 03: JSX Hex-Lint Gate Summary

**An eighth MD3 token check now rejects hardcoded `#RRGGBB` values in JSX color/background style props while preserving JavaScript theme emitters.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-03T02:44:11Z
- **Completed:** 2026-08-03T02:46:20Z
- **Tasks:** 2
- **Files modified:** 1 production file

## Accomplishments

- Appended Check #8 to `scripts/check-tokens.sh` and updated its eight-check header inventory.
- Scoped ripgrep to `.jsx` files in `frontend/src/components/` and `frontend/src/pages/`, naturally excluding `presets.js` and `theme-engine.js`.
- Proved the clean codebase exits 0 with `PASS: 8/8`, then proved an in-tree `color: '#ff0000'` sentinel exits non-zero and is reported by Check #8.
- Removed the sentinel and confirmed both direct Bash execution and `npm run check:tokens` pass.

## Task Commits

Each implementation task was handled atomically:

1. **Task 1: Add Check #8 JSX hex-lint gate** - `dde9711` (chore)
2. **Task 2: Verify clean and synthetic violation paths** - verification-only; no repository changes to commit

## Files Created/Modified

- `scripts/check-tokens.sh` - Adds the eighth token invariant for JSX style-prop hex colors.
- `.planning/phases/17-theme-system-foundation-engine-page-presets-persistence/17-03-SUMMARY.md` - Records implementation and verification evidence.

## Key Links

- `scripts/check-tokens.sh` → `frontend/src/components/**/*.jsx` via `rg --glob '*.jsx'`.
- `scripts/check-tokens.sh` → `frontend/src/pages/**/*.jsx` via the same JSX-only scan.
- `frontend/package.json` → `scripts/check-tokens.sh` through the `check:tokens` npm script.

## Verification Evidence

- `bash -n scripts/check-tokens.sh` — PASS.
- Executable bit (`test -x scripts/check-tokens.sh`) — PASS; mode remains `100755`.
- Clean baseline `bash scripts/check-tokens.sh` — PASS: `8/8`.
- Baseline JSX-wide hex scan — no matches.
- Temporary `frontend/src/components/_HexLintViolation.jsx` with `color: '#ff0000'` — expected non-zero exit; Check #8 reported the file and line.
- Sentinel removal followed by `bash scripts/check-tokens.sh` — PASS: `8/8`.
- `cd frontend && npm run check:tokens` — PASS: `8/8`.

## Decisions Made

- Restricted Check #8 to `color` and `background*` style-object properties to avoid flagging unrelated documentation and string content in JSX.
- Retained ripgrep as the repository's existing token-check dependency; no fallback was needed because `rg` is available and already required by Checks #1-6.

## Deviations from Plan

None - plan executed exactly as written. The user constraint's more precise style-prop regex was used instead of a generic every-hex-in-JSX pattern.

## Issues Encountered

- The first npm verification was invoked from the repository root and correctly failed because the root has no `package.json`; it was immediately rerun from `frontend/` and passed. No code change was needed.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- FND-07 enforcement is complete and ready to guard the upcoming ThemeCard and ThemePage JSX work.
- Phase 17 plan 04 can proceed; no blockers remain.

## Self-Check: PASSED

- `scripts/check-tokens.sh` exists, is executable, and contains Check #8.
- Task commit `dde9711` exists in git history.
- All plan-level verification commands pass in the final clean state.

---
*Phase: 17-theme-system-foundation-engine-page-presets-persistence*
*Completed: 2026-08-03*
