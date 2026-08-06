---
phase: 18-custom-editor-seasonal-auto-switch
reviewed: 2026-08-07T00:00:00Z
depth: standard
base_commit: 2e7fa29
head: HEAD
files_reviewed: 5
files_reviewed_list:
  - frontend/src/theme/theme-engine.js
  - frontend/src/theme/theme-engine.test.mjs
  - frontend/src/components/theme/ThemePreview.jsx
  - frontend/src/pages/ThemeEditorPage.jsx
  - frontend/src/pages/ThemePage.jsx
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues-found
---

# Phase 18 Gap-Closure: Code Review Report

**Reviewed:** 2026-08-07
**Depth:** standard (per-file analysis + cross-reference to plan threat models)
**Scope:** 4 gap-closure plans (18-06, 18-07, 18-08, 18-09) closing 6 UAT gaps (Tests 5, 6, 8, 9, 10, 12)
**Base:** `2e7fa29` → **HEAD** (5 commits, frontend-only)
**Files Reviewed:** 5
**Status:** issues-found (2 informational findings; no blockers or warnings)

## Summary

Reviewed all 5 frontend source files changed during the Phase 18 gap-closure cycle against the 4 PLAN.md files (18-06 through 18-09) and their STRIDE threat models. The execution is high quality: each one-line / small-scope fix lands precisely where its plan specified, all 16 theme-engine tests pass, ESLint is clean, and the production build succeeds.

**Key verification outcomes (all focus areas cleared):**

1. **18-07 deviation handled correctly.** The plan's claim that `SchemeTonalSpot` IS `DynamicScheme(variant=TONAL_SPOT)` (byte-identical primary) was FALSE. The executor discovered `themeFromSourceColor` actually uses the deprecated `Scheme`/`CorePalette` path, not `DynamicScheme`. The new primary assertions (`#056d37`→`#316a42` light, `#81d997`→`#98d4a4` dark) are the ACTUAL MCU `DynamicScheme` output — proven by the passing `TonalSpot primary is unaffected by secondary/tertiary seed changes` test (asserts exact equality to `#316a42`) and the 3 new responsiveness regression tests. The deviation is documented thoroughly in `18-07-SUMMARY.md` under "Deviations from Plan" with MCU source-level root-cause analysis. Threat T-18-07-02's "accept" disposition covers this.
2. **18-06 cascade fix correctly placed.** The second `document.head.appendChild(element)` is AFTER `element.textContent = cssText` (theme-engine.js:230), NOT inside the `if (!element)` creation block. The first-call creation path (line 227) is preserved. Two distinct `appendChild` calls exist, exactly as the acceptance criteria require.
3. **18-08 one-line addition verified.** Exactly one `showToast(\`已存在同名主题：${finalName}\`, 'error')` line added to the duplicate-name catch branch (ThemeEditorPage.jsx:266), after the existing `setNameError` call, using the `'error'` variant. No other catch branch was modified.
4. **18-09 navigate removal is clean.** The `if (theme.kind === 'custom') { navigate(...) }` block was removed from `handleThemeClick`. `navigate` is still used 4 times elsewhere in ThemePage.jsx (handleNew:62, handleOpenSettings:66, handleEdit:82, handleEdit:91) — no unused-variable lint error. The `onEdit` wiring at line 166 is unchanged. Docstring at line 15 updated to reflect no-op behavior.
5. **Threat models hold.** All 9 STRIDE threats (T-18-06-01/02, T-18-07-01/02/03, T-18-08-01/02, T-18-09-01/02) have dispositions consistent with the implemented code. Input validation (`validateSourceColors` + `validateVariant`) runs before `deriveDynamicSchemes`; the cascade fix provides defense-in-depth; the D-09 mutex is strengthened by the navigate removal.

**Cross-file trace verified:** `buildCssSync` → `deriveDynamicSchemes` (all 9 variants unified) → `buildSchemeCss` reads both DIRECT_ROLES and palette tones; `injectThemeCss` is the sole injection point called from `theme-context.jsx`; `showToast` flows from `useToast()` → `ToastContext.jsx` SnackbarProvider. No circular imports introduced; the removed `themeFromSourceColor` import has no remaining functional references (only 2 historical comments in theme-engine.js:8,92).

The 2 findings below are informational quality observations — neither indicates a correctness defect, security gap, or data-loss risk in the gap-closure code.

## Narrative Findings (AI reviewer)

### IN-01: TonalSpot FOUC divergence is perceptible, not "cosmetically negligible"

**File:** `frontend/src/theme/theme-engine.js:194` (runtime derivation); `frontend/src/css/tokens.css:16,201` (static FOUC fallback)
**Issue:** After the 18-07 unification, TonalSpot's runtime primary is `DynamicScheme`-derived (`#316a42` light / `#98d4a4` dark), while the static `tokens.css` FOUC fallback retains the old `Scheme`/`CorePalette` values (`#056d37` light / `#81d997` dark). The plan (18-07-PLAN.md:242) and summary (18-07-SUMMARY.md:93) characterize this divergence as "cosmetically negligible (both are green)."

This characterization is optimistic: `#056d37` is RGB(5,109,55) — a dark, saturated forest green — while `#316a42` is RGB(49,106,66) — a noticeably lighter, muted grayish-green. The dark-mode pair (`#81d997` vs `#98d4a4`) differs similarly. Users will perceive a brief first-paint flash from one green to the other before `fc-dynamic-theme` overrides `tokens.css`. The 18-06 cascade fix ensures the correct (DynamicScheme) value wins at runtime, so this is strictly a FOUC concern, NOT a runtime correctness issue. The residual risk: if the dynamic-theme JS bundle fails to load (network error, parse failure), the page permanently shows the old green instead of the intended DynamicScheme palette — still a valid green theme, just not the one the theme engine would produce.

This is a documented, accepted trade-off (threat T-18-07-02 "accept" disposition) and is out of scope to fix in this gap closure. Noting only because the "negligible" framing undersells the perceptible delta.
**Fix:** In a future maintenance pass, regenerate `frontend/src/css/tokens.css` via `scripts/generate-tokens.cjs` (updated to use `DynamicScheme(Variant.TONAL_SPOT)`) so the FOUC fallback matches the runtime derivation. No action required for this gap-closure merge.

### IN-02: Adjacent empty-name catch branch lacks showToast (UX inconsistency)

**File:** `frontend/src/pages/ThemeEditorPage.jsx:267-268`
**Issue:** The 18-08 fix added `showToast(..., 'error')` to the duplicate-name catch branch so it shows BOTH an inline Input error AND a Snackbar popup. The adjacent empty-name branch (lines 267-268) still calls only `setNameError('主题名称不能为空')` with no accompanying `showToast`, creating a minor UX inconsistency: duplicate-name errors are doubly announced (inline + snackbar) while empty-name errors are inline-only.

This is pre-existing behavior (the empty-name branch never had `showToast`), explicitly out of scope for 18-08 ("Do NOT change any other branch"), and the empty-name case is typically caught client-side by `validateName()` (line 231) before the API call — so the backend's "主题名称不能为空" message only surfaces in edge cases where client/server trimming disagree. No correctness impact.
**Fix:** Optional consistency follow-up — add `showToast('主题名称不能为空', 'error')` to the empty-name branch to match the duplicate-name pattern. Defer to a separate UX-polish task; not required for this gap closure.

---

_Reviewed: 2026-08-07_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
_Verification: 16/16 theme-engine tests pass · ESLint clean · `npm run build` succeeds_
