---
phase: 18-custom-editor-seasonal-auto-switch
plan: 06
subsystem: ui
tags: [css-cascade, dom-ordering, vite-dev-mode, md3-theme, theme-engine, fouc]

# Dependency graph
requires:
  - phase: 17-theme-system-foundation-engine-page-presets-persistence
    provides: "injectThemeCss + FOUC bootstrap + fc-dynamic-theme <style> contract"
  - phase: "18-07"
    provides: "refactored theme-engine.js (deriveDynamicSchemes unified path) — 18-06 depends_on 07, serialized after it"
provides:
  - "injectThemeCss now guarantees fc-dynamic-theme is the LAST <style> in <head> on every call, winning the CSS cascade in both Vite dev and production modes"
  - "Closes UAT Tests 6 (save-not-applying), 9 (seasonal-no-color-change), 12 (card-click-no-apply) — all share the single root cause"
affects: [theme-context, fouc-bootstrap, theme-editor-page, theme-settings-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "appendChild(existingElement) as DOM re-ordering idiom — moves an already-attached node to the END of its parent's children list, reclaiming CSS cascade precedence without detach/insertBefore"

key-files:
  created: []
  modified:
    - frontend/src/theme/theme-engine.js

key-decisions:
  - "appendChild-on-every-call (fix option a) chosen over selector-specificity bump (option b `:root:root`) — re-ordering is the cleanest fix; it preserves the existing :root specificity contract and works for both dev and production modes"
  - "Fix applies to BOTH dev and production for consistency, even though production already works (FOUC bootstrap runs after CSS link in dist) — defense-in-depth against any future stylesheet injected after fc-dynamic-theme"

patterns-established:
  - "Dynamic theme injection must always re-append to end of <head> — any future code that injects CSS variables via a <style> tag should follow this pattern to win the cascade"

requirements-completed:
  - FND-02
  - EDIT-03
  - EDIT-05
  - SEAS-02

# Metrics
duration: 1min
completed: 2026-08-06
---

# Phase 18 Plan 06: CSS Cascade Ordering Fix Summary

**One-line fix (`document.head.appendChild(element)`) in `injectThemeCss` ensures `fc-dynamic-theme` is always the last `<style>` in `<head>`, closing UAT Tests 6/9/12 where Vite dev-mode `tokens.css` was overriding the dynamic theme**

## Performance

- **Duration:** 1 min
- **Started:** 2026-08-06T16:19:37Z
- **Completed:** 2026-08-06T16:20:41Z
- **Tasks:** 2
- **Files modified:** 1

## Root Cause

In Vite dev mode, the FOUC bootstrap creates `<style id="fc-dynamic-theme">` early, but Vite's CSS-module runtime (`/@vite/client` `updateStyle`) then injects `tokens.css` and `styles.css` as additional `<style>` tags **after** it. Both stylesheets target `:root` with identical specificity `(0,1,0)`, so source order decides the winner. Because `tokens.css` loaded later, it silently overrode every dynamic theme variable — making ALL runtime theme changes (save, card-click, seasonal toggle) invisible in dev mode. Production builds were unaffected because the FOUC bootstrap runs after the CSS `<link>` in `dist/index.html`.

The theme logic chain (`setActiveTheme` → `useEffect[activeTheme]` → `buildCssSync` → `injectThemeCss`) was verified correct across three debug sessions (`.planning/debug/seasonal-no-color-change.md`, `save-not-applying.md`, `card-click-no-apply.md`) — the only defect was the DOM ordering, not the logic.

## Accomplishments

- **Closed 3 UAT gaps with a single one-line change** — Tests 6, 9, and 12 all shared the exact same root cause (CSS cascade ordering), so the `appendChild` reorder fixed all three simultaneously.
- **Defense-in-depth cascade guarantee** — `injectThemeCss` now re-appends `fc-dynamic-theme` to the end of `<head>` on EVERY call, so even if a buggy or malicious stylesheet is injected later, the next theme change reclaims cascade precedence.
- **Zero behavioral regression** — all 26 existing theme-engine + season tests pass unchanged; the change is DOM-only (`document.head.appendChild`), which Node tests cannot exercise but which leaves CSS generation logic (`buildCssSync`, `deriveDynamicSchemes`) completely untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Re-append fc-dynamic-theme to end of head on every injectThemeCss call** — `82b0256` (fix)
2. **Task 2: Run full theme test suite and verify cascade ordering in build output** — no commit (verification-only task; produces no file changes)

**Plan metadata:** pending (this SUMMARY commit)

## Files Created/Modified

- `frontend/src/theme/theme-engine.js` — `injectThemeCss` now calls `document.head.appendChild(element)` after `element.textContent = cssText;` (line 230), in addition to the existing `appendChild` in the `if (!element)` creation block (line 227). JSDoc updated to document the cascade-ordering guarantee.

## injectThemeCss — Before / After

**Before (the bug):**
```js
export function injectThemeCss(cssText) {
  let element = document.getElementById('fc-dynamic-theme');
  if (!element) {
    element = document.createElement('style');
    element.id = 'fc-dynamic-theme';
    document.head.appendChild(element);
  }
  element.textContent = cssText;
  // ← element stayed where it was first appended; later-injected Vite CSS modules won the cascade
}
```

**After (the fix):**
```js
export function injectThemeCss(cssText) {
  let element = document.getElementById('fc-dynamic-theme');
  if (!element) {
    element = document.createElement('style');
    element.id = 'fc-dynamic-theme';
    document.head.appendChild(element);
  }
  element.textContent = cssText;
  document.head.appendChild(element); // ← MOVES element to END of <head>; always wins cascade
}
```

## Decisions Made

- **Fix option (a) `appendChild`-on-every-call over option (b) `:root:root` specificity bump.** The debug session (`seasonal-no-color-change.md`) identified two viable fixes. Option (a) was chosen because it preserves the existing `:root` specificity contract (avoiding cascading side-effects on any `:root`-descendant overrides) and is a single standard DOM idiom. Option (b) would have required regenerating all dynamic CSS with a doubled selector, increasing risk of unintended specificity battles.
- **Apply to both dev and production modes.** The bug only manifested in Vite dev mode (production's FOUC bootstrap already runs after the CSS link), but the fix is applied unconditionally for defense-in-depth — it costs nothing (a no-op move when the element is already last) and protects against any future stylesheet injected after `fc-dynamic-theme`.

## Verification Results

All automated gates passed (Task 2):

| Gate | Command | Result |
|------|---------|--------|
| Theme tests | `node --test src/theme/theme-engine.test.mjs src/theme/season.test.mjs` | 26 pass, 0 fail |
| Lint | `npm run lint -- --quiet` | exit 0 (clean) |
| Build | `npm run build` | built in 1.13s |
| Structural | `rg -c "document.head.appendChild" frontend/src/theme/theme-engine.js` | 2 (line 227 creation + line 230 reorder) |

**Note:** The DOM cascade ordering fix (`appendChild` moves element to end of head) cannot be verified in Node.js (no DOM). Human UAT re-testing of Tests 6, 9, 12 is the final gate.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 3 cascade-ordering UAT gaps (Tests 6, 9, 12) are code-fixed and ready for human UAT re-testing in `npm run dev`.
- The remaining Phase 18 UAT gaps (Test 5 secondary/tertiary preview, Test 8 duplicate-name Snackbar, Test 10 auto-mode no-op card click) were closed by sibling plans 18-07, 18-08, 18-09 respectively.
- No blockers.

## Self-Check: PASSED

- FOUND: `.planning/phases/18-custom-editor-seasonal-auto-switch/18-06-SUMMARY.md`
- FOUND: `82b0256` (Task 1 commit)
- `document.head.appendChild` count in theme-engine.js: **2** (line 227 creation + line 230 reorder) ✓
- All acceptance criteria re-verified after SUMMARY creation.

---
*Phase: 18-custom-editor-seasonal-auto-switch*
*Completed: 2026-08-06*
