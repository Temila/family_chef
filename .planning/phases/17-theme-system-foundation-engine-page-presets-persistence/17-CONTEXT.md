# Phase 17: Theme System Foundation — Engine, Page, Presets & Persistence - Context

**Gathered:** 2026-07-31
**Status:** Ready for planning

## Phase Boundary

一个完整可用的 theme 系统——theme-engine（派生 + 应用）、FOUC bootstrap、ThemeContext、/theme 卡片页（卡片即预览）、5 个预设、header 入口按钮、后端 CustomTheme 模型 + 迁移 + CRUD API + 跨设备同步。本阶段构建所有下游消费的基础：theme-engine.js（派生 + 应用）、FOUC bootstrap、ThemeContext、/theme 卡片页（卡片即预览）、5 个预设、header 入口按钮、后端 CustomTheme 模型 + 迁移 + CRUD API + 跨设备同步。/theme 页面同时渲染自定义 theme 的展示槽位（display-ready），但创建/编辑自定义 theme 在 Phase 18 交付。

## Requirements (locked via REQUIREMENTS.md)

**18 requirements mapped to this phase**: FND-01~07, TPAGE-01~07, SYNC-01~04. See `.planning/REQUIREMENTS.md` for full text and acceptance criteria. Downstream agents MUST read `.planning/REQUIREMENTS.md` before planning.

**In scope:**
- theme-engine.js (MCU-based derivation from seed colors → light + dark MD3 schemes)
- FOUC bootstrap inline script in `index.html` reading `fc_active_theme` and inserting `<style id="fc-dynamic-theme">` before first paint
- ThemeContext (active theme state, mount application, memoized value)
- /theme page (card grid, mobile-first responsive, card-as-preview mini-UI)
- 5 presets (current green + spring/summer/autumn/winter; fork-only semantics; not DB-backed)
- Header entry button (Palette icon, 48dp IconButton, between theme toggle and avatar)
- Backend CustomTheme SQLAlchemy model + Alembic migration
- REST API `/api/themes` (JWT, per-user scope, full CRUD)
- Cross-device sync (DB is source of truth, localStorage caches active selection, last-write-wins by updatedAt)

**Out of scope (Phase 18):**
- Custom theme editor (react-colorful picker, 9 MD3 variants, real-time drag preview)
- Seasonal auto-switch (season parser, hemisphere toggle, manual override TTL)

## Implementation Decisions

### Preset Semantics (TPAGE-04/05/07)

- **D-01 (Fork-only edits):** Presets (5 slots: 当前配色 / 春 / 夏 / 秋 / 冬) are read-only originals. Any user "edit" of a preset forks into a new custom theme — the 5 preset slots never mutate. UX: clicking "edit" on a preset opens a save dialog pre-filled with "我的春" / "我的夏" naming hint.
- **D-02 (Presets = Frontend constants):** 5 presets are hardcoded JS/TS constants in `frontend/src/theme/presets.js` (or `.ts`). They do NOT live in DB. Display cards read directly from this config. This avoids the "who owns this preset" multi-user edit problem entirely.
- **D-03 (Seed colors source):** 5 presets' seed colors (primary/secondary/tertiary hex triples) are hardcoded inline with each preset constant. Sourced in this single file: `frontend/src/theme/presets.js`. Future expansion (more palettes, brand packs) lives in same file.
- **D-04 (Variant = TonalSpot for v1.5):** All 5 presets + first CustomTheme save use MCU's `Scheme.light` (TonalSpot variant). Selection of other 8 variants (Vibrant/Expressive/Content/Mono/Neutral/Fidelity/Rainbow/FruitSalad) is Phase 18 EDIT-02.

### Card-as-Preview Rendering (TPAGE-03)

- **D-05 (Scoped CSS-var boundary + real primitives):** Each /theme card wraps a `<div data-fc-theme-scope={themeId}>` on whose boundary the engine sets all `--md-color-*` tokens via a generated `<style>` element scoped to that selector. Inside that boundary, render real `<Card>`/`<Button>`/`<Chip>` primitives from `frontend/src/components/primitives/` — they consume `--md-*` vars natively, so the preview shows the EXACT same rendering as if the theme were active. No mocked mini-UI, no iframe. TPAGE-03 "mini-UI through CSS variable inheritance" satisfied.
- **D-06 (Preview content = full mini-UI):** Inside each preview scope: 1 elevated Card, 1 filled Button + 1 tonal Button, 1 Chip (filter variant + label), and a 4-step surface ramp (surface-container-lowest → highest) so the user can see "depth" gradient at a glance.
- **D-07 (Static preview in Phase 17):** Each preset/custom card's preview is rendered once at /theme page mount from the card's theme source colors (MCU derive → CSS vars → render). Real-time drag-time update is Phase 18 EDIT-03.

### Apply Layer (FND-01/02/03/04)

- **D-08 (Apply via synthesized `<style id="fc-dynamic-theme">`):** `theme-engine.js` accepts sourceColors + variant → derives light + dark MD3 schemes via MCU → produces ONE `<style>` element with two blocks: (1) `:root { --md-color-primary: ...; --md-color-primary-container: ...; ... }` for LIGHT, and (2) `[data-theme="dark"] { --md-color-primary: ...; --md-color-primary-container: ...; ... }` for DARK. Idempotent re-application: replace innerHTML of existing element by id "fc-dynamic-theme"; insert if absent. Zero `style.setProperty` calls.
- **D-09 (Light/dark orthogonal via CSS cascade):** Because the two blocks are selector-scoped (`:root` for default light, `[data-theme="dark"]` for dark) and the existing ThemeToggle only flips `data-theme` on `<html>`, switching light↔dark re-paints within the same theme instantly with zero JS re-application. FND-03 satisfied structurally.
- **D-10 (FOUC bootstrap in `index.html`):** Extend the existing inline `<script>` block (which currently only handles `fc_theme` for light/dark) to also: read `fc_active_theme` from localStorage (a small JSON blob: `{ sourceColors, variant }`); if present and valid, run the same theme-engine synthesize path and `document.head.appendChild(<style id="fc-dynamic-theme">)` BEFORE first paint. If `fc_active_theme` missing / JSON parse fails / MCU not yet loaded → fall back to tokens.css default (`#34834E` Primary, etc.). FND-04 satisfied.
- **D-11 (ThemeContext mount/apply + memoized value):** ThemeContext exposes `{ activeTheme, setActiveTheme, customThemes, refreshCustomThemes }`. On `mount` and on `activeTheme` change, re-synthesize the `<style id="fc-dynamic-theme">` via the same path. Provider wraps the app inside existing AuthProvider in `App.jsx`. `useMemo` for the value object to prevent consumer re-renders. FND-05 satisfied.

### Backend CustomTheme Model + Sync (SYNC-01/02/03/04)

- **D-12 (CustomTheme model per-user):** New `backend/app/models/custom_theme.py` — `CustomTheme { id, user_id (FK users.id, ON DELETE CASCADE, NOT NULL), name (String(100) NOT NULL), source_colors (JSON NOT NULL), variant (String(20) NOT NULL DEFAULT 'TonalSpot'), created_at, updated_at }`. Indexes: `ix_custom_themes_user_id`, `uq_custom_themes_user_name` (unique per (user_id, name) so users can't have duplicate names). Export from `backend/app/models/__init__.py`. SYNC-01 satisfied.
- **D-13 (Alembic migration):** `backend/alembic/versions/<hash>_add_custom_themes_table.py` — `op.create_table('custom_themes', ...)` with `op.create_index('ix_custom_themes_user_id', ...)` and `op.create_index('uq_custom_themes_user_name', 'custom_themes', ['user_id', 'name'], unique=True)`. Add to migration `down_revision` chain after current head.
- **D-14 (REST API `/api/themes`):** `backend/app/routers/themes.py` + `backend/app/services/custom_theme_service.py`. JWT-protected via existing `get_current_user_from_token`. Endpoints:
  - `GET /api/themes` — list current user's custom themes (no pagination needed, count cap = unlimited)
  - `POST /api/themes` — create (validate name + sourceColors shape + variant ∈ known list)
  - `PUT /api/themes/{id}` — update (ownership check; returns 403 if not owner)
  - `DELETE /api/themes/{id}` — soft-or-hard delete (recommend hard delete; cascades to nothing else)
  - Per-user isolation enforced in service layer (`WHERE user_id = current_user.id`). SYNC-02 + SYNC-04 satisfied.
- **D-15 (Sync pull strategy):** On `ThemeContext.mount` → fire-and-forget `GET /api/themes` (full payload of each CustomTheme including sourceColors JSON). Render custom themes with cached `localStorage` instantly (paint with last-known data) → on response, replace + persist to localStorage. No `updatedAt`-metadata-only optimization in Phase 17 — full payload is small (each theme is one JSON object ~200 bytes).
- **D-16 (Conflict resolution = last-write-wins by updatedAt):** When the user picks a theme on device A and switches to device B: device B's mount-pulled list shows the latest theme, but the user's *active selection* (`fc_active_theme` in localStorage) reflects device B's last pick — until device B explicitly pulls and detects the new updatedAt. Recommended UX: on device B mount-pull, if the fetched custom theme list's `updatedAt` differs from what was painted, show a small toast "i已同步最新主题" and replace. Active theme `apply` writes to localStorage optimistically; on every ThemeContext render after mount-fetch, if `activeTheme.kind === 'custom' && activeTheme.id is in fetched && theme.updatedAt > localStorage.fetchedAt` → re-apply updated. SYNC-03 satisfied in spirit.
- **D-17 (Cross-device failure UX = toast + fallback):** If the mount-pull `/api/themes` fails (network/server): leave the cached `localStorage` active theme visible, show a Snackbar "无法同步主题（请检查网络）". Local-only mode (offline) is allowed for the duration. Avoid silently swallowing failures per FND-05 spirit.

### Header Entry Point (TPAGE-01)

- **D-18 (Palette IconButton in Header):** `frontend/src/components/composites/Header.jsx` adds a new `IconButton` between `<IconButton className="md-header__theme-toggle">` (light/dark) and the avatar button. Icon = `Palette` (already in `frontend/src/components/primitives/Icon.jsx`'s @material-symbols-svg/react@0.13.0 import set; confirmed in node_modules dist/index.d.ts). ariaLabel="选择主题". onClick → `navigate('/theme')`. Same 48dp IconButton, same className pattern.
- **D-19 (Header now visible on PC + mobile):** Relax `.md-header { display: none }` rule on viewports < 1024px. Rationale: /theme must be reachable from any device and the user has chosen Header as the universal entry point. BottomBar remains untouched (no theme tab). Note: the Header's right cluster may need a compact layout (3 buttons instead of 2) at narrow viewports — recommend CSS flex-wrap or icon-only label truncation (preserve 48dp touch target).
- **D-20 (Title + nav):** Add `'/theme': '主题'` to `PAGE_TITLES` dict in `Header.jsx`. Route registration: add `<Route path="/theme" element={<ProtectedRoute requiredRoles={['user', 'chef', 'admin']}><ThemePage /></ProtectedRoute>} />` inside the `<Route element={<PcLayout />}>` block in `frontend/src/App.jsx`.

### Engine Module

- **D-21 (`frontend/src/theme/` directory):** New directory: `frontend/src/theme/` containing `theme-engine.js` (MCU bridge: derive light+dark MD3 schemes from `{ sourceColors, variant }`), `presets.js` (5 preset constants), `theme-context.jsx` (React Provider/hook), `index.js` (re-exports). ThemeContext imports both engine + presets.
- **D-22 (MCU integration):** Use `@material/material-color-utilities@^0.4.0` (already installed as devDep). Import `corePalette`, `DynamicScheme` (light + dark variants), `schemeFromProperties` etc. The same JSON the build script `scripts/generate-tokens.cjs` uses can be replicated here for client-side runtime. Pre-bundled by Vite (no need for dynamic import).

### Hex-Lint Gate (FND-07)

- **D-23 (Reuse existing token-check):** The existing `scripts/check-m3-tokens.sh` Check #3 already verifies "no hex literals in CSS outside tokens.css". Extend it (or add a sibling check) to also scan `frontend/src/**/*.jsx` for hardcoded `color: '#xxxxxx'` or `background: '#xxxxxx'` style props, and `frontend/src/theme/presets.js` is exempted (those hex values are the source-of-truth inputs). The gate fails CI on any new hardcoded color in JSX.

### Phase Boundary Reinforcement

- **D-24 (Phase 18 owns editor + season):** Phase 17 ships the read-only /theme card grid + click-to-apply + server-backed custom theme CRUD display. No color picker UI in Phase 17. No seasonal auto-switch in Phase 17. Phase 18 ships: react-colorful editor, 9-variant selector, season parser, hemisphere toggle, manual override TTL.
- **D-25 (Per-user page render-only):** The /theme page renders ALL custom themes for the current user, sorted by `updated_at DESC`. There is no "preset first / custom last" ordering separation — both kinds are cards in the same grid, distinguished by a "预设"/"自定义" small chip in the card header. This simplifies the card-as-preview layout.

### the agent's Discretion

- Whether to bundle `theme-engine.js` with MCU as one chunk or split (splitting helps mobile cold-start but breaks the inline FOUC bootstrap which needs synchronous access). Recommendation: bundling MCU into the main chunk is acceptable for v1.5 given MCU's ~30KB gzip footprint; revisit if First Input Delay metrics regress.
- Whether to add a "Reset to default" button on /theme (resets active theme to the original current-green preset) — recommend YES, top-right of /theme page, single IconButton "restart-alt" with confirmation Snackbar.
- Whether to validate `sourceColors` shape strictly (must have exactly primary/secondary/tertiary hex strings) at the API layer — recommend YES (Pydantic field_validator raises 400 on shape mismatch).
- Whether to soft-delete or hard-delete custom themes — recommend HARD delete for v1.5 (no need for trash semantics; cost of accidental deletion is small since user re-creates from same source colors).
- Snackbar text for sync failure — recommend "无法同步主题（请检查网络），已使用上次缓存".
- Snackbar text for cross-device updatedAt re-apply — recommend "已同步最新主题".

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project artifacts
- `.planning/REQUIREMENTS.md` § "v1.5 Requirements" lines 51-95 — FND/TPAGE/SYNC requirement text
- `.planning/ROADMAP.md` § "Phase 17" — phase goal, dependency, success criteria, research flags
- `.planning/PROJECT.md` § "Current Milestone" + § "Constraints" — v1.5 target features + tech constraints
- `.planning/STATE.md` § "Branch State" + § "Decisions" — branch context + Phase 10-16 collected decisions relevant to themeing

### Existing code (reusable patterns)
- `frontend/src/components/composites/Header.jsx` — PC header where new entry button slots in (line 96-102 `__right` cluster; lines 28-48 `PAGE_TITLES`; line 10 PC-only visibility comment)
- `frontend/src/css/styles.css` — `.md-header { display: none @ <1024px }` style to relax per D-19 (search for `.md-header` rules)
- `frontend/src/utils/index.js` lines 6-37 — existing `theme` util (`fc_theme`, `data-theme` attribute) — Phase 17 coexists with this, not replaces it
- `frontend/index.html` lines 8-16 — existing inline FOUC bootstrap script that Phase 17 extends per D-10
- `frontend/src/css/tokens.css` lines 1-238 — current `:root` + `[data-theme="dark"]` MD3 tokens (the "fallback default" per D-10)
- `scripts/generate-tokens.cjs` lines 1-100+ — build-time MCU usage pattern (PC-side PHASE 17 will mirror this client-side)
- `frontend/package.json` devDependencies — `@material/material-color-utilities@^0.4.0` already installed
- `frontend/node_modules/@material/material-color-utilities/scheme/scheme.d.ts` — MCU variant API surface (Scheme / DynamicScheme)
- `frontend/node_modules/@material-symbols-svg/react/dist/index.d.ts` — confirms `Palette` is an exported icon (line grep `Palette`)

### Backend patterns to mirror
- `backend/app/models/wish.py` lines 1-37 — per-user model pattern (FK + indexes + created/updated_at)
- `backend/app/models/favorite.py` lines 1-18 — minimal per-user CRUD template (user_id + FK + unique constraint)
- `backend/app/models/guest_invitation.py` — DB schema + token model pattern
- `backend/alembic/versions/a9b1c2d3e4f5_add_guest_invitations_table_and_guest.py` — modern migration pattern (create_table + indexes + indexes for queries)
- `backend/app/services/favorite_service.py` lines 1-127 — service class with `@staticmethod` methods, error-as-ValueError pattern
- `backend/app/routers/favorites.py` lines 1-109 — thin FastAPI route pattern (Depends(get_db), Depends(get_current_user_from_token), PageResponse wrapping)
- `backend/app/schemas/favorite.py` lines 1-15 — minimal Pydantic schema pattern (Create/Response with from_attributes)
- `backend/app/main.py` — router registration via `app.include_router()`

### Frontend integration points
- `frontend/src/App.jsx` — route definitions; add `/theme` Route inside `<Route element={<PcLayout />}>` block (around line 121+)
- `frontend/src/App.jsx` lines 103-110 — provider stack (add `ThemeProvider` inside or alongside `CategoriesProvider` / `ToastProvider`)
- `frontend/src/contexts/AuthContext.jsx` lines 1-50 — current pattern for context provider + `useXxx` hook
- `frontend/src/components/primitives/Icon.jsx` lines 85-149 — Icon registry; `palette` should be added (Palette component is in node_modules dist)
- `frontend/src/components/primitives/Card.jsx`, `Button.jsx`, `Chip.jsx` — primitives consumed by /theme preview mini-UI (must read `--md-*` vars natively per D-05)
- `frontend/src/api/client.js` lines 240-270 — pattern for per-entity CRUD methods (e.g., `getWishes`, `addFavorite`); add `getThemes/createTheme/updateTheme/deleteTheme` here
- `frontend/src/contexts/ToastContext.jsx` — for `showToast` calls per D-17, D-25

### Tooling
- `scripts/check-tokens.sh` lines 60+ Check #4 — template for hex-lint extension per D-23
- `scripts/audit-md3-compliance.mjs` — referenced as existing MD3 compliance audit; may be extended for theme card preview validation
- `frontend/eslint.config.js` — flat config; will not need changes since theme code stays within conventions

## Existing Code Insights

### Reusable Assets
- **`<Card>` / `<Button>` / `<Chip>` primitives** (`frontend/src/components/primitives/`) — Phases 10-11 MD3 primitives natively read `--md-color-*` tokens. Placing them inside a scoped CSS-variable boundary (D-05) gives high-fidelity previews at zero cost. No mock UI.
- **`@material/material-color-utilities@0.4.0`** (existing devDep) — Same library `scripts/generate-tokens.cjs` uses to derive the current tokens.css. Phase 17 imports it client-side to derive per-theme custom tokens at runtime. SPA-friendly since MCU is tree-shakeable.
- **MCU variant API (`Scheme.light()` / `DynamicScheme.light()`)** — exposes all 33 MD3 roles per side; Phase 17 emits exactly those roles in the synthesized `<style id="fc-dynamic-theme">`. Phase 18 will switch variants by passing different `variant` values to the engine.
- **`get_current_user_from_token` + `Depends(get_db)` (FastAPI)** — already wired in `backend/app/routers/auth.py`. New `backend/app/routers/themes.py` uses both as-is.
- **`ApiClient` singleton pattern (`frontend/src/api/client.js`)** — Phase 17 adds `getThemes()` / `createTheme()` / `updateTheme()` / `deleteTheme()` methods following the existing per-entity pattern.

### Established Patterns
- **Service class with `@staticmethod` methods** (per `backend/app/services/`) — New `CustomThemeService` follows same pattern.
- **Pydantic field validation via `field_validator`** (per `backend/app/schemas/user.py`) — ThemeCreate schema should validate `source_colors` shape (`{primary: str, secondary: str, tertiary: str}` where each is `^#[0-9a-fA-F]{6}$`) and `variant ∈ {TonalSpot, Vibrant, Expressive, Content, Mono, Neutral, Fidelity, Rainbow, FruitSalad}` at Pydantic level.
- **Generated CSS via `<style>` insertion** — New pattern for Phase 17. Idempotent replace by id.
- **React Context provider + `useTheme()` hook** — Mirrors `AuthContext` (lines 1-50 + `App.jsx` provider stack).
- **Theme Toggle pattern (Header inline + dead ThemeToggle.jsx)** — ThemeToggle.jsx is now dead code (post Phase 15 NAV-02); Phase 17's new entry button reuses the inline-onClick + `useState(currentTheme)` shape from `Header.jsx` lines 57-60.

### Integration Points
- `frontend/index.html` line 8 `<script>` (inline FOUC bootstrap) — extend per D-10.
- `frontend/src/main.jsx` — root mount; Phase 17 ThemeProvider sits between AuthProvider and the existing providers in `App.jsx`.
- `frontend/src/App.jsx` lines 103-110 — provider stack insertion point.
- `frontend/src/App.jsx` lines 121+ `<Route element={<PcLayout />}>` — `/theme` route insertion.
- `backend/app/main.py` — `app.include_router(themes.router)` registration.
- `backend/app/models/__init__.py` lines 1-13 — `CustomTheme` model export.
- `backend/alembic/versions/` — new migration file appended to chain.
- `frontend/src/css/styles.css` — may need mobile-header visibility tweak per D-19.

## Specific Ideas

- **Header entry = icon-only** — matches existing ThemeToggle pattern (48dp IconButton, no text label). User explicitly chose "纯图标" over "图标+文字" for header consistency. See D-18.
- **Preset naming convention** — When user forks a preset ("spring"), pre-fill name as "我的春" (or "我的春季主题"). User can edit before save. See D-01 follow-up.
- **Reset to default button** — Top-right of /theme page (recommended, agent discretion per D-24). Resets active theme to the original current-green preset. Confirmation Snackbar.
- **5 presets = current green + 4 seasons** — Naming: "默认" / "春" / "夏" / "秋" / "冬". Seed colors to be hand-tuned by user/designer in `frontend/src/theme/presets.js`. Concrete seed values TBD by designer (out of code scope).
- **Cross-device re-apply toast text** — "已同步最新主题" (D-25 agent discretion).
- **Sync failure toast text** — "无法同步主题（请检查网络），已使用上次缓存" (D-17).

## Deferred Ideas

- **react-colorful picker UI** — Phase 18 EDIT-01.
- **9-variant selection** — Phase 18 EDIT-02.
- **Real-time drag preview** — Phase 18 EDIT-03 (Phase 17 = static per D-07).
- **Seasonal auto-switch** — Phase 18 SEAS-01~04 (Season parser, hemisphere toggle, manual override TTL).
- **HCT-picker for advanced users** — Future, post-v1.5 (REQUIREMENTS "Future").
- **JSON theme export/import** — Future (REQUIREMENTS "Future").
- **URL-shareable theme (base64 query)** — Future (REQUIREMENTS "Future").
- **Image-derived theme (themeFromImage)** — Future (REQUIREMENTS "Future").
- **Contrast panel (WCAG verifier)** — Future (REQUIREMENTS "Future").
- **BottomBar "主题" tab** — Deferred; Header is sole v1.5 entry per D-19. May be added later if mobile UX feels unbalanced.
- **Alembic auto-upgrade at startup** — Already shipped (Phase 16 TD-06); no Phase 17 work but referenced for context that `cd backend && uv run alembic upgrade head` will run on container start.

---
*Phase: 17-Theme System Foundation — Engine, Page, Presets & Persistence*
*Context gathered: 2026-07-31*
