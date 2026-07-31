---
phase: 15-navigation-restructure-test-data
plan: 04
subsystem: ui
tags: [react, md3, header, action-bar, bottom-bar, navigation, user-home]

# Dependency graph
requires:
  - phase: 15-navigation-restructure-test-data
    provides: "Wave 1 (15-02) Header composite restructure — actions prop renders below main row inside conditional .header-action-bar div; 15-03 wrapped the 3 multi-button management pages"
provides:
  - "NAV-01 complete: all 7 Header actions callsites now wrap their payload in <div className=\"header-action-bar\"> (15-03 multi-button + this plan's 4 single-button callers)"
  - "NAV-05 complete: BottomBar 3 role tab arrays replaced per locked order (chef 7 / admin 7 / user 4) with logout branch removed — logout now exclusively via Header avatar menu"
  - "NAV-04 chef side: UserHomePage chef sees 4 menuEntries (开始点菜/口味偏好/菜品管理/食材管理); admin sees 5 (adds 订单管理)"
  - "NAV-04 admin side audited: AdminHomePage.jsx already exposes 菜品管理 + 食材管理 in its quickActions array (no change required)"
affects:
  - NAV-01
  - NAV-04
  - NAV-05
  - 15-06 (Playwright spec will assert BottomBar tab counts, UserHomePage quick actions, AdminHomePage entries)

# Tech tracking
tech-stack:
  added: []  # zero new dependencies
  patterns:
    - "Single-button Header actions wrapper: bare <Button> or <IconButton> passed to <Header actions={...}> now wrapped in <div className=\"header-action-bar\" style={{ display:'flex', gap:'var(--md-spacing-2)'}}>{button}</div> — completes the multi-button pattern from 15-03"
    - "Role-filtered BottomBar tab arrays with no logout surface — logout centralized in Header avatar dropdown (D-NAV02-01)"

key-files:
  created: []
  modified:
    - frontend/src/pages/AdminUsersPage.jsx
    - frontend/src/pages/AdminCategoriesPage.jsx
    - frontend/src/pages/OrderDetailPage.jsx
    - frontend/src/pages/DishDetailPage.jsx
    - frontend/src/components/composites/BottomBar.jsx
    - frontend/src/pages/UserHomePage.jsx

key-decisions:
  - "Followed plan Task 3 step-3 revision: chef no longer sees 订单管理 on UserHomePage (CONTEXT D-NAV04-04 locks chef at 4 entries); 订单管理 condition narrowed to admin-only. Chef accesses orders via BottomBar 订单 tab instead."
  - "Preserved inline style={{ display:'flex', gap:'var(--md-spacing-2)' }} alongside className=\"header-action-bar\" on all 4 wrapper divs — belt-and-suspenders defense against CSS ordering (mirrors 15-03 decision)"
  - "Updated BottomBar.jsx module docstring to reflect logout migration (Phase 15 NAV-05) — kept docstring accurate per AGENTS.md conventions"

patterns-established:
  - "Single-button Header caller wrapper: <div className=\"header-action-bar\" style={{ display:'flex', gap:'var(--md-spacing-2)'}}>{singleButtonOrIconButton}</div>"
  - "Role-disjoint menuEntries branching on UserHomePage: separate `if (role==='admin')` for admin-only entries (订单管理) and shared `if (role==='chef' || role==='admin')` for common entries (菜品管理/食材管理)"

requirements-completed: [NAV-01, NAV-04, NAV-05]

# Metrics
duration: 2min
completed: 2026-07-30
---

# Phase 15 Plan 04: Navigation Refinements (Header Wrap + BottomBar + UserHome) Summary

**Completed NAV-01 (wrapped the 4 remaining single-button Header callers in `.header-action-bar`), NAV-05 (replaced BottomBar role tab arrays to chef 7 / admin 7 / user 4 with logout removed), and NAV-04 (extended UserHomePage chef/admin menuEntries with 菜品管理 + 食材管理, with chef's 订单管理 relocated to BottomBar).**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-30T04:13:16Z
- **Completed:** 2026-07-30T04:15:26Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- NAV-01 closed: all 7 Header actions callsites now wrap their payload in `.header-action-bar` (this plan's 4 single-button callers + 15-03's 3 multi-button management pages), so every page-level action button renders in the 56px action bar below the Header main row
- NAV-05 closed: BottomBar role tab arrays locked to NAV-05 order — chef 7 tabs (首页/订单/菜品/食材/愿望/点菜/我的), admin 7 tabs (后台/菜品/食材/愿望/用户/点菜/我的), user 4 tabs (首页/点菜/愿望/我的); `logout` removed from `useAuth` destructure, tab arrays, and onClick handler — logout now exclusively via Header avatar menu (D-NAV02-01)
- NAV-04 chef side: UserHomePage chef sees 4 menuEntries (开始点菜/口味偏好/菜品管理/食材管理), admin sees 5 (adds 订单管理), user unchanged at 2 — matches CONTEXT D-NAV04-04
- NAV-04 admin side audited: AdminHomePage.jsx already exposes 菜品管理 + 食材管理 in its quickActions array (no modification required; runtime verification deferred to Plan 15-06 Playwright spec)
- `chef-orders` Badge id preserved on chef tab so pending-order count continues to render
- `npm run build` passes (4012 modules transformed, zero errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap 4 single-button Header callers in .header-action-bar** - `2756b14` (feat)
2. **Task 2: Replace BottomBar role tab arrays and remove logout branch** - `e281c2f` (feat)
3. **Task 3: Extend UserHomePage chef menuEntries with 菜品管理 + 食材管理** - `f590a98` (feat)

## Files Created/Modified
- `frontend/src/pages/AdminUsersPage.jsx` — bare `+ 添加` Button wrapped in `<div className="header-action-bar">`
- `frontend/src/pages/AdminCategoriesPage.jsx` — bare `+ 添加` Button wrapped in `<div className="header-action-bar">`
- `frontend/src/pages/OrderDetailPage.jsx` — bare `← 返回` back Button wrapped in `<div className="header-action-bar">`
- `frontend/src/pages/DishDetailPage.jsx` — bare favorite IconButton wrapped in `<div className="header-action-bar">`
- `frontend/src/components/composites/BottomBar.jsx` — 3 role tab arrays replaced per NAV-05; `logout` removed from `useAuth` destructure + onClick handler; chef-orders Badge preserved; module docstring updated
- `frontend/src/pages/UserHomePage.jsx` — 订单管理 condition narrowed to admin-only; new shared chef/admin branch pushes 菜品管理 (role-aware route) + 食材管理 entries

## Decisions Made
- See `key-decisions` frontmatter above (chef 订单管理 relocation; inline-style belt-and-suspenders; docstring accuracy).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated stale BottomBar module docstring**
- **Found during:** Task 2 (BottomBar tab array replacement)
- **Issue:** Module docstring line 9 stated "现有 logout / navigate(path) / usePendingOrderCount Badge 行为零回归" but logout was just removed from BottomBar per NAV-05 — docstring contradicted the new code
- **Fix:** Rewrote docstring to "Phase 15 NAV-05：logout 已从 BottomBar 迁出至 Header 头像菜单；navigate(path) / usePendingOrderCount Badge 行为零回归"
- **Files modified:** frontend/src/components/composites/BottomBar.jsx
- **Verification:** `grep 'logout' BottomBar.jsx` returns only comments (D-NAV05 code comments + corrected docstring); no logout code path remains
- **Committed in:** e281c2f (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug — documentation accuracy)
**Impact on plan:** Cosmetic docstring correction; zero functional impact. No scope creep.

## Issues Encountered
- **`node --check` cannot validate JSX (Node v26):** Same pre-existing tooling reality documented in 15-02/15-03 SUMMARYs — `node --check frontend/.../*.jsx` fails with `ERR_UNKNOWN_FILE_EXTENSION` because Node's `--check` does not parse JSX. Equivalent syntax validity was proven via `npm run build` succeeding (4012 modules transformed, zero errors) after each task.

## User Setup Required
None - no external service configuration required. No new dependencies introduced.

## Next Phase Readiness
- NAV-01 fully closed across both 15-03 (multi-button) and this plan (single-button).
- NAV-04 closed on the chef side (UserHomePage modified); admin side confirmed via AdminHomePage audit (no change needed). Runtime verification delegated to Plan 15-06 Playwright spec.
- NAV-05 closed (BottomBar role tab arrays locked).
- Ready for remaining Phase 15 waves: UI-01 (OrderPage filter Sheet), DATA-01 (seed test dishes), and 15-06 (Playwright navigation spec).
- No blockers.

---
*Phase: 15-navigation-restructure-test-data*
*Completed: 2026-07-30*

## Self-Check: PASSED

- FOUND: .planning/phases/15-navigation-restructure-test-data/15-04-SUMMARY.md
- FOUND: 2756b14 (Task 1 feat commit)
- FOUND: e281c2f (Task 2 feat commit)
- FOUND: f590a98 (Task 3 feat commit)
- FOUND: frontend/src/pages/AdminUsersPage.jsx (className="header-action-bar" present)
- FOUND: frontend/src/pages/AdminCategoriesPage.jsx (className="header-action-bar" present)
- FOUND: frontend/src/pages/OrderDetailPage.jsx (className="header-action-bar" present)
- FOUND: frontend/src/pages/DishDetailPage.jsx (className="header-action-bar" present)
- FOUND: frontend/src/components/composites/BottomBar.jsx (chef-orders Badge preserved, no logout action, 后台/首页 tabs present)
- FOUND: frontend/src/pages/UserHomePage.jsx (菜品管理 + 食材管理 entries present; admin-only 订单管理 condition)
- Plan-level verification: all `<verification>` assertions PASS — 4 Header callers wrapped, BottomBar NAV-05 arrays + logout removal, UserHomePage chef extension, AdminHomePage audit entries intact
- Build sanity: `npm run build` succeeds (4012 modules, zero errors)
- No accidental file deletions in any task commit
