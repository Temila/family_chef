---
phase: 12-page-level-refactor-8dp-grid-human-uat
plan: 00-BUGFIX
subsystem: ui
tags: [md3, ripple, react, playwright, bugfix, pointer-events]

# Dependency graph
requires:
  - phase: 08-md3-design-token-foundation
    provides: "--md-motion-duration-* / --md-motion-easing-* / --md-spacing-* tokens"
  - phase: 09-motion-state-layers
    provides: "Ripple.jsx, .md-interactive/.md-ripple-layer base.css, 48dp touch targets"
  - phase: 10-primitive-components
    provides: "Button/IconButton/FAB primitives with internal Ripple + forwardRef"
  - phase: 11-composite-navigation-components
    provides: "Sidebar (80dp rail + footer), Sidecar Header composite, ListItem wrap-mode Ripple"
provides:
  - "Hybrid Ripple self/wrap API restoring native mouse/touch click hit-testing on Button/IconButton/FAB"
  - "Single-header PcLayout (Sidecar Header removed, page-level Header preserved)"
  - "Sidebar footer theme-toggle + logout controls (theme first, 48dp targets in 56px rows)"
  - "pointer-events:auto on wrap-mode Ripple children (Sidebar nav/footer, BottomBar, Card clickable)"
  - "Playwright regression spec locking D-BUG-01/D-BUG-02 against future drift"
affects: [12-01A, 12-01B, 12-02, v1.2-UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ripple hybrid mode: mode='self' (cloneElement onto child button, no span wrapper) for primitives; mode='wrap' (span .md-ripple-layer) for composites"
    - "pointer-events re-enable: .md-ripple-layer > * { pointer-events: auto } to defeat CSS inheritance from the span's pointer-events:none"
    - "ref composition: composeRefs(consumerForwardedRef, internalRef) via cloneElement — reads children.ref (eslint-suppressed react-hooks/refs)"

key-files:
  created:
    - "frontend/tests/phase12-bugfix.spec.js — 10 Playwright regression tests (mouse/keyboard click, ripple-span, single-header, footer layout)"
    - "frontend/tests/fixtures/phase12-bugfix.html — test fixture entry"
    - "frontend/tests/fixtures/phase12-bugfix.jsx — mounts real primitives + real Sidebar/Header via seeded AuthProvider (no backend)"
  modified:
    - "frontend/src/components/primitives/Ripple.jsx — hybrid self/wrap API + motion tokens + ref composition"
    - "frontend/src/components/primitives/base.css — .md-ripple-layer > * pointer-events:auto fix"
    - "frontend/src/components/primitives/Button.jsx — mode='self'"
    - "frontend/src/components/primitives/IconButton.jsx — mode='self'"
    - "frontend/src/components/primitives/FAB.jsx — mode='self'"
    - "frontend/src/App.jsx — deleted <Header/> + import from PcLayout"
    - "frontend/src/components/composites/Sidebar.jsx — theme toggle in footer + reactive state"
    - "frontend/src/components/composites/Sidebar.css — footer grid var(--md-spacing-8) rows + 48px scoped override"

key-decisions:
  - "D-BUG-01 fix = Option 3 (cloneElement hybrid): self mode injects onPointerDown+geometry directly onto the native button, dropping the .md-ripple-layer span that created the stacking trap; wrap mode preserved for non-button composite consumers"
  - "Wrap-mode pointer-events inheritance fixed globally in base.css (.md-ripple-layer > * { pointer-events: auto }) rather than per-consumer inline style — fixes Sidebar nav + footer, BottomBar, and Card at once; ListItem had previously worked only because it passed style={{ pointerEvents:'auto' }}"
  - "Theme toggle in Sidebar footer uses useState for reactive Icon/label (切换浅色/切换深色) update on toggle; theme is the first footer child (more frequent action), logout second"
  - "Sidebar footer: grid with grid-auto-rows: var(--md-spacing-8) (56px) + scoped .md-sidebar__footer .md-sidebar__item { min-block-size: 48px } — 112px total, no overlap, nav items stay 80dp"
  - "Task 1 tdd='true' honored via Task 3 Playwright browser tests (project has no JS unit-test runner; Task 3 is the designated regression-test task)"

patterns-established:
  - "Pattern: Ripple mode='self' for primitive button wrappers; mode='wrap' (default) for composite non-button children"
  - "Pattern: footer action rows use var(--md-spacing-8) grid-auto-rows with 48dp scoped min-block-size overrides"
  - "Pattern: Playwright fixture mounts real production components via seeded localStorage AuthProvider (no backend/JWT dependency)"

requirements-completed: [UX-02, LOGIC-01, LOGIC-02, LOGIC-03]

# Metrics
duration: 40min
completed: 2026-07-28
---

# Phase 12 Plan 00: Bugfix Summary

**Restored native mouse/touch click on MD3 button primitives via Ripple hybrid self/wrap mode and removed the duplicate Sidecar Header, relocating theme/logout to a compact Sidebar footer — both v1.2 regressions locked behind 10 Playwright browser tests.**

## Performance

- **Duration:** 40 min
- **Started:** 2026-07-28T14:52:02Z
- **Completed:** 2026-07-28T15:31:53Z
- **Tasks:** 3
- **Files modified:** 8 (5 primitives/base, App.jsx, Sidebar.jsx, Sidebar.css)
- **Files created:** 3 (spec + 2 fixture files)

## Accomplishments
- **D-BUG-01 fixed:** Button, IconButton, and FAB now receive native mouse/touch `click` events. Ripple gained a hybrid API (`mode="self"` uses `cloneElement` to inject `onPointerDown` + geometry directly onto the child `<button>`, eliminating the `.md-ripple-layer` span stacking trap). Keyboard Tab+Enter continues to work. Wrap-mode (Sidebar/BottomBar/Card/ListItem) is unchanged.
- **D-BUG-02 fixed:** PcLayout no longer renders the Sidecar `<Header/>`; authenticated pages now show exactly one `<header>` (the page-level one). Theme toggle and logout relocated to the Sidebar footer — theme first (more frequent), logout second — as compact 48dp targets inside tokenized 56px rows (112px total vs the prior 160px double-80dp stack).
- **Motion tokens:** Ripple transition literals (500ms/150ms) replaced with `var(--md-motion-duration-long/short)` + `var(--md-motion-easing-emphasized/standard)`.
- **Regression locked:** 10 Playwright tests reproduce both bugs and prevent drift — real mouse clicks, keyboard Enter, `.ripple-span` creation, wrap-mode child clickability, single-`<header>` DOM count, theme `data-theme` toggle, logout auth clear, and footer/nav layout measurements.

## Task Commits

Each task was committed atomically:

1. **Task 1: Ripple self mode + primitive wiring** — `c39fbaf` (fix)
2. **Task 2: Remove Sidecar Header + relocate shell controls** — `83c4b93` (fix)
3. **Task 1 follow-up: wrap-mode pointer-events fix + lint suppression** — `02b1507` (fix, deviation)
4. **Task 3: Playwright regression spec** — `3c0ec4b` (test)

## Files Created/Modified
- `frontend/src/components/primitives/Ripple.jsx` — hybrid self/wrap API, ref composition, motion tokens
- `frontend/src/components/primitives/base.css` — `.md-ripple-layer > * { pointer-events: auto }` (deviation)
- `frontend/src/components/primitives/Button.jsx` — `mode="self"`
- `frontend/src/components/primitives/IconButton.jsx` — `mode="self"`
- `frontend/src/components/primitives/FAB.jsx` — `mode="self"`
- `frontend/src/App.jsx` — deleted `<Header/>` + unused import from PcLayout
- `frontend/src/components/composites/Sidebar.jsx` — theme toggle footer button + reactive state
- `frontend/src/components/composites/Sidebar.css` — footer grid + scoped 48px item override
- `frontend/tests/phase12-bugfix.spec.js` — 10 Playwright regression tests (NEW)
- `frontend/tests/fixtures/phase12-bugfix.html` — fixture entry (NEW)
- `frontend/tests/fixtures/phase12-bugfix.jsx` — real-component mount harness (NEW)

## Decisions Made
- **Ripple fix = Option 3 (cloneElement hybrid)** per RESEARCH §1 recommendation — the only solution that preserves ripple visuals while restoring the native click path. Self mode composes the consumer's forwarded ref (via `composeRefs`) so Button/IconButton/FAB `forwardRef` semantics are preserved.
- **Wrap-mode pointer-events fix is global (base.css)** rather than per-consumer — the `.md-ripple-layer { pointer-events: none }` is an inherited property, so all wrap-mode children silently inherited `none`. A single `.md-ripple-layer > *` rule fixes Sidebar nav/footer, BottomBar, and Card at once.
- **Theme toggle uses reactive `useState`** so the Icon and accessible name update immediately on toggle (the plan specified a "dynamic label"; state makes it truly dynamic rather than stale after first toggle).
- **Task 1 `tdd="true"` satisfied via Task 3** — the project has no JS unit-test runner; Task 3's Playwright browser tests are the designated regression coverage for Task 1's behavior (real mouse/keyboard hit-testing).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrap-mode Ripple children inherited `pointer-events: none`**
- **Found during:** Task 3 (browser verification of footer clickability)
- **Issue:** `base.css` sets `.md-ripple-layer { pointer-events: none }`. Because `pointer-events` is an inherited CSS property, every wrap-mode child (Sidebar nav buttons, Sidebar footer buttons, BottomBar tabs, Card) inherited `none` and was unclickable via mouse/touch. ListItem worked only because it passed `style={{ pointerEvents: 'auto' }}` inline. This directly blocked Task 2's footer deliverable and Task 3's wrap-mode click assertion. The plan's Task 1 `read_first` explicitly authorized base.css edits "if verification proves a CSS defect" — Task 3 verification proved it empirically (`elementFromPoint` returned the footer div, not the button; computed style showed `pointer-events: none` on the button).
- **Fix:** Added `.md-ripple-layer > * { pointer-events: auto }` in `base.css`. The span itself stays non-intercepting; children are re-enabled; the dynamically-inserted `.ripple-span` keeps its inline `pointer-events: none`.
- **Files modified:** `frontend/src/components/primitives/base.css`
- **Verification:** Playwright footer theme/logout tests pass; wrap-mode click test passes; `elementFromPoint` now returns the button.
- **Committed in:** `02b1507`

**2. [Rule 1 - Bug] Ripple.jsx `react-hooks/refs` lint on cloneElement ref composition**
- **Found during:** Task 3 (lint verification)
- **Issue:** The `composeRefs(children.ref, containerRef)` call needed to read `children.ref` during render to merge the consumer's forwarded ref — a necessary cloneElement ref-composition pattern. The React 19 `react-hooks/refs` rule flags this conservatively.
- **Fix:** Scoped `/* eslint-disable react-hooks/refs */` block around the `cloneElement` call with a justification comment. `.current` is never accessed during render.
- **Files modified:** `frontend/src/components/primitives/Ripple.jsx`
- **Verification:** `npx eslint Ripple.jsx` → 0 errors; total lint count did not increase beyond baseline.
- **Committed in:** `02b1507`

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 bug)
**Impact on plan:** Both auto-fixes were necessary for the plan's stated success criteria (clickable MD3 primitives + single-header layout). The base.css pointer-events fix is arguably part of D-BUG-01's scope (the same class of Ripple interaction regression). No scope creep; no backend changes; no new dependencies.

## Issues Encountered
- Playwright `getByLabel('按钮点击次数')` initially matched 3 outputs (substring of `图标按钮点击次数` / `浮动按钮点击次数`) — resolved with `{ exact: true }`. Not a production issue; test-locator hygiene only.
- Repo-root `test-results/` directory is untracked (Playwright output). `.gitignore` covers `frontend/test-results/` but not the repo-root variant. This is a pre-existing gitignore gap, out of scope for this plan — logged for awareness, not fixed.

## User Setup Required
None — no external service configuration required. No new dependencies added.

## Next Phase Readiness
- **Ready for 12-01A / 12-01B** — the interaction shell is now stable: mouse/touch clicks work on all primitives, the layout has a single header, and theme/logout are accessible. The page-level token sweep (8dp grid, emoji→Icon, motion, snackbar action) can proceed without fear of compounding the Ripple/Header regressions.
- **Ready for 12-02** — the Playwright fixture pattern (`phase12-bugfix.jsx` mounting real components via seeded AuthProvider) is reusable for the broader UAT compliance script.
- No blockers. Backend is completely untouched (LOGIC-02 verified).

## Verification Results
- `npm run build` — ✓ 0 errors (chunk-size advisory only)
- `npm run lint` — 97 errors (baseline ≥90 per STATE.md; only additions are 2 fixture `react-refresh` errors matching the existing snackbar/list-item fixture convention; all production source files clean)
- `npm exec playwright test -- phase12-bugfix.spec.js --reporter=line` — ✓ 10 passed
- `rg '<Header />|import Header' frontend/src/App.jsx` — ✓ no matches
- `rg -c 'Ripple mode="self"' Button/IconButton/FAB` — ✓ 1 per file
- `git diff --name-only -- backend` — ✓ empty (no backend changes)

---
*Phase: 12-page-level-refactor-8dp-grid-human-uat*
*Completed: 2026-07-28*

## Self-Check: PASSED

All 11 created/modified files exist on disk. All 4 task commits (c39fbaf, 83c4b93, 02b1507, 3c0ec4b) verified in git log. Acceptance criteria re-verified for all 3 tasks.
