# Phase 17: Theme System Foundation — Engine, Page, Presets & Persistence - Research

**Researched:** 2026-07-31
**Confidence:** HIGH
**Phase research flag:** LOW (per ROADMAP.md § Phase 17)
**Source:** Synthesized from project-level `.planning/research/{STACK,ARCHITECTURE,FEATURES,PITFALLS,SUMMARY}.md` (1900 LOC) + `.planning/phases/17-.../17-CONTEXT.md` (25 locked decisions). No new external research needed.

> Downstream agents (`gsd-pattern-mapper`, `gsd-planner`, `gsd-plan-checker`) MUST read this file before producing artifacts. They MAY also read the source-level research for context but should not re-derive what is captured here.

---

## Executive Summary

Phase 17 builds the **foundation of the v1.5 theme system**. It delivers: a runtime MD3-derivation engine, FOUC-safe apply layer, ThemeContext, /theme card-grid page, 5 presets, header entry button, backend `CustomTheme` model + per-user CRUD API + cross-device sync, and the hex-lint CI gate.

Phase 18 (separate milestone phase) consumes these foundations to deliver react-colorful editor + 9 MD3 variants + seasonal auto-switch. Phase 17 deliberately ships nothing on those axes.

The dominant pattern is **promote `generate-tokens.cjs` build-time logic to runtime** — same MCU call, same MCU library, but invoked client-side at apply time, with storage of only ~100 bytes of source key colors (not the ~4 KB full derived token set).

Top risks (in priority order): (1) FOUC on cold load, (2) light/dark × custom-color matrix, (3) sync conflicts between localStorage and DB, (4) CSS specificity wars if `tokens.css` is edited. All four have concrete architectural mitigations baked into CONTEXT.md.

---

## 1. Technology Stack (locked)

| Technology | Version | Phase 17 Action | Justification |
|---|---|---|---|
| `@material/material-color-utilities` | `^0.4.0` (already installed as devDep) | **PROMOTE to `dependencies`** | Same library `scripts/generate-tokens.cjs` uses. Must now ship in the browser bundle, not only at build time. |
| `react-colorful` | `^5.8.0` | **DEFER to Phase 18** | 3.1 KB editor picker is exclusively for Phase 18 EDIT-01. **Phase 17 does NOT add this dependency.** |
| Native CSS Custom Properties | (browser built-in) | Use generated `<style id="fc-dynamic-theme">` element | Existing `tokens.css` is 100% CSS custom properties. Override via appended `<style>` block wins the cascade without any library. |
| SQLAlchemy 2.0 `JSON` | (already in `pyproject.toml`) | Use for `CustomTheme.source_colors` column | SQLite ≥3.9 with JSON1 (Python 3.11 bundles SQLite ≥3.39, JSON1 guaranteed). |
| FastAPI + Alembic + Pydantic V2 | (existing) | Add `routers/themes.py` + `services/custom_theme_service.py` + `schemas/theme.py` | Mirror the `favorites.py` per-user CRUD pattern verbatim. |
| React 19 Context | (existing pattern) | New `theme-context.jsx` mirroring `CategoriesContext` | Use `useMemo` on the value (unlike `AuthContext`'s non-memoized pattern — theme state changes frequently during drag in Phase 18). |
| `Icon` registry | `@material-symbols-svg/react@0.13.0` (existing) | Use `Palette` icon, already exported | Verified in `node_modules/@material-symbols-svg/react/dist/index.d.ts`. |

**Explicitly NOT added in Phase 17:** `react-colorful` (Phase 18), MCU variant enum usage (Phase 18 EDIT-02), seasonal logic (Phase 18 SEAS-*), HCT picker (future), JSON import/export (future).

---

## 2. Architecture Approach

### 2.1 Layered Architecture (unchanged from v1.0/v1.2)

```
Routers (HTTP)     → Services (business logic) → Models (ORM)
   ↓                     ↓                          ↓
themes.py          custom_theme_service.py      CustomTheme
                                             (JSON source_colors)
```

All three new files mirror existing patterns (static-method service singleton, `@staticmethod` methods, `AsyncSession` injected, `get_current_user_from_token` for auth). See `.planning/phases/17-.../17-CONTEXT.md` D-12 through D-17 for exact field/repo shapes.

### 2.2 Frontend Module Layout

```
frontend/src/theme/                              ← NEW directory
  ├── theme-engine.js                           ← Pure module: derive + buildCss + inject
  ├── presets.js                                ← 5 preset constants (current + 4 seasons)
  ├── theme-context.jsx                         ← React Provider + useTheme() hook
  └── index.js                                  ← Re-exports
```

The `theme-engine.js` module is **pure** (no React, no DOM-touching side effects in `derive`/`build`). Only `injectThemeCss(cssText)` touches the DOM. This is load-bearing because the **same module is called by two callers** (inline FOUC bootstrap + `ThemeContext`) and must produce byte-identical CSS pre- and post-mount.

### 2.3 Apply Mechanism (FOUC-safe)

**Single source of truth:** a generated `<style id="fc-dynamic-theme">` element appended to `<head>` AFTER `tokens.css` loads. Contains two blocks:

```css
:root {
  --md-color-primary: ...;
  --md-color-on-primary: ...;
  /* ~50 semantic roles — light scheme */
}
[data-theme="dark"] {
  --md-color-primary: ...;
  --md-color-on-primary: ...;
  /* ~50 semantic roles — dark scheme */
}
```

**Why this works for light/dark toggle:** the existing `theme` util in `frontend/src/utils/index.js` (lines 6-37) only flips the `data-theme` attribute on `<html>`. The `<style>` rule with selector `[data-theme="dark"]` participates in the **same CSS cascade** — the browser re-paints without any JS re-application. FND-03 satisfied structurally.

**Why this avoids editing tokens.css:** `tokens.css` is regenerated by `npm run gen:tokens` and silently overwrites manual edits. The generated `<style>` element is the safer surface (append-after-load also has higher cascade priority).

### 2.4 FOUC Bootstrap

Extend the existing inline `<script>` in `frontend/index.html` lines 8-16:

```html
<script>
  (function(){
    // EXISTING (light/dark):
    var saved = localStorage.getItem('fc_theme');
    var preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && preferDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // NEW (active theme):
    var themeRaw = localStorage.getItem('fc_active_theme');
    if (themeRaw) {
      try {
        var theme = JSON.parse(themeRaw);
        var css = buildThemeCssSync(theme.sourceColors, theme.variant || 'TonalSpot');
        var style = document.createElement('style');
        style.id = 'fc-dynamic-theme';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
      } catch (e) {
        // malformed JSON → fall back to tokens.css defaults
      }
    }
  })();
</script>
```

`buildThemeCssSync` is a synchronous export from `theme-engine.js`. Because it runs BEFORE React mounts, it must not import React. Vite will tree-shake + bundle this for production.

### 2.5 Backend Mirror

```
backend/app/
  ├── models/
  │   └── custom_theme.py            ← NEW: CustomTheme class (FK to User, JSON column)
  ├── schemas/
  │   └── theme.py                   ← NEW: Pydantic V2 Create/Update/Response + SourceColors
  ├── services/
  │   └── custom_theme_service.py    ← NEW: @staticmethod methods
  └── routers/
      └── themes.py                  ← NEW: GET/POST/PUT/DELETE /api/themes (JWT)
```

Field shape (per CONTEXT.md D-12):

```python
class CustomTheme(Base):
    __tablename__ = "custom_themes"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_colors: Mapped[dict] = mapped_column(JSON, nullable=False)
    variant: Mapped[str] = mapped_column(String(20), nullable=False, default="TonalSpot")
    created_at: Mapped[datetime]  # via naive_utc_now() per Phase 16 decision
    updated_at: Mapped[datetime]  # via naive_utc_now() per Phase 16 decision
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_custom_themes_user_name"),
    )
```

Migration pattern: copy `backend/alembic/versions/72b56533bb6d_add_wishes_table.py` structure (create_table + indexes + batch_alter_table wrapper for SQLite).

### 2.6 Page Layout (`/theme`)

- **Route registration** (`App.jsx`): `<Route path="/theme" element={<ProtectedRoute requiredRoles={['user', 'chef', 'admin']}><ThemePage /></ProtectedRoute>} />` inside the existing `<Route element={<PcLayout />}>` block.
- **Page grid**: `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--md-spacing-4);` — mobile-first 1-col, 2-col at 480px, 3-col at 880px.
- **Card-as-preview** (CONTEXT.md D-05–D-07): each card wraps a `<div data-fc-theme-scope={themeId}>` on which the engine scopes `--md-color-*` tokens via a generated `<style>` scoped to that selector. Inside the boundary, render real primitives (`<Card>`, `<Button>`, `<Chip>`) — they consume `--md-*` vars natively, so the preview shows the EXACT same rendering as if the theme were active. **No mocked mini-UI, no iframe.**
- **Preview content** (D-06): 1 elevated Card, 1 filled Button + 1 tonal Button, 1 Chip, and a 4-step surface ramp.

### 2.7 Header Entry Point

- Insert between the existing theme-toggle IconButton and the avatar IconButton in `frontend/src/components/composites/Header.jsx` `__right` cluster.
- Icon: `Palette` (from existing `@material-symbols-svg/react`).
- Same 48dp IconButton wrapper (md-header__pattern).
- onClick → `navigate('/theme')`.
- `ariaLabel="选择主题"`.
- **Visibility relaxation:** `.md-header { display: none }` at <1024px must be relaxed because /theme must be reachable from any device. Per CONTEXT.md D-19, header becomes visible PC+mobile (BottomBar unchanged).
- **Compact layout:** 3 right-cluster buttons need flex-wrap / icon-only label truncation at narrow viewports while preserving 48dp touch target.

---

## 3. Critical Pitfalls (ranked, with mitigations)

### P1: FOUC on cold load (CONTEXT.md D-10, SUMMARY.md Pitfall 1)
- **Risk:** React mounts after first paint; any `useEffect`-based apply flashes default green theme for 1–3 frames before custom theme snaps in. Flash is jarring for drastically different palettes (spring pink → winter blue).
- **Mitigation:** Extend the existing inline `<script>` in `index.html` to read `fc_active_theme` → derive → inject `<style id="fc-dynamic-theme">` BEFORE first paint. React's theme application afterwards is idempotent (replace innerHTML by id).
- **Verification:** DevTools 4× CPU throttle test. FND-04 success criterion 1.

### P2: Light/dark × custom-color matrix (CONTEXT.md D-09, SUMMARY.md Pitfall 2)
- **Risk:** every MD3 role has different values per mode (primary is tone 40 in light, tone 80 in dark). Single flat map fails; toggling dark with custom theme active either reverts to default green or shows broken pale-on-dark colors.
- **Mitigation:** derive `{light, dark}` together from one seed via MCU. The generated `<style>` carries separate `:root` and `[data-theme="dark"]` blocks. The existing ThemeToggle just flips `data-theme` — the cascade handles the swap.
- **Verification:** FND-03 success criterion 2.

### P3: localStorage ↔ DB sync conflicts (CONTEXT.md D-15/16/17, SUMMARY.md Pitfall 4)
- **Risk:** device A creates a theme, device B's stale localStorage wins, or last-write-wins destroys edits.
- **Mitigation:** **DB is source of truth** for custom themes; localStorage is cache + active-skin snapshot. On mount after FOUC paint: fetch `/api/themes`, reconcile by `updatedAt`. On save: write DB first, update localStorage only on success, **toast on failure** (project precedent in `order_service.py:217` is incorrect — it's silent; theme sync must visibly fail).
- **Sync UX:** pull on mount, render cached localStorage instantly, replace + persist to localStorage on response (D-15). On updatedAt drift, show toast "已同步最新主题" (D-25). On fetch failure, show toast "无法同步主题（请检查网络），已使用上次缓存" (D-17).

### P4: Specificity wars / editing tokens.css (CONTEXT.md D-08, SUMMARY.md Pitfall 5)
- **Risk:** `tokens.css` is auto-generated (`npm run gen:tokens` silently wipes manual edits); and stray `!important` token redefinitions in component CSS beat non-important inline overrides.
- **Mitigation:** **NEVER edit `tokens.css`**. Apply via the generated `<style>` element appended AFTER tokens.css loads (later in the cascade, same specificity, equal rules → later-wins). Add CI lint gate `rg "#[0-9a-fA-F]{3,8}" frontend/src/components --glob '*.css'` (currently 0 matches — keep it that way) AND scan `frontend/src/**/*.jsx` for `color: '#xxxxxx'` props — `frontend/src/theme/presets.js` is exempted (it's the source-of-truth inputs).

### P5: Elevation shadows & surface-tint don't track custom colors (CONTEXT.md D-09, SUMMARY.md Pitfall 8)
- **Risk:** elevation shadows in `tokens.css:163-167` are hardcoded `rgba(0,0,0,X)` (invisible on dark surfaces); `--md-color-surface-tint` defaults to primary and is easy to miss.
- **Mitigation:** include `surface-tint` (= primary tone for mode) in every generated scheme; override the 5 `--md-elevation-*` tokens for dark mode using the custom surface-tint at low alpha. State-layer tokens are SAFE (`var(--md-color-*)` references, no overrides).
- **FND-06 success criterion 3.**

### P6: Schema push requirement (ORM detected: SQLAlchemy)
- **Risk:** Phase 17 adds Alembic migration. Build/types pass without the migration actually running, creating false-positive verification.
- **Mitigation:** Inject **[BLOCKING] schema push task** — `cd backend && uv run alembic upgrade head` must run before verification. Container start already runs `alembic upgrade head` (per Phase 16 TD-06), but for local/dev the planner must include this as an explicit task with verified file/migration on disk.

### P7: Backend test coverage gap (per `.planning/config.json` nyquist_validation=false → skip Nyquist)
- **Risk:** no automated tests per existing pattern; new router/service needs sanity tests.
- **Mitigation:** follow `tests/` patterns for favorites router (look for `test_favorites.py` if exists); add `test_themes.py` covering create/list/update/delete and per-user scoping (403 if not owner).

---

## 4. Implementation Boundaries

### Phase 17 IN scope (per CONTEXT.md § "In scope"):
- `frontend/src/theme/theme-engine.js` — pure derivation + apply helpers
- `frontend/src/theme/presets.js` — 5 preset constants (current + 4 seasons)
- `frontend/src/theme/theme-context.jsx` — Provider + hook with memoized value
- `frontend/src/theme/index.js` — re-exports
- Extend `frontend/index.html` FOUC bootstrap script
- Wrap App with `<ThemeProvider>` in `frontend/src/App.jsx`
- Add `<Route path="/theme" ...>` in `App.jsx` inside `<Route element={<PcLayout />}>` block
- Header entry Palette IconButton in `frontend/src/components/composites/Header.jsx` (line ~96-102 `__right` cluster)
- Relax `.md-header` display rule on mobile in `frontend/src/css/styles.css`
- `frontend/src/pages/ThemePage.jsx` — card grid + apply-on-click
- `frontend/src/components/theme/ThemeCard.jsx` — card-as-preview
- `frontend/src/api/client.js` add `getThemes / createTheme / updateTheme / deleteTheme` methods
- `backend/app/models/custom_theme.py` — CustomTheme model
- `backend/app/schemas/theme.py` — Pydantic schemas
- `backend/app/services/custom_theme_service.py` — service class
- `backend/app/routers/themes.py` — FastAPI router
- `backend/app/main.py` — register router
- `backend/alembic/versions/<hash>_add_custom_themes_table.py` — migration
- `scripts/check-tokens.sh` extension (or sibling script) — JSX hex-lint check
- Synchronize on add/remove of MD3 token names (currently 50+ roles, derive a canonical list from `frontend/src/css/tokens.css`)

### Phase 17 OUT of scope (Phase 18):
- `react-colorful` picker (Phase 18 EDIT-01)
- 9-variant selection (Phase 18 EDIT-02)
- Real-time drag preview (Phase 18 EDIT-03)
- Edit/delete custom themes UI (Phase 18 EDIT-05/06) — Phase 17 displays custom themes in read-only mode
- Seasonal auto-switch (Phase 18 SEAS-*)
- HCT picker, JSON export/import, URL-share, image-derived theme (future)

---

## 5. Patterns to Mirror (do NOT re-invent)

### Backend
- **`backend/app/models/favorite.py`** — per-user model pattern (FK + indexes + timestamps).
- **`backend/app/services/favorite_service.py`** — `@staticmethod` methods, error-as-`ValueError`.
- **`backend/app/routers/favorites.py`** — thin FastAPI route pattern (`Depends(get_db)`, `Depends(get_current_user_from_token)`, `PageResponse` wrapping).
- **`backend/app/schemas/favorite.py`** — minimal Pydantic schema (Create/Response with `from_attributes=True`).
- **`backend/alembic/versions/72b56533bb6d_add_wishes_table.py`** — modern migration pattern.

### Frontend
- **`frontend/src/contexts/AuthContext.jsx`** lines 1-50 — current pattern for context provider + `useXxx` hook. **But:** `AuthContext`'s value is NOT memoized — ThemeContext MUST use `useMemo` to avoid the perf pitfall SUMMARY.md Pitfall 7 (drag re-renders the whole app).
- **`frontend/src/components/composites/Header.jsx`** lines 28-48 `PAGE_TITLES` + lines 96-102 `__right` cluster — insertion points for the new entry button.
- **`frontend/src/utils/index.js`** lines 6-37 — existing `theme` util (`fc_theme`, `data-theme` attribute). Phase 17 coexists with this, NOT replaces it. Add a NEW key `fc_active_theme` for active-theme JSON, keep `fc_theme` for light/dark.
- **`frontend/index.html`** lines 8-16 — existing inline FOUC bootstrap script that Phase 17 extends (NOT replaces).
- **`frontend/src/css/tokens.css`** lines 1-238 — current `:root` + `[data-theme="dark"]` MD3 tokens (the fallback default per D-10). NEVER edit.
- **`scripts/generate-tokens.cjs`** — build-time MCU usage pattern; the client-side `theme-engine.js` mirrors the same call shape.
- **`frontend/src/components/primitives/`** (Card, Button, Chip, IconButton) — primitives that natively read `--md-*` vars. The card-as-preview pattern (D-05) puts real primitives inside a scoped CSS-variable boundary.

---

## 6. Test / Verification Approach

### Verification commands (Phase 17 must pass all):
- `cd backend && uv run alembic upgrade head` — migration applies cleanly on a fresh DB.
- `cd backend && uv run pytest tests/test_themes.py` — backend service tests pass.
- `cd backend && uv run pytest` — full backend suite passes (zero regressions).
- `cd backend && uv run ruff check app/ tests/ alembic/versions/` — zero lint errors.
- `cd frontend && npm run lint` — zero ESLint errors.
- `cd frontend && npm run check:md3` — MD3 token compliance unchanged.
- `cd frontend && npm run check:all` — full CSS lint + MD3 check + Vite build pass.
- `cd frontend && npm run build` — production build succeeds (validates MCU Vite import).

### Manual verification (human UAT, runs after execute-phase):
1. Apply each of the 5 presets; verify the entire app surface re-colors.
2. With a custom theme active, toggle light/dark via header; verify instant repaint (no flash, no JS re-apply).
3. Reload page after applying a custom theme; verify FOUC-free paint under DevTools 4× CPU throttle.
4. Save a custom theme on device A; load `/theme` on device B; verify it appears (after login).
5. Confirm pre-set of "默认" preset colors matches the original green scheme (`#34834E` etc.).

---

## 7. Open Product Decisions (per CONTEXT.md § "the agent's Discretion")

The planner SHOULD NOT ask about these — they have acceptable defaults listed. The planner SHOULD adopt them.

1. **MCU bundling strategy** — Bundle MCU into main chunk (acceptable for v1.5 given ~30 KB gzip footprint; revisit if First Input Delay metrics regress).
2. **"Reset to default" button** — Recommend YES, top-right of /theme, single IconButton `restart-alt` with confirmation Snackbar.
3. **`sourceColors` shape strictness** — Recommend YES at the API layer (Pydantic `field_validator` raises 400 on shape mismatch).
4. **Soft-delete vs hard-delete custom themes** — Recommend HARD delete (no trash semantics for v1.5).
5. **Sync failure toast text** — "无法同步主题（请检查网络），已使用上次缓存".
6. **Cross-device updatedAt re-apply toast text** — "已同步最新主题".

Open in CONTEXT.md but EXPLICITLY deferred to Phase 18:
- Variant enum selection (9 variants) — Phase 18 EDIT-02 only uses `TonalSpot` in Phase 17.
- Seasonal definition (meteorological vs 节气) — Phase 18 SEAS-* open product decision.
- Hemisphere toggle UI — Phase 18 SEAS-03.
- Manual override TTL value (30 days recommended) — Phase 18 SEAS-04.

---

## 8. Gaps to Address

### Addressable in Phase 17
1. **MCU v0.4.0 ESM packaging defect at Vite bundling** — SUMMARY.md notes Vite/esbuild handles the missing-`.js`-extensions defect automatically; verify with `vite build` after promoting MCU to dependency. If the build breaks, apply the same `ensurePackageImportable` patch (the script in `generate-tokens.cjs:24-44`) via a Vite plugin or a pre-build step.
2. **MCU bundle size at runtime** — SUMMARY.md estimates 15-25 KB tree-shaken; verify with `vite build` + bundle analyzer. Mitigation if too large: `React.lazy(() => import('./pages/ThemePage.jsx'))` so MCU never loads on the main app shell (but FOUC bootstrap still needs it inline — see below).
3. **FOUC bootstrap + React.lazy conflict** — if MCU is React.lazy'd, the inline bootstrap cannot use it. Solution: import MCU in a non-lazy tiny module (`theme-engine-bundle.js`) that's only used by the bootstrap + ThemeContext. Pages can stay lazy.
4. **Custom theme name uniqueness** — `UniqueConstraint(user_id, name)` matches favorites pattern (SUMMARY.md confidence HIGH).
5. **Hex-lint script for JSX** — `scripts/check-tokens.sh` already has Check #4 for CSS. Add Check #5 that `rg -t jsx "#[0-9a-fA-F]{3,8}" frontend/src` and excludes `frontend/src/theme/presets.js` and any `presets.json` files. Exit 1 on any other match.

### Deferred beyond Phase 17 (documented for future planning)
- Seasonal auto-switch (Phase 18)
- Variant enum selection (Phase 18 EDIT-02)
- HCT picker, JSON export/import (future)
- /theme route gating: presets could be open (no auth) but custom CRUD requires auth — current CONTEXT.md decision is full auth (scope of v1.5 is family-member users); defer the open-presets decision to a future iteration.

---

## 9. Source Material (research provenance)

This synthesis references the following existing artifacts. The planner agent MAY consult them directly for fuller context.

| File | Used for |
|------|----------|
| `.planning/research/SUMMARY.md` | Executive synthesis, pitfalls prioritization, roadmap-mapping |
| `.planning/research/STACK.md` | MCU v0.4.0 capability, bundle-size estimates, ESM packaging defect |
| `.planning/research/ARCHITECTURE.md` | Component breakdown, SQLAlchemy JSON shape, generated-`<style>` mechanism |
| `.planning/research/FEATURES.md` | Feature table-stakes, must/should/defer matrix |
| `.planning/research/PITFALLS.md` | 8 critical pitfalls + mitigation playbook |
| `.planning/phases/17-.../17-CONTEXT.md` | 25 locked decisions (D-01..D-25), canonical references, integration points |
| `.planning/REQUIREMENTS.md` § v1.5 | Requirement IDs (FND-01..07, TPAGE-01..07, SYNC-01..04) |
| `.planning/ROADMAP.md` § Phase 17 | Phase goal, success criteria, research flag (LOW) |
| `scripts/generate-tokens.cjs` | Build-time MCU usage pattern to mirror client-side |
| `frontend/src/css/tokens.css` | Current 50+ MD3 token names; the override surface |
| `frontend/index.html:8-16` | Existing inline FOUC bootstrap script to extend |
| `frontend/src/components/composites/Header.jsx:96-102` | New entry button insertion point |
| `frontend/src/utils/index.js:6-37` | Existing `theme` util (light/dark), coexists with new `fc_active_theme` |

---

*Phase 17 research complete. Ready for planning.*
