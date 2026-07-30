---
phase: quick
plan: 260730-ks4
subsystem: ui
tags: [react, css, md3-tokens, layout, header-composite]

requires:
  - phase: quick-260730-k5g
    provides: 把「高级筛选 / 解析文本 / 添加」三按钮引入菜品/食材管理页（但位置错误地放在了 Header action-bar）
provides:
  - 共享 CSS 类 .filter-action-row + .filter-action-row__actions（搜索栏下方的左/右按钮分布行）
  - 两页修正后的页面结构（Header 无 actions → search-bar → filter-action-row → Sheet）
affects: [AdminDishesPage, AdminIngredientsPage, Header-composite]

tech-stack:
  added: []
  patterns:
    - "页面级 filter-action-row：搜索栏与高级筛选 Sheet 之间的一行操作按钮，space-between 左/右分布"

key-files:
  created: []
  modified:
    - frontend/src/css/styles.css
    - frontend/src/pages/AdminIngredientsPage.jsx
    - frontend/src/pages/AdminDishesPage.jsx
    - frontend/src/components/composites/Header.css

key-decisions:
  - "三按钮从 Header 的 actions 属性移到页面级 filter-action-row，确保位于搜索栏下方"
  - "用共享类 .filter-action-row 而非内联样式，两页复用"
  - "删除 260730-k5g 引入的死代码 .header-action-bar--split（移动后零消费者）"
  - "基类 .header-action-bar 保持不变（其它 5 个页面仍在使用，仍为 flex-end）"

requirements-completed: []

duration: 3 min
completed: 2026-07-30
---

# Quick Task 260730-ks4: 三按钮移到搜索栏下方 Summary

**修正 260730-k5g 的位置错误：把「高级筛选 / 解析文本 / 添加」从 Header action-bar 移到搜索栏下方的页面级 `filter-action-row`，左/右分布，并清理对应的死代码 CSS 修饰符。**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-30T06:59:30Z
- **Completed:** 2026-07-30T07:00:52Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments

- 新增共享类 `.filter-action-row`（space-between）与 `.filter-action-row__actions`（右侧按钮组），水平 padding 与 `.search-bar` 对齐
- AdminIngredientsPage / AdminDishesPage 两页：移除 `<Header>` 的 `actions` 属性，在 search-bar 与 Sheet 之间插入 `filter-action-row`（高级筛选靠左、解析文本+添加靠右）
- 删除 260730-k5g 引入的死代码 `.header-action-bar--split` 修饰符；基类 `.header-action-bar` 保持不变
- `npm run build` 通过（0 error）

## Task Commits

每个任务原子提交：

1. **Task 1: styles.css — 新增 .filter-action-row 类** — `5aa4fa7` (fix)
2. **Task 2: AdminIngredientsPage — 移除 Header actions + 插入 filter-action-row** — `67595a8` (fix)
3. **Task 3: AdminDishesPage — 同样重构** — `fd6a53d` (fix)
4. **Task 4: Header.css — 删除死代码 .header-action-bar--split** — `7f8baee` (fix)

## Files Created/Modified

- `frontend/src/css/styles.css` — 在 `.search-bar .search-icon` 后追加 `.filter-action-row` 与 `.filter-action-row__actions` 两个规则
- `frontend/src/pages/AdminIngredientsPage.jsx` — `<Header title="食材管理" />`（无 actions）；search-bar 后插入 `filter-action-row`（解析文本 → openParseModal）
- `frontend/src/pages/AdminDishesPage.jsx` — `<Header title="菜品管理" />`（无 actions）；search-bar 后插入 `filter-action-row`（解析文本 → openExtractModal）
- `frontend/src/components/composites/Header.css` — 删除 `.header-action-bar--split` 修饰符（5 行），基类 `.header-action-bar` 未动

## Decisions Made

- **位置修正**：按用户要求，三按钮必须在搜索栏**下方**，所以从 Header 的 `actions` 属性（由 Header composite 渲染在搜索栏**上方**）移出，改为页面级 `filter-action-row`，位于 search-bar `</div>` 之后、`{showAdvFilter && <Sheet>}` 之前。
- **共享类 vs 内联样式**：选共享类 `.filter-action-row`，避免两页重复内联样式，符合 AGENTS.md「无多余代码」精神。
- **死代码清理**：260730-k5g 的 `.header-action-bar--split` 修饰符在移动后零消费者，删除以避免遗留死代码；基类保留（5 个页面仍在用）。
- **图标/文案保留**：「解析文本」+ `edit` 图标沿用 260730-k5g 的结果（两页一致）。

## Deviations from Plan

### Auto-fixed Issues

**1. [Note — Cosmetic] Task 4 提交信息有 typo**
- **Found during:** Task 4
- **Issue:** 提交信息写成 `fix(quick-quick-260730-ks4): ...`（多了一个 `quick-` 前缀），其余三个提交为正确的 `fix(quick-260730-ks4): ...`
- **Fix:** 未修正——遵循「不 amend 已成功的提交除非显式要求」的约束。仅为外观问题，不影响功能或构建。
- **Committed in:** `7f8baee`

---

**Total deviations:** 1 (仅外观提交信息 typo，非功能性)
**Impact on plan:** 无。所有 4 个任务的功能性产出与 PLAN 完全一致。

## Issues Encountered

None — `npm run build` 一次通过；6 项验证全部 PASS。

## Verification Results (PLAN `<verification>` block)

1. ✅ `npm run build` 通过（0 error，仅 pre-existing chunk-size 警告）
2. ✅ 两页 `<Header` 标签无 `actions` 属性（`<Header title="..." />`）
3. ✅ 两页 search-bar 之后、Sheet 之前存在 `<div className="filter-action-row">`（AdminIngredients 行 262，AdminDishes 行 541）
4. ✅ 高级筛选 trigger 仅在 filter-action-row 内一次；Sheet 块完整保留
5. ✅ `.header-action-bar--split` 已从 Header.css 删除（frontend/src 下零命中）；`.header-action-bar` 基类仍在（行 150）
6. ✅ 其它 5 页（ChefDishes/AdminUsers/AdminCategories/OrderDetail/DishDetail）仍命中 `header-action-bar`，className 不含 `--split`

## Self-Check: PASSED

- **Files modified exist:** ✅ styles.css, AdminIngredientsPage.jsx, AdminDishesPage.jsx, Header.css 均在
- **Commits exist:** ✅ `5aa4fa7`, `67595a8`, `fd6a53d`, `7f8baee` 全部在 `git log`
- **Build passes:** ✅ `vite build` 成功
