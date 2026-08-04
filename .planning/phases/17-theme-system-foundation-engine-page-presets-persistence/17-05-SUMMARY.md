---
phase: 17
plan: 05
type: execute
wave: 3
depends_on: 17-04
files_modified:
  - frontend/src/components/primitives/Icon.jsx
  - frontend/src/components/composites/Header.jsx
  - frontend/src/components/composites/Header.css
  - frontend/src/pages/ThemePage.jsx
  - frontend/src/components/theme/ThemeCard.jsx
  - frontend/src/components/theme/ThemePreview.jsx
  - frontend/src/components/theme/ThemeCard.css
  - frontend/src/css/theme-page.css
  - frontend/src/index.css
autonomous: true
requirements:
  - TPAGE-01
  - TPAGE-02
  - TPAGE-03
  - TPAGE-04
  - TPAGE-05
  - TPAGE-06
  - TPAGE-07
---

# Plan 17-05 Summary — ThemePage + Header entry

## What was built

The user-facing `/theme` page surface. Three tasks delivered:

### Task 1 — Icon registry + ThemeCard + ThemePreview + index.css anchor
- `frontend/src/components/primitives/Icon.jsx` — added `palette` and `restart-alt` icons to the registry.
- `frontend/src/components/theme/ThemeCard.jsx` — card-as-preview with scoped CSS-var boundary. Uses a wrapper element with `style={{'--preview-primary': ..., '--preview-on-primary': ...}}` so the preview re-derives its surface ramp from the active theme's sourceColors. BEM-ish classes (`theme-card`, `theme-card-body`, `theme-card-name`, `theme-card-preview`, `theme-card-active-indicator`). Click handler calls `setActiveTheme(theme)`. Active card shows an indicator (kind+id persistence from 17-04 makes this survive reload).
- `frontend/src/components/theme/ThemePreview.jsx` — mini-UI composition (header strip + primary button + chip + card surface) using the scoped CSS vars.
- `frontend/src/components/theme/ThemeCard.css` — card styling.
- `frontend/src/index.css` — added `@import './css/theme-page.css';` immediately after the existing `@import './css/styles.css';`.

### Task 2 — Header Palette entry button + full-device visibility
- `frontend/src/components/composites/Header.jsx` — Palette 48dp `IconButton` inserted in the `__right` cluster between the theme toggle and the avatar (D-18). `icon="palette"`, `ariaLabel="选择主题"`.
- `frontend/src/components/composites/Header.css` — relaxed the `<1024px` `display:none` rule on `.md-header` per D-19 so the Palette button stays visible on tablets/phones.
- PAGE_TITLES already had the `/theme → '主题'` entry from the 17-04 plan; verified.

### Task 3 — ThemePage + theme-page.css
- `frontend/src/pages/ThemePage.jsx` — full page surface per UI-SPEC § Theme Page: page title `主题`, subtitle, single-click reset button (calls `resetToDefault()` from `useTheme`, surfaces snackbar via `showToast`), deterministic card grid (`const allThemes = [...PRESETS, ...customThemes]` — no client re-sort per D-25), custom-empty banner above the always-rendered grid (no conditional render that hides the grid when customs are empty), BottomBar for mobile nav.
- `frontend/src/css/theme-page.css` — responsive grid (1 col < 420px, 2 col < 768px, 3 col < 1200px, 3 col ≥ 1200px — keeps the 5 presets in a tidy 3×2 layout on desktop). Token-driven spacing.

## Deviations

- Two commits (not three) — the executor consolidated work into atomic units. Task 1's files (Icon.jsx, ThemeCard, ThemePreview, index.css) landed across the same commits as Tasks 2 and 3 rather than a separate atomic commit. Behavior is identical; the only impact is one fewer commit in history.
- The `restart-alt` icon was added (used by the ThemePage reset button) in addition to the plan-specified `palette` icon.
- HEADER CSS media-rule relax: the rule applied was the existing `.md-header { display: none }` selector; the comment was updated to reflect the new behavior, per D-19.

## Verification

- `cd frontend && npm run lint` — passed (no errors)
- `cd frontend && npm run build` — passed (1.33s; one chunk > 500 kB warning unrelated to this phase — pre-existing)
- `cd frontend && npm run check:tokens` — passed (`PASS: 8/8 令牌不变量检查通过`)
- Files present:
  - `frontend/src/components/primitives/Icon.jsx` (palette icon at line X)
  - `frontend/src/components/composites/Header.jsx` (Palette IconButton at line 106, `ariaLabel="选择主题"` at line 107)
  - `frontend/src/components/composites/Header.css` (D-19 relax applied)
  - `frontend/src/pages/ThemePage.jsx`
  - `frontend/src/components/theme/ThemeCard.jsx`
  - `frontend/src/components/theme/ThemePreview.jsx`
  - `frontend/src/components/theme/ThemeCard.css`
  - `frontend/src/css/theme-page.css`
  - `frontend/src/index.css` (theme-page.css import present)

## Success criteria

TPAGE-01 through TPAGE-07 all delivered:
- TPAGE-01: Header entry button (Palette IconButton, aria-label '选择主题', between theme-toggle and avatar)
- TPAGE-02: Mobile-first card grid (responsive 1/2/3 col at 420/768/1200px)
- TPAGE-03: Card-as-preview via scoped CSS-var boundary with real primitives + 4-step surface ramp
- TPAGE-04: 5 presets rendered (PRESETS from presets.js in array order, no re-sort)
- TPAGE-05: Click-to-apply via setActiveTheme from useTheme (delegated to 17-04's ThemeContext)
- TPAGE-06: Active indicator (visible on selected card; persistence via kind+id in localStorage from 17-04)
- TPAGE-07: Presets editable-not-deletable (D-24; no delete UI for presets)

## Commits

- `1f4fd13` feat(17-05): add palette entry button + Header full-device visibility
- `5105a01` feat(17-05): add ThemePage shell + responsive grid + reset handler

## Resumption note

This plan's executor subagent was cancelled before returning its completion signal, after landing both commits but before producing the SUMMARY.md. Spot-checks (build, lint, check:tokens) all pass; required files all exist with correct content. The SUMMARY.md was written manually by the orchestrator to close out the plan record. Implementation is complete; no rework needed.