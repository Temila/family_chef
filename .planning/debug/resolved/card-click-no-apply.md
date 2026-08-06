---
status: diagnosed
trigger: "In manual mode, clicking a theme card shows 'selected' indicator but page color doesn't change."
created: 2026-08-06T23:10:00Z
updated: 2026-08-06T23:10:00Z
---

# Debug: card-click-no-apply (UAT Test 12)

## Root Cause

**Same as save-not-applying (Test 6) + seasonal-no-color-change (Test 9).**

CSS cascade ordering in Vite dev mode. See `.planning/debug/seasonal-no-color-change.md` for full investigation.

ThemePage `handleThemeClick` → `setActiveTheme(theme)` → state updates → card shows "selected" → `useEffect[activeTheme]` → `injectThemeCss` writes new CSS to `<style id="fc-dynamic-theme">` → but tokens.css overrides due to source order.

## Cross-Reference

Full investigation: `.planning/debug/seasonal-no-color-change.md`

## Suggested Fix

Same one-line fix in `injectThemeCss` — re-append element to end of `<head>` on every call.

## Files Involved

- `frontend/src/theme/theme-engine.js:254-262` — `injectThemeCss` does not re-order element
