---
phase: 15-navigation-restructure-test-data
plan: 02
subsystem: ui
tags: [react, md3, header, sidebar, navigation-shell, vite]

# Dependency graph
requires:
  - phase: 15-navigation-restructure-test-data
    provides: Wave 0 migrated specs (15-01) asserting the new NAV-03 footer + Header theme-toggle contract
provides:
  - "Header composite with action-bar wrapper (D-NAV01): actions render BELOW main row in .header-action-bar; theme IconButton in main row; 2-item avatar menu (编辑资料 + Divider + 退出登录)"
  - "Sidebar composite with NAV-03 footer: single .md-sidebar__version text node; theme toggle + logout relocated to Header"
  - "Vite build-time version injection (vite.config.js define block) binding VITE_APP_VERSION to package.json version"
  - "Header.css .header-action-bar (56px / surface / border-top) + .md-header__menu-item--danger rules"
  - "Sidebar.css .md-sidebar__version (0.75rem / 400 / 1.3 / on-surface-variant)"
affects:
  - 15-03 (Wave 2 — caller-wrap plans wrap 7 <Header actions={...}> callsites in <div className="header-action-bar">)
  - 15-04 (Wave 3 — NAV-04 UserHomePage / NAV-05 BottomBar depend on Header not consuming actions in main row)
  - NAV-01, NAV-02, NAV-03 (requirement closure)
  - phase12-bugfix.spec.js / md3-compliance.spec.js (Wave 0 specs flip from red-by-design to green)

# Tech tracking
tech-stack:
  added: []  # zero new dependencies — pure refactor of existing composites
  patterns:
    - "Header-local theme state: useState(() => theme.getTheme()) + handleToggleTheme mirroring Sidebar pattern — required because theme.toggleTheme() does not broadcast a DOM event, so the relocated IconButton needs local state to re-render its icon"
    - "Action-bar wrapper: conditional {actions && <div className="header-action-bar">{actions}</div>} below main <header> — null actions renders no bar div"
    - "Vite build-time define injection: vite.config.js define block binds import.meta.env.VITE_APP_VERSION to process.env.npm_package_version for compile-time version constants"

key-files:
  created: []
  modified:
    - frontend/src/components/composites/Header.jsx
    - frontend/src/components/composites/Header.css
    - frontend/src/components/composites/Sidebar.jsx
    - frontend/src/components/composites/Sidebar.css
    - frontend/vite.config.js

key-decisions:
  - "Version source = Vite build-time injection (vite.config.js define block) over hardcoded literal or config.yaml — selected per agent discretion in CONTEXT.md/plan Step 7; auto-updates when frontend/package.json version changes, falls back to '0.0.0' in non-Vite environments"
  - "Kept the .md-sidebar__footer div container and only replaced its children (CONTEXT anti-pattern: 不要删 Sidebar 整个 footer div) — footer now holds a centered .md-sidebar__version text node"
  - "Added Header-local currentTheme state (mirror Sidebar.jsx pattern) because theme.toggleTheme() does NOT broadcast a DOM event — without it the relocated theme IconButton would not re-render its glyph after a click"
  - "Added 编辑资料 as a NEW menuitem (the pre-Phase-15 menu had only 切换主题 + 退出; 编辑资料 did not exist) — onClick navigates to /profile per D-NAV02-02"

patterns-established:
  - "Header action-bar: page-level action buttons live in a 56px secondary bar below the Header main row, never inside .md-header__right (Wave 2 callers must wrap payloads in <div className=\"header-action-bar\">)"
  - "Semantic menu Divider: <Divider /> separates neutral actions (编辑资料) from destructive actions (退出登录) per D-NAV02-03"

requirements-completed: [NAV-01, NAV-02, NAV-03]

# Metrics
duration: 4min
completed: 2026-07-30
---

# Phase 15 Plan 02: Navigation Shell Foundation (Header + Sidebar Restructure) Summary

**Restructured Header composite (action-bar wrapper below main row + theme IconButton in main row + 2-item avatar menu with Divider) and Sidebar footer (version text replacing theme/logout buttons), wired Vite build-time version injection.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-30T04:04:26Z
- **Completed:** 2026-07-30T04:08:12Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Header main row now contains only theme IconButton + avatar; the `actions` prop renders below in a conditional `.header-action-bar` div (null actions = no bar) — locks NAV-01 (D-NAV01-01/02/03)
- Avatar dropdown reduced to exactly 2 menuitems (编辑资料 + 退出登录) separated by `<Divider />` with the menu-info section preserved; theme toggle moved to Header main row as `.md-header__theme-toggle` IconButton — locks NAV-02 (D-NAV02-01..04) and NAV-03-03
- Sidebar footer stripped to a centered `.md-sidebar__version` text node; removed useState(currentTheme), theme import, handleToggleTheme, and logout destructure — locks NAV-03 (D-NAV03-01/04/05)
- Version sourced from `import.meta.env.VITE_APP_VERSION` via a new Vite `define` block binding `process.env.npm_package_version` (verified injected as build-time constant `0.0.0` in the production bundle)
- `npm run build` passes with zero new errors (pre-existing chunk-size warning only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure Header.jsx — action-bar wrapper, theme IconButton, 2-item avatar menu** - `af90b94` (feat)
2. **Task 2: Restructure Sidebar.jsx + Sidebar.css + vite.config.js — remove footer buttons, add version text** - `cebe7f7` (feat)

## Files Created/Modified
- `frontend/src/components/composites/Header.jsx` — Removed inline `{actions}` from `.md-header__right`; added theme IconButton (`.md-header__theme-toggle`) before avatar; added Header-local currentTheme state; replaced 2-item menu (切换主题 + 退出) with 编辑资料 + `<Divider />` + 退出登录; wrapped root in fragment with conditional `.header-action-bar` div
- `frontend/src/components/composites/Header.css` — Added `.header-action-bar` (56px / flex / surface bg / border-top) and `.md-header__menu-item--danger` (error color + hover) rules
- `frontend/src/components/composites/Sidebar.jsx` — Removed useState/theme imports, logout destructure, currentTheme state; footer now renders only `<div className="md-sidebar__version">v{APP_VERSION}</div>`; APP_VERSION sourced from import.meta.env.VITE_APP_VERSION
- `frontend/src/components/composites/Sidebar.css` — Replaced footer grid + 48dp item rules with centered flex `.md-sidebar__footer` + `.md-sidebar__version` (0.75rem / 400 / 1.3 / on-surface-variant)
- `frontend/vite.config.js` — Added `define` block binding `import.meta.env.VITE_APP_VERSION` to `process.env.npm_package_version`

## Decisions Made
- See `key-decisions` frontmatter above (version source, footer div retained, Header-local theme state, 编辑资料 menuitem added).

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria for both tasks passed on the first verification pass; the plan's exact `<automated>` verify commands returned PASS for every gate.

## Issues Encountered
- **`node --check` cannot validate JSX (Node v26):** The plan's acceptance criterion "File passes `node --check frontend/src/components/composites/Header.jsx`" fails at the Node layer with `ERR_UNKNOWN_FILE_EXTENSION: .jsx` because Node's `--check` does not parse JSX. This is a pre-existing tooling reality (independent of this plan's changes), so per the scope-boundary rule it was not "fixed." Equivalent syntax validity was proven via (a) ESLint's JSX parser (zero parse errors on both Header.jsx and Sidebar.jsx) and (b) the full production `npm run build` succeeding (4012 modules transformed, zero errors). The runtime DOM assertions (`.md-sidebar__version` textContent regex, `.md-header__theme-toggle` click) are covered by the Wave 0 Playwright specs (15-01) and the Wave 4 `phase15-navigation.spec.js`.
- **Version literal proven in bundle:** Confirmed `import.meta.env.VITE_APP_VERSION` is statically replaced at build time (0 occurrences of the token in `dist/`; the constant `var ka=\`0.0.0\`` appears, confirming the Vite `define` binding works). At runtime `.md-sidebar__version` renders `v0.0.0`, satisfying `/^v\d+\.\d+\.\d+$/`.

## User Setup Required
None - no external service configuration required. No new dependencies introduced.

## Next Phase Readiness
- Wave 1 foundation complete: the navigation shell contract (Header action-bar + theme IconButton + 2-item menu; Sidebar version-text footer) is locked.
- Ready for Wave 2 (15-03 and sibling caller-wrap plans): the 7 `<Header actions={...}>` callsites can now wrap their payloads in `<div className="header-action-bar">` — Header no longer renders actions inside its main row.
- Ready for Wave 3 (NAV-04 UserHomePage, NAV-05 BottomBar) and Wave 4 tests: the Wave 0 specs (15-01) now have their target DOM (`.md-header__theme-toggle` + `.md-sidebar__version`) present and will flip from red-by-design to green.
- No blockers.

---
*Phase: 15-navigation-restructure-test-data*
*Completed: 2026-07-30*

## Self-Check: PASSED

- FOUND: .planning/phases/15-navigation-restructure-test-data/15-02-SUMMARY.md
- FOUND: af90b94 (Task 1 feat commit)
- FOUND: cebe7f7 (Task 2 feat commit)
- FOUND: 5697b4c (SUMMARY docs commit)
- FOUND: frontend/src/components/composites/Header.jsx
- FOUND: frontend/src/components/composites/Header.css
- FOUND: frontend/src/components/composites/Sidebar.jsx
- FOUND: frontend/src/components/composites/Sidebar.css
- FOUND: frontend/vite.config.js
- Plan-level verification: all `<verification>` assertions PASS (header-action-bar x1, `<Divider />`, md-header__theme-toggle, 退出登录, NO 切换主题 in Header.jsx; .header-action-bar + .md-header__menu-item--danger in Header.css; .md-sidebar__version + font-size 0.75rem in Sidebar.css; no footer buttons; no currentTheme state in Sidebar.jsx)
- Build sanity: `npm run build` succeeds (4012 modules, zero errors); Vite define version injection proven in bundle
- Re-export frontend/src/components/Header.jsx unchanged (empty diff vs HEAD~2)
- No accidental file deletions in either task commit
