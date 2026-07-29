---
phase: 14-ui-bugfix-filter-popup
plan: 06
subsystem: ui
tags: [react, accessibility, wcag, portal, keyboard-nav, scroll-listener]

# Dependency graph
requires:
  - phase: 14-04
    provides: closest('[data-ing-dropdown]')/closest('[data-sf-dropdown]') click-outside guards + createPortal dropdown scaffolding
provides:
  - Keyboard-activatable Portal dropdowns (openIngDropdown/openSfDropdown openers capture coords on Enter/Space)
  - Scroll/resize/orientationchange auto-close for Portal dropdowns (WR-01/WR-06 cheap mitigation)
affects: [ChefDishesPage Portal migration (14-07), AdminIngredientsPage dropdown pattern]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Opener-function extraction: shared open logic between onClick + onKeyDown so keyboard path captures getBoundingClientRect (Portal render gate)"
    - "Capture-phase window scroll listener (true) — catches modal-body overflow scroll before it bubbles"

key-files:
  created: []
  modified:
    - frontend/src/pages/AdminDishesPage.jsx

key-decisions:
  - "Single combined commit per plan Task 3 step 5 — the keyboard-activation (CR-01) and scroll-close (WR-01/06) changes are tightly coupled (both required for correct dropdown behavior) and touch one file"
  - "Semicolon style chosen to match surrounding openCreate/openEdit functions (file's dominant style), not orchestrator's 'no semicolons' note which was inaccurate for this file"
  - "closeOnScroll is idempotent — setShowIngDropdown(false) is a no-op if already false; React batches updates so no perf regression (threat T-14-06-03 accept)"

patterns-established:
  - "Pattern: Portal dropdown opener = extract capture-coords-then-show into named function; both onClick and onKeyDown reference it (a11y: WCAG 2.1.1)"
  - "Pattern: Portal dropdown lifecycle = register window scroll(capture)/resize/orientationchange on open, remove on cleanup; closing beats repositioning for complexity tradeoff"

requirements-completed: [BUG-04]

# Metrics
duration: 1min
completed: 2026-07-29
---

# Phase 14 Plan 06: Portal Dropdown 键盘激活 + scroll/resize 关闭 Summary

**关闭 REVIEW CR-01（WCAG 2.1.1/4.1.2 键盘激活）+ 廉价缓解 WR-01/WR-06（scroll/resize/orientationchange 触发关闭）—— openIngDropdown/openSfDropdown opener 统一 onClick + onKeyDown 路径**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-29T14:00:19Z
- **Completed:** 2026-07-29T14:02:03Z
- **Tasks:** 3 (2 code + 1 verify)
- **Files modified:** 1

## Accomplishments
- CR-01 关闭：键盘用户 Tab + Enter/Space 可正常打开 ingredient + semifinished 下拉菜单（coords 在 keyboard handler 中被捕获，Portal 正常渲染）
- WR-01/WR-06 廉价缓解：dropdown 打开期间任何 scroll(capture)/resize/orientationchange 事件触发立即关闭（比重新定位简单 10 倍，0 复杂度）
- 14-04 的 `closest('[data-ing-dropdown]')` / `closest('[data-sf-dropdown]')` 守卫完整保留 —— 点击 Portal 菜单内部项不会误关
- `npm run build` exit 0；无新增 lint error

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: opener 提取 + 监听器注册** - `433ad5e` (fix) — 单一 combined commit（plan Task 3 step 5 约定）

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `frontend/src/pages/AdminDishesPage.jsx` - 新增 openIngDropdown/openSfDropdown opener（onClick + onKeyDown 共用）；两个 useEffect 注册 scroll(capture)/resize/orientationchange 监听并在 cleanup 移除

## Decisions Made
- 单次 combined commit：plan Task 3 step 5 明确指定 `fix(14-06): Portal dropdown 键盘激活 + scroll/resize 关闭 (CR-01 + WR-01/06)` 作为单一提交；两个代码改动紧耦合（键盘激活是主修复，scroll-close 是缓解，均触碰同一文件同一特性）
- 分号风格：匹配文件内 openCreate/openEdit 的现有分号风格（文件主导风格），非 orchestrator 注明的"无分号"
- closeOnScroll 幂等：setShowIngDropdown(false) 在已关闭时为 no-op，React 批处理更新，无性能回归（威胁 T-14-06-03 accept）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 分号风格与文件一致性**
- **Found during:** Task 1（opener 函数写入）
- **Issue:** orchestrator 提示注明"无分号"，但实际 AdminDishesPage.jsx 主导风格使用分号（openCreate/openEdit/loadDishes 均 `;` 结尾）；初次写入无分号版本与周围代码不一致
- **Fix:** 将 opener 函数体改为分号风格，与 openCreate/openEdit 对齐
- **Files modified:** frontend/src/pages/AdminDishesPage.jsx
- **Verification:** ESLint 无新增 error；build exit 0
- **Committed in:** 433ad5e

---

**Total deviations:** 1 auto-fixed (1 blocking — code style consistency)
**Impact on plan:** 无 scope creep；纯风格对齐，功能零影响。

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CR-01 已关闭；键盘 + 鼠标路径均正常打开 Portal dropdown
- WR-01/WR-06 廉价缓解到位（关闭策略，非重定位）
- 待 verifier 人工视觉验证清单 5 项（Tab+Enter 打开食材/半成品下拉；滚动 Modal body 关闭；旋转设备关闭；鼠标路径无回归）
- 下一个 plan: 14-07（ChefDishesPage Portal 迁移 + ingredient 触发圆角）

## Self-Check: PASSED

- FOUND: 14-06-SUMMARY.md
- FOUND: frontend/src/pages/AdminDishesPage.jsx
- FOUND: 433ad5e (fix commit)
- FOUND: c97b559 (docs commit)

---
*Phase: 14-ui-bugfix-filter-popup*
*Completed: 2026-07-29*
