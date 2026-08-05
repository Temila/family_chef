---
phase: 18-custom-editor-seasonal-auto-switch
verified: 2026-08-05T09:39:51Z
status: passed
score: 18/18 must-haves verified
overrides_applied: 0
human_verification: []
re_verification:
  previous_status: gaps_found
  previous_score: 17/18
  gaps_closed:
    - "WR-01: rename-to-duplicate on PUT /api/themes/{id} now returns HTTP 400 with Chinese 已存在同名主题 detail (duplicate pre-check in update_theme excluding self) — verified by regression test test_update_theme_duplicate_name; suite 13/13 passed"
  gaps_remaining: []
  regressions: []
---

# Phase 18: Custom Editor & Seasonal Auto-Switch Verification Report

**Phase Goal:** 自定义编辑器交付 — react-colorful 种子色编辑器 (primary/secondary/tertiary) + 9 种 MD3 变体 (TonalSpot/Vibrant/Expressive/Content/Mono/Neutral/Fidelity/Rainbow/FruitSalad) + 编辑器内 scoped 实时预览直写 DOM + 增删改自定义 theme（fork/重名拦截/删除确认）+ 季节自动切换（节气/本地时区/半球/持久化/首绘/cache 门控/开关互斥）.
**Verified:** 2026-08-05T09:39:51Z
**Status:** passed
**Re-verification:** Yes — after gap closure (WR-01)

## Re-verification (WR-01 closed)

**Previous status:** gaps_found (17/18) — gap: duplicate-name interception missing on the edit/rename path (`update_theme` had no pre-check → unhandled IntegrityError → HTTP 500 English error).

**Fix applied (commit `93202fa`):**
- `backend/app/services/custom_theme_service.py` — `update_theme` now pre-checks duplicate names excluding self (`CustomTheme.id != theme_id`, only when `name` in patch and changed), raising `ValueError("已存在同名主题: {name}")` mirroring `create_theme`. The PUT router's existing `except ValueError → HTTP 400` (themes.py:58-59) now surfaces the Chinese detail, which the editor's `/同名|已存在|duplicate/i` remap (ThemeEditorPage.jsx:264) renders as the in-place input error.
- `backend/tests/test_themes.py` — added `test_update_theme_duplicate_name`: rename-to-existing → 400 + Chinese detail; original name preserved after rejection; same-name self-update → 200. `test_create_theme_duplicate_name` regression intact.

**Verification evidence (re-run):**
- `uv run pytest tests/test_themes.py -q` → **13 passed** (was 12 + 1 new regression test)
- Frontend canaries unchanged by backend fix: `node --test src/theme/theme-engine.test.mjs src/theme/season.test.mjs` → **23 pass, 0 fail**; `npm run lint -- --quiet` → exit 0, clean.

**Frontend note:** blank/whitespace/>100-char names remain blocked client-side (validateName) with Chinese errors; the duplicate case is now server-side pre-checked on BOTH create and edit paths — the must-have "blank/whitespace/>100-char/duplicate names prevent save and surface a Chinese error" is fully met.

**Gap closure:** must-have truth #9 upgraded from ✗ FAILED (partial) → ✓ VERIFIED. Score 18/18. Non-blocking warnings WR-02..WR-05 remain carried forward (not part of any must-have; human-verification items 2 covers WR-02 severity assessment).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Selecting any of the nine named MD3 variants changes derived semantic roles for the same 3 seeds | ✓ VERIFIED | `theme-engine.js` — real `VARIANT_WHITELIST` (9 names, TonalSpot first) + `VARIANT_TO_MCU` dispatch; 8 alternates via `DynamicScheme` with user secondary/tertiary injection; test "alternate variants emit at least one differing role from TonalSpot" passes; `node --test` 23/23 |
| 2 | Editor and saved themes receive MD3-derived light/dark roles, not user-editable derived roles | ✓ VERIFIED | `buildSchemeCss` derives all 28+ roles from MCU scheme/palettes; editor exposes only 3 seed inputs + variant; no derived-role editing surface anywhere (ThemeEditorPage.jsx, theme-engine.js) |
| 3 | Invalid seed-color or variant input cannot produce a CSS theme | ✓ VERIFIED | `validateSourceColors` throws `Invalid sourceColors shape`; `validateVariant` throws `Unsupported variant:` before any derivation (theme-engine.js:216-218); tests lock both rejections incl. wrong-case/whitespace variants |
| 4 | Both new packages verified from canonical registries before install | ✓ VERIFIED | 18-02-SUMMARY records `npm view react-colorful` → 5.8.0 / omgovich/react-colorful and PyPI skyfield → 1.54 / MIT / brandon-rhodes; human `approved` recorded at blocking gate; react-colorful locked `^5.8.0` resolved from `registry.npmjs.org` (package-lock.json:3738); skyfield consumed only via `uv run --with skyfield` in `scripts/generate-solar-terms.py` |
| 5 | No package installed from unverified/ambiguous source | ✓ VERIFIED | Only `react-colorful` added to runtime manifest (package.json:24, ^5.8.0); skyfield absent from all frontend runtime files (grep count 0 in solar-terms.js/season.js/fouc-bootstrap.js) and from backend manifests |
| 6 | Deep-linkable editor with primary/secondary/tertiary live picker + valid hex input | ✓ VERIFIED | ThemeEditorPage.jsx — 3× `HexColorPicker`+`HexColorInput` (react-colorful), `HEX_COLOR_RE` gate, routes `/theme/editor`, `?themeId=`, `?preset=`; Header+BottomBar shell |
| 7 | Dragging updates ONLY scoped preview via direct CSS text/DOM mutation; app theme unchanged until save | ✓ VERIFIED | `buildScopedCss` rewrites `:root`/`[data-theme="dark"]` → `[data-fc-theme-scope="editor-preview"]`, written via `styleRef.current.textContent` in effect; NO `injectThemeCss`/`setActiveTheme`/`fc_active_theme` write during draft (ThemeEditorPage.jsx:185-193); apply only after save when `!seasonEnabled` (line 253-255) |
| 8 | New→POST, existing custom→PUT, preset fork→POST with prefilled 我的春/夏/秋/冬; manual save applies + returns to /theme | ✓ VERIFIED | `handleSave` dispatches POST (`mode: 'new'|'fork'`) vs PUT (`mode:'edit' && originalId`); `PRESET_FORK_NAMES` {spring:'我的春', summer:'我的夏', autumn:'我的秋', winter:'我的冬'}; `refreshCustomThemes()` then `setActiveTheme(saved)` (manual only) then `navigate('/theme')` |
| 9 | Blank/whitespace/>100-char/duplicate names prevent save + surface Chinese error | ✓ VERIFIED | Blank/whitespace/>100 blocked client-side with Chinese errors (validateName). Duplicate: pre-checked server-side on BOTH create (`create_theme`) and edit (`update_theme`, excluding self) paths → 400 `已存在同名主题` → editor remap. WR-01 fixed (commit 93202fa); regression `test_update_theme_duplicate_name` + suite 13/13 passed |
| 10 | Season derived from 立春/立夏/立秋/立冬 in user local timezone, not fixed months/backend | ✓ VERIFIED | `solar-terms.js` — 80 years × 4 terms = 320 UTC ISO timestamps (regex-verified: 80 year keys, 80 of each term); `season.js` converts to local calendar via getFullYear/getMonth/getDate + YYYYMMDD key compare; no month tables, no backend API |
| 11 | Auto-switch selects only spring/summer/autumn/winter preset, never default/custom | ✓ VERIFIED | `getSeasonPresetId` whitelist-rejects everything else; `applyCurrentSeason` uses `PRESETS.find(p => p.id === presetId)` only; `applySeasonalPresetDirect` sole bypass (theme-context.jsx:302-323) |
| 12 | North default hemisphere; stored south choice inverts exactly, no browser/IP heuristics | ✓ VERIFIED | `normalizeHemisphere` defaults north; `NORTH_TO_SOUTH` = {spring→autumn, summer→winter, autumn→spring, winter→summer} applied to north result (season.js:57-82). First-principles check: 立春→autumn, 立夏→winter, 立秋→spring, 立冬→summer — exact inversion, locked by tests (season.test.mjs:72-117) |
| 13 | seasonEnabled/hemisphere/last-season persist; one application per season boundary (cache gate) | ✓ VERIFIED | `fc_season_enabled`/`fc_hemisphere`/`fc_last_season` with validated readers/writers; `shouldApplySeasonalPreset` skips when cache `hemisphere:season` matches AND activeTheme.id === season; boundary/hemisphere change applies once and updates cache (theme-context.jsx:181-186, 302-323) |
| 14 | Auto blocks public manual apply (D-09 mutex); off immediately restores manual; FOUC bootstrap honors fc_season_enabled | ✓ VERIFIED | `setActiveTheme`/`applyTheme`/`resetToDefault` return false when seasonEnabled (lines 205-218); `setSeasonEnabled` persists immediately + `justEnabledRef` one-cycle bypass; fouc-bootstrap.js:23-47 gives season preset precedence over fc_active_theme with validated hemisphere; built dist/index.html contains seasonal symbols (grep: 1 match) |
| 15 | /theme has reachable 新建 + 主题设置 entries; editor/settings routes ProtectedRoute (user/chef/admin) in PcLayout | ✓ VERIFIED | ThemePage.jsx:135-150 both buttons wired; App.jsx:304-316 `/theme/editor` + `/theme/settings` with `ProtectedRoute requiredRoles={['user','chef','admin']}` inside `<Route element={<PcLayout />}>`; both pages render Header+BottomBar |
| 16 | Manual applies preset/custom; auto preset-click no-op; auto custom-click → editor navigation (no apply) | ✓ VERIFIED | `handleThemeClick` (ThemePage.jsx:70-79): seasonEnabled + custom → navigate editor; seasonEnabled + preset → return (silent no-op); manual → `setActiveTheme(theme)`; ThemeCard `stopEvent` guards action buttons |
| 17 | Custom edit/fork/delete affordances with confirmation; preset never deletable | ✓ VERIFIED | `handleEdit` custom→themeId, preset→`?preset=` only in manual mode; `handleDelete` custom-only with `window.confirm` (Chinese) → `api.deleteTheme` → refresh → active fallback via resetToDefault (manual only) → toasts; ThemeCard `showDelete = kind==='custom' && onDelete` — preset delete impossible |
| 18 | Settings page has exact warning 开启后仅使用四季主题，手动应用失效 + immediate toggle/hemisphere | ✓ VERIFIED | ThemeSettingsPage.jsx:80 exact string in prominent `<aside role="note" aria-live="polite">` region; controlled checkbox → `setSeasonEnabled(Boolean(checked))`; north/south radio → `setHemisphere`; no TTL/timezone/IP heuristics |

**Score:** 18/18 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `frontend/src/theme/theme-engine.js` | 9-variant MCU dispatch | ✓ VERIFIED | Real dispatch, whitelist + enum map, validation, TonalSpot byte-stable legacy path |
| `frontend/src/theme/theme-engine.test.mjs` | Node regression | ✓ VERIFIED | 13 tests incl. 9-variant loop, role differentiation, case-insensitive hex, invalid variant |
| `frontend/package.json` + lock | react-colorful | ✓ VERIFIED | `^5.8.0` declared + lockfile entry with integrity |
| `frontend/src/pages/ThemeEditorPage.jsx` | Editor page | ✓ VERIFIED | Picker/hex/variant chips/scoped preview/POST-PUT-fork/validation |
| `frontend/src/css/theme-editor.css` | Editor styles | ✓ VERIFIED | Token-driven, `.theme-editor` present, no raw hex (check:tokens 8/8) |
| `scripts/generate-solar-terms.py` | Skyfield generator | ✓ VERIFIED | Uses `almanac_east_asia.solar_terms` + `SOLAR_TERMS_ZHS`, DE440S, 2020-2099 |
| `frontend/src/theme/solar-terms.js` | Static constant | ✓ VERIFIED | 80 years × 4 terms = 320 UTC timestamps; zero skyfield reference |
| `frontend/src/theme/season.js` | Resolver | ✓ VERIFIED | getSeasonForDate/getSeasonPresetId/normalizeHemisphere; exact south inversion |
| `frontend/src/theme/season.test.mjs` | Resolver tests | ✓ VERIFIED | 10 tests incl. both hemispheres, 4 boundaries, unsupported years |
| `frontend/src/theme/theme-context.jsx` | Seasonal state machine | ✓ VERIFIED | 3 localStorage keys, mutex, cache gate, persistence |
| `frontend/src/theme/fouc-bootstrap.js` | First-paint seasonal | ✓ VERIFIED | fc_season_enabled precedence, explicit season imports, bundled IIFE |
| `frontend/src/theme/index.js` | Re-exports | ✓ VERIFIED | Season helpers + SOLAR_TERMS; Phase 17 exports preserved |
| `frontend/src/pages/ThemeSettingsPage.jsx` | Settings subpage | ✓ VERIFIED | Exact warning string, toggle, hemisphere radios |
| `frontend/src/pages/ThemePage.jsx` | Grid + entry points | ✓ VERIFIED | 新建/主题设置, season-aware click orchestration, delete flow |
| `frontend/src/App.jsx` | Protected routes | ✓ VERIFIED | /theme/editor + /theme/settings, user/chef/admin, PcLayout |
| `frontend/src/components/theme/ThemeCard.jsx` | Edit/delete affordances | ✓ VERIFIED | onEdit/onDelete, stopPropagation/preventDefault, preset never deletable |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | -- | ------ | ------- |
| theme-engine.js | MCU | DynamicScheme/HCT | ✓ WIRED | Real `DynamicScheme` + `TonalPalette.fromInt` + `Variant` enum usage |
| ThemeEditorPage.jsx | theme-engine.js | buildCssSync→scoped textContent | ✓ WIRED | buildScopedCss + style ref textContent; no global inject during draft |
| ThemeEditorPage.jsx | api client | createTheme/updateTheme | ✓ WIRED | POST for new/fork, PUT for edit with originalId |
| ThemeEditorPage.jsx | theme-context.jsx | setActiveTheme/refreshCustomThemes | ✓ WIRED | Applied after save when `!seasonEnabled`; refresh always |
| generate-solar-terms.py | solar-terms.js | generated 80×4 constant | ✓ WIRED | Output verified 80 year records + 320 timestamps |
| season.js | presets.js | seasonal IDs only | ✓ WIRED | PRESETS.find whitelisted to 4 seasonal ids |
| theme-context.jsx | season.js | getSeasonForDate + cache gate | ✓ WIRED | applyCurrentSeason + shouldApplySeasonalPreset + fc_last_season |
| fouc-bootstrap.js | season.js | fc_season_enabled first-paint | ✓ WIRED | Explicit imports; season preset wins over fc_active_theme |
| ThemePage.jsx | ThemeEditorPage.jsx | navigate('/theme/editor?…') | ✓ WIRED | 新建/编辑/custom-click paths |
| ThemePage.jsx | theme-context.jsx | seasonEnabled guard | ✓ WIRED | Click/reset/delete all respect D-09 |
| ThemeSettingsPage.jsx | theme-context.jsx | setSeasonEnabled/setHemisphere | ✓ WIRED | Controlled, immediate persistence |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Engine + season test suite | `node --test src/theme/theme-engine.test.mjs src/theme/season.test.mjs` | 23 tests, 23 pass, 0 fail | ✓ PASS |
| Lint | `npm run lint -- --quiet` | exit 0, no output | ✓ PASS |
| Production build | `npm run build` | built in 1.08s, exit 0 (chunk-size warning only) | ✓ PASS |
| Token invariants | `npm run check:tokens` | PASS: 8/8 令牌不变量检查通过 | ✓ PASS |
| South inversion from first principles | season.js code read + tests | 立春→autumn, 立夏→winter, 立秋→spring, 立冬→summer — exact bijection {spring↔autumn, summer↔winter} applied to north mapping; tests assert each boundary for both hemispheres | ✓ PASS |
| Solar-term table shape | regex on solar-terms.js | 80 year keys; 80 lichun/lixia/liqiu/lidong each | ✓ PASS |
| Skyfield runtime-absence | grep -i skyfield | 0 matches in solar-terms.js/season.js/fouc-bootstrap.js | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| EDIT-01 | 18-02/18-03 | react-colorful editor + hex input | ✓ SATISFIED | HexColorPicker+HexColorInput ×3, HEX_COLOR_RE; deep-linkable routes |
| EDIT-02 | 18-01 | 9 MD3 variants | ✓ SATISFIED | VARIANT_WHITELIST + dispatch; tests prove per-variant role differences |
| EDIT-03 | 18-03 | Live preview direct DOM, no full re-render | ✓ SATISFIED | Scoped style textContent; no global injection during draft |
| EDIT-04 | 18-03/18-05 | Name + save custom theme (unlimited) | ✓ SATISFIED | POST create + validation; 新建 entry reachable |
| EDIT-05 | 18-03/18-05 | Edit existing custom theme | ✓ SATISFIED | PUT edit path works; rename-to-duplicate → 400 Chinese error (WR-01 fixed, regression test 13/13) |
| EDIT-06 | 18-05 | Delete custom (preset excluded) | ✓ SATISFIED | api.deleteTheme + confirm + refresh; preset never deletable |
| EDIT-07 | 18-01 | Seed-only editing, WCAG AA derived roles | ✓ SATISFIED | All roles MCU-derived from 3 seeds; no derived-role editing surface |
| SEAS-01 | 18-04 | Season from user local timezone | ✓ SATISFIED | Local calendar-day comparison of solar terms; 23 test-verified boundaries |
| SEAS-02 | 18-04/18-05 | Auto-switch toggle → seasonal preset | ✓ SATISFIED | Toggle + mutex + preset-only selection; settings warning exact |
| SEAS-03 | 18-04/18-05 | Hemisphere north default + south switch | ✓ SATISFIED | Manual switch, persisted, exact inversion |
| SEAS-04 | 18-04/18-05 | Manual-apply suspension (D-09 mutex replaces TTL) | ✓ SATISFIED | setActiveTheme/applyTheme/resetToDefault blocked; cache-gated one-apply-per-boundary |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| backend/app/services/custom_theme_service.py | 74-86 | ~~Missing duplicate pre-check in update_theme → IntegrityError~~ **RESOLVED (WR-01)** | ✅ FIXED | Duplicate pre-check excluding self added in commit 93202fa → 400 Chinese error; locked by `test_update_theme_duplicate_name`; suite 13/13 |
| frontend/src/theme/theme-context.jsx | 191, 220-229 | Initial state ignores fc_season_enabled; apply effect re-injects stale fc_active_theme before seasonal microtask correction | ⚠️ WARNING (WR-02) | Transient wrong-theme flash post-hydration when auto-switch on and active ≠ season preset; FOUC first paint itself correct |
| frontend/src/pages/ThemeEditorPage.jsx | 51-61 | Duplicated variant whitelist (VARIANT_OPTIONS) instead of importing VARIANT_WHITELIST | ⚠️ WARNING (WR-03) | Divergence risk only; values match today |
| frontend/src/pages/ThemeSettingsPage.jsx | 76, 99 | aria-describedby self-referential / backwards | ⚠️ WARNING (WR-04) | Screen readers never announced mutex warning; visible warning unaffected |
| frontend/src/theme/theme-context.jsx | 250-251 | 已同步最新主题 toast shown even when mutex blocked the apply | ⚠️ WARNING (WR-05) | Misleading toast in auto mode |
| frontend/src/pages/ThemePage.jsx | 88-92 | Unreachable auto-mode preset-fork toast branch | ℹ️ INFO | Dead code, harmless |
| frontend/src/pages/ThemeEditorPage.jsx | 349-355 | aria-hidden scope contains focusable primitives (Phase 17 pattern) | ℹ️ INFO | A11y concern, pre-existing pattern |

### Review Warnings — Impact Assessment (not fixed, per instructions)

- **WR-01 (rename-to-duplicate → HTTP 500):** ✅ **FIXED in commit `93202fa`** — `update_theme` now pre-checks duplicates excluding self and raises `ValueError(已存在同名主题)` → PUT router maps to 400 with Chinese detail; regression test `test_update_theme_duplicate_name` covers rename-to-existing (400 + Chinese), original-name preservation, and same-name self-update (200). Backend suite 13/13. No longer a gap.
- **WR-02 (stale-theme flash after hydration):** Does **NOT** violate the SEAS-02/SEAS-04 first-paint acceptance — `fouc-bootstrap.js` correctly paints the season preset at first paint and honors `fc_season_enabled` (verified). The flash occurs *after* hydration when React re-injects stale `fc_active_theme` before the seasonal effect corrects it; the final state is correct and the cache gate still yields one seasonal application. Functional/UX defect (wrong-theme flicker on load in auto mode), warning-level, not a must-have failure. Fix would be season-aware initial state in `readActiveThemeFromStorage` or gating the apply effect while seasonEnabled.

### Gaps Summary

1. **Duplicate-name interception on the edit path (WR-01) — CLOSED.** `update_theme` (backend) lacked the duplicate pre-check that `create_theme` has; renaming a custom theme to an existing name violated `uq_custom_themes_user_name` at flush → HTTP 500 English error. Fixed in commit `93202fa`: pre-check excluding self (`CustomTheme.id != theme_id`) raising `ValueError(已存在同名主题)` → PUT router's existing ValueError catch returns 400 with Chinese detail → editor remap surfaces it. Verified by re-running the suite: **13 passed** (includes new `test_update_theme_duplicate_name`). Must-have truth #9 now fully verified — all 18 truths pass. No data corruption was ever possible (DB unique constraint), and both create and edit paths now deliver the promised Chinese duplicate error.

2. Non-blocking warnings carried forward (no fix performed): WR-02 stale-theme flash post-hydration, WR-03 duplicated whitelist, WR-04 ARIA miswire, WR-05 misleading sync toast. None are must-have failures; WR-02 severity is covered by human-verification item 2.

### Human Verification Required

1. **Drag latency of scoped preview (EDIT-03 / SC1)** — drag each picker in the editor; the scoped preview must recolor with no perceptible delay while the rest of the app stays static. Why human: perceived-latency and drag feel cannot be verified by grep.
2. **WR-02 flash severity** — with auto-switch ON and `fc_active_theme` ≠ current season preset, load the app in a browser; confirm the season preset is the first paint and assess how noticeable the post-hydration stale-theme flash is (expected: brief flicker, final state = season preset). Why human: visual timing behavior.
3. **Card action double-fire prevention** — on /theme, click 编辑/删除 buttons and confirm the card itself never applies/navigates simultaneously; confirm the delete confirmation dialog appears. Why human: pointer-event behavior.
4. **Mobile layout & touch targets** — open /theme/editor and /theme/settings on a narrow viewport (≤420px); verify pickers, chip row scroll, and 48dp targets are usable. Why human: visual/responsive verification.
5. **Variant visual differentiation** — switch between all 9 variants in the editor and confirm the preview colors change visibly and remain readable (contrast is engine-guaranteed; visual sanity check). Why human: subjective color/contrast assessment.

---

_Verified: 2026-08-05T09:39:51Z_
_Verifier: the agent (gsd-verifier)_
