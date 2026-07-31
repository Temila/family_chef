---
phase: 14-ui-bugfix-filter-popup
plan: 04
subsystem: ui
tags: [react, css, material-design-3, portal, dropdown, card-layout, bugfix]

# Dependency graph
requires:
  - phase: 14-02
    provides: Card primitive flex-column + marginTop:auto footer pattern (BUG-03 base)
  - phase: 14-03
    provides: Portal dropdown pattern with data-dropdown-id attributes + Sheet filter migration
provides:
  - "BUG-02 修复：管理表格表头与内容列对齐（th:first-child padding-left 替代 th::before）"
  - "BUG-04 修复：Portal'd 下拉菜单 click 事件 + closest() 守卫，选项 onClick 不再被吞"
  - "统一卡片设计规则：footer slot 右对齐等大按钮 + 文字截断省略号 + 缺失字段占位"
affects: [v1.3-uat, mobile-card-consistency, admin-table-alignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Portal'd 菜单 click-outside 守卫：closest('[data-x-dropdown]') 防御性检查 + click（非 mousedown）保证 React onClick 先于关闭"
    - "卡片设计 4 规则统一：footer slot（右对齐等大）+ 2 行截断（-webkit-box clamp）+ 单行省略号 + minHeight 占位"

key-files:
  created: []
  modified:
    - "frontend/src/css/styles.css — BUG-02 th::before 移除，th:first-child padding-left 替代"
    - "frontend/src/pages/AdminDishesPage.jsx — BUG-04 click 守卫 + 移动端菜品卡片 footer slot + 截断 + chefs 占位"
    - "frontend/src/pages/ChefDishesPage.jsx — 移动端菜品卡片 footer slot + 截断 + chefs 占位"
    - "frontend/src/pages/AdminIngredientsPage.jsx — 移动端食材卡片 footer slot + 截断 + 别名占位"
    - "frontend/src/components/WishCard.jsx — footer 右对齐 + 菜名/note/reference_url 截断 + secondary 占位"

key-decisions:
  - "BUG-02：删除通用 th::before 伪元素（导致所有表头偏移），改为仅 th:first-child 应用 padding-left 偏移与表体编辑按钮后的菜名对齐"
  - "BUG-04：mousedown→click + closest('[data-ing-dropdown]') 守卫双保险；click 事件在 React 合成 onClick 之后冒泡，确保 toggleIngredient 先执行"
  - "卡片按钮统一移入 Card footer prop（.md-card__footer 自带 justify-content:flex-end + gap），按钮加 flex-1 等大"
  - "缺失字段占位：chefs 始终渲染 minHeight:28px 容器、aliases 始终渲染 minHeight:1.2rem、WishCard secondary 始终渲染 minHeight:2rem"

patterns-established:
  - "Portal'd 菜单防抢先关闭：document click 监听 + closest('[data-x-dropdown]') 跳过菜单内点击"
  - "移动端卡片设计 4 规则：footer slot（按钮底部右对齐等大）+ 名称 2 行截断 + 次要信息单行省略号 + 缺失字段 minHeight 占位"

requirements-completed: [BUG-02, BUG-03, BUG-04, BUG-05]

# Metrics
duration: 2min
completed: 2026-07-29
---

# Phase 14 Plan 04: Gap Closure — Table Header / Dropdown / Card Design Rules Summary

**修复 BUG-02 表头对齐 + BUG-04 Portal 下拉菜单点击被吞 + 5 类卡片统一设计规则（footer 右对齐等大按钮、文字截断省略号、缺失字段占位）**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-29T12:52:01Z
- **Completed:** 2026-07-29T12:54:58Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- BUG-02：移除 `.pc-data-table th::before` 48px 伪元素（导致全表头偏移），改为仅 `th:first-child` padding-left 偏移与表体编辑按钮列对齐
- BUG-04：AdminDishesPage 食材/半成品下拉菜单 click-outside 从 `mousedown` 改为 `click`，并加 `closest('[data-ing-dropdown]')` / `closest('[data-sf-dropdown]')` 守卫，确保 Portal'd 菜单选项 onClick 先于关闭触发
- 5 类移动端卡片（AdminDishesPage 菜品、ChefDishesPage 菜品、AdminIngredientsPage 食材、WishCard）统一设计规则：按钮移入 Card `footer` prop（右对齐等大）、名称 2 行截断、次要信息单行省略号、缺失字段 minHeight 占位

## Task Commits

Each task was committed atomically:

1. **Task 1: 修复 BUG-02 表头对齐 + BUG-04 下拉菜单 mousedown 抢先关闭** — `d677114` (fix)
2. **Task 2: 卡片设计规则——移动端菜品卡片 + 食材卡片** — `7344865` (feat)
3. **Task 3: 卡片设计规则——WishCard（按钮右对齐 + 文字截断 + 缺失字段占位）** — `5c29fb6` (feat)

## Files Created/Modified
- `frontend/src/css/styles.css` — 删除 `.pc-data-table th::before` 规则块，新增 `.pc-data-table th:first-child` padding-left 偏移
- `frontend/src/pages/AdminDishesPage.jsx` — 两个 dropdown useEffect 从 mousedown→click + closest 守卫；移动端菜品卡片按钮移入 footer slot + flex-1 + 名称截断 + chefs 占位
- `frontend/src/pages/ChefDishesPage.jsx` — 移动端菜品卡片按钮移入 footer slot + flex-1 + 名称截断 + chefs 占位
- `frontend/src/pages/AdminIngredientsPage.jsx` — 移动端食材卡片按钮移入 footer slot + flex-1 + 名称截断 + 别名始终渲染占位
- `frontend/src/components/WishCard.jsx` — footer 添加 justifyContent:flex-end；菜名 2 行截断；note 3 行截断；reference_url 单行省略号；secondary 始终渲染 minHeight:2rem 占位

## Decisions Made
- **BUG-02 修复策略**：删除通用 `th::before`（影响所有列导致全表偏移），仅对第一列表头应用 padding-left（与表体第一列编辑按钮后的内容对齐）。其他列不再有伪元素偏移。
- **BUG-04 双保险**：`click` 事件确保 React 合成 onClick 在 document 监听之前触发；`closest('[data-x-dropdown]')` 作为防御性检查，即使点击落在 Portal'd 菜单内也不关闭。
- **卡片按钮统一用 Card `footer` prop**：复用 `.md-card__footer` 自带的 `justify-content:flex-end` + `gap`，按钮加 `flex-1` 等大，`.md-card__body` 的 `flex:1` 自动将 footer 推到底部。
- **缺失字段占位统一规则**：chefs→minHeight:28px、aliases→minHeight:1.2rem、WishCard secondary→minHeight:2rem，保证网格中卡片元素对齐。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Portal'd 菜单 data 属性已存在，无需新增**
- **Found during:** Task 1
- **Issue:** 计划假设需要在 Portal'd 菜单根 `<div>` 添加 `data-ing-dropdown` / `data-sf-dropdown` 属性（计划步骤 3、4），但实际代码（来自 14-03）已在 `createPortal` 调用处带有这两个属性。
- **Fix:** 跳过属性新增步骤（no-op）；仅完成 mousedown→click + closest 守卫的实质修改。
- **Files modified:** 无（属性已存在）
- **Verification:** `grep 'data-ing-dropdown' AdminDishesPage.jsx` 命中 Portal 根 div + closest 守卫两处；`grep 'data-sf-dropdown'` 同理。
- **Committed in:** d677114（Task 1 提交说明中已注明）

**2. [Rule 1 - Bug] 折叠预存的 1 行缩进规范化**
- **Found during:** Task 1
- **Issue:** 工作树中 AdminDishesPage.jsx 与 ChefDishesPage.jsx 各有一处 `<th>菜品</th>` 行的缩进规范化（cosmetic，非本计划引入，疑似编辑器自动格式化遗留）。
- **Fix:** 由于该行位于本计划正在编辑的同一文件内，且为无行为变化的纯缩进修复，将其折叠进 Task 1 / Task 2 提交，避免单独的噪音提交。
- **Files modified:** frontend/src/pages/AdminDishesPage.jsx, frontend/src/pages/ChefDishesPage.jsx
- **Verification:** 构建通过；diff 仅显示缩进变化（`-<th>菜品</th>` → `+                    <th>菜品</th>`）。
- **Committed in:** d677114（AdminDishesPage）、7344865（ChefDishesPage）

---

**Total deviations:** 2 auto-fixed（1 阻塞 no-op、1 cosmetic 折叠）
**Impact on plan:** 无范围蔓延。第一个偏差是计划基于过时假设（属性已由 14-03 添加），实际改动量比计划少；第二个是无行为变化的格式化折叠。所有计划目标全部达成。

## Issues Encountered
None — 全部 3 个任务一次性通过构建与自动化验证。

## User Setup Required
None — no external service configuration required.（纯前端 CSS + React 事件处理改动）

## Next Phase Readiness
- Phase 14 全部 4 个计划已完成（P01 BottomBar、P02 bugfix-sweep、P03 Sheet+Portal、P04 gap-closure）
- BUG-01~05 全部关闭，卡片设计规则统一，下拉菜单点击修复
- 准备进入 Phase 15（导航重组 + 测试 seed 数据）或 v1.3 milestone 验收
- 注意：本计划未触碰 STATE.md / ROADMAP.md（由 orchestrator 在 wave 合并后统一更新）

## Self-Check

- [x] `frontend/src/css/styles.css` 存在且含 `th:first-child` 规则
- [x] `frontend/src/pages/AdminDishesPage.jsx` 存在且含 `footer={` + `closest.*data-ing-dropdown`
- [x] `frontend/src/pages/ChefDishesPage.jsx` 存在且含 `footer={`
- [x] `frontend/src/pages/AdminIngredientsPage.jsx` 存在且含 `footer={`
- [x] `frontend/src/components/WishCard.jsx` 存在且含 `justifyContent: 'flex-end'`
- [x] 提交 d677114、7344865、5c29fb6 均在 git log 中
- [x] `npm run build` exit 0

## Self-Check: PASSED

---
*Phase: 14-ui-bugfix-filter-popup*
*Completed: 2026-07-29*
