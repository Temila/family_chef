# Project Research Summary

**Project:** 家味 · Family Chef — v1.5 自定义网站皮肤 (Dynamic MD3 Theme Customization)
**Domain:** Brownfield feature — runtime user-customizable Material Design 3 color theming layered on an existing React 19 + Vite SPA with a code-generated MD3 CSS-variable token system
**Researched:** 2026-07-31
**Confidence:** HIGH

## Executive Summary

This is **not** a build-from-scratch theming problem. The repo already contains the canonical Material You engine — `@material/material-color-utilities@0.4.0` (installed as a devDependency) — and a working build-time token generator (`scripts/generate-tokens.cjs`) that proves the entire pipeline: **3 source hex colors → full light + dark MD3 scheme (33 semantic roles) + 6 tonal palettes × 13 tones**. The v1.5 feature is the runtime, user-facing equivalent of that already-validated pipeline, plus per-user persistence. The dominant industry pattern (Google Material Theme Builder, Android Wallpaper colors, every MD3 app picker) is: **user picks 1–4 source key colors → engine derives the entire accessible palette → CSS custom properties are swapped on `document.documentElement`.** Real-time preview is free because CSS variables cascade instantly.

The recommended approach adds **almost no new dependencies** — promote `@material/material-color-utilities` from `devDependencies` to `dependencies` (it now ships in the browser bundle, not just a build script) and add `react-colorful@^5.8.0` (3 KB, the modern color picker) for the editor UI. Backend adds zero new libraries: a new `CustomTheme` model with a `JSON` column for source colors, one Alembic migration, one router/service/schema trio mirroring the existing `favorites` pattern. **Themes store only the MD3 source key colors (~100 bytes); the full 33-role light + dark token set is re-derived synchronously at apply time (<1 ms) by the same MCU call the build script already uses.**

The top risks, in priority order: (1) **FOUC** — React mounts after first paint, so every reload flashes the default green theme before the user's custom "Autumn Orange" snaps in; the fix is an inline blocking `<script>` in `index.html` that reads localStorage and injects the resolved theme *before* paint. (2) **The light/dark × custom-color matrix** — every MD3 role has different values per mode, so a single flat token map can't serve both; themes must store/derive a `{light, dark}` pair. (3) **Accessibility collapse** — naive hex editors let users pick legally-blind contrast ratios; mitigated structurally by letting MCU's `SchemeTonalSpot` derive all role-pairs from a seed (guarantees WCAG AA). All three are foundational decisions that must be settled in Phase 1 or every later phase inherits the bug.

## Resolving the CSS-Override Disagreement (STACK.md vs ARCHITECTURE.md)

The four researchers split on the runtime override mechanism. **Decision: the ARCHITECTURE.md approach wins — a single generated `<style id="fc-dynamic-theme">` element appended to `<head>` containing both `:root { … }` and `[data-theme="dark"] { … }` blocks.** STACK.md briefly flirted with inline `document.documentElement.style.setProperty()` per token (its "Specificity Strategy" section praises inline style's "highest specificity"). ARCHITECTURE.md explicitly rejects this, and PITFALLS.md Pitfall 2 independently corroborates ARCHITECTURE.md — calling the generated `<style>` "preferable because it's inspectable in DevTools, can be cleared wholesale, and naturally sits later in the cascade than the linked `tokens.css`."

**The decisive argument is light/dark handling.** The codebase's dark mode is built on the `[data-theme="dark"]` CSS selector in `tokens.css` and a `theme` util that just flips the `data-theme` attribute on `<html>`. A generated `<style>` block carrying its own `[data-theme="dark"]` rule participates in the *same cascade* — when the user taps the existing header `ThemeToggle`, the browser recomputes the cascade and picks the dark overrides **automatically, with zero JS re-application logic**. The light/dark axis and the palette axis stay cleanly decoupled (matching PROJECT.md's constraint that the header light/dark button stays independent). With inline styles on `<html>`, `ThemeContext` would be forced to subscribe to dark-mode changes and re-derive + re-apply ~90 properties on every toggle — recreating the CSS cascade in JS for no benefit, and making PITFALLS.md Pitfall 5 (the light/dark matrix) far harder to solve.

**One reconciliation note:** PITFALLS.md Pitfall 1's FOUC bootstrap example uses inline `setProperty`, and Pitfall 2's example selector (`:root, [data-theme="light"], [data-theme="dark"]` grouped) applies one map to both modes — both are inconsistent with the chosen approach. The synthesized rule: **both the pre-mount inline bootstrap script and the post-mount `ThemeContext` use the same generated-`<style>` mechanism with *separate* `:root { light… }` and `[data-theme="dark"] { dark… }` blocks** (so each mode gets its own token values). ARCHITECTURE.md's `theme-engine.js` is the single shared, pure (no-React, no-DOM) module — only `injectThemeCss(cssText)` touches the DOM, and both the index.html bootstrap and `ThemeContext` call it, guaranteeing byte-identical CSS pre- and post-mount (no flash from re-derivation differences).

## Key Findings

### Recommended Stack

**Minimal stack diff — two lines in `package.json`, zero new backend deps.** The headline finding from STACK.md: the critical MD3 library (`@material/material-color-utilities`) is already installed and already proven in `scripts/generate-tokens.cjs`. The only changes are promoting it from `devDependency` → `dependency` (it must now ship in the browser bundle) and adding `react-colorful`.

**Core technologies:**
- **`@material/material-color-utilities@^0.4.0`** (PROMOTE devDep → dep) — Google's official, authoritative implementation of the HCT color space (Hue-Chroma-Tone) and `themeFromSourceColor` / `Scheme*` derivation. **The only JS library that implements HCT** — verified that `culori` and `color` lack HCT. ~15–25 KB tree-shaken at runtime; mitigate with `React.lazy` on `/theme` route.
- **`react-colorful@^5.8.0`** (ADD) — 3.1 KB gzipped, zero deps, WAI-ARIA accessible, React 19 compatible color picker for the custom editor. 12× lighter than legacy `react-color`. Does NOT need HCT/OKLCH support — the picker captures a single source hex; MCU does all HCT math.
- **Native CSS Custom Properties API** — runtime override is a one-liner per token via the generated `<style>` element. No CSS-in-JS library (would fight the existing static token architecture). **Stay native.**
- **SQLAlchemy 2.0 `JSON` column** (existing) — stores `{primary, secondary, tertiary, neutral?}` source colors on SQLite via the JSON1 extension (guaranteed present: Python 3.11 bundles SQLite ≥3.39).
- **`React.Context`** (existing pattern) — new `ThemeContext.jsx` mirrors `AuthContext`/`CategoriesContext`. No Zustand/Redux (violates the v1.2 "no state library" decision).

**Explicitly rejected:** `culori`/`color`/`chroma-js` (no HCT), `react-color` (12× bundle bloat), `@material/web` (full web-component framework conflicts with existing React primitives), CSS-in-JS (styled-components/emotion — conflicts with static token architecture), client-side state libraries (Zustand/Redux — violates v1.2 architecture), remote theme-builder SaaS (network dependency for what MCU does in <5ms client-side).

### Expected Features

**Must have (table stakes — P1, ship in v1.5):**
- Header entry button → `/theme` route (discoverability; the feature doesn't exist without it)
- Token model + `themeFromSourceColor` runtime adapter (the engine foundation everything consumes)
- Inline pre-mount theme application in `index.html` (FOUC prevention — highest-priority technical concern)
- `/theme` page with **cards-as-previews** (the card IS the preview — CSS-var scoping on a wrapper `<div>` renders a mini-UI in each theme's palette)
- 5 presets (current + spring/summer/autumn/winter), editable-not-deletable (explicit PROJECT.md deliverable)
- Apply-on-click + persistent selection (localStorage)
- Custom theme editor: primary/secondary/tertiary key colors + hex input + **live preview**
- Edit + delete custom themes; edit (not delete) presets
- "Currently active" indicator on cards
- **Light/dark toggle stays independent in header** (explicit constraint — palette ≠ mode)
- Backend: `user_themes`/`custom_themes` table + migration + per-user CRUD `/api/themes` (briefed: cross-device sync)

**Should have (differentiators — P1/P2):**
- **Seasonal auto-switch** (calendar-driven, unique to this app's 家庭/季节感 angle — no competitor does this)
- **MD3 scheme variant selector** (Vibrant/Expressive/Mono/Neutral/etc. — 9 variants; exposes the MD3 *algorithm* not just the color)
- **Unlimited backend-synced custom themes** (cross-device sync beats localStorage-only competitors)
- Per-theme name + inline rename (emotional vocabulary: 妈妈生日配色, 夏日清爽)
- JSON export/import (clipboard + file download — backup/share)

**Defer (v2+):**
- URL-shareable themes (base64 query param — needs landing/confirm UX)
- Theme-from-image upload (MCU's `themeFromImage()` — different feature, different upload flow)
- Accessibility contrast panel with guarded WCAG validation (`contrastLevel` slider behind safety rails)
- Per-theme custom typography (separate milestone — conflates with i18n font stacks)
- HCT picker (Hue/Chroma/Tone sliders — power-user upgrade over native hex picker)

**Explicitly never (anti-features):**
- **Per-component color overrides** (explodes the token surface from ~5 inputs to ~33; breaks MD3's role-based accessibility contract — the #1 anti-feature)
- **Light/dark merged into `/theme`** (conflates orthogonal axes; PROJECT.md explicitly rejects)
- **Custom fonts / typography editor** (out of scope; Chinese font stack is a system-font concern)
- **Animated rainbow / "color cycle" mode** (accessibility hazard — vestibular/motion sensitivity)
- Theme scheduling beyond season (composable rules engine = exponential UX complexity)

### Architecture Approach

The feature slots into the existing **Router → Service → Model** layered architecture with **one new SQLAlchemy model + migration, one new router/service/schema trio, one new React Context, one new pure MD3-derivation utility module, and a generated `<style>` element as the CSS override surface.** All new code follows established codebase patterns verbatim: static-method service singleton (like `favorite_service`), `get_current_user_from_token` + per-user scoping (like `favorites.py`), `UniqueConstraint(user_id, name)` (like `favorites`'s `uq_user_dish_favorite`), `create_table` Alembic migration (like `72b56533bb6d_add_wishes_table.py`). `tokens.css` is **never edited** (it's code-generated; the header explicitly forbids manual edits).

**Major components:**
1. **`CustomTheme` model** (`backend/app/models/custom_theme.py`) — `source_colors: JSON` column (~100 bytes), `UniqueConstraint(user_id, name)`, mirrors `favorite.py`. Presets are NOT in this table (they live in `localStorage` + a frontend `presets.js` constant per PROJECT.md).
2. **`theme-engine.js`** (`frontend/src/utils/theme-engine.js`) — **pure, no React, no DOM** — exports `deriveTheme(sourceColors)`, `buildThemeCss({light, dark})`, `injectThemeCss(cssText)`. Shared by the pre-mount inline bootstrap AND `ThemeContext` so pre-mount and post-mount produce byte-identical CSS.
3. **`ThemeContext.jsx`** — mirrors `CategoriesContext` shape; holds active theme + custom themes + seasonal flag; MUST `useMemo` its value (unlike `AuthContext`'s non-memoized pattern — theme state changes 100×/sec during drag).
4. **`themes.py` router + `theme_service.py` + `schemas/theme.py`** — per-user CRUD under JWT; mirrors `favorites.py`. `ThemeCreate`/`Update`/`Response` + `SourceColors` with `@field_validator` for `#RRGGBB` hex format.
5. **`<style id="fc-dynamic-theme">`** — the CSS override surface. Appended to `<head>` after `tokens.css` loads (wins cascade at equal specificity). Contains `:root { light… }` and `[data-theme="dark"] { dark… }` blocks so light/dark toggle "just works."
6. **`/theme` page + `ThemeCard.jsx` + `ThemeEditor.jsx`** — card grid (each card wraps a mini-UI scoped to the theme's tokens) + custom editor (`react-colorful` pickers + live preview writing direct-to-DOM, bypassing React on `input` events).

### Critical Pitfalls (ranked by severity)

1. **FOUC on cold load** *(Phase 1 — recovery cost: MEDIUM)* — React mounts after first paint; any `useEffect`-based apply flashes the default green theme for 1–3 frames. Custom themes can be radically different hues (spring pink → winter blue), making the flash jarring. **Fix:** extend the inline blocking `<script>` in `index.html` to read `fc_active_theme` → derive → inject `#fc-dynamic-theme` `<style>` before paint. Verify under DevTools 4× CPU throttle.

2. **Light/dark × custom-color matrix** *(Phase 1 — recovery cost: HIGH, DB migration)* — every MD3 role has different values in light vs. dark (primary is tone 40 in light, tone 80 in dark). A single flat token map can't serve both modes. Toggling dark with a custom theme active either reverts to default green or shows broken pale-on-dark colors. **Fix:** store/derive `{light: {...}, dark: {...}}` together from one seed via `themeFromSourceColor` (returns `theme.schemes.light` + `theme.schemes.dark` in one call); the generated `<style>` carries separate `:root` and `[data-theme="dark"]` blocks so the cascade handles the switch for free.

3. **Accessibility collapse** *(Phase 2 — recovery cost: HIGH, retroactive)* — naive hex editors let users pick pale-yellow primary → white-on-pale-yellow buttons (contrast ~1.8:1, WCAG AA requires 4.5:1). MD3's role-pair system (`primary`/`on-primary`) means every editable color is actually two colors that must maintain contrast. **Fix:** the editor's data model is **a single seed color + optional variant**; MCU's `SchemeTonalSpot`/`themeFromSourceColor` derives the complete accessible role set (guarantees ≥4.5:1 for text roles). Never expose individual derived roles (`primary-container`, `surface-container-high`) as user inputs — that's the #1 anti-feature.

4. **localStorage ↔ DB sync conflicts** *(Phase 1 contract + Phase 4 impl — recovery: MEDIUM)* — hybrid storage creates two sources of truth. Device A creates a theme, device B's stale localStorage wins, or last-write-wins destroys edits. **Fix:** DB is source of truth for custom themes; localStorage is cache + active-skin snapshot. On mount after FOUC paint: fetch from DB, reconcile by `updatedAt` (last-write-wins, correct for single-user-per-account). On save: write DB first, update localStorage only on success, toast on failure (never silently swallow — project pattern in `order_service.py:217` is wrong for themes).

5. **Specificity wars / editing `tokens.css`** *(Phase 1 — recovery: LOW)* — `tokens.css` is auto-generated (`npm run gen:tokens` silently wipes manual edits); and stray `!important` token redefinitions in component CSS beat non-important inline overrides (CSS custom property `!important` precedence is counterintuitive). **Fix:** never edit `tokens.css`; apply via the generated `<style>` element appended after tokens.css loads; add a CI lint gate `rg "#[0-9a-fA-F]{3,8}" frontend/src/components --glob '*.css'` (currently returns 0 matches — keep it that way).

6. **Seasonal auto-switch fights manual selection** *(Phase 5 — recovery: MEDIUM)* — user manually picks a theme; next page load the seasonal logic reverts it. Or timezone drift (UTC server vs UTC+8 user) switches at the wrong wall-clock time. **Fix:** manual pick sets `fc_user_override = {themeId, expiresAt: now+30d}`; seasonal checks it and yields if present; seasonal evaluates **once per season boundary** (store `fc_last_season`), not on every mount; season computed in user's local timezone.

7. **Slider drag re-renders the whole app** *(Phase 2 — recovery: LOW)* — `onChange` → `setSeed` in context → all 30+ consumers re-render × 60–120 events/sec → main thread saturates on low-end mobile (project's target). **Fix:** write preview tokens directly to a `<style id="skin-preview">` on `input` events (bypass React entirely); debounce context propagation ~150ms via existing `debounce` util; `useMemo` the context value. Also: never run `SchemeTonalSpot`/`themeFromSourceColor` in the render path — only at save/apply time.

8. **Elevation shadows & surface-tint don't track custom colors** *(Phase 1 apply set — recovery: LOW)* — elevation shadows in `tokens.css:163-167` are hardcoded `rgba(0,0,0,X)` (invisible on dark surfaces); `--md-color-surface-tint` defaults to primary and is easy to miss. **Fix:** include `surface-tint` (=== primary tone for the mode) in every generated scheme; override the 5 `--md-elevation-*` tokens for dark mode using the custom surface-tint at low alpha. State-layer tokens are SAFE (they're `var(--md-color-*)` references — verified no overrides).

## Implications for Roadmap

Consensus build order across all four research files (PITFALLS.md is the most explicit, with Phase-to-Pitfall mapping; FEATURES.md's dependency graph implies the same ordering; ARCHITECTURE.md and STACK.md's component breakdown aligns). Suggested **5 phases** + a deferred stretch.

### Phase 1: Foundation — Apply Engine, Storage Schema, FOUC Prevention
**Rationale:** Everything downstream consumes the apply/storage decisions. Five of the eight pitfalls (P1 FOUC, P2 override mechanism, P4 elevation in apply set, P5 light/dark matrix, P6 sync contract) are foundational and baked in here. Skipping to the editor guarantees rework.
**Delivers:** `theme-engine.js` (pure derive + buildCss + inject); extended inline `<script>` in `index.html`; `<style id="fc-dynamic-theme">` injection mechanism with separate `:root`/`[data-theme="dark"]` blocks; `presets.js` (5 preset definitions); `ThemeContext.jsx` skeleton (memoized value, reads localStorage, applies on mount); `/theme` route + header entry button; apply-on-click + persistent selection; hex-lint CI gate; verified light/dark × custom matrix.
**Addresses:** Token model + runtime adapter; FOUC-safe apply layer; 5 presets; apply-on-click + localStorage; header entry; light/dark independence; currently-active indicator.
**Avoids:** Pitfalls 1, 2, 4, 5, 6-contract.
**Research flag:** LOW — well-documented patterns (existing `theme` util + `generate-tokens.cjs` provide templates). One small spike: confirm MCU v0.4.0 imports cleanly via Vite at runtime (STACK.md notes a known Node-ESM packaging defect but says Vite/esbuild resolves it automatically — verify).

### Phase 2: Custom Theme Editor — UI, Live Preview, Performance
**Rationale:** The creative core of the feature. Depends entirely on the Phase 1 seed-based data model (P3 accessibility is unsolvable if Phase 1 shipped token-level editing). Highest research need of any phase.
**Delivers:** `ThemeEditor.jsx` with `react-colorful` pickers (primary/secondary/tertiary + hex inputs); live preview writing direct-to-DOM (bypassing React on `input`); debounced context propagation; save custom theme to localStorage (DB wiring in Phase 4); edit + delete custom themes; cancel/discard drafts.
**Addresses:** Custom editor with live preview; seed-based generation (accessibility-by-construction); edit/delete management.
**Avoids:** Pitfalls 3 (accessibility — seed-based `SchemeTonalSpot`), 7 (perf — direct-to-DOM preview + debounce + useMemo).
**Research flag:** HIGH — needs `/gsd-plan-phase --research-phase 2`. HCT color space behavior, the `Variant` enum (9 scheme variants: TonalSpot/Vibrant/Expressive/Content/Mono/Neutral/Fidelity/Rainbow/FruitSalad), and the direct-to-DOM preview pattern all need validation. **Spike the MCU runtime integration and variant selection before committing the editor data model.**

### Phase 3: Presets Polish + Cards-as-Previews
**Rationale:** The headline UX from the brief. The apply layer already exists from Phase 1; this phase renders the 5 preset cards as faithful mini-app previews and adds the management polish.
**Delivers:** `ThemeCard.jsx` (card body IS the live preview — wrapper `<div>` with ~10–12 salient tokens scoped inline renders a mini-UI: button + card + chip + surface ramp); currently-active indicator (MD3 `selected`/state-layer); mobile-first responsive grid (1-col phone, 2–3-col tablet); preset edit (not delete) UX enforcement.
**Addresses:** Cards-as-previews; mobile-first layout; preset immutability.
**Avoids:** Pitfall 4 verification across all 4 seasonal presets in both modes.
**Research flag:** LOW — CSS-var-scoping on a wrapper `<div>` is MDN-verified and used by every MD3 preview tool. Decide in plan phase whether to render real `<Button>`/`<Chip>` primitives inside cards (more faithful) or dedicated `.preview-*` classes (lighter).

### Phase 4: Backend Persistence — Cross-Device Sync
**Rationale:** PROJECT.md briefs "自定义 theme 数量无上限" with backend sync as a v1.5 differentiator. Can run in parallel with Phase 3 (presets are client-side) but must land before launch. The localStorage↔DB reconciliation contract was stubbed in Phase 1; this phase implements the API.
**Delivers:** `CustomTheme` model + Alembic `create_table("custom_themes")` migration; `theme_service.py` (static-method singleton, per-user ownership scoping like `favorite_service`); `themes.py` router under JWT (`POST/GET/PUT/DELETE /api/themes`); `schemas/theme.py` (`ThemeCreate/Update/Response` + `SourceColors` with hex validator); `ApiClient` 4 methods; mount reconciliation on login.
**Addresses:** Unlimited backend-synced custom themes; cross-device sync.
**Avoids:** Pitfall 6 (sync conflicts — DB-source-of-truth + updatedAt reconciliation + toast-on-save-failure).
**Research flag:** LOW — well-established codebase patterns (`favorites.py` provides the exact per-user CRUD template).

### Phase 5: Seasonal Auto-Switch
**Rationale:** Pure client-side logic layered on the Phase 1 apply layer. Separable from the core editor; technically could ship as an immediate follow-up if timeline-pressured (FEATURES.md flags it P1-P2). Can run in parallel with Phase 4.
**Delivers:** Season resolver (`getMonth()` → season map); hemisphere default (northern) + "南半球" toggle in `/theme` settings; `fc_user_override` flag with 30-day TTL; once-per-boundary evaluation (store `fc_last_season`); auto-switch toggle OFF by default + one-time discoverability toast.
**Addresses:** Seasonal auto-switch differentiator; hemisphere handling.
**Avoids:** Pitfall 8 (auto-switch fighting manual — override flag + once-per-boundary eval + user-timezone season).
**Research flag:** MEDIUM — **needs `/gsd-plan-phase --research-phase 5` and a discuss-phase product decision.** Season definition is unresolved: meteorological (Mar–May spring) vs astronomical vs 节气 (solar terms 立春/立夏 — the project is Chinese-context, 节气 may be more culturally appropriate than June 1 boundaries). Also: does auto-switch override the manual pick (current recommendation: remember but suspend, reversible)?

### Deferred (v1.6 stretch)
- MD3 scheme variant selector (segmented control over the 9 `Variant` enum values — big creative lever)
- HCT picker (Hue/Chroma/Tone sliders — power-user upgrade)
- JSON export/import (clipboard + file download)
- URL-shareable themes (base64 query param)
- Theme-from-image upload
- Accessibility contrast panel (guarded WCAG validation)

### Phase Ordering Rationale

- **Phase 1 first** because P1 (FOUC), P2 (override mechanism), P4 (elevation in apply set), P5 (matrix schema), P6 (sync contract) are *foundational apply/storage decisions*. Every later phase consumes them. Skipping to the editor (Phase 2) guarantees rework — and if Phase 2 ships token-level editing without contrast guards, retrofitting seed-based generation in a later phase means migrating every saved custom theme in the DB.
- **Phase 2 (Editor) second** because P3 (accessibility) and P7 (perf) are editor-internal and depend on the Phase 1 seed-based data model being settled.
- **Phase 3 (Presets UX) third** — straightforward once the apply layer exists; mainly verifies P4 across the 4 seasonal presets in both modes. Can partially overlap with Phase 2.
- **Phase 4 (Backend) can run parallel with Phase 3** (presets are client-side localStorage-only) but must land before launch — backend sync is a briefed v1.5 differentiator.
- **Phase 5 (Seasonal) can run parallel with Phase 4** (client-side logic vs API work; they only meet at the P6 reconciliation). It's the most product-decision-heavy phase, so flag for discuss-phase.

### Research Flags

**Needs `/gsd-plan-phase --research-phase N`:**
- **Phase 2 (Editor):** HIGH — HCT color space, scheme variants, direct-to-DOM preview pattern. Spike MCU runtime integration before committing the editor data model.
- **Phase 5 (Seasonal):** MEDIUM — season-definition (meteorological vs 节气) is a product/cultural decision; hemisphere handling; auto-switch vs manual-pick semantics.

**Standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** LOW — existing `theme` util + `generate-tokens.cjs` provide exact templates; only a small MCU runtime-import spike needed.
- **Phase 3 (Presets UX):** LOW — CSS-var-scoping for cards-as-previews is MDN-verified; plan-phase suffices.
- **Phase 4 (Backend):** LOW — `favorites.py` provides the exact per-user CRUD template.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | MCU already installed + proven in `generate-tokens.cjs`; `react-colorful` verified against npm registry (5.8.0, 0 deps, React 19 compat). HCT-not-in-culori verified against culori docs. Only medium-confidence item: actual tree-shaken bundle size (needs `vite build` size report in Phase 1). |
| Features | HIGH | Table stakes verified against Material Theme Builder (canonical reference, archived Jul 2026) + Android Wallpaper colors + existing `tokens.css`. Seasonal/hemisphere UX is MEDIUM (no single canonical source — synthesized from browser-API capabilities). |
| Architecture | HIGH | All decisions grounded in direct codebase analysis (`tokens.css`, `generate-tokens.cjs`, model/router/service patterns). SQLAlchemy `JSON` on SQLite verified via Context7. The CSS-override disagreement is resolved with high confidence (ARCHITECTURE.md's generated-`<style>` approach is independently corroborated by PITFALLS.md Pitfall 2). |
| Pitfalls | HIGH | All 8 critical pitfalls verified against actual code (line numbers cited: `tokens.css:163-167`, `index.html:8-16`, `AuthContext.jsx:47-57`); `rg` confirms zero component-level hardcoded colors and zero `--md-palette-*` direct consumers today. Recovery costs are honest (the flat-map and token-level-editor regressions are HIGH cost). |

**Overall confidence:** HIGH — This is a brownfield feature with a proven in-repo reference implementation (`generate-tokens.cjs`), an established domain (MD3 dynamic color), and well-mapped codebase patterns. The main risks are foundational decisions (FOUC, light/dark matrix, seed-based model) — all addressable in Phase 1.

### Gaps to Address

- **MCU bundle size at runtime** — STACK.md estimates 15–25 KB tree-shaken, but actual size depends on which exports get pulled. Validate with `vite build` + bundle analyzer in Phase 1. Mitigation already specified: `React.lazy(() => import('./pages/ThemePage.jsx'))` so MCU never loads on the main app shell.
- **MCU v0.4.0 ESM packaging defect in browser** — STACK.md says Vite/esbuild resolves the missing-`.js`-extensions automatically at bundle time, but this is unverified for the runtime import path. Small spike in Phase 1 (low risk; fallback: bundle a pre-built version).
- **Season definition** — meteorological vs astronomical vs 节气 (solar terms). Project is Chinese-context; 节气 (立春/立夏/立秋/立冬) may be more culturally appropriate than meteorological Mar–May. **Open product decision — resolve in discuss-phase before Phase 5.**
- **Hemisphere handling** — all researchers recommend default-northern + optional "南半球" toggle, but it needs explicit confirmation (no browser hemisphere API; timezone-heuristic is fragile). **Open product decision — resolve in discuss-phase.**
- **Number of editable source colors in MVP editor** — STACK.md suggests 1-color MVP (primary only, MCU auto-derives secondary/tertiary); FEATURES.md/ARCHITECTURE.md expose primary/secondary/tertiary (matching existing `generate-tokens.cjs`). Reconcile in plan phase — recommend P/S/T (matches the build script's proven pattern).
- **`SchemeTonalSpot` vs `themeFromSourceColor` with customColors** — both are valid MCU APIs (the latter internally uses the former for the default variant). Phase 2 spike must decide whether the editor passes `Variant` enum or instantiates `Scheme*` classes directly for variant selection.
- **`/theme` route gating** — PITFALLS.md flags that presets + active selection could work for logged-out users (localStorage), with only custom-theme CRUD behind auth. PROJECT.md scope implies family-member users. **Open product decision — resolve in discuss-phase.**
- **Logout behavior** — clear `fc_active_skin` on logout (security: shared-device) or preserve it (UX: continuity)? PITFALLS.md flags this as a security concern. **Open product decision — resolve in discuss-phase.**
- **Custom theme name uniqueness** — ARCHITECTURE.md assumes per-user unique (`UniqueConstraint(user_id, name)`, matching favorites). Confirm in plan phase.

## Sources

### Primary (HIGH confidence — verified directly)
- **In-repo code (decisive):**
  - `scripts/generate-tokens.cjs` — working proof that MCU derives 33 semantic roles + 6 palettes × 13 tones from 3 source colors; contains `ensurePackageImportable()` patcher documenting the v0.4.0 packaging defect; the exact API to reuse at runtime.
  - `frontend/src/css/tokens.css` — confirms `:root` + `[data-theme="dark"]` structure, ~50 semantic color roles + 6 tonal palettes, mode-invariant tokens (radius/spacing/elevation/motion/font), hardcoded `rgba(0,0,0,X)` elevations at lines 163-167, state-layer cascade at 189-190. **Generation contract: never edit manually.**
  - `frontend/package.json` — confirms MCU currently in `devDependencies` (must move to `dependencies`); `react-colorful` absent.
  - `frontend/src/utils/index.js` — existing `theme` util (`data-theme` attribute + `fc_theme` localStorage key); existing `debounce` helper.
  - `frontend/index.html:8-16` — existing inline FOUC-prevention script (the pattern to extend).
  - `frontend/src/contexts/AuthContext.jsx:16-57` — context pattern to follow, AND the non-memoized `value` (line 47-57) to NOT copy into ThemeContext.
  - `backend/app/models/favorite.py`, `routers/favorites.py`, `services/favorite_service.py` — exact per-user CRUD template (static-method singleton + ownership scoping + `UniqueConstraint`).
  - `backend/alembic/versions/72b56533bb6d_add_wishes_table.py` — modern `create_table` migration pattern.
- **npm registry (verified 2026-07-31):** `@material/material-color-utilities@0.4.0` (Apache-2.0, 0 deps); `react-colorful@5.8.0` (peer `react>=16.8.0`, 0 deps, 3.1 KB gzipped); `react-color@2.19.3` (12× larger — rejected); `color@5.0.3` (no HCT — rejected); `culori@4.0.2` (no HCT per culorijs.org/color-spaces — rejected).
- **Context7 library lookups:** `/material-foundation/material-color-utilities` (browser-native API, `themeFromSourceColor`, `DynamicScheme`); `/websites/sqlalchemy_en_20` (`sqlalchemy.dialects.sqlite.JSON` — "SQLite supports JSON as of 3.9 through JSON1 extension"; Python 3.11 bundles SQLite ≥3.39, JSON1 guaranteed).
- **MDN — CSS Custom Properties:** https://developer.mozilla.org/en-US/docs/Web/CSS/--* — "scoped to the element(s) they are declared on … Inherited: yes" (basis for cards-as-previews per-element override).
- **Material Theme Builder README** (canonical MD3 reference, archived Jul 23 2026): https://github.com/material-foundation/material-theme-builder — Core Colors (P/S/T/Neutral), HCT picker, JSON import/export, multi-theme presets.
- **Material Color Utilities README:** https://github.com/material-foundation/material-color-utilities — `SchemeTonalSpot(hct, isDark, contrastLevel)`, `Contrast.ratioOfTones`, 9 `Variant` enum values.

### Secondary (MEDIUM confidence)
- Bundle size estimates (3.1 KB react-colorful, 15–25 KB MCU tree-shaken) — tarball inspection + maintainer README claim; needs `vite build` validation in Phase 1.
- Seasonal/hemisphere UX — synthesized from standard astronomical season definitions + browser API capabilities (no canonical single source).
- MD3 spec elevation model (two-channel: shadow + surface-tint) — cross-referenced with MCU behavior.

---
*Research completed: 2026-07-31*
*Ready for roadmap: yes*
