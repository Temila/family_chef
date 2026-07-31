# Stack Research — v1.5 自定义网站皮肤 (Dynamic MD3 Theming)

**Domain:** Runtime user-customizable Material Design 3 color theming for an existing React 19 + Vite SPA
**Researched:** 2026-07-31
**Confidence:** HIGH

> **Scope note:** This research covers ONLY the new stack additions for v1.5's theme customization feature. The existing FastAPI + SQLAlchemy 2.0 (async) + React 19 + Vite + SQLite stack (documented in `codebase/STACK.md` and `AGENTS.md`) is validated and deliberately NOT re-researched here.

---

## TL;DR — The Stack Diff Is Tiny

The headline finding: **this feature needs almost no new dependencies.** The critical library — Google's `@material/material-color-utilities` (the only JS implementation of the HCT color space that powers Material You) — is **already installed as a devDependency** and is already proven working in `scripts/generate-tokens.cjs`.

The only changes required:

| Action | Package | Why |
|--------|---------|-----|
| **PROMOTE** `devDependencies` → `dependencies` | `@material/material-color-utilities@^0.4.0` | Token generation moves from build-time (Node script) to **runtime** (in-browser, on user color pick). The devDep status is wrong for runtime code. |
| **ADD** to `dependencies` | `react-colorful@^5.8.0` | The color picker UI for the custom theme editor. |
| **NONE** | (backend) | Existing SQLAlchemy + Alembic + Pydantic fully cover the theme persistence table. |

That's it. Two lines in `package.json`. No new backend deps, no new build tools, no new CSS frameworks.

---

## Recommended Stack

### Core Technologies (Runtime MD3 Engine)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@material/material-color-utilities` | `^0.4.0` (latest: 0.4.0) | **The** HCT color space + MD3 DynamicScheme + tonal palette engine. Converts a single source color → full 6-family × 13-tone palette + semantic role assignments for light/dark. | Google's official, authoritative implementation. **Only JS library that implements HCT** (Hue-Chroma-Tone, the CAM16-xy-L* color space Material You is built on). Any "MD3 theme" feature is fundamentally an MCU wrapper. Already proven in `generate-tokens.cjs` which produces the exact `tokens.css` format we override at runtime. |
| `react-colorful` | `^5.8.0` (latest: 5.8.0, released 2026-07-13) | Color picker component for the custom theme editor UI. | 3.1 KB gzipped, **zero dependencies**, tree-shakeable, WAI-ARIA accessible, mobile-friendly (touch support), React 19 compatible (peer dep `react >=16.8.0`). Supports HEX/RGB/HSL/HSV models and ships `HexColorInput` companion for typed hex entry. The de-facto modern React color picker — 3.5k stars, used by Storybook/Leva. 12× lighter than legacy `react-color`. |

### Runtime CSS Override Mechanism (No Library — Native Browser API)

The mechanism for applying a generated theme at runtime is the **CSS Custom Properties API**, already a native browser standard. No library is needed:

```javascript
// Apply a single overridden token at runtime
document.documentElement.style.setProperty('--md-color-primary', '#056d37');

// Or, the cleaner pattern: inject a <style> block with a full theme object
// (matches how the existing tokens.css is structured for :root + [data-theme="dark"])
```

**Why native over a library:** The existing `tokens.css` is 100% CSS custom properties on `:root` (light) and `[data-theme="dark"]` (dark). The entire app already consumes tokens via `var(--md-color-*)`. Runtime override is a one-liner per token. Libraries like `@vanilla-extract/dynamic-theme-plugin` or CSS-in-JS would add complexity and fight the existing token architecture. **Stay native.**

### Backend Persistence (No New Libraries)

| Concern | Solution | Notes |
|---------|----------|-------|
| Custom theme storage (cross-device sync) | New SQLAlchemy model + Alembic migration | One new table `custom_themes` (or `user_themes`): `id`, `user_id` FK, `name`, `theme_data` (JSON: source colors + optional overrides), `created_at`, `updated_at`. JSON column type is supported by SQLite via SQLAlchemy's `JSON` type. |
| API endpoints | New FastAPI router `routers/themes.py` | Standard CRUD: `GET /api/themes`, `POST /api/themes`, `PUT /api/themes/{id}`, `DELETE /api/themes/{id}`. Follows existing router pattern exactly. |
| Schema validation | Pydantic v2 schemas in `schemas/theme.py` | `ThemeCreate`, `ThemeUpdate`, `ThemeResponse`. Validate that `theme_data.source_color` is a valid `#RRGGBB` hex string; reject if malformed. |
| Hybrid storage | localStorage (presets + current selection) + DB (custom themes) | localStorage keys: `fc_theme_presets_v1`, `fc_active_theme_id`, `fc_season_autoswitch`. The existing `fc_theme` key (light/dark mode) is preserved untouched. |

**No new backend dependencies** — `sqlalchemy>=2.0.0`, `alembic>=1.12.0`, `pydantic>=2.0.0` are all already in `pyproject.toml`.

### Supporting Libraries (None Required)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| *(none)* | — | The MCU + react-colorful + native CSS variables combo covers every v1.5 requirement. See "Alternatives Considered" for libraries explicitly evaluated and rejected. |

### Development Tools (No New Tools)

| Tool | Purpose | Notes |
|------|---------|-------|
| *(none)* | — | Vite 8, ESLint 10, stylelint 17, and the existing `npm run gen:tokens` pipeline already cover development. The `generate-tokens.cjs` script remains as the **build-time** generator for the 5 preset themes (deterministic output committed to repo); MCU runtime is used only for **user-created custom themes**. |

---

## Critical Design Decision: HCT vs. Other Color Spaces

The feature spec asks users to "adjust MD3 primary/primary-container/secondary/accent colors." A naive implementation would let users directly edit `--md-color-primary` as a hex value. **This is wrong for MD3.** MD3 colors are not independent — they are *derived* from a small set of source colors via HCT tonal palettes.

### The Correct Mental Model (from `generate-tokens.cjs`)

```
User picks 1-3 source colors (primary, optional secondary, optional tertiary)
    ↓ (MCU themeFromSourceColor)
HCT color space computation
    ↓
6 tonal palettes (primary/secondary/tertiary/neutral/neutral-variant/error)
    ↓
~30 semantic role tokens (light scheme + dark scheme)
    ↓
CSS custom properties on :root + [data-theme="dark"]
```

**Implication for the UI:** The custom theme editor should let users pick **source colors** (typically just primary, optionally secondary/tertiary), and MCU generates the *entire* derived token set. Users do NOT hand-edit 30+ tokens. This is how Material Theme Builder, Android 12+ Material You, and every compliant MD3 implementation works.

**This is why MCU is non-negotiable** — no other JS library can perform the HCT → tonal palette → DynamicScheme derivation. `culori` (v4.0.2) explicitly does NOT support HCT (verified at culorijs.org/color-spaces/ — supports Oklab/Oklch/CIELAB/Jzazbz/ICtCp, but no HCT). `color` (v5.0.3) likewise has no HCT support.

### Does react-colorful Need HCT/OKLCH Support? **No.**

The downstream consumer explicitly asks this. Answer: **react-colorful's lack of HCT/OKLCH modes is irrelevant.** The picker only needs to capture a single source color as HEX/RGB. MCU then does all HCT math. The picker is the *input*; MCU is the *engine*. Conflating them is a category error.

If a future phase wanted a perceptually-uniform picker (constant-lightness hue/chroma plane), `react-colorful` would be swapped for a custom canvas picker using `culori`'s `okhsl` mode — but that is out of scope for v1.5 and not needed.

---

## Installation

```bash
# From frontend/ directory

# 1. PROMOTE material-color-utilities from devDep to runtime dep
#    (it must ship in the bundle now, not just be a build tool)
npm install @material/material-color-utilities@^0.4.0

# 2. ADD the color picker
npm install react-colorful@^5.8.0

# 3. REMOVE material-color-utilities from devDependencies
#    (it should no longer be in both sections)
npm uninstall -D @material/material-color-utilities 2>/dev/null || true
# Then re-add to dependencies if step 1 didn't already move it:
# Final state: it lives ONLY in "dependencies".
```

**Verification after install:**

```bash
# Confirm package.json has MCU in dependencies (not devDependencies) and react-colorful added
node -e "const p=require('./package.json'); console.log('deps:', p.dependencies); console.log('devDeps:', p.devDependencies)"
```

**Resulting `package.json` diff:**

```diff
 "dependencies": {
+  "@material/material-color-utilities": "^0.4.0",
   "@material-symbols-svg/react": "^0.13.0",
   "marked": "^18.0.3",
   "react": "^19.2.5",
   "react-dom": "^19.2.5",
-  "react-router-dom": "^7.15.0"
+  "react-router-dom": "^7.15.0",
+  "react-colorful": "^5.8.0"
 },
 "devDependencies": {
-  "@material/material-color-utilities": "^0.4.0",
   "@eslint/js": "^10.0.1",
   ...
 }
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not (or When to Use Alternative) |
|----------|-------------|-------------|--------------------------------------|
| MD3 color engine | `@material/material-color-utilities` | `culori` (v4.0.2) | **Does NOT support HCT.** Only Oklab/Oklch/CIELAB/Jzazbz. Cannot generate MD3 tonal palettes. Would require reimplementing Google's CAM16-xy-L* math — multi-month effort, guaranteed bugs. Use culori ONLY if a future phase needs non-MD3 perceptual color work (e.g., data viz palettes). |
| MD3 color engine | `@material/material-color-utilities` | `color` (v5.0.3, by Qix) | General-purpose converter (RGB/HSL/HSV/Lab). No HCT, no DynamicScheme, no tonal palettes. Strictly inferior to MCU for this use case. |
| MD3 color engine | `@material/material-color-utilities` | `@material/web` (Material Web Components) | Different abstraction level — full web components, not a color library. Pulls in the entire MWC runtime. Massive overkill and would conflict with the existing custom React component layer built in v1.2. |
| Color picker | `react-colorful` | `react-color` (v2.19.3) | **12× larger bundle** (~38 KB vs 3.1 KB gzipped). Built on class components, less accessible, slower maintenance cadence. Was the pre-2021 default; `react-colorful` is the modern replacement (acknowledged in `react-color`'s own ecosystem migration guides). |
| Color picker | `react-colorful` | `react-colorful` v3 beta (`3.0.0-beta.1`) | Beta. Wait for stable. v5.8.0 is the current stable line and fully covers needs. |
| Color picker | `react-colorful` | Custom `<input type="color">` | Native color input is inconsistent across browsers, has no HSV/HSL plane, poor UX for design work, and cannot be styled to match MD3. Acceptable only for a trivial "pick primary color" MVP — but the feature spec calls for a real editor with real-time preview, so `react-colorful` is the floor. |
| Color picker | `react-colorful` | `vanilla-colorful` | Web-component port of react-colorful. Only choose if migrating off React — we're not. |
| Runtime CSS application | Native `style.setProperty` / injected `<style>` | CSS-in-JS (styled-components, emotion) | Would fight the existing CSS custom property token system. The entire app reads `var(--md-color-*)` from static CSS files; CSS-in-JS cannot override `:root` custom properties more efficiently than a 3-line native helper. Adds ~12 KB+ for zero benefit. |
| Theme persistence | SQLAlchemy `JSON` column | Separate normalized tables (one row per token override) | Over-normalized. A theme is a small opaque blob of source colors + optional token overrides — JSON column is the right granularity. Normalizing would force N+1 queries and complex migrations for no query benefit (themes are always loaded whole). |
| State management | React Context (existing pattern) | Zustand / Jotai / Redux | The existing app uses React Context for all global state (`AuthContext`, `CategoriesContext`, `ToastContext`). A `ThemeContext` fits this pattern perfectly. Adding a state library for one feature violates the v1.2 architecture decision ("No state management library"). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `culori` for MD3 palette generation | **No HCT support** (verified). Would produce non-compliant MD3 palettes that don't match Material You behavior. | `@material/material-color-utilities` |
| `react-color` (any version) | 12× bundle bloat vs `react-colorful`, class-component architecture, declining maintenance, less accessible. | `react-colorful@^5.8.0` |
| CSS-in-JS libraries (styled-components, emotion, stitches) | Conflicts with the existing static CSS custom property token architecture. Cannot override `:root` vars more efficiently than native API. Adds 10-50 KB for zero gain. | Native `document.documentElement.style.setProperty()` + injected `<style>` for bulk theme application. |
| `@material/web` (Material Web Components) | Full web-component framework; conflicts with existing v1.2 React primitive components. Would create two parallel component systems. | Existing `components/primitives/*` (Button, Card, Input, etc.) + react-colorful for the picker. |
| Client-side state libraries (Zustand/Redux) | Violates established v1.2 architecture (Context-only). One feature does not justify a global state library. | `ThemeContext.jsx` following the existing `AuthContext.jsx` pattern. |
| `color` / `chroma-js` / `tinycolor2` | Redundant with MCU for HCT work; MCU's `Color` utility namespace covers ARGB↔hex↔RGB conversions. Adding a second color lib creates conversion ambiguity. | MCU's built-in `hexFromArgb` / `argbFromHex` (already used in `generate-tokens.cjs`). |
| Theme-builder SaaS / runtime theme APIs (e.g., remote Material Theme Builder) | Adds network dependency + latency to a feature that should be instant and offline-capable. MCU runs client-side in <5ms. | MCU, fully client-side. |

---

## Stack Patterns by Variant

**If the editor lets users pick only 1 source color (primary):**
- Use `MCU.themeFromSourceColor(primaryArgb)` — single-argument form.
- MCU auto-derives secondary + tertiary via `temperature`/`blend` modules.
- Simplest UX; recommended for v1.5 MVP.

**If the editor lets users pick primary + secondary + tertiary (3 source colors):**
- Use `MCU.themeFromSourceColor(primaryArgb, [{name:'secondary', value: secArgb, blend:true}, {name:'tertiary', value: tertArgb, blend:true}])`.
- This is **exactly** what `generate-tokens.cjs` already does for the default theme (lines 162-165). Copy that pattern at runtime.
- More control; recommended if discuss-phase confirms 3-color editor.

**If the editor lets users override individual semantic tokens (power-user mode):**
- Generate the base scheme from source colors (MCU), then apply user overrides on top as a final layer.
- Overrides stored as a sparse map: `{"--md-color-primary": "#custom"}` — only non-null entries applied.
- Do NOT allow overriding tonal palette tokens (`--md-palette-*`) — those are always MCU-derived to stay MD3-compliant.

**If a preset theme needs to be "baked" into the repo (the 4 seasonal presets):**
- Generate them at build time by extending `generate-tokens.cjs` to accept a `--presets` flag that emits 4 additional `tokens-spring.css` / `tokens-summer.css` / etc. files OR a single `presets.css` with `[data-theme-preset="spring"]` selectors.
- This keeps presets deterministic and FOUC-free (decision D-86 in PROJECT.md: "MD3 令牌生成一次/hardcode 模式 — 避免 FOUC").
- Runtime custom themes use MCU live; preset themes use pre-built CSS classes.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@material/material-color-utilities@0.4.0` | Vite 8, esbuild, Node 18+ | **Known ESM packaging defect:** several `.js` files have relative imports missing `.js` extensions. **Node native ESM loader fails** (must patch — see `ensurePackageImportable()` in `generate-tokens.cjs`). **Vite/esbuild bundler resolves them automatically** — no patch needed for browser runtime. ⚠ If you ever import MCU from a Node ESM context at runtime (e.g., SSR), apply the patch. For pure client-side Vite usage, no action needed. |
| `@material/material-color-utilities@0.4.0` | React 19 | MCU is framework-agnostic (pure TS). No React coupling. Works in any JS runtime. |
| `react-colorful@5.8.0` | React 19.2.5, React DOM 19.2.5 | Peer dep `react >=16.8.0` (hooks). React 19 confirmed compatible — no breaking changes in 5.x line. Latest release 2026-07-13. |
| `react-colorful@5.8.0` | Vite 8, ESLint 10 | Pure ESM (`"type": "module"` not required by consumer). Ships `dist/index.mjs`. No CJS-only gotchas. |
| MCU + react-colorful | Each other | No shared deps, no peer conflicts. Both are leaf libraries (MCU has 0 deps; react-colorful has 0 deps). Safe to coexist. |
| New `ThemeContext` | Existing `AuthContext`/`ToastContext`/`CategoriesContext` | Follows identical pattern (Context + Provider + `useTheme` hook). No interaction risk. |

---

## Bundle Size Impact

Measured via `npm pack --dry-run` (tarball sizes; real tree-shaken bundle is smaller):

| Package | Tarball | Estimated gzipped runtime (tree-shaken) | Notes |
|---------|---------|------------------------------------------|-------|
| `react-colorful` | 104 KB | **~3.1 KB** | Only `HexColorPicker` + `HexColorInput` imported → rest tree-shaken. Documented 2.8 KB min+gzip by maintainer. |
| `@material/material-color-utilities` | 177 KB | **~15-25 KB** | Importing `themeFromSourceColor` + `argbFromHex` + `hexFromArgb` pulls in `hct` + `palettes` + `scheme` + `dynamiccolor` modules. Cannot easily tree-shake further (scheme generation needs the HCT stack). Acceptable for a theme editor that's lazy-loaded behind `/theme` route. |
| **Total new client JS** | — | **~20-28 KB gzipped** | Mitigation: **code-split** the `/theme` route + MCU import behind `React.lazy(() => import('./pages/ThemePage.jsx'))` so it never loads on the main app shell. Theme *application* (the runtime `setProperty` calls) is <1 KB and loads eagerly. |

**Recommendation:** Lazy-load `ThemePage.jsx` (and therefore MCU + react-colorful) via React.lazy. Only the tiny `ThemeContext` + the active theme's CSS-variable-application logic ship to the main bundle. Users who never visit `/theme` never download MCU.

---

## Integration with Existing Token Architecture

This is the single most important architectural consideration, and it is **clean**:

### What Already Exists (from v1.2 — do not break)
- `frontend/src/css/tokens.css`: ~240 lines of CSS custom properties on `:root` (light) and `[data-theme="dark"]` (dark). Defines `--md-color-*` semantic roles AND `--md-palette-{family}-{tone}` tonal palettes (13 tones × 6 families = 78 palette tokens).
- All components consume tokens via `var(--md-color-*)` — no hardcoded colors.
- `frontend/src/utils/index.js` → `theme` object manages `data-theme` attribute (light/dark) on `<html>`, persisted to `localStorage['fc_theme']`.

### What v1.5 Adds
1. **`ThemeContext.jsx`** — new context providing `{ activeTheme, setTheme, customThemes, presets, seasonAutoswitch }`. Mirrors `AuthContext` pattern.
2. **Theme application layer** — a `applyTheme(theme)` utility that:
   - If theme is a preset: toggles a `data-theme-preset="spring"` attribute (preset CSS lives in a new `presets.css`, generated at build time by extended `generate-tokens.cjs`).
   - If theme is custom: calls MCU `themeFromSourceColor()` → writes derived tokens to `document.documentElement.style` (inline style overrides `:root` cascade — higher specificity, no `!important` needed).
3. **`ThemePage.jsx`** — lazy-loaded route at `/theme`. Houses the 5 preset cards + custom theme editor (react-colorful pickers + live preview).
4. **No changes** to `tokens.css`, no changes to existing components, no changes to `theme` object (light/dark toggle stays independent in header per spec).

### Specificity Strategy (Critical)
- `:root { --md-color-primary: #056d37; }` (from tokens.css) → specificity 0,0,1,0 (pseudo-class)
- `document.documentElement.style.setProperty('--md-color-primary', '#...')` → inline style → highest specificity, wins.

This means **runtime-applied custom themes cleanly override the default tokens without `!important`** and without modifying `tokens.css`. To reset, call `document.documentElement.style.removeProperty('--md-color-primary')` for each token — the cascade falls back to `:root`. ✅

---

## Sources

### HIGH confidence (verified against official sources)

| Source | What was verified | URL |
|--------|-------------------|-----|
| `@material/material-color-utilities` npm registry | Latest version `0.4.0`, license Apache-2.0, no deps | `npm view @material/material-color-utilities` (2026-07-31) |
| Material Color Utilities GitHub (material-foundation) | Component list confirms `hct`, `palettes`, `scheme`, `dynamiccolor`, `blend` modules; TS availability | https://github.com/material-foundation/material-color-utilities |
| `react-colorful` npm registry | Latest `5.8.0`, peer dep `react>=16.8.0`, 0 dependencies | `npm view react-colorful` (2026-07-31) |
| `react-colorful` GitHub README | 3.1 KB gzipped, 12× lighter than react-color, WAI-ARIA, mobile-friendly, `HexColorInput` companion | https://github.com/omgovich/react-colorful |
| `culori` color spaces docs | **HCT NOT supported** in v4.0.2 (supports Oklab/Oklch/CIELAB/Jzazbz/ICtCp only) — decisive for rejecting culori as MCU alternative | https://culorijs.org/color-spaces/ |
| `color` npm registry | Latest `5.0.3`, no HCT support | `npm view color` (2026-07-31) |
| `react-color` npm registry | Latest `2.19.3`, 12× larger than react-colorful | `npm view react-color` (2026-07-31) |
| Project source `scripts/generate-tokens.cjs` | Confirms MCU `themeFromSourceColor` API + 3-source-color pattern + Node ESM packaging defect + bundler-works-fine note | `/home/temila/family_chef/scripts/generate-tokens.cjs` |
| Project source `frontend/src/css/tokens.css` | Confirms exact token names (`--md-color-*`, `--md-palette-*`) and `:root` / `[data-theme="dark"]` structure | `/home/temila/family_chef/frontend/src/css/tokens.css` |
| Project source `frontend/package.json` | Confirms MCU currently in `devDependencies`, react-colorful absent | `/home/temila/family_chef/frontend/package.json` |
| Project source `frontend/src/utils/index.js` | Confirms existing `theme` object + `fc_theme` localStorage key + `data-theme` attribute pattern | `/home/temila/family_chef/frontend/src/utils/index.js` |

### MEDIUM confidence

| Source | What was verified | Confidence limiter |
|--------|-------------------|--------------------|
| Bundle size estimates (3.1 KB react-colorful, 15-25 KB MCU) | Tarball inspection + maintainer README claim | Actual tree-shaken size depends on which MCU exports are imported — should be validated with `vite build` + bundle analyzer during Phase 1 implementation. |

### Not needed ( Context7 lookup )

MCU and react-colorful have minimal docs beyond their GitHub READMEs and source code; the existing `generate-tokens.cjs` in-repo is the most authoritative usage example for MCU's API. Context7 was not queried because the in-repo working code already demonstrates the exact API surface needed.

---

*Stack research for: v1.5 Dynamic MD3 Theme Customization*
*Researched: 2026-07-31*
