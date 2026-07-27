---
phase: 08-md3-design-token-foundation
plan: 03
subsystem: ui
tags: [md3, design-tokens, css, frontend, material-design, focus-ring, a11y, regression-guard]

# Dependency graph
requires:
  - phase: 08-md3-design-token-foundation
    plan: 02
    provides: Wave 1+2 token consumers active (color/shape/font/motion/nav-height/elevation)
provides:
  - MD3 focus ring tokens applied via :focus-visible across all interactive surfaces
  - Hardcoded numeric border-radius values swept from JSX inline styles
  - scripts/check-tokens.sh regression guard with 7 invariant checks
  - npm run check:tokens wired in frontend/package.json
affects:
  - Phase 09 motion/state layers (focus ring pattern is the reference implementation)
  - Phase 10 primitive components (focus-visible rules inherited via global baseline)
  - Phase 11 composite components (same)
  - Phase 12 page-level refactor (guard prevents regression during 8dp grid sweep)
  - CI pipeline (check:tokens can be added as a pre-commit or CI gate)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MD3 double-ring focus pattern: outer ring (On-Primary) for surface elements + inner ring (Surface) for filled/primary elements"
    - ":focus-visible vs :focus split — keyboard tab shows ring, mouse click does not"
    - "Regression guard as Bash + ripgrep script — deterministic, fast (<5s), no deps beyond rg"

key-files:
  created:
    - scripts/check-tokens.sh (95 lines — 7-check MD3 token invariant guard)
  modified:
    - frontend/src/css/styles.css (focus ring rules + emphasized easing on card/dish-card/quick-action)
    - frontend/package.json (check:tokens npm script)
    - frontend/src/pages/AdminDishesPage.jsx (borderRadius: 4 → var(--md-radius-xs))
    - frontend/src/pages/ChefDishesPage.jsx (borderRadius: 4 → var(--md-radius-xs))
    - frontend/src/pages/DishDetailPage.jsx (borderRadius: 4 → var(--md-radius-xs))
    - frontend/src/pages/AdminIngredientsPage.jsx (borderRadius: 999 → var(--md-radius-full))

key-decisions:
  - "Double-ring MD3 focus pattern: surface elements use --md-focus-ring-outer (On-Primary), filled elements (btn-primary/fab/filter-chip.active) use --md-focus-ring-inner (Surface) for visibility on primary backgrounds"
  - "Global :focus-visible baseline (2px primary outline + 2px offset) at end of styles.css ensures every interactive element is keyboard-accessible by default; component-level rules cannot disable it without an explicit override"
  - "Global :focus:not(:focus-visible) { outline: none } suppresses mouse-only focus rings — MD3 spec compliance"
  - "Emphasized easing adopted on card/dish-card/quick-action elevation transitions for more pronounced MD3 feel (MOTION-05)"
  - "borderRadius: 4 (半成品 tag) maps to --md-radius-xs (8px) — MD3 has no 6px tier; 8px is the closest standard"
  - "borderRadius: 999 maps to --md-radius-full (9999px) — same semantic, MD3 namespace"
  - "InvitationsModal borderRadius: 0 preserved — intentional full-screen modal per CONTEXT MODAL-08"
  - "styles.css had zero numeric border-radius values (Wave 1 already swept); Task 2 work was JSX-only"

patterns-established:
  - "Pattern: MD3 focus ring = outline + outline-offset, NOT box-shadow (fixes .search-bar input:focus + .form-input:focus legacy box-shadow pattern)"
  - "Pattern: Surface vs filled focus ring selection — choose outer (On-Primary) or inner (Surface) based on element background"
  - "Pattern: Regression guard script with fail()/check() helpers + TOTAL/FAILURES counters → deterministic exit codes"
  - "Pattern: Path resolution via SCRIPT_DIR=$(cd $(dirname $0) && pwd) — works from any cwd (matches scripts/run.sh convention)"

requirements-completed: [TOKEN-13, MOTION-04, MOTION-05, UX-02]

# Metrics
duration: 10min
completed: 2026-07-24
---

# Phase 8 Plan 3: Focus Rings + Border-Radius Sweep + Regression Guard Summary

**MD3 focus ring tokens applied via :focus-visible across 11 selectors (8 outer-ring refs + 5 inner-ring refs); global baseline ensures keyboard accessibility by default; 6 hardcoded numeric borderRadius values swept from JSX inline styles; scripts/check-tokens.sh regression guard (7 invariant checks, 95 lines) wired as `npm run check:tokens`; build green, lint matches baseline (92/21), guard exits 0 on clean tree and 1 on injected regression.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 3 / 3
- **Files modified:** 7 (1 CSS + 4 JSX + 1 script + 1 package.json)
- **Files created:** 1 (scripts/check-tokens.sh)

## Accomplishments

- **Task 1: Focus rings + emphasized easing** — Added global `:focus-visible` baseline (2px primary outline + 2px offset) and `:focus:not(:focus-visible) { outline: none }` suppressor at end of styles.css. Migrated `.search-bar input:focus` and `.form-input:focus` from legacy `box-shadow: 0 0 0 3px var(--md-color-primary-container)` pattern to MD3 `outline + box-shadow` ring pattern. Added 9 component-level `:focus-visible` rules: 6 surface elements use `--md-focus-ring-outer` (On-Primary) — btn, filter-chip, list-item, dish-card, card, order-card; 3 filled elements use `--md-focus-ring-inner` (Surface) — btn-primary, filter-chip.active, fab. Updated `.card`, `.dish-card`, `.quick-action` transitions from `--md-motion-easing-standard` to `--md-motion-easing-emphasized` for more pronounced elevation transitions per MOTION-05. Final counts: 8 outer refs, 5 inner refs, 11 :focus-visible selectors, 3 emphasized-easing refs.
- **Task 2: JSX border-radius sweep** — Swept 6 numeric `borderRadius` values across 4 page files: AdminDishesPage.jsx:554,619 + ChefDishesPage.jsx:576,640 + DishDetailPage.jsx:151 (all `borderRadius: 4` → `'var(--md-radius-xs)'` for 半成品 tag), AdminIngredientsPage.jsx:564 (`borderRadius: 999` → `'var(--md-radius-full)'` for pill). InvitationsModal.jsx:35 intentional `borderRadius: 0` preserved. styles.css had zero numeric border-radius values (Wave 1 already swept). Final state: zero numeric `borderRadius` values in JSX (excluding intentional 0), zero in styles.css.
- **Task 3: Regression guard** — Created `scripts/check-tokens.sh` (95 lines, executable): 7 invariant checks via ripgrep — (1) old color/semantic token names, (2) old shape/typography/motion/nav-height token names, (3) raw 6-digit hex outside tokens.css, (4) raw rgba() in styles.css, (5) hardcoded border-radius in styles.css, (6) hardcoded borderRadius in JSX, (7) tokens.css presence + required token families. Path resolution via SCRIPT_DIR pattern (works from any cwd). Wired as `"check:tokens": "bash ../scripts/check-tokens.sh"` in frontend/package.json. Verified: clean tree exits 0, injected `var(--accent)` regression exits 1.

## Task Commits

Each task committed atomically:

1. **Task 1: Apply MD3 focus rings via :focus-visible + emphasized easing** — `fad1ea8` (feat)
2. **Task 2: Sweep hardcoded borderRadius to MD3 radius tokens** — `32c022f` (refactor)
3. **Task 3: Add MD3 token regression guard (scripts/check-tokens.sh)** — `fdb0ead` (feat)

## Verification

| Acceptance Criterion | Result |
|---|---|
| `styles.css` contains ≥5 references to `var(--md-focus-ring-outer)` | ✅ 8 |
| `styles.css` contains ≥3 references to `var(--md-focus-ring-inner)` | ✅ 5 |
| `styles.css` contains ≥5 `:focus-visible` selectors | ✅ 11 |
| `styles.css` contains ≥3 references to `var(--md-motion-easing-emphasized)` | ✅ 3 |
| `.search-bar input:focus` + `.form-input:focus` no longer use legacy box-shadow pattern | ✅ migrated to outline + box-shadow ring |
| Global `:focus-visible` + `:focus:not(:focus-visible)` baseline at end of file | ✅ |
| `styles.css` contains zero `border-radius: <nonzero>px` | ✅ zero |
| All 28 JSX files contain zero `borderRadius: <nonzero>number` | ✅ zero (excluding intentional 0) |
| `.fab` still uses `var(--md-radius-md)` 16px (D-08 not regressed) | ✅ |
| `InvitationsModal.jsx` retains intentional `borderRadius: 0` | ✅ line 35 |
| `scripts/check-tokens.sh` exists, executable, ≥30 lines | ✅ 95 lines, executable |
| `scripts/check-tokens.sh` checks 7 invariants | ✅ all 7 |
| `scripts/check-tokens.sh` exits 0 on clean tree | ✅ PASS: 7/7 |
| `scripts/check-tokens.sh` exits 1 on regression | ✅ verified with injected `var(--accent)` |
| `frontend/package.json` contains `"check:tokens": "bash ../scripts/check-tokens.sh"` | ✅ |
| `npm run check:tokens` exits 0 | ✅ |
| `npm run build` exits 0 | ✅ 493 kB JS + 42 kB CSS |
| `npm run lint` ≤ baseline + 5 | ✅ 92 errors / 21 warnings (baseline unchanged) |

## Decisions Made

- **Double-ring focus pattern (MD3 spec)** — Surface elements (btn, filter-chip, card, etc.) use the outer ring (`--md-focus-ring-outer` = 2px On-Primary) because they sit on surface backgrounds. Filled elements (btn-primary, fab, filter-chip.active) use the inner ring (`--md-focus-ring-inner` = 2px Surface) because they sit on Primary backgrounds — an On-Primary ring would be invisible against Primary fill. This is the standard MD3 double-ring accessibility pattern.
- **Negative outline-offset on list-item** — `.list-item:focus-visible` uses `outline-offset: -2px` (negative) to keep the focus ring inside the row bounds. Standard MD3 list-item accessibility pattern.
- **Emphasized easing on elevation transitions** — `.card`, `.dish-card`, `.quick-action` transitions changed from `--md-motion-easing-standard` to `--md-motion-easing-emphasized` per MOTION-05. The emphasized cubic-bezier (0.2, 0, 0, 1) produces more pronounced deceleration, making hover/elevation changes feel more "alive" per MD3 motion spec.
- **borderRadius mapping for 半成品 tag** — Original `borderRadius: 4` mapped to `--md-radius-xs` (8px). MD3 has no 6px or 4px tier — 8px is the closest standard. The 半成品 tag is a tiny pill badge; 8px gives it a subtle rounding that matches the MD3 small-badge aesthetic.
- **borderRadius mapping for AdminIngredientsPage pill** — `borderRadius: 999` mapped to `--md-radius-full` (9999px). Same semantic (fully rounded pill), MD3 namespace. The visual result is identical.
- **scripts/check-tokens.sh design** — Bash + ripgrep (no Node dependency) for portability and speed. Path resolution via SCRIPT_DIR pattern (matches scripts/run.sh convention) so the script works regardless of cwd. Uses `fail()` / `check()` helpers + TOTAL/FAILURES counters for deterministic exit codes. Output in Chinese per project conventions.

## Deviations from Plan

- **`.btn:disabled` rule not found for insertion point** — Plan said append `.btn:focus-visible` after `.btn:disabled`. The codebase has no explicit `.btn:disabled` rule (disabled state handled via inline className). Resolved by placing all focus-visible rules at the end of the file in a dedicated `=== MD3 焦点环 (Wave 3) ===` section. Functionally equivalent — the end-of-file placement gives the rules highest cascade specificity.
- **styles.css Task 2 was a no-op** — Plan anticipated sweeping numeric `border-radius` values from styles.css. Wave 1's executor had already swept them all. Only JSX sweep was needed. This is benign over-delivery from Wave 1.
- **`.badge-count` and `.markdown-body code` already swept** — Plan anticipated changing `border-radius: 9px` → `var(--md-radius-full)` and `border-radius: 3px` → `var(--md-radius-xs)`. Wave 1 had already migrated both to MD3 tokens. Verified `.badge-count` uses `var(--md-radius-full)` and `.markdown-body code` uses `var(--md-radius-xs)`.

## Issues Encountered

- **`--md-focus-ring-inner` token shape mismatch** — The token is defined as `2px solid var(--md-color-surface)` (a full outline shorthand). The plan suggested using it as `box-shadow: 0 0 0 4px var(--md-focus-ring-inner)`, which would produce invalid CSS. Resolved by using the token as `outline: var(--md-focus-ring-inner)` (the semantically correct usage for an outline shorthand token). The inner-ring rules now use `outline` rather than `box-shadow`, which is cleaner and matches the token's actual shape.
- **Exit code capture in shell pipeline** — During regression testing, piping `bash check-tokens.sh | head -10` reported exit 0 because `$?` captures the last command in the pipeline (`head`). Re-tested with direct redirection to confirm the script's actual exit code is 1 on regression.

## Self-Check: PASSED

All 18 verification criteria pass. Three atomic commits produced (fad1ea8, 32c022f, fdb0ead). Foundation layer sealed — any future `var(--accent)`, raw `#xxxxxx`, raw `rgba()`, or numeric `border-radius` under `frontend/src/` will fail `npm run check:tokens`.

## Phase 8 Completion

With Wave 3 complete, the entire MD3 Design Token Foundation (Phase 8) is done:
- **Wave 1 (08-01):** Token generator + tokens.css + color sweep across styles.css + 28 JSX files
- **Wave 2 (08-02):** Shape/spacing/elevation/typography/motion/nav-height tokens (verification pass — Wave 1 over-delivered)
- **Wave 3 (08-03):** Focus rings + hardcoded radius sweep + regression guard

All 21 mapped requirements (TOKEN-01..14, MOTION-04/05, UX-02/04/05, LOGIC-01/02/03) are satisfied. Foundation layer is sealed against regression. Phase 9-12 can proceed against a stable MD3 token surface.

## Next Phase Readiness

- **Phase 09 Motion & State Layers** — Focus ring pattern is the reference implementation; motion tokens (duration + easing) are fully consumed; state layers can layer on top of the focus ring baseline.
- **Phase 10 Primitive Components** — All primitive tokens defined and consumed; primitive components inherit the global `:focus-visible` baseline automatically.
- **Phase 11 Composite & Navigation Components** — Same inheritance; composite components can use `--md-elevation-*` and `--md-color-surface-container-*` tiers without further token work.
- **Phase 12 Page-Level Refactor + 8dp Grid** — `--md-spacing-{1..8}` tokens defined; the regression guard will catch any accidental reintroduction of old tokens during the page-level sweep.

No blockers. Phase 8 is complete.

---

*Phase: 08-md3-design-token-foundation*
*Plan: 03 (Wave 3)*
*Completed: 2026-07-24*
