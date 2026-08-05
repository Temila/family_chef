---
phase: 18-custom-editor-seasonal-auto-switch
plan: 03
subsystem: theme-editor
tags: [react-colorful, theme-editor, scoped-preview, md3-variants, custom-theme]

# Dependency graph
requires:
  - phase: 17-theme-system-foundation-engine-page-presets-persistence
    provides: buildCssSync + ThemeContext apply + 5 preset source colors + scoped ThemeCard CSS-var boundary
  - phase: 18-custom-editor-seasonal-auto-switch/18-01
    provides: Nine-variant MCU dispatch (VARIANT_WHITELIST)
  - phase: 18-custom-editor-seasonal-auto-switch/18-02
    provides: Blocking package legitimacy gate — react-colorful@5.8.0 approved
provides:
  - react-colorful@^5.8.0 runtime dependency + lockfile entry
  - /theme/editor independent route page (deep-linkable via themeId / preset query)
  - Three seed-color (primary/secondary/tertiary) HexColorPicker + HexColorInput editing controls
  - Nine-variant horizontally scrollable filter Chip row with selected-state styling
  - Scoped live preview via data-fc-theme-scope="editor-preview" with rewritten :root / [data-theme="dark"] selectors and textContent-only style updates
  - Save flow: name trim+validate (blank/whitespace/>100 blocked), POST for new+fork, PUT for existing custom; duplicate-name error surfaced in Chinese
  - Manual-mode setActiveTheme guard via seasonEnabled hookup point (Plan 18-04)
affects: [18-05-route-registration-and-guard-actions, theme-engine, theme-context, theme-page, presets]

# Tech tracking
tech-stack:
  added:
    - react-colorful@^5.8.0 (omgovich/react-colorful, HexColorPicker + HexColorInput)
  patterns:
    - "Scoped CSS-var preview pattern: rewrite :root → [data-fc-theme-scope=\"editor-preview\"] and [data-theme=\"dark\"] → [data-fc-theme-scope=\"editor-preview\"][data-theme=\"dark\"]; assign textContent directly during draft changes"
    - "Draft/source-of-truth split: editor holds local sourceColors + variant; active application theme is left untouched until explicit 保存"
    - "POST / PUT / fork dispatch: editor.mode decides which API call; preset fork re-uses preset seeds with prefilled 我的春/夏/秋/冬 name"
    - "seasonEnabled guard for D-09 mutex: destructured with default false so Plan 18-04 hookup does not break earlier code"

key-files:
  created:
    - frontend/src/pages/ThemeEditorPage.jsx
    - frontend/src/css/theme-editor.css
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/src/index.css

key-decisions:
  - "Scoped preview identity locked to data-fc-theme-scope=\"editor-preview\" (constant SCOPE_ID) so it cannot collide with the per-theme ThemeCard scopes that use theme.id — same selector rewrite pattern as ThemeCard.jsx"
  - "HexColorInput/HexColorPicker state stored as plain string at React level; picker re-render is gated by HexColorPicker's internal memo (X(model)) so we only re-render on actual hex changes"
  - "Name validation runs before any API call — empty / whitespace / >100 / duplicate all surface via Chinese error on the Input primitive; duplicate is detected server-side and re-mapped to setNameError (uq_custom_themes_user_name)"
  - "POST request body uses source_colors snake_case (matches backend Pydantic SourceColors schema); PUT body uses source_colors too — client normalizes source_colors → sourceColors only for in-memory state"
  - "Preset fork name table is a static const PRESET_FORK_NAMES keyed by preset id — no UI clone of preset.name, fork name is locked per D-15 (\"我的春/夏/秋/冬\")"
  - "seasonEnabled guard defaults to false so the editor works in isolation today; Plan 18-04 adds seasonEnabled to useTheme() without touching the editor"
  - "useTheme() consumed via destructure with default value ({ seasonEnabled = false }) — no extra guard, no explicit conditional destructure"

patterns-established:
  - "Inline style.scopedCss rewrite at useMemo time: useMemo wraps buildScopedCss(sourceColors, variant); useEffect assigns result to scoped style ref.current.textContent — no React render of the style body"
  - "Editor view = single page-container with Header(showBack) + sectioned form; BottomBar reused without role-specific overrides"

requirements-completed: [EDIT-01, EDIT-03, EDIT-04, EDIT-05]

# Metrics
duration: 10 min
completed: 2026-08-05
---

# Phase 18 Plan 03: Scoped-Preview Theme Editor + react-colorful Dependency

**Independent /theme/editor route with three HexColorPicker+HexColorInput seeds, 9-variant Chip row, scoped [data-fc-theme-scope="editor-preview"] live preview, POST/PUT/fork save semantics, and seasonEnabled mutex hookup for Plan 18-04.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-05T03:32:25Z
- **Completed:** 2026-08-05T03:42:57Z
- **Tasks:** 2
- **Files modified:** 5 (1 added `react-colorful` dep, 1 regen lockfile, 1 new editor page, 1 new editor css, 1 css index import)

## Accomplishments

- `react-colorful@^5.8.0` declared in `frontend/package.json` dependencies and resolved into `frontend/package-lock.json` (`node_modules/react-colorful` entry + integrity hash). The lockfile preserves every existing dependency (notably `@material/material-color-utilities@^0.4.0`).
- New `ThemeEditorPage` mounted on `/theme/editor` (independent route, deep-linkable). Uses `Header showBack` + `BottomBar` + `useSearchParams` per D-12. Three initialization modes:
  - `/theme/editor` → from `DEFAULT_PRESET` (`mode: 'new'`)
  - `/theme/editor?themeId=<id>` → from matching custom theme loaded via `api.getThemes()` (`mode: 'edit'`, `originalId` retained)
  - `/theme/editor?preset=<spring|summer|autumn|winter>` → fork with that preset's seeds + variant + prefilled `我的春/夏/秋/冬` (`mode: 'fork'`)
- Three `SeedColorControl` components (primary / secondary / tertiary), each pairing a `HexColorPicker` with a prefixed `HexColorInput`. Both round-trip through a `HEX_COLOR_RE` validator that drops invalid values silently — the engine itself rejects malformed seeds.
- Nine `Chip variant="filter"` components in exact English order (TonalSpot first, FruitSalad last) inside a horizontal `overflow-x:auto` row. Selected chip toggles via the `selected` prop on the filter variant (which is the Chip primitive's secondary-container selected state — no extra CSS needed).
- Scoped preview: `<style id="editor-preview-style" ref={scopedStyleRef} />` lives next to `<div data-fc-theme-scope="editor-preview">`. A `useMemo` over `(sourceColors, variant)` calls `buildScopedCss(...)` which rewrites `:root` → `[data-fc-theme-scope="editor-preview"]` and `[data-theme="dark"]` → `[data-fc-theme-scope="editor-preview"][data-theme="dark"]`. A `useEffect` assigns the result to `styleRef.current.textContent` — direct DOM mutation, no React render of the style body, no `injectThemeCss` / `setActiveTheme` / `fc_active_theme` write during draft.
- Save flow: client-side `validateName()` trims and rejects empty / whitespace-only / >100-char names (each with a dedicated Chinese message via `setNameError`); API call chooses POST (`mode: 'new' | 'fork'`) vs PUT (`mode: 'edit' && originalId`); success runs `refreshCustomThemes()` and `setActiveTheme(saved)` only when `seasonEnabled` is false; toast reflects the manual-vs-auto branch; navigate to `/theme` only after the mutation resolves.
- Error mapping: 4xx response with the backend's `已存在同名主题` (Pydantic ValueError "已存在同名主题") is rewritten to the input error state in Chinese. Network / other failures go through `showToast`.
- CSS is fully token-driven (`--md-*` only, no hex literals). Editor CSS file imports via `src/index.css` after `theme-page.css`. Spacing grid + responsive 1→2→3 column layout mirrors ThemePage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add and lock the approved react-colorful runtime dependency** - `115c176` (feat)
2. **Task 2: Implement the independent scoped-preview editor and save semantics** - `2863525` (feat)

## Files Created/Modified

- `frontend/package.json` — Added `"react-colorful": "^5.8.0"` between `react` and `react-dom` in `dependencies`. No other dependency changed.
- `frontend/package-lock.json` — Regenerated with `node_modules/react-colorful` block (version, resolved URL, integrity, MIT license, peerDependencies on react/react-dom >=16.8.0). Existing blocks unchanged.
- `frontend/src/pages/ThemeEditorPage.jsx` (new) — Full route page. Imports `HexColorPicker`, `HexColorInput` from `react-colorful`; `buildCssSync` from `theme-engine`; `DEFAULT_PRESET, PRESETS` from `presets`; `useTheme` from `theme-context`; `api` from `client`; `useToast`; `Header, BottomBar, Input, Chip, Card, Button, Loading, ThemePreview` primitives. Exports default `ThemeEditorPage`. Uses `useSearchParams` for deep-link parsing and `useNavigate` for save/cancel. State management: `draft (mode/name/sourceColors/variant/originalId)`, `loadingCustom`, `saving`, `nameError`. Refs: `scopedStyleRef` for the scoped `<style>` element.
- `frontend/src/css/theme-editor.css` (new) — `.theme-editor` page layout (mobile-first), `.theme-editor__seed-grid` (1/2/3 columns at 0/480/768px), `.theme-editor__seed-picker` to constrain react-colorful to 220px max-width, `.theme-editor__chip-row` horizontal scroll, `.theme-editor__preview-card` + `.theme-editor__preview-scope` to host the ThemePreview primitive inside the data-fc-theme-scope div, `.theme-editor__actions` for the 保存/取消 row, narrow-screen reverse-stack override at <420px.
- `frontend/src/index.css` — Added `@import './css/theme-editor.css';` after `theme-page.css` import.

## Decisions Made

- **Style element pattern: textContent over dangerouslySetInnerHTML.** The first render has an empty `<style id="editor-preview-style" />`. The `useEffect` immediately assigns the scoped CSS to `textContent` on mount and on every draft change. This avoids React's reconciliation loop on the style body and keeps the dragging latency invisible — the preview updates during the same animation frame as the `onChange` callback.
- **SCOPE_ID is a string constant, not the theme's id.** Editor preview is a singleton (one editor at a time), so using a stable `"editor-preview"` id avoids competing with ThemeCard's `theme.id` scopes on the /theme page when the user opens the editor from a card.
- **`seasonEnabled` default false via destructuring.** `const { setActiveTheme, refreshCustomThemes, seasonEnabled = false } = useTheme();` means the editor works correctly today and Plan 18-04 only needs to add the `seasonEnabled` field to the context value object — no editor-side change required.
- **POST vs PUT dispatch via draft.mode.** A preset fork uses `mode: 'fork'` and dispatches POST (the fork seeds are treated as a brand-new theme). Editing existing custom (`mode: 'edit' && originalId`) uses PUT against `/api/themes/{originalId}`. The branch is explicit so future preset-fork variants (e.g., saving into another user's library) can be added without ambiguity.
- **`useMemo` over `(sourceColors, variant)` rebuilds the scoped CSS only when those change.** The whole editor re-renders on text-input changes too, but `buildScopedCss` is cheap (single MCU call + two string replaces) and we only do the work when the inputs that affect the CSS actually change.
- **`<style>` lives outside the scoped div.** The selector rewrite points *into* the scope, but the style element itself doesn't need to be inside — it just needs to be in document order before the preview mounts. Putting it as a sibling keeps the React tree minimal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm peer-dependency resolution required --legacy-peer-deps**
- **Found during:** Task 1 — first `npm install` after adding react-colorful
- **Issue:** npm 11+ raised ERESOLVE because the existing lockfile's react-dom@19.2.6 was reported as `react-dom@undefined` to the resolver when react-colorful@5.8.0 declared `peer react-dom@>=16.8.0`. The blocker is a known npm/node interaction with package metadata when react-dom's package.json is installed but the resolver can't see the version field through the workspace's `package.json` index. (Lockfile resolution ultimately succeeds — the issue is only in the install-time peer check.)
- **Fix:** Used `npm install --legacy-peer-deps` for this one install. react-colorful's only peer requirements (`react >=16.8.0`, `react-dom >=16.8.0`) are trivially satisfied by the project's `react@^19.2.5` and `react-dom@^19.2.5` — no semantic correctness lost. The lockfile is unchanged from what `npm install` would have produced; `--legacy-peer-deps` only suppresses the peer-overlap error.
- **Files modified:** none (install-time only); lockfile generated normally
- **Verification:** `node -e "..."` check confirms `dependencies.react-colorful === '^5.8.0'` and `packages['node_modules/react-colorful']` exists. `npm run build` succeeds with the same 916.25 kB main bundle.
- **Committed in:** not committed separately (install-time artifact)

**2. [Rule 1 - Bug] React-hooks lint: setLoadingCustom(true) inside effect body**
- **Found during:** Task 2 — first `npm run lint -- --quiet` after writing the editor page
- **Issue:** The `useEffect` that loads an existing custom theme (themeId path) called `setLoadingCustom(true)` synchronously inside the effect body. The repo's eslint config (react-hooks plugin) flags this as cascading-renders anti-pattern; the plan did not anticipate this lint rule.
- **Fix:** Initialized `loadingCustom` lazily via `useState(Boolean(themeIdParam))` — if a themeId is present we already know we'll be loading. The effect body now only does `setLoadingCustom(false)` inside the `finally` block, which is allowed because it is conditional on the awaited promise.
- **Files modified:** `frontend/src/pages/ThemeEditorPage.jsx`
- **Verification:** `npm run lint -- --quiet` exits 0. `npm run build` succeeds.
- **Committed in:** `2863525` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking install, 1 bug-fix lint).
**Impact on plan:** Both deviations necessary for correctness. No semantic deviation from D-12~D-16 — the spec's contract strings (`HexColorPicker`, `HexColorInput`, `data-fc-theme-scope="editor-preview"`, `api.createTheme`, `api.updateTheme`, `TonalSpot`, `FruitSalad`, `setActiveTheme`, `refreshCustomThemes`) all present and verified.

## Issues Encountered

- The first draft of `ThemeEditorPage.jsx` used `require('../theme/theme-context.jsx')` inside a helper function and `dangerouslySetInnerHTML` on the scoped `<style>`. Both were rewritten before lint — the project is ESM (`"type": "module"` in `package.json`), so `require` would crash at runtime; and `dangerouslySetInnerHTML` combined with the `useEffect`-driven `textContent` assignment would cause a double-write on every change (initial render via dangerouslySetInnerHTML, then immediate overwrite by useEffect on mount). The final implementation uses ES module imports and a single textContent write — both more correct and smaller.
- `npm install react-colorful` peer-dependency resolution required `--legacy-peer-deps` (documented above). The repo's existing dependency tree has many React 19.2.5 packages and no peer-dep conflicts; this is a known npm 11 quirk, not a project issue.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. All editor paths route through real `api.createTheme` / `api.updateTheme` / `api.getThemes` calls, and the scoped preview produces real MD3-derived CSS.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: editor_validation_extension | frontend/src/pages/ThemeEditorPage.jsx | T-18-07 mitigation: `HEX_COLOR_RE` rejects non-`#RRGGBB` values before any draft mutation; variant options are an inline whitelist of the 9 engine identifiers; `validateName()` trims and bounds 1–100 chars before API calls; empty / whitespace / >100 names surface Chinese errors via the Input primitive. |
| threat_flag: xss_safe_rendering | frontend/src/pages/ThemeEditorPage.jsx | T-18-08 mitigation: name is rendered through the `Input` primitive (React text node), never concatenated into selectors; generated CSS is scoped to the fixed `editor-preview` identifier; preset names are matched by id (no string interpolation of preset.name). |
| threat_flag: repudiation_safe_save | frontend/src/pages/ThemeEditorPage.jsx | T-18-09 mitigation: `await` on `api.createTheme` / `api.updateTheme`; `await refreshCustomThemes()` after success; navigate only after the mutation resolves; failure surface as Chinese toast and/or Input error; `saving` state disables double-submit. |
| threat_flag: scoped_preview_no_app_repaint | frontend/src/pages/ThemeEditorPage.jsx | T-18-03 mitigation (theme-engine scoped style): drag-time updates go to a scoped `<style>` element via `textContent`, never to the global `fc-dynamic-theme` style; `setActiveTheme` is not called during draft changes, so the active application theme does not re-derive. |
| threat_flag: package_pinning_lock | frontend/package.json + frontend/package-lock.json | T-18-SC mitigation: react-colorful is pinned to `^5.8.0` (Plan 18-02 approved package); `npm install` produced a lockfile entry with integrity hash; no Skyfield or other disallowed package was added to runtime manifests. |

## Next Phase Readiness

- **18-04 (Seasonal auto-switch):** Editor's `seasonEnabled` destructure is a no-op today; adding `seasonEnabled` to `useTheme()` will switch the editor into "save but don't apply" mode automatically. No editor change required.
- **18-05 (Route registration + guarded card actions + deletion):** `ThemeEditorPage.jsx` exports a default component ready to be mounted at `/theme/editor` (under `ProtectedRoute requiredRoles={['user','chef','admin']}`). The "新建" / "编辑" entry points on `ThemePage` and `ThemeCard` are deferred to 18-05 — this plan does not register the route (per the prompt's constraint).
- **Backend:** No backend changes required. Existing `/api/themes` endpoints (POST/PUT/GET) accept the editor's payloads (`source_colors` snake_case, `variant`, `name 1–100`).

## Self-Check: PASSED

- `frontend/package.json` exists, contains `"react-colorful": "^5.8.0"` in dependencies, and preserves `@material/material-color-utilities` at `^0.4.0`.
- `frontend/package-lock.json` contains `node_modules/react-colorful` block with `version: 5.8.0` and integrity hash.
- `frontend/src/pages/ThemeEditorPage.jsx` exists, imports `HexColorPicker` and `HexColorInput` from `react-colorful`, contains all 9 contract strings (`HexColorPicker`, `HexColorInput`, `data-fc-theme-scope="editor-preview"`, `api.createTheme`, `api.updateTheme`, `TonalSpot`, `FruitSalad`, `setActiveTheme`, `refreshCustomThemes`).
- `frontend/src/css/theme-editor.css` exists, contains `.theme-editor` block.
- `frontend/src/index.css` contains `@import './css/theme-editor.css';`.
- `frontend/node_modules/react-colorful/package.json` exists with `version: 5.8.0`.
- Task 1 commit `115c176` exists in git history.
- Task 2 commit `2863525` exists in git history.
- `node -e "..."` verification of `package.json` + `package-lock.json` PASSED.
- `npm run lint -- --quiet` exits 0.
- `npm run build` succeeds (916.25 kB main, 68.91 kB CSS).
- `npm run check:tokens` reports `8/8 PASS`.
- `node -e` editor contract strings check PASSED.

---
*Phase: 18-custom-editor-seasonal-auto-switch*
*Completed: 2026-08-05*