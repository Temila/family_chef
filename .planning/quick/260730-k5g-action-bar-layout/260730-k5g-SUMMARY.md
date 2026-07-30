---
phase: quick
plan: 260730-k5g
subsystem: ui
tags: [react, action-bar, layout, md3, css-modifier]

requires: []
provides:
  - "header-action-bar--split 修饰符（多按钮分栏页左右分布）"
affects: [AdminDishesPage, AdminIngredientsPage]

tech-stack:
  added: []
  patterns:
    - "BEM 修饰符模式扩展 action-bar 布局变体，不修改基类以保护单按钮页面"

key-files:
  created: []
  modified:
    - frontend/src/pages/AdminIngredientsPage.jsx
    - frontend/src/pages/AdminDishesPage.jsx
    - frontend/src/components/composites/Header.css

key-decisions:
  - "用 --split 修饰符而非修改基类，避免破坏单按钮页面（AdminUsers/AdminCategories/OrderDetail/DishDetail）的靠右对齐"
  - "AdminIngredients parse modal 标题「从菜谱解析食材」→「从文本解析食材」，与重命名后的按钮文案保持一致"

patterns-established:
  - "需要左右分布的多按钮 action-bar 使用 header-action-bar--split，默认靠右布局保持不变"

requirements-completed: []

duration: 3 min
completed: 2026-07-30
---

# Quick Task 260730-k5g: 菜品/食材管理页 action-bar 排版调整 Summary

**两页 action-bar 改为「高级筛选(左) + 解析文本&添加(右)」单行左右分布，AdminIngredients 按钮从「从菜谱解析/inventory-2」统一为「解析文本/edit」，通过新增 `--split` 修饰符而非改基类实现**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-30T06:35:37Z
- **Completed:** 2026-07-30T06:39:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- AdminIngredients「从菜谱解析」(inventory-2 图标) → 「解析文本」(edit 图标)，与 AdminDishes 统一
- 两页「高级筛选」按钮从独立 padding div 移入 `header-action-bar`，与「解析文本 + 添加」位于同一行
- 新增 `.header-action-bar--split` 修饰符实现左右分布（space-between），基类保持 flex-end 不影响单按钮页面

## Task Commits

Each task was committed atomically:

1. **Task 1: AdminIngredientsPage 重命名 + 合并筛选** - `eeaf8f8` (feat)
2. **Task 2: AdminDishesPage 合并筛选（文案/图标已正确）** - `62e24c7` (feat)
3. **Task 3: Header.css 新增 --split 修饰符** - `6f984f4` (feat)

## Files Created/Modified
- `frontend/src/pages/AdminIngredientsPage.jsx` - 按钮重命名、图标换 edit、筛选并入 action-bar、parse modal 标题同步
- `frontend/src/pages/AdminDishesPage.jsx` - 筛选并入 action-bar，解析文本/edit 与添加按钮布局重构
- `frontend/src/components/composites/Header.css` - 新增 `.header-action-bar--split` 修饰符

## Decisions Made
- **--split 修饰符而非改基类**：基类 `.header-action-bar` 被 ChefDishesPage/AdminUsersPage/AdminCategoriesPage/OrderDetailPage/DishDetailPage 等单按钮页面复用，改 justify-content 会让那些按钮跑到左侧。用 BEM 修饰符只作用于两页。
- **parse modal 标题同步**（见 Deviations）：按钮重命名后 modal 标题残留旧措辞，为一致性一并更新。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - 一致性] 同步更新 AdminIngredients parse modal 标题**
- **Found during:** Task 1 验证阶段
- **Issue:** 按钮已从「从菜谱解析」改为「解析文本」，但 parse Modal 的标题仍为 `从菜谱解析食材`（line 496），与重命名后的按钮不一致；同时导致 plan 验证项 #2（grep「从菜谱解析」无残留）无法通过。
- **Fix:** 将 input 步骤的 modal 标题 `从菜谱解析食材` → `从文本解析食材`（菜谱→文本，保留「从X解析食材」描述结构，与按钮「解析文本」语义一致）。
- **Files modified:** frontend/src/pages/AdminIngredientsPage.jsx
- **Verification:** `rg "从菜谱解析" AdminIngredientsPage/AdminDishesPage` 无残留；`npm run build` 通过
- **Committed in:** eeaf8f8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 consistency fix)
**Impact on plan:** 微小文案一致性修正，直接由按钮重命名引发，无范围蔓延。

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 两页 action-bar 排版统一完成，build 通过
- `--split` 修饰符可被未来多按钮分栏页面直接复用

---
*Phase: quick (260730-k5g)*
*Completed: 2026-07-30*

## Self-Check: PASSED
- All 3 modified files exist on disk
- All 3 task commits (eeaf8f8, 62e24c7, 6f984f4) present in git log
- `npm run build` passes (0 errors)
- Verification grep: no residual「从菜谱解析」/ inventory-2 / standalone filter div
- Base `.header-action-bar` justify-content remains flex-end; `.header-action-bar--split` added
