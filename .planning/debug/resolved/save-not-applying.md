---
status: diagnosed
trigger: "After saving a custom theme (POST/PUT), the card appears but clicking it doesn't change the page theme color. The card shows 'selected' but CSS isn't applied."
created: 2026-08-06T23:10:00Z
updated: 2026-08-06T23:10:00Z
---

# Debug: save-not-applying (UAT Test 6)

## Root Cause

**Same as seasonal-no-color-change (Test 9) + card-click-no-apply (Test 12).**

In Vite dev mode, `<style id="fc-dynamic-theme">` is inserted BEFORE Vite's CSS module injections (tokens.css, styles.css). Both target `:root` with identical specificity (0,1,0). Source order determines the winner — tokens.css loads LATER → wins → overrides dynamic theme variables.

The save flow is logically correct: `setActiveTheme(saved)` → `setActiveThemeState(normalizeTheme(saved))` → `useEffect[activeTheme]` fires → `buildCssSync()` → `injectThemeCss()` → `element.textContent = cssText`. The CSS IS rebuilt and written to the DOM element. But the cascade gives precedence to tokens.css, so the user sees no visual change.

The card "selected" indicator works because it's driven by React state (`activeTheme.id === theme.id`), not CSS variables.

## Cross-Reference

Full investigation: `.planning/debug/seasonal-no-color-change.md`

## Suggested Fix

In `frontend/src/theme/theme-engine.js:injectThemeCss()` (line 254-262), add `document.head.appendChild(element)` after setting `textContent` to ensure fc-dynamic-theme is always the LAST child of `<head>`:

```js
export function injectThemeCss(cssText) {
  let element = document.getElementById('fc-dynamic-theme');
  if (!element) {
    element = document.createElement('style');
    element.id = 'fc-dynamic-theme';
  }
  element.textContent = cssText;
  document.head.appendChild(element); // (re)append → always last → wins cascade
}
```

`appendChild` on an existing element MOVES it to the end. This is a one-line fix that resolves Tests 6, 9, AND 12.

## Files Involved

- `frontend/src/theme/theme-engine.js:254-262` — `injectThemeCss` does not re-order element
