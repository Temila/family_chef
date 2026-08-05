---
phase: 18-custom-editor-seasonal-auto-switch
reviewed: 2026-08-05T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - frontend/src/theme/theme-engine.js
  - frontend/src/theme/theme-engine.test.mjs
  - frontend/src/theme/season.js
  - frontend/src/theme/season.test.mjs
  - frontend/src/theme/solar-terms.js
  - frontend/src/theme/theme-context.jsx
  - frontend/src/theme/fouc-bootstrap.js
  - frontend/src/theme/index.js
  - frontend/src/theme/presets.js
  - frontend/src/pages/ThemeEditorPage.jsx
  - frontend/src/pages/ThemeSettingsPage.jsx
  - frontend/src/pages/ThemePage.jsx
  - frontend/src/css/theme-editor.css
  - frontend/src/css/theme-settings.css
  - frontend/src/css/theme-page.css
  - frontend/src/components/theme/ThemeCard.jsx
  - frontend/src/components/theme/ThemeCard.css
  - frontend/src/App.jsx
  - frontend/src/index.css
  - frontend/package.json
  - scripts/generate-solar-terms.py
  - frontend/src/api/client.js
  - backend/app/routers/themes.py
  - backend/app/services/custom_theme_service.py
findings:
  critical: 0
  warning: 5
  info: 7
  total: 12
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-08-05
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the Phase 18 implementation of the custom theme editor (react-colorful seeds, 9-variant chip row, scoped preview, POST/PUT/fork save semantics), the seasonal auto-switch pipeline (skyfield pre-generated solar-term table, local-timezone resolver, hemisphere inversion, D-09 mutex, cache-gated apply), and the UI wiring (routes, ThemeCard affordances, delete flow).

**Overall assessment:** The core engineering is solid. The nine-variant engine dispatch is correctly implemented against the real MCU `DynamicScheme` constructor contract (`sourceColorHct` + palette-override options verified against `node_modules/@material/material-color-utilities/dynamiccolor/dynamic_scheme.js`), with the TonalSpot legacy path byte-stable (regression test asserts `#056d37`/`#81d997`/`#ffffff`). Season resolver logic is correct — I independently verified today's date (2026-08-05) resolves to summer north / winter south, all four boundaries and the hemisphere bijection are exact, and randomized/local-timezone probes behave per the D-02 "精确到天" contract. All 23 tests pass (`node --test`), lint and token checks clean. Security focus areas checked out: theme names are React-escaped in every render path (text nodes + `aria-label` attributes), `theme.id` interpolated into scoped selectors is a backend integer or a fixed preset id (no injection), query-string handling is whitelisted/string-compared, card action events are properly `stopPropagation`-guarded, and the D-09 mutex is enforced at the context layer with the sole bypass restricted to the internal seasonal apply path.

The issues found are functional/UX defects rather than security or data-loss problems: a broken duplicate-name interception on the edit/rename path (backend 500), a stale-theme flash when the FOUC seasonal path and the ThemeContext initial state disagree, and a duplicated variant whitelist that undermines the declared single-source-of-truth contract.

## Warnings

### WR-01: Renaming a theme to an existing name raises an unhandled IntegrityError → HTTP 500; D-16 duplicate interception only works on the create path

**File:** `backend/app/services/custom_theme_service.py:69-79` (+ `backend/app/routers/themes.py:52-63`, `frontend/src/pages/ThemeEditorPage.jsx:262-272`)
**Issue:** `create_theme` pre-checks for a duplicate name and raises the Chinese `ValueError("已存在同名主题...")` which the router maps to 400 — but `update_theme` has **no duplicate pre-check** (it only checks ownership). Renaming theme A to the name of theme B therefore violates the `uq_custom_themes_user_name` unique constraint at `db.flush()`, raising an unhandled `sqlalchemy.exc.IntegrityError` (only `ThemePermissionError`/`ValueError` are caught in the PUT route). The API returns HTTP 500 `"Internal Server Error"` — the editor's `/同名|已存在|duplicate/i` remap (ThemeEditorPage.jsx:264) never matches, so the user sees an English "Internal Server Error" toast instead of the promised Chinese duplicate-name error (D-16 acceptance "重名时阻止保存并弹提示"). The edit/rename workflow is the phase's own headline feature, so this is a real functional gap.
**Fix:** Add the same duplicate pre-check to `update_theme`, excluding the theme itself:

```python
# custom_theme_service.update_theme, after the ownership check
if "name" in patch and patch["name"] != theme.name:
    dup = await db.execute(
        select(CustomTheme).where(and_(
            CustomTheme.user_id == current_user.id,
            CustomTheme.name == patch["name"],
        ))
    )
    if dup.scalar_one_or_none() is not None:
        raise ValueError(f"已存在同名主题: {patch['name']}")
```

### WR-02: FOUC bootstrap and ThemeContext disagree on the initial active theme — stale-theme flash on load when season auto-switch is on

**File:** `frontend/src/theme/fouc-bootstrap.js:34-51` vs `frontend/src/theme/theme-context.jsx:191,220-229`
**Issue:** With `fc_season_enabled === 'true'`, the FOUC script correctly prioritizes the season preset at first paint. But `ThemeProvider`'s initial `activeTheme` state (`useState(readActiveThemeFromStorage)`, line 191) reads only `fc_active_theme` and ignores the season switch. The mount apply effect (line 220) then re-injects the **stale** `fc_active_theme` CSS immediately after hydration, and only afterwards does the seasonal effect (line 332, via `queueMicrotask`) correct it. Whenever `fc_active_theme` ≠ the current season's preset — i.e., the first load after a season boundary crossed while the app was closed, or the first load after enabling the switch — the user sees a wrong-theme flash (season → stale → season) on every page load. This undermines the FOUC work and D-03's "evaluate once" intent for exactly the state auto-switch exists for.
**Fix:** Make the initial state read season-aware — e.g., in `readActiveThemeFromStorage`, when `fc_season_enabled === 'true'`, resolve the season preset first and return it (mirroring the FOUC precedence), or gate the apply effect's storage write/apply while `seasonEnabled` is true and let the seasonal path own first mount.

### WR-03: Editor hardcodes a second copy of the variant whitelist instead of importing `VARIANT_WHITELIST`

**File:** `frontend/src/pages/ThemeEditorPage.jsx:51-61`
**Issue:** 18-01 exported `VARIANT_WHITELIST` from `theme-engine.js` (lines 50-60) explicitly as the "single source of truth for editor, presets, and persisted themes", but `ThemeEditorPage` re-declares the same 9 strings as a private `VARIANT_OPTIONS` constant. If the whitelist ever changes (variant added/renamed/ordered), the engine, tests, and the editor chip row silently diverge — a saved theme could reference a variant the editor cannot select, and vice versa.
**Fix:**

```js
import { VARIANT_WHITELIST } from '../theme/theme-engine.js';
// chip row maps VARIANT_WHITELIST directly
{VARIANT_WHITELIST.map(variantName => ( ... ))}
```

### WR-04: Settings page ARIA wiring for the D-09 mutex warning is backwards/self-referential

**File:** `frontend/src/pages/ThemeSettingsPage.jsx:72-82,92-100`
**Issue:** The toggle `<input id={SEASON_TOGGLE_ID}>` has `aria-describedby={SEASON_TOGGLE_ID}` — a self-reference, so screen readers never announce the mutex warning. The `<aside>` warning also has `aria-describedby={SEASON_TOGGLE_ID}` pointing the wrong direction. The comment claims "aria-describedby 把提醒与开关控件显式关联" but the ids are miswired, so the prominent D-09 warning (a phase acceptance criterion) is invisible to assistive tech.
**Fix:** Give the warning an id and reference it from the input:

```jsx
<aside id="theme-settings-mutex-warning" role="note" aria-live="polite"> ... </aside>
...
<input id={SEASON_TOGGLE_ID} ... aria-describedby="theme-settings-mutex-warning" />
```

### WR-05: Cross-device sync toast claims "已同步最新主题" even when the D-09 mutex blocks the apply

**File:** `frontend/src/theme/theme-context.jsx:243-252`
**Issue:** In `refreshCustomThemes`, when the updatedAt conflict-resolution branch fires while `seasonEnabled=true`, `setActiveTheme(matchedFetchedTheme)` returns `false` (mutex no-op — correct), but the code unconditionally shows `已同步最新主题`. The user is told the theme was updated when it explicitly was not (by design). Additionally, `refreshCustomThemes` is recreated on every `activeTheme` change, which re-triggers the mount `useEffect` (line 260) and refetches `GET /themes` on every theme click.
**Fix:** Gate the toast on the mutex result and stabilize the callback identity:

```js
const applied = setActiveTheme(matchedFetchedTheme);
if (applied) showToast('已同步最新主题', 'success');
```
(and read `activeTheme` via a ref inside `refreshCustomThemes` so it needn't be a dependency, or split the sync effect from `activeTheme`.)

## Info

### IN-01: Season boundary is classified at local-day granularity, arriving up to ~23 h early in extreme timezones

**File:** `frontend/src/theme/season.js:64-68,71-79`
**Issue:** The term UTC instant is converted to the local calendar day and compared at day granularity (per D-02 "精确到天"). Verified: 2020 立春 = `2020-02-04T09:03:19Z` → local day Feb 3 in Pacific/Honolulu (UTC-10, instant falls 23:03 local) — the whole Feb 3 is classified spring though the astronomical boundary hits at 23:03. Same skew (up to ~17 h) applies in UTC+8. This matches the locked contract and tests, but is worth a comment in `season.js` so future maintainers don't "fix" it.
**Fix:** Add a code comment documenting the accepted day-resolution semantics and the westward skew bound.

### IN-02: Editor silently falls back to "new" mode when the `themeId` load fails, while the URL still carries `themeId`

**File:** `frontend/src/pages/ThemeEditorPage.jsx:154-181,262-272`
**Issue:** If `api.getThemes()` fails (network), the catch shows "加载自定义主题失败" but the draft remains the default 'new' draft while the URL still says `?themeId=<id>`. Saving then POSTs a brand-new theme the user never intended to create (or gets a confusing duplicate error). Consider navigating back or disabling save when the load failed.
**Fix:** Track a `loadFailed` state; on failure, show the error and either navigate back to `/theme` or disable the save button with a hint.

### IN-03: Dead branch — preset fork toast in auto mode is unreachable

**File:** `frontend/src/pages/ThemePage.jsx:88-92,168`
**Issue:** `handleEdit`'s `seasonEnabled` branch (toast "无法派生预设") can never execute: preset cards only receive `onEdit` when `!seasonEnabled` (line 168 supplies `undefined` in auto mode), so the 编辑 button is never rendered in auto mode. Harmless but misleading dead code.
**Fix:** Remove the branch, or keep it as defensive documentation.

### IN-04: Apply-effect catch conflates theme-derivation failure with localStorage write failure

**File:** `frontend/src/theme/theme-context.jsx:220-229,97-104`
**Issue:** `buildCssSync`/`injectThemeCss`/`writeActiveThemeToStorage` share one try/catch. If `localStorage.setItem` throws (quota, storage disabled — note the seasonal writers all have their own try/catch but `writeActiveThemeToStorage` does not), the user sees "主题应用失败，已恢复默认" and the theme is silently reset to default even though derivation succeeded.
**Fix:** Wrap `writeActiveThemeToStorage` in its own try/catch (matching the sibling writers), or split the catch blocks.

### IN-05: `queueMicrotask` wrappers inside effects add no cancellation and obscure the async flow

**File:** `frontend/src/theme/theme-context.jsx:262,334`
**Issue:** `queueMicrotask(() => { refreshCustomThemes(); })` and `queueMicrotask(() => { applyCurrentSeason(); })` are fire-and-forget with no cancellation on unmount/dep change; the stale-microtask ordering only happens to be safe because microtasks are FIFO. Direct `void refreshCustomThemes();` / `void applyCurrentSeason();` (or proper cancellation) is clearer.
**Fix:** Simplify to direct calls; add an `ignore`/`cancelled` flag if rapid hemisphere toggling is a concern.

### IN-06: Solar-term generator uses a CWD-relative ephemeris directory

**File:** `scripts/generate-solar-terms.py:71`
**Issue:** `Loader("./skyfield-data", ...)` resolves relative to the working directory; running the script from `scripts/` (instead of the repo root as the docstring instructs) silently creates a parallel `scripts/skyfield-data/` cache. Deterministic output is unaffected, but it's a footgun.
**Fix:** `Loader(str(Path(__file__).resolve().parent / "skyfield-data"), ...)`.

### IN-07: `aria-hidden` preview scope contains focusable primitives

**File:** `frontend/src/pages/ThemeEditorPage.jsx:349-355` (pattern inherited from `frontend/src/components/theme/ThemeCard.jsx:100`)
**Issue:** The `aria-hidden="true"` scope div (theme-card previews and the editor preview) contains real `<Button>`/`<Chip>` elements that remain in the tab order — an accessibility violation (focusable content inside `aria-hidden`). Pre-existing from Phase 17, but the editor replicates it.
**Fix:** Add `inert` semantics (e.g., `aria-hidden` + `tabIndex={-1}` on the preview primitives, or `inert` attribute on modern browsers) for the preview scopes.

---

*Reviewed: 2026-08-05*
*Reviewer: the agent (gsd-code-reviewer)*
*Depth: standard*