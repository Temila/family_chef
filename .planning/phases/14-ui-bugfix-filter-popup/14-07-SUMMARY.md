---
phase: 14-ui-bugfix-filter-popup
plan: 07
subsystem: ui
tags: [react, createPortal, dropdown, portal-escape, md3-radius, bugfix, gap-closure]

# Dependency graph
requires:
  - phase: 14-04 (BUG-04 Portal dropdown migration for AdminDishesPage/AdminIngredientsPage)
    provides: createPortal-to-document.body escape pattern + click/closest guard convention
  - phase: 14-06 (Portal dropdown keyboard activation + scroll/resize close)
    provides: openIngDropdown/openSfDropdown opener function pattern with rect capture
provides:
  - ChefDishesPage 食材/半成品下拉菜单 createPortal 渲染（与 AdminDishesPage 视觉行为一致）
  - AdminIngredientsPage 触发按钮小可见 6px 圆角（BUG-04 SC4 "圆角 1/4" 字面达成）
affects: [14-VERIFICATION, 14-UAT, 14-REVIEW]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ChefDishesPage 与 AdminDishesPage 统一 Portal dropdown 模式 (createPortal + position:fixed + zIndex:1000 + data-*-dropdown + click/closest guard)"

key-files:
  created: []
  modified:
    - frontend/src/pages/ChefDishesPage.jsx
    - frontend/src/pages/AdminIngredientsPage.jsx

key-decisions:
  - "ChefDishesPage 提取 openIngDropdown/openSfDropdown opener 函数（镜像 14-06 AdminDishesPage 模式），使 onClick 与 onKeyDown 共享 coords 捕获逻辑，键盘激活也能正确渲染 Portal"
  - "AdminIngredientsPage 触发按钮 inline borderRadius: '6px' = 原 24px 框的 1/4 半径，满足 BUG-04 SC4 '圆角 1/4' 字面要求且不破坏 12dp 最小触控目标"

patterns-established:
  - "Pattern: Chef/Admin 两个 DishesPage 下拉菜单实现完全对齐（Portal + coords state + opener + click/closest），后续如需第三个类似下拉可照搬"

requirements-completed: [BUG-04]

# Metrics
duration: 3min
completed: 2026-07-29
---

# Phase 14 Plan 07: ChefDishesPage Portal 迁移 + AdminIngredientsPage 触发圆角 Summary

**关闭 WR-05（ChefDishesPage 下拉未迁移 Portal）+ VERIFICATION Gap 2（AdminIngredientsPage 触发按钮缺可见圆角），ChefDishesPage 食材/半成品下拉改 createPortal + click/closest 守卫，AdminIngredientsPage 2 个触发按钮 inline 加 borderRadius: '6px'**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-29T14:04:24Z
- **Completed:** 2026-07-29T14:07:24Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- ChefDishesPage 食材 + 半成品两个下拉菜单迁移到 `createPortal(<div data-*-dropdown>, document.body)`，`position: 'fixed'` + `zIndex: 1000`，逃出菜品编辑 modal body overflow 裁剪（WR-05 根因消除）
- ChefDishesPage 两个 click-outside `useEffect` 由 `mousedown` 改为 `click` + `closest('[data-ing-dropdown]')` / `closest('[data-sf-dropdown]')` 守卫，Portal 菜单项 onClick 不再被提前关闭（与 AdminDishesPage 14-04 修复一致）
- ChefDishesPage 新增 `ingDropdownCoords` / `sfDropdownCoords` state + `openIngDropdown` / `openSfDropdown` opener 函数（镜像 14-06 AdminDishesPage），trigger onClick 与 onKeyDown 共享 coords 捕获
- AdminIngredientsPage 表格行 + 移动卡片 2 个 ▾ 触发按钮 inline 加 `borderRadius: '6px'`，恢复小可见圆角（BUG-04 SC4 "圆角 1/4" 字面达成），保留 `compact-interactive-target` + `data-dropdown-id` + `aria-label` 不变

## Task Commits

按 plan Task 3 step 7 指定，采用单一合并 commit（ChefDishesPage Portal 迁移 + AdminIngredientsPage 圆角 为一个连贯的 WR-05 + Gap 2 单元）：

1. **Task 1+2+3 合并: ChefDishesPage Portal 迁移 + 食材触发按钮 6px 圆角** - `c7898ac` (fix)

**Plan metadata:** (见下方最终 docs commit)

## Files Created/Modified
- `frontend/src/pages/ChefDishesPage.jsx` - 引入 createPortal；2 个 useEffect 改 click + closest 守卫；新增 coords state + opener 函数；2 个下拉 inline 块改为 Portal 渲染（data-ing-dropdown / data-sf-dropdown，position:fixed + zIndex:1000）
- `frontend/src/pages/AdminIngredientsPage.jsx` - 表格行 + 移动卡片 2 个 ▾ 触发按钮 inline 加 borderRadius: '6px'

## Decisions Made
- **提取 opener 函数而非 inline coords 捕获**：plan Task 2 字面建议"在 trigger onClick 中追加 setIngDropdownCoords"，但参照 AdminDishesPage.jsx:780（14-06 刚交付的 opener 函数模式）提取 `openIngDropdown`/`openSfDropdown` 更干净——onClick 与 onKeyDown 共享同一 coords 捕获逻辑，键盘激活也能正确渲染 Portal。属 plan 范围内（plan 明确要求"mirror AdminDishesPage.jsx:780 pattern"）的等价实现，非架构变更。
- **AdminIngredientsPage 圆角值 6px**：plan 指定值（约原 24px 框的 1/4 半径），满足 SC4 "圆角 1/4" 字面要求，且不修改 `.compact-interactive-target` 规则（12dp 最小触控目标不变）。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] ChefDishesPage 缺少 ingDropdownCoords/sfDropdownCoords state + opener 函数**
- **Found during:** Task 2 (state 检查 grep)
- **Issue:** plan Task 2 step 1 预判 state 可能缺失；grep 确认 ChefDishesPage 完全没有 coords state，而 Portal 渲染依赖 `{showIngDropdown && ingDropdownCoords && createPortal(...)}`，缺 state 则 Portal 永不渲染。
- **Fix:** 新增 `const [ingDropdownCoords, setIngDropdownCoords] = useState(null)` + `sfDropdownCoords` 两个 state；提取 `openIngDropdown`/`openSfDropdown` opener 函数（镜像 AdminDishesPage.jsx:208-230）在 trigger 激活时捕获 `getBoundingClientRect()` 并 set coords；trigger onClick/onKeyDown 改为调用 opener。
- **Files modified:** frontend/src/pages/ChefDishesPage.jsx
- **Verification:** grep 确认 coords state 存在 + opener 函数存在 + Portal 渲染条件 `showIngDropdown && ingDropdownCoords` 存在；build exit 0
- **Committed in:** c7898ac（合并 commit 的一部分）

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** 自动补全是 plan Task 2 明确预判并授权的（"若 state 缺失，需添加"），非范围蔓延。实现选择（opener 函数 vs inline）与 plan 引用的 AdminDishesPage 参考模式完全一致。

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- WR-05 关闭：ChefDishesPage 下拉与 AdminDishesPage 视觉行为一致，chef 用户编辑菜品时下拉不再被 modal 边界裁剪
- VERIFICATION Gap 2 关闭：AdminIngredientsPage 触发按钮有可见 6px 圆角
- 5 项人类视觉验证清单待 verifier 执行（chef 下拉逃出 modal + admin 触发圆角可见）——本 plan 自动化验证（grep + build + dist 字符串）全部通过
- Phase 14 plan 14-07 为当前 phase 最后一个 plan（7/7），phase 可进入 verification

---
*Phase: 14-ui-bugfix-filter-popup*
*Completed: 2026-07-29*

## Self-Check: PASSED

- FOUND: frontend/src/pages/ChefDishesPage.jsx
- FOUND: frontend/src/pages/AdminIngredientsPage.jsx
- FOUND: .planning/phases/14-ui-bugfix-filter-popup/14-07-SUMMARY.md
- FOUND commit: c7898ac
- Automated verification (grep + `npm run build` exit 0 + dist JS contains data-ing-dropdown/data-sf-dropdown) all PASS
