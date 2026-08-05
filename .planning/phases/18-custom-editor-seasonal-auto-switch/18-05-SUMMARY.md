---
phase: 18-custom-editor-seasonal-auto-switch
plan: 05
subsystem: theme-ui-wiring
tags: [theme-settings, theme-page, theme-card, routes, seasonal-mutex, delete-flow]

# Dependency graph
requires:
  - phase: 18-custom-editor-seasonal-auto-switch/18-01
    provides: Nine-variant engine (VARIANT_WHITELIST)
  - phase: 18-custom-editor-seasonal-auto-switch/18-03
    provides: /theme/editor ThemeEditorPage (deep-linkable, scoped preview, save semantics)
  - phase: 18-custom-editor-seasonal-auto-switch/18-04
    provides: seasonEnabled/hemisphere/currentSeason/setSeasonEnabled/setHemisphere + D-09 mutex in ThemeProvider
  - phase: 17-theme-system-foundation-engine-page-presets-persistence
    provides: ThemePage grid, ThemeCard scoped preview, CustomTheme CRUD API
provides:
  - 主题设置 subpage (/theme/settings) with 季节自动切换 toggle, 北半球/南半球 control, prominent D-09 mutex warning
  - Protected routes /theme/editor + /theme/settings (roles user/chef/admin, inside PcLayout)
  - ThemePage 新建/主题设置 entry actions + season-aware card click orchestration
  - ThemeCard onEdit/onDelete affordances with stopPropagation/preventDefault guards
  - Custom theme hard-delete flow (confirm → api.deleteTheme → refresh → active fallback → toast)
affects: [theme-page, theme-card, theme-settings, app-routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Season-aware click orchestration in ThemePage: single handleThemeClick checks seasonEnabled — manual→setActiveTheme, auto+preset→noop, auto+custom→navigate editor without apply"
    - "Action-button event guard: every card action calls event.stopPropagation() + event.preventDefault() before its callback so the outer Card onClick (apply/navigate) never double-fires"
    - "Custom-only delete: delete affordance rendered solely from theme.kind==='custom'; preset cards can never render delete"
    - "Preset fork entry gated by manual mode: preset 编辑 callback only supplied by page when auto mode is off"

key-files:
  created:
    - frontend/src/pages/ThemeSettingsPage.jsx
    - frontend/src/css/theme-settings.css
  modified:
    - frontend/src/pages/ThemePage.jsx
    - frontend/src/css/theme-page.css
    - frontend/src/App.jsx
    - frontend/src/components/theme/ThemeCard.jsx
    - frontend/src/components/theme/ThemeCard.css
    - frontend/src/index.css
    - .gitignore (skyfield-data/ dev ephemeris)

key-decisions:
  - "主题设置 subpage is a separate /theme/settings route (D-08), not a Sheet — uses Header showBack + BottomBar"
  - "Mutex warning is a prominent standalone region with the exact string 开启后仅使用四季主题，手动应用失效 (D-09), linked to the toggle control"
  - "Auto mode preset card click is a silent no-op (D-10) — no apply, no toast; custom card click navigates to editor with themeId query"
  - "Preset fork (编辑 on preset card) only wired in manual mode; auto mode leaves preset edit unreachable (D-10)"
  - "Delete flow uses lightweight window.confirm + api.deleteTheme + refreshCustomThemes; if the deleted theme was active and manual mode is on, resetToDefault restores a safe preset (T-18-15)"
  - "ThemeCard is dumb regarding mode: page callbacks are the source of truth; card never calls setActiveTheme or reads localStorage (T-18-14)"

patterns-established:
  - "Action-row CSS: .theme-card__actions flex-wrap gap var(--md-spacing-2), border-top outline-variant, right-aligned ≥480px; buttons keep primitive 36-48dp touch targets"
  - "Settings page form pattern: controlled switch + radio group bound directly to context setters; no local draft state, immediate persistence"

requirements-completed: [EDIT-04, EDIT-05, EDIT-06, SEAS-02, SEAS-03, SEAS-04]

# Metrics
duration: 15 min
completed: 2026-08-05
---

# Phase 18 Plan 05: Theme Settings Subpage, Route Wiring, and Card Action Affordances

**The /theme surface is now fully navigable: 新建 → editor, 主题设置 → settings, custom cards edit/delete, preset cards fork in manual mode, auto-mode mutex honored across every click path.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 8 (2 new, 6 modified)

## Accomplishments

### Task 1: 主题设置 subpage (`/theme/settings`)
- `ThemeSettingsPage.jsx` (182 lines) with Header showBack + BottomBar, controlled `季节自动切换` switch bound to `setSeasonEnabled`, prominent D-09 warning region with exact string `开启后仅使用四季主题，手动应用失效`, `北半球`/`南半球` radio pair bound to `setHemisphere` (north default), `返回主题` action.
- `theme-settings.css` (249 lines): token-only layout (--md-*), 48dp targets, visible focus states, htmlFor/id label wiring, mobile-first.
- No timezone/IP/browser hemisphere detection; no TTL field (D-09 replaced TTL model).

### Task 2: ThemePage orchestration + routes
- `ThemePage.jsx`: 新建 (→ /theme/editor) + 主题设置 (→ /theme/settings) entry actions; `handleThemeClick` season-aware: manual → `setActiveTheme`, auto+preset → silent no-op, auto+custom → `navigate('/theme/editor?themeId=<id>')` without applying (D-10).
- `handleEdit`: custom → editor themeId; preset → `?preset=<id>` fork only in manual mode.
- `handleDelete`: custom only — window.confirm → `api.deleteTheme` → `refreshCustomThemes` → active fallback via `resetToDefault` (manual mode only) → success/error toasts (T-18-15).
- `App.jsx`: `/theme/editor` and `/theme/settings` registered as ProtectedRoute with `['user', 'chef', 'admin']` inside PcLayout.

### Task 3: ThemeCard affordances
- Props extended: `onEdit`, `onDelete` alongside `theme/isActive/onClick`.
- Custom cards render 编辑 (outlined) + 删除 (text) buttons; preset cards render 编辑 only when page supplies manual-mode fork callback; preset delete never rendered.
- `stopEvent()` helper calls `stopPropagation()` + `preventDefault()` before callbacks — Card onClick can never double-fire.
- `.theme-card__actions` token-based row (flex-wrap, outline-variant divider, right-align ≥480px); scoped preview/active indicator/keyboard activation/data-fc-theme-scope all preserved.
- `isCustomTheme` keeps Phase 17 semantics (kind/user_id/numeric id).

### Housekeeping
- `.gitignore` + `skyfield-data/` — the 32MB dev-time ephemeris download from Plan 18-04's generator is excluded from version control.

## Verification

- `npm run lint -- --quiet` — clean
- `npm run build` — success (1.1s)
- `npm run check:tokens` — 8/8 PASS
- Source contracts: routes/click (App.jsx, ThemePage.jsx), card actions (ThemeCard.jsx), settings strings (ThemeSettingsPage.jsx), no raw hex in settings CSS — all PASS

## Deviations

- None (executor was cancelled mid-plan by the orchestrator; Tasks 1-2 commits retained as-is, Task 3 committed by orchestrator after verification)

## Next Phase Readiness

Phase 18 complete: engine (18-01), packages approved (18-02), editor (18-03), seasonal pipeline (18-04), UI wiring (18-05). Ready for phase verification.