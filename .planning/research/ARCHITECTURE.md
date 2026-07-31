# Architecture Research: Dynamic MD3 Theming Integration

**Domain:** Brownfield feature — runtime MD3 color-token override + per-user theme persistence
**Project:** 家味 · Family Chef v1.5 — 自定义网站皮肤 / Theme Customization
**Researched:** 2026-07-31
**Confidence:** HIGH — all conclusions grounded in direct codebase analysis (`tokens.css`, `generate-tokens.cjs`, existing model/router/service patterns) plus Context7 verification of `@material/material-color-utilities` browser API and SQLAlchemy `JSON` on SQLite.

---

## Executive Summary

The dynamic theme system slots into the existing architecture with **one new SQLAlchemy model + migration, one new router/service/schema trio, one new React Context, one new MD3-derivation utility module, and a generated `<style>` element as the CSS override mechanism.** The single most important architectural decision — and the answer to the core question — is:

> **Override `:root` and `[data-theme="dark"]` CSS variables via a dedicated generated `<style id="fc-dynamic-theme">` element injected into `<head>` (a higher-cascade stylesheet), NOT via inline `style` properties on `documentElement` and NOT via a `data-skin` attribute.** Store **source key colors only** in a `JSON` column; derive the full light+dark MD3 token set at runtime from those source colors using the same `@material/material-color-utilities` library the existing `generate-tokens.cjs` build script already uses.

This choice is load-bearing for three reasons:

1. **Cascade reuse** — A `<style>` block containing both `:root { … }` and `[data-theme="dark"] { … }` selectors automatically does the right thing on light/dark toggle, because it participates in the *same cascade* as `tokens.css`. The existing `theme` utility (`frontend/src/utils/index.js`) and `ThemeToggle` keep flipping `data-theme` and the override stylesheet reacts with zero re-application logic. An inline-style approach would force `ThemeContext` to re-set ~90 properties on every dark-mode toggle. The generated-stylesheet approach decouples "which skin" from "light or dark" entirely — exactly matching the PROJECT.md constraint "明暗切换（light/dark）保留为 header 独立按钮，不整合进 /theme".
2. **Source-colors storage** — MD3 is, by definition, a *derivation* from source key colors. The existing `generate-tokens.cjs` proves this: 3 hex inputs (`PRIMARY_HEX`, `SECONDARY_HEX`, `TERTIARY_HEX`) → full light+dark scheme + 6 tonal palettes. Storing those ~4 source hexes in JSON is ~100 bytes; storing the full derived token set would be ~4 KB/theme and couple stored data to the exact token vocabulary. Since derivation is synchronous and <1 ms, storing source colors is strictly better.
3. **Infinite custom themes** — A `data-skin="spring"` attribute approach would require every theme's CSS to be pre-shipped in a stylesheet, capping themes at a hardcoded set. The generated-`<style>` approach renders CSS from runtime data, satisfying "自定义 theme 数量无上限".

The new code follows the existing codebase's established patterns verbatim: static-method service singleton (like `favorite_service`), `get_current_user_from_token` + per-user scoping (like `favorites.py`), `UniqueConstraint` on `(user_id, name)` (like `favorites`'s `uq_user_dish_favorite`), `create_table` Alembic migration (like `72b56533bb6d_add_wishes_table.py`).

---

## System Overview

```
┌──────────────────────────────── FRONTEND (React 19 + Vite) ────────────────────────────────┐
│                                                                                              │
│   index.html                                                                                 │
│   ┌─────────────────────────────────────────────────────┐   ← FOUC-avoidance inline script  │
│   │ <script> read localStorage → derive → inject CSS    │     (runs BEFORE React mounts)     │
│   └─────────────────────────────────────────────────────┘                                    │
│                                                                                              │
│   ThemeContext (NEW)                       MD3 Derivation (NEW util)                         │
│   ┌────────────────────────┐               ┌──────────────────────────────┐                 │
│   │ active theme state     │──source hex──▶│ deriveTheme(sourceColors)    │                 │
│   │ seasonal auto-switch   │               │  uses @material/material-     │                 │
│   │ localStorage sync      │◀──{light,dark}│  color-utilities             │                 │
│   │ applyTheme() ──────────┼──CSS string──▶│ buildThemeCss(light, dark)   │                 │
│   └─────────┬──────────────┘               └──────────────────────────────┘                 │
│             │ apply                                                                          │
│             ▼                                                                                │
│   <head>                                                                                     │
│   ┌─────────────────────────────────────────────────────┐                                    │
│   │ <style id="fc-dynamic-theme">  ← generated,         │   overrides tokens.css             │
│   │   :root { --md-color-primary: ...; ... }            │   (loaded later in cascade)        │
│   │   [data-theme="dark"] { ... }                       │                                    │
│   └─────────────────────────────────────────────────────┘                                    │
│                                                                                              │
│   /theme page (NEW)                       Header (MODIFIED — add /theme button)              │
│   ThemeCard / ThemeEditor (NEW)           existing ThemeToggle (UNCHANGED)                   │
│                                                                                              │
│   presets.js (NEW constant)               ApiClient (MODIFIED — add theme methods)           │
└──────────────────────────┬───────────────────────────────────────────────────────────────────┘
                           │ HTTPS + JWT (auth) / no-auth inline script uses localStorage only
                           ▼
┌──────────────────────────────── BACKEND (FastAPI) ──────────────────────────────────────────┐
│                                                                                              │
│   routers/themes.py (NEW)                                                                    │
│   ┌─────────────────────────────────────────────────────┐                                    │
│   │ POST/GET/PUT/DELETE /api/themes  (per-user CRUD)     │                                    │
│   │   Depends(get_current_user_from_token)               │                                    │
│   └─────────┬───────────────────────────────────────────┘                                    │
│             │ calls                                                                           │
│             ▼                                                                                 │
│   services/theme_service.py (NEW — static-method singleton)                                  │
│   ┌─────────────────────────────────────────────────────┐                                    │
│   │ create/get/list/update/delete_theme(db, user_id, …)  │                                    │
│   └─────────┬───────────────────────────────────────────┘                                    │
│             │ ORM                                                                             │
│             ▼                                                                                 │
│   models/custom_theme.py (NEW)    schemas/theme.py (NEW — Pydantic V2)                       │
│   ┌─────────────────────────────┐ ┌──────────────────────────────────────┐                   │
│   │ CustomTheme(Base)           │ │ ThemeCreate / ThemeUpdate / ThemeResp │                   │
│   │  source_colors: JSON        │ │  source_colors: dict[str,str]         │                   │
│   └─────────────────────────────┘ └──────────────────────────────────────┘                   │
│             │                                                                                 │
│             ▼                                                                                 │
│   SQLite  ── custom_themes table (NEW, via Alembic migration)                                │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation Notes |
|-----------|----------------|----------------------|
| `CustomTheme` model | Persist per-user custom theme (name + source colors) | New file `models/custom_theme.py`; `JSON` column for source colors; `UniqueConstraint(user_id, name)` |
| `theme_service` | CRUD business logic, per-user scoping | New file; static-method singleton `theme_service = ThemeService()` — mirrors `favorite_service` |
| `themes` router | HTTP endpoints, JWT auth, ValueError→HTTPException | New file; `Depends(get_current_user_from_token)` — mirrors `favorites.py` |
| `MD3 derivation util` | source hex → `{light, dark}` token map → CSS string | New file `utils/theme-engine.js`; wraps `@material/material-color-utilities` |
| `ThemeContext` | Hold active theme, apply/revoke CSS, seasonal switch, localStorage sync | New file `contexts/ThemeContext.jsx`; mirrors `CategoriesContext` shape |
| `presets.js` constant | The 5 seed presets (default + 4 seasons) with source colors | New file; stable keys for seasonal auto-switch |
| `<style id="fc-dynamic-theme">` | The actual CSS override surface | Created once by ThemeContext; `textContent` updated on change |
| `/theme` page + cards + editor | Browse/preview/edit/select themes | New files under `pages/` and `components/composites/` |
| `ApiClient` | Add 4 methods for theme CRUD | MODIFY `frontend/src/api/client.js` |
| `Header` | Add `/theme` entry IconButton | MODIFY `frontend/src/components/composites/Header.jsx` |

---

## Core Architecture Decisions (Answers to the Research Question)

### Decision 1 — CSS Override Mechanism: Generated `<style>` element (CHOSEN)

**What:** Create a single `<style id="fc-dynamic-theme">` element appended to `<head>` (after the `tokens.css` import so it wins the cascade). On every theme change, set its `textContent` to a generated CSS string:

```css
:root {
  --md-color-primary: #056d37;
  --md-color-on-primary: #ffffff;
  /* …all ~50 light-mode semantic roles + any overridden palette tones… */
}
[data-theme="dark"] {
  --md-color-primary: #81d997;
  /* …all ~50 dark-mode semantic roles… */
}
```

To revert to the default (tokens.css) theme, clear `textContent` or remove the element.

**Why this beats the two alternatives:**

| Criterion | Generated `<style>` (CHOSEN) | Inline `style` on `<html>` | `data-skin` attribute |
|-----------|------------------------------|----------------------------|-----------------------|
| Light/dark handling | **Automatic** — `[data-theme="dark"]` selector in the block reacts to existing toggle | **Manual** — must re-apply ~90 props on every toggle | Automatic, but only for pre-shipped skins |
| Supports infinite DB themes | ✅ Yes (CSS generated from data) | ✅ Yes | ❌ No (must be hardcoded in CSS) |
| Atomic update on theme change | ✅ One `textContent` write | ❌ ~90 `setProperty` calls | ✅ One attribute set |
| Revert to default | ✅ Clear textContent | ✅ Loop `removeProperty` | ✅ Remove attribute |
| Plays well with existing cascade | ✅ Identical mechanism to tokens.css | ⚠️ Bypasses cascade (inline specificity) | ✅ Same mechanism |
| FOUC-avoidance in inline script | ✅ Generate string, set once | ✅ Loop setProperty | ❌ Can't inject DB theme pre-mount |

The **decisive factor is light/dark handling.** The project's existing dark-mode flow (`theme` util + `ThemeToggle` + `[data-theme="dark"]` selector in tokens.css) must keep working with zero changes. The generated-`<style>` approach extends that *exact* mechanism: the override block contains its own `[data-theme="dark"]` rule, so when the user taps dark mode, the browser recomputes the cascade and picks the dark overrides automatically. With inline styles, `ThemeContext` would have to subscribe to dark-mode changes and re-apply the entire token set for the new mode — a coupling that re-implements the cascade in JS for no benefit.

**FOUC handling:** The dynamic theme applies only to **authenticated users** (guest pages `/guest/:token` and `/login` always use the default green theme — they never inject a `<style>`). Active selection lives in `localStorage`, so an inline bootstrap `<script>` in `frontend/index.html` `<head>` can read it, derive the CSS, and inject the `<style>` before React mounts — no flash. This is the same anti-FOUC discipline PROJECT.md credits for v1.2 ("MD3 令牌生成一次/hardcode 模式 — 避免 FOUC"). Note: the existing `theme.initTheme()` dark-mode call currently runs from `ThemeToggle`'s `useEffect` (post-mount) — the v1.5 dynamic theme should be *more* FOUC-disciplined than that and run pre-mount via the inline script.

### Decision 2 — Theme Data Model: Store source key colors as JSON (NOT full derived tokens)

**What:** The `source_colors` column stores a small JSON object of MD3 source inputs:

```json
{
  "primary": "#34834E",
  "secondary": "#506446",
  "tertiary": "#F5B43C",
  "neutral": "#757873"
}
```

**Light and dark are NOT stored separately.** Both variants are *derived* at runtime from these source colors in one call to `themeFromSourceColor()` — exactly as `generate-tokens.cjs` already does (`theme.schemes.light` + `theme.schemes.dark` from a single primary + custom secondary/tertiary). This is the canonical Material You model.

**Why not store the full derived token set (the "palette as JSON" literal reading):**

| Concern | Store source colors (CHOSEN) | Store full derived tokens |
|---------|------------------------------|---------------------------|
| DB payload | ~100 bytes | ~4 KB/theme |
| Future-proof (new token added) | ✅ Auto-derived | ❌ Stored themes miss new tokens → stale |
| Editor round-trip | ✅ Edit hex directly | ❌ Must reverse-engineer source or send whole blob |
| Runtime cost | Derive once on apply (<1 ms) | Zero |
| Couples to token vocabulary | No | Yes (schema migration needed if token set changes) |
| Deterministic | Yes (HCT derivation is pure) | Yes |

Runtime cost is negligible: HCT derivation is synchronous pure math. The existing build script proves the library does it in a single Node tick. Derivation also happens to give the editor its **real-time preview** for free — every source-color tweak re-derives instantly.

**Why a `JSON` column (not separate hex columns):** The source set is small, extensible (a future "neutralVariant" key shouldn't need a migration), and naturally models the `{primary, secondary, tertiary, …}` shape. SQLAlchemy's generic `JSON` type is verified to work on SQLite (Context7: `sqlalchemy.dialects.sqlite.JSON`, "SQLite supports JSON as of 3.9 through its JSON1 extension"). Python 3.11's bundled SQLite is ≥3.39, so JSON1 is guaranteed present. SQLAlchemy handles serialization to TEXT at the ORM layer.

**Model definition** (follows `favorite.py` / `preference.py` conventions — `DeclarativeBase`, `Column`, `UniqueConstraint`, `func.now()`):

```python
# backend/app/models/custom_theme.py
"""自定义主题模型"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.sql import func
from app.database import Base


class CustomTheme(Base):
    __tablename__ = "custom_themes"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_theme_name"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    source_colors = Column(JSON, nullable=False)
    # {"primary": "#hex", "secondary": "#hex", "tertiary": "#hex", "neutral": "#hex"}
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
```

**Why presets are NOT in this table:** PROJECT.md states "预设+当前选择存 localStorage；自定义 theme 存后端 DB". The 5 presets (default + spring/summer/autumn/winter) are seed values defined once in a frontend constant (`presets.js`) and copied into the user's `localStorage` on first load (where they're editable but not deletable per "仅可编辑，不可删除"). This keeps the DB to pure custom themes and avoids seeding 5 rows per user. The `is_preset`/`season` columns are therefore **not needed** on the DB model — seasonal identity lives in the preset's stable key in `presets.js`.

### Decision 3 — ThemeContext: Derive → Generate CSS → Inject (on mount AND on change)

**What:** A new `ThemeContext` (mirroring the shape of `CategoriesContext`: `createContext`, Provider with `useState`/`useEffect`, exported `useTheme` hook with "must be used within ThemeProvider" guard). Responsibilities, in order:

1. **On mount** — Read active selection from `localStorage` (`fc_active_theme`: either a preset key like `"spring"` or a custom-theme record id like `42`, or `"default"`). Resolve source colors: preset → from `presets.js`; custom → from the in-memory cache (loaded via `ApiClient.getThemes()` on mount) or a single `GET /api/themes/{id}`. If seasonal auto-switch is on (`fc_seasonal_auto: "true"`), override selection with the current-season preset.
2. **Derive** — Call `deriveTheme(sourceColors)` → `{ light: {…50 tokens}, dark: {…50 tokens} }`.
3. **Generate CSS** — Call `buildThemeCss(derived)` → the CSS string with `:root` + `[data-theme="dark"]` blocks.
4. **Inject** — Find/create `#fc-dynamic-theme` `<style>` in `<head>`, set `textContent`. (The inline index.html script does this same work pre-mount; the Context just keeps it in sync.)
5. **On theme change** — Repeat 2–4.
6. **On active-theme delete** — If the active custom theme is deleted, fall back to `"default"` (clear `#fc-dynamic-theme`).
7. **On dark-mode toggle** — **Do nothing.** The cascade handles it. (This is the payoff of Decision 1.)

**Expose to consumers:**
```js
const { activeTheme, themes, presets, setActiveTheme,
        seasonalAuto, setSeasonalAuto, createTheme,
        updateTheme, deleteTheme, loading } = useTheme();
```

**Provider wiring** — Add `<ThemeProvider>` in `App.jsx` as an **outer** provider (it reads `localStorage` and derives CSS independent of auth), but it should fetch custom themes only when authenticated. Suggested placement: outside `AuthProvider` so the `<style>` injection isn't blocked by the auth-loading gate (avoids a flash of default theme after login). Pattern matches `CategoriesProvider` (which also self-loads on mount).

### Decision 4 — REST API: Per-user CRUD mirroring `favorites.py`

**Endpoints** (all under `/api/themes`, all `Depends(get_current_user_from_token)`, all scoped to `current_user.id`):

| Method | Path | Purpose | Status | Body / Response |
|--------|------|---------|--------|-----------------|
| `POST` | `/api/themes` | Create custom theme | 201 | `ThemeCreate` → `ThemeResponse` |
| `GET` | `/api/themes` | List current user's custom themes | 200 | `list[ThemeResponse]` (unpaginated — themes are few; use simple list, not `PageResponse`, unless count grows large) |
| `GET` | `/api/themes/{id}` | Get one custom theme | 200 | `ThemeResponse` (404 if not owned by caller) |
| `PUT` | `/api/themes/{id}` | Update name and/or source_colors | 200 | `ThemeUpdate` → `ThemeResponse` |
| `DELETE` | `/api/themes/{id}` | Delete custom theme | 204 | — (404 if not owned) |

**Schemas** (`schemas/theme.py`, Pydantic V2, `from_attributes = True` on response — mirrors `favorite.py`):

```python
class SourceColors(BaseModel):
    primary: str
    secondary: str
    tertiary: str
    neutral: str | None = None

class ThemeBase(BaseModel):
    name: str
    source_colors: SourceColors

class ThemeCreate(ThemeBase): ...

class ThemeUpdate(BaseModel):
    name: str | None = None
    source_colors: SourceColors | None = None

class ThemeResponse(ThemeBase):
    id: int
    class Config:
        from_attributes = True
```

Add a `@field_validator` for hex format (`#RRGGBB`) — the project already uses custom validators in `schemas/user.py` (`_sanitize`, `_check_unsafe`).

**Service** (`theme_service.py`) — static-method singleton, `flush()`+`refresh()` pattern, per-user `where(CustomTheme.user_id == user_id)`, ownership check before update/delete (raise `ValueError("主题不存在")` → router converts to 404). Identical structure to `favorite_service.py`.

**Router** (`themes.py`) — register in `main.py`:
```python
app.include_router(themes.router, prefix="/api/themes", tags=["自定义主题"])
```

---

## Recommended Project Structure (New & Modified Files)

### New files

```
backend/
├── app/
│   ├── models/
│   │   └── custom_theme.py          # NEW — CustomTheme model (source_colors JSON)
│   ├── schemas/
│   │   └── theme.py                 # NEW — ThemeCreate/Update/Response + SourceColors
│   ├── services/
│   │   └── theme_service.py         # NEW — static-method CRUD singleton
│   └── routers/
│       └── themes.py                # NEW — per-user CRUD endpoints
└── alembic/versions/
    └── <rev>_add_custom_themes.py   # NEW — create_table("custom_themes")

frontend/
├── index.html                       # MODIFY — add inline FOUC-avoidance <script> in <head>
├── src/
│   ├── utils/
│   │   ├── theme-engine.js          # NEW — deriveTheme() + buildThemeCss() (pure, no React)
│   │   └── presets.js               # NEW — 5 preset definitions {key,name,source_colors,season}
│   ├── contexts/
│   │   └── ThemeContext.jsx         # NEW — active theme state + injection + seasonal logic
│   ├── api/
│   │   └── client.js                # MODIFY — add getThemes/createTheme/updateTheme/deleteTheme
│   ├── pages/
│   │   └── ThemeSettingsPage.jsx    # NEW — /theme route page (card grid + editor)
│   ├── components/
│   │   └── composites/
│   │       ├── ThemeCard.jsx        # NEW — card whose body IS the live preview
│   │       └── ThemeEditor.jsx      # NEW — source-color pickers + real-time preview
│   └── App.jsx                      # MODIFY — add <ThemeProvider> + /theme <ProtectedRoute>
```

### Modified files (minimal, surgical)

| File | Change | Why surgical |
|------|--------|--------------|
| `backend/app/models/__init__.py` | Add `from app.models.custom_theme import CustomTheme` + `__all__` entry | Alembic autogenerate needs the import to detect the model |
| `backend/app/main.py` | Add `themes` to router import block + one `app.include_router(...)` line | Pattern identical to existing 14 routers |
| `frontend/src/api/client.js` | Add 4 methods (`getThemes`, `createTheme`, `updateTheme`, `deleteTheme`) | Follows existing `getFavorites`-style naming; 401 auto-logout already handled |
| `frontend/src/components/composites/Header.jsx` | Insert one `<IconButton icon="palette" onClick={() => navigate('/theme')} />` between the theme-toggle IconButton (~L97) and the user avatar block (~L103) | Single insertion point per PROJECT.md "位于主题切换与用户头像之间" |
| `frontend/src/App.jsx` | Wrap with `<ThemeProvider>`; add `/theme` route under `PcLayout` + `ProtectedRoute` (all authenticated roles) | Mirror existing route entries |
| `frontend/index.html` | Inline `<script>` in `<head>`: read `localStorage` active theme → derive → inject `#fc-dynamic-theme` `<style>` | FOUC avoidance |
| `frontend/package.json` | Move `@material/material-color-utilities` from `devDependencies` → `dependencies` | Currently build-time-only; runtime derivation needs it in the browser bundle |

### Structure Rationale

- **`theme-engine.js` is pure (no React, no DOM) on purpose** — so the inline index.html bootstrap script and ThemeContext share one derivation implementation. The only DOM-aware function is `injectThemeCss(cssString)`, which both callers invoke. This avoids a duplicate derivation path (DRY) and guarantees pre-mount and post-mount produce byte-identical CSS (no flash from re-derivation differences).
- **`presets.js` is a constant, not an API resource** — presets are identical for everyone and seed into `localStorage`. Exposing them via API would add a stateless endpoint that just returns a constant — pointless. Seasonal keys (`"spring"`/`"summer"`/`"autumn"`/`"winter"`) are stable identifiers used by the auto-switch logic.

---

## Architectural Patterns

### Pattern 1: CSS-Cascade Extension (the generated-stylesheet pattern)

**What:** Treat the dynamic theme as a *second stylesheet* that participates in the normal CSS cascade, loaded after `tokens.css`.
**When to use:** Whenever you need to override CSS custom properties at runtime AND have those overrides react to other cascade-affecting attributes (like `data-theme`).
**Trade-offs:** + Automatic cascade participation; + atomic updates; − must generate/escape CSS string (trivial for hex values).

```javascript
// utils/theme-engine.js — the only DOM-aware part
export function injectThemeCss(cssText) {
  let el = document.getElementById('fc-dynamic-theme');
  if (!el) {
    el = document.createElement('style');
    el.id = 'fc-dynamic-theme';
    document.head.appendChild(el);  // appended last → wins cascade vs tokens.css
  }
  el.textContent = cssText;
}

export function clearThemeCss() {
  const el = document.getElementById('fc-dynamic-theme');
  if (el) el.textContent = '';
}
```

```javascript
// buildThemeCss — pure, no DOM (shared by inline script + ThemeContext)
import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities';

export function deriveTheme(sourceColors) {
  const theme = themeFromSourceColor(argbFromHex(sourceColors.primary), [
    { name: 'secondary', value: argbFromHex(sourceColors.secondary), blend: true },
    { name: 'tertiary',  value: argbFromHex(sourceColors.tertiary),  blend: true },
  ]);
  // Map scheme props → --md-color-* keys (camelCase → kebab), same logic as generate-tokens.cjs
  return { light: schemeToTokens(theme.schemes.light), dark: schemeToTokens(theme.schemes.dark) };
}

export function buildThemeCss({ light, dark }) {
  const l = Object.entries(light).map(([k, v]) => `  --md-color-${k}: ${v};`).join('\n');
  const d = Object.entries(dark).map(([k, v]) => `  --md-color-${k}: ${v};`).join('\n');
  return `:root {\n${l}\n}\n[data-theme="dark"] {\n${d}\n}`;
}
```

### Pattern 2: Source-Color-as-Canonical-Input

**What:** Persist only the MD3 source key colors; derive everything else. This mirrors how Google's Material You actually works (a seed color → full scheme) and how the existing `generate-tokens.cjs` already operates.
**When to use:** Anywhere a "theme" is really a derivation from a small input set.
**Trade-offs:** + tiny storage; + future-proof; + editor round-trips trivially; − requires the derivation library in the browser bundle (~moves one devDep to dep; tree-shaken size is modest).

### Pattern 3: Per-User Service Singleton + Ownership Scoping

**What:** `theme_service = ThemeService()` with `@staticmethod` methods taking `(db, user_id, ...)`, exactly like `favorite_service`. Every query includes `where(CustomTheme.user_id == user_id)`. Update/delete verify ownership (raise `ValueError` → 404).
**When to use:** Any per-user owned resource (the codebase already does this for favorites, preferences, wishes).
**Trade-off:** Forces `user_id` into every method signature — verbose but explicit and safe. Do NOT try to infer user from session/request (the codebase never does this).

### Pattern 4: Pre-Mount Inline Bootstrap (FOUC avoidance)

**What:** A synchronous `<script>` in `index.html` `<head>` reads `localStorage` and injects the `<style>` before the browser paints. React's `ThemeContext` later reconciles.
**When to use:** Whenever theme state lives in `localStorage` and affects first paint.
**Trade-off:** − small duplication of the resolve logic (mitigated by sharing `theme-engine.js` via a build inlined entry, or by keeping the inline script minimal: read key → fetch preset from an inlined `presets` constant → derive → inject; custom themes that require an async API call cannot be applied pre-mount, so the first paint for an active *custom* theme may flash default once — acceptable since the API call is fast and the user explicitly chose that custom theme).

---

## Data Flow

### Primary: User selects a theme in `/theme` page

```
[User taps ThemeCard "夏·Summer"]
    ↓
ThemeContext.setActiveTheme('summer')
    ↓
resolve sourceColors ← presets.js['summer'].source_colors
    ↓
deriveTheme(sourceColors) → {light, dark}      ← @material/material-color-utilities
    ↓
buildThemeCss({light, dark}) → CSS string
    ↓
injectThemeCss(cssString) → #fc-dynamic-theme <style>.textContent updated
    ↓
Browser recomputes cascade → all var(--md-color-*) resolve to summer palette instantly
    ↓
setLocalStorage('fc_active_theme', 'summer')
```

### Custom-theme create flow

```
[User edits source colors in ThemeEditor, clicks 保存]
    ↓
ApiClient.createTheme({ name, source_colors })   ← POST /api/themes
    ↓
themes router → get_current_user_from_token → theme_service.create_theme(db, user.id, …)
    ↓
CustomTheme row INSERT (source_colors as JSON) → flush/refresh → commit
    ↓
ThemeResponse ← router
    ↓
ThemeContext: append to `themes` list; (optionally) setActiveTheme(newId)
```

### Seasonal auto-switch flow

```
[App mounts, fc_seasonal_auto === 'true']
    ↓
season = computeSeason(new Date())   ← {spring|summer|autumn|winter} by Northern-hemisphere month
    ↓
setActiveTheme(season)               ← picks the matching preset; flow continues as Primary above
```

### State Management

```
localStorage (persistence)          ThemeContext (runtime)              DOM
┌──────────────────────┐            ┌────────────────────┐             ┌────────────────┐
│ fc_active_theme      │◀──────────▶│ activeTheme        │────────────▶│ #fc-dynamic-   │
│ fc_seasonal_auto     │            │ themes[] (custom)  │             │   theme style  │
│ fc_presets (seeded)  │            │ seasonalAuto       │             └────────────────┘
└──────────────────────┘            │ loading            │
       ↑                            └────────────────────┘
       │                              ▲
       └────────── ApiClient ─────────┘  (custom themes CRUD ↔ SQLite)
```

---

## Integration Points (Explicit)

### With existing `tokens.css`

| Aspect | Integration |
|--------|-------------|
| Cascade order | `#fc-dynamic-theme` `<style>` is appended to `<head>` *after* `tokens.css` is imported (`index.css` @imports `styles.css` which loads tokens). Later in DOM = wins cascade at equal specificity. Both use `:root` / `[data-theme="dark"]` — equal specificity, so order decides. |
| Token vocabulary | `buildThemeCss` emits `--md-color-*` keys only — the same names tokens.css defines. It does NOT touch `--md-radius-*`, `--md-spacing-*`, `--md-elevation-*`, `--md-motion-*`, `--md-font-*` (those are mode-invariant and shared across all themes). |
| Default theme = no-op | When `activeTheme === 'default'`, `clearThemeCss()` empties the `<style>` → tokens.css values apply untouched. Zero regression for users who never touch theming. |
| FOUC | tokens.css is a static CSS file loaded in `<head>` — it paints correctly on its own. The dynamic `<style>` only overrides when present. Even if the inline bootstrap script fails, the app falls back to the default green theme, not a broken state. |

### With existing `theme` util + `ThemeToggle` (DARK MODE)

| Aspect | Integration |
|--------|-------------|
| `data-theme` attribute | **Unchanged.** `theme.setTheme('dark')` still does `document.documentElement.setAttribute('data-theme', 'dark')`. The dynamic `<style>`'s `[data-theme="dark"]` rule reacts automatically. |
| `ThemeToggle` component | **Unchanged.** No edits needed. |
| localStorage keys | The dark-mode key is `fc_theme`; the skin keys are `fc_active_theme` / `fc_seasonal_auto` / `fc_presets`. Distinct namespaces — no collision. |

### With existing `ApiClient` (frontend/src/api/client.js)

Add 4 methods following existing naming conventions:
```javascript
async getThemes()              // GET    /api/themes
async createTheme(payload)     // POST   /api/themes
async updateTheme(id, payload) // PUT    /api/themes/{id}
async deleteTheme(id)          // DELETE /api/themes/{id}
```
JWT header attachment and 401 auto-logout are already handled by the `ApiClient` wrapper — no new auth logic.

### With existing AuthContext / Providers

`<ThemeProvider>` placed in `App.jsx`. Recommendation: place it **outside** `<AuthProvider>` so theme injection isn't gated on auth-loading (the inline index.html script already runs pre-auth anyway). But `ThemeProvider` should only attempt `getThemes()` when a JWT exists (check `localStorage` for token before calling, else skip — avoids 401 noise on login page). `useTheme()` is only consumed inside `ProtectedRoute`-guarded pages, so it's always used when authenticated.

### With Alembic migration (SQLite)

Follow `72b56533bb6d_add_wishes_table.py` exactly — `op.create_table(...)` with explicit `sa.Column`, `sa.PrimaryKeyConstraint`, `sa.ForeignKeyConstraint`, plus `op.create_index` on `user_id`. Since this is a brand-new table (no existing data to preserve), the `batch_alter_table(recreate=always)` pattern (needed for ADD COLUMN on SQLite) is **not** required here — plain `create_table` works. `downgrade()` does `drop_table`.

---

## Anti-Patterns

### Anti-Pattern 1: Storing light and dark as separate rows/columns

**What people do:** Create two columns (`source_colors_light`, `source_colors_dark`) or two rows per theme.
**Why it's wrong:** MD3 derivation produces *both* schemes from one source in a single call (`theme.schemes.light` + `theme.schemes.dark`). Splitting them doubles storage, lets light/dark drift out of MD3 compliance, and breaks the Material You contract (the two modes are *related* by HCT contrast curves, not independently chosen).
**Do this instead:** One `source_colors` JSON column; derive both modes at runtime.

### Anti-Pattern 2: Inline `style.setProperty` per variable on `<html>`

**What people do:** Loop over tokens calling `document.documentElement.style.setProperty('--md-color-primary', …)`.
**Why it's wrong:** Inline styles bypass the cascade and pin to one mode. Dark-mode toggle then requires re-looping all ~90 properties for the dark variant — re-implementing the cascade in JS. It also pollutes the `<html>` inline style, making "revert to default" a second full loop of `removeProperty`.
**Do this instead:** Generated `<style>` element with `:root` + `[data-theme="dark"]` blocks — the cascade does the mode-switching for free.

### Anti-Pattern 3: `data-skin` attribute with pre-shipped CSS per skin

**What people do:** Ship `[data-skin="spring"] { … }` for each theme in a CSS file.
**Why it's wrong:** Caps themes to a hardcoded set — fails "自定义 theme 数量无上限". Also requires every theme's full token set authored in CSS by hand.
**Do this instead:** Generate CSS from runtime data.

### Anti-Pattern 4: Putting the derivation in a React component / re-deriving on every render

**What people do:** Call `themeFromSourceColor` inside a component render or without memoization.
**Why it's wrong:** Re-derives on every parent re-render (wasted CPU, though cheap) and scatters derivation across components.
**Do this instead:** Derive once per theme selection inside `ThemeContext` (in a `useEffect` keyed on `activeTheme`), generating the CSS string once and injecting once.

### Anti-Pattern 5: Seeding presets into the DB

**What people do:** Insert 5 preset rows per user on first login.
**Why it's wrong:** PROJECT.md explicitly says presets live in localStorage. 5 rows × N users is wasted DB; presets are identical for everyone. Also makes "仅可编辑，不可删除" a DB-enforcement problem instead of a UI rule.
**Do this instead:** Frontend `presets.js` constant, copied to `localStorage` on first load; hide the delete button for preset keys in the UI.

---

## Scaling Considerations

This is a family app (single SQLite file, tens of users). The realistic scale ceiling is ~100 users × ~10 custom themes each = ~1000 rows in `custom_themes`. That is trivially within SQLite's capacity.

| Scale | Architecture Impact |
|-------|---------------------|
| Current (≤100 users) | No indexes beyond `user_id` strictly needed; list query is fast. Add `ix_custom_themes_user_id` anyway (cheap, matches every other per-user table). |
| 1k+ users / many themes | Add pagination to `GET /api/themes` (switch return type to `PageResponse[ThemeResponse]` — the generic already exists in `schemas/common.py`). |
| Multi-tenant / shared themes | Out of scope for v1.5 — would require an `is_public` flag + a global themes table. Not needed now. |

### Scaling Priorities
1. **First (only realistic) concern:** Derivation cost if many components call it — prevented by centralizing in ThemeContext and memoizing.
2. **Second:** Bundle size from adding `@material/material-color-utilities` to the browser bundle — tree-shaking keeps it to the ~3-4 functions actually used (`argbFromHex`, `themeFromSourceColor`, `hexFromArgb`); verify with `vite build` size report during implementation.

---

## Sources

- **Direct codebase analysis (HIGH confidence):**
  - `frontend/src/css/tokens.css` — confirms `:root` + `[data-theme="dark"]` structure, ~50 semantic color roles + 6 tonal palettes, mode-invariant tokens (radius/spacing/elevation/motion/font).
  - `scripts/generate-tokens.cjs` — confirms `themeFromSourceColor(primary, [secondary, tertiary])` produces full light+dark scheme; the exact derivation API to reuse at runtime.
  - `frontend/package.json` — confirms `@material/material-color-utilities@^0.4.0` is currently a **devDependency** (must move to `dependencies`).
  - `frontend/src/utils/index.js` — existing `theme` util (dark-mode via `data-theme` attr + localStorage `fc_theme`).
  - `frontend/src/components/composites/Header.jsx` — exact insertion point for `/theme` button (between theme-toggle IconButton ~L97 and avatar block ~L103).
  - `backend/app/models/favorite.py`, `preference.py`, `guest_invitation.py` — model conventions (`DeclarativeBase`, `Column`, `UniqueConstraint`, `func.now()`).
  - `backend/app/routers/favorites.py` + `services/favorite_service.py` — per-user CRUD + static-method singleton + ownership scoping pattern.
  - `backend/alembic/versions/72b56533bb6d_add_wishes_table.py` — modern `create_table` migration pattern.
  - `backend/app/routers/auth.py` — `get_current_user_from_token` + `require_role` for endpoint auth.
  - `backend/app/database.py` — `Base`, `get_db`, async engine (model registration via `models/__init__.py`).
  - `.planning/PROJECT.md` — v1.5 requirements, storage split (presets+selection in localStorage, custom in DB), seasonal auto-switch, `/theme` entry placement, light/dark stays separate.

- **Context7 verification (HIGH confidence):**
  - `@material/material-color-utilities` (ID `/material-foundation/material-color-utilities`) — docs confirm browser-native usage (`document.documentElement.style.setProperty`, `window.matchMedia`, `HTMLImageElement`); `themeFromSourceColor` and `DynamicScheme` APIs available at runtime. Resolves library ID confirmed.
  - SQLAlchemy 2.0 (ID `/websites/sqlalchemy_en_20`) — `sqlalchemy.dialects.sqlite.JSON` confirmed: "SQLite supports JSON as of 3.9 through its JSON1 extension". Generic `sqlalchemy.JSON` auto-selects dialect impl. Python 3.11 bundles SQLite ≥3.39 (JSON1 always present).

---
*Architecture research for: Dynamic MD3 Theming Integration (v1.5)*
*Researched: 2026-07-31*
