---
status: complete
phase: 14-ui-bugfix-filter-popup
source:
  - 14-01-SUMMARY.md
  - 14-02-SUMMARY.md
  - 14-03-SUMMARY.md
started: 2026-07-29T09:10:00Z
updated: 2026-07-30T16:00:00Z
resolution_note: 所有 5 个问题已由用户在 gsd 工作流之外自行修复（参见 ROADMAP.md 中 Phase 14 的 `[x]` 完成标记及 STATE.md 260729-wl7 quick task）。本 UAT 现作为已修复状态的存档记录保留；不进入 /gsd-plan-phase --gaps 流程。
---

## Current Test

[testing complete]

## Tests

### 1. BottomBar fills mobile viewport width (BUG-01)
expected: |
  At viewports 360px–1023px, the bottom nav bar spans the full viewport width edge-to-edge, no left/right gap. At ≥1024px the bar is hidden (desktop-hide media query preserved).
result: pass

### 2. Table headers align with content columns (BUG-02)
expected: |
  On any admin page with a data table (e.g. AdminIngredientsPage, AdminDishesPage, AdminCategoriesPage, AdminChefsPage, AdminLogsPage, AdminUsersPage), the table header text aligns vertically with the first content column below it (no left-shift misalignment). The 48px ::before placeholder pushes the visible label to the right.
result: pass
resolution: out-of-band — 用户自行修复（最终方案：Plan 14-05 基线 + --with-leading 修饰类拆分，作用于 4 个带头像表格；3 个纯文本表格保留基线）。

### 3. Mobile WishCard footer pinned to bottom (BUG-03)
expected: |
  On the mobile wish list (view at ~375px width), when 3 wish cards render in a grid row with varying content lengths, all cards stretch to equal height. The action footer (buttons/badges) sits at the bottom of each card, not floating mid-card.
result: pass
resolution: out-of-band — 用户自行修复（Plan 14-04 统一卡片设计规则：footer 槽 + 右对齐按钮 + 文本截断 + 缺失字段占位）。

### 4. DishCard footer pinned to bottom (BUG-03 consistency)
expected: |
  On the admin dish grid (e.g. AdminDishesPage dish list), dish cards stretch uniformly. The card footer (badge + availability toggle) stays pinned to the bottom of each card regardless of content length.
result: pass
resolution: out-of-band — 用户自行修复（同 Plan 14-04 卡片设计规则统一处理）。

### 5. Modal shows edge border in dark mode (BUG-07 / UI-03)
expected: |
  Toggle theme to dark mode. Open any Modal (e.g. "Add Dish", "Parse Recipe", "Edit Ingredient" on AdminIngredientsPage, "Wish Advance"). The modal has a visible 1px outline-variant edge that contrasts against the dark scrim. In light mode the same border is barely visible (token difference between #c1c9bf light and #414941 dark).
result: pass

### 6. AdminIngredientsPage dropdown escapes card overflow (BUG-04)
expected: |
  On AdminIngredientsPage (any viewport), tap the ▾ dropdown trigger on any ingredient row. The linked-dishes menu renders fully visible at the top of the stacking order, NOT clipped by the table header or surrounding cards (Portal z-index 1000). Click outside the menu → it closes. Tap the trigger again → it re-opens.
result: pass

### 7. AdminDishesPage ingredient dropdown escapes modal clipping (BUG-04)
expected: |
  Open AdminDishesPage dish add/edit modal. Click the "点击选择食材..." ingredient dropdown trigger. The ingredient list menu appears fully visible, NOT clipped by the modal scrim or form modal border. Type into the search input to filter — typing works without the menu closing. Click outside → menu closes.
result: pass
resolution: out-of-band — 用户自行修复（Plan 14-04 + 14-06：click-outside 改为 click 事件 + closest 守卫 + 键盘激活同步 coords）。

### 8. Mobile ingredient cards bottom-align edit/delete buttons (BUG-05)
expected: |
  On AdminIngredientsPage at mobile viewport (~375px), view a row of 3 ingredient cards with varying name lengths and mixed alias presence. All 3 cards show edit (✎) and delete (🗑) buttons on the same horizontal line at the bottom of each card.
result: pass
resolution: out-of-band — 用户自行修复（同 Plan 14-04 / 14-07 卡片设计规则统一；触发按钮 6px 圆角由 14-07 完成）。

### 9. AdminIngredientsPage 高级筛选 opens as Sheet (UI-02 partial)
expected: |
  On AdminIngredientsPage, tap "高级筛选". On mobile (<1024px): a bottom sheet slides up from the bottom with category chips and a 清空/应用 footer. On desktop (≥1024px): a centered modal appears with the same content. ESC closes; backdrop click closes; 应用 closes + applies filter; 清空 resets selections.
result: pass

### 10. AdminDishesPage 高级筛选 opens as Sheet (UI-02 partial)
expected: |
  On AdminDishesPage, tap "高级筛选". On mobile: bottom sheet slides up with category sections + 半成品 chips + 清空/应用 footer. On desktop: centered modal. ESC/backdrop closes; 应用 closes + applies filter; 清空 resets selections.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0
resolved_out_of_band: 5

## Gaps

<!-- 5 个原始诊断项已由用户在 gsd 工作流之外修复，作为历史诊断存档保留 -->
- truth: "Table headers align with first content column on all admin pages"
  status: resolved-out-of-band
  resolved_by: user (2026-07-29)
  resolution_plan: "14-05-PLAN.md（基线 + --with-leading 修饰类拆分，作用于 4 个带头像表格；3 个纯文本表格保留基线）"
  test: 2
  original_root_cause: ".pc-data-table th::before selector not matching actual <th> elements"
- truth: "Mobile wish cards render with uniform row height and footer pinned to bottom"
  status: resolved-out-of-band
  resolved_by: user (2026-07-29)
  resolution_plan: "14-04-PLAN.md（4 条卡片设计规则：等高 + footer 固定 + 右对齐 + 文本截断 + 缺失字段占位）"
  test: 3
  original_root_cause: "WishCard grid missing display:grid align-items:stretch + missing footer bottom-pinning"
- truth: "DishCard/WishCard/MobileIngredientCard follow unified 4-rule design (uniform size + right-aligned buttons + ellipsis + missing-field placeholders)"
  status: resolved-out-of-band
  resolved_by: user (2026-07-29)
  resolution_plan: "14-04-PLAN.md"
  test: 4
  original_root_cause: "Card implementation only added flex-column + marginTop:auto; missing text-truncation, missing-field placeholders, right-aligned footer"
- truth: "AdminDishesPage ingredient dropdown user can select items without menu closing prematurely"
  status: resolved-out-of-band
  resolved_by: user (2026-07-29)
  resolution_plan: "14-04-PLAN.md + 14-06-PLAN.md（click-outside 改为 click + closest 守卫 + 键盘激活同步 coords）"
  test: 7
  original_root_cause: "Click-outside fires on mousedown which races click event on Portal'd menu items"
- truth: "Mobile ingredient card edit/delete buttons bottom-aligned across all rows in a grid"
  status: resolved-out-of-band
  resolved_by: user (2026-07-29)
  resolution_plan: "14-04-PLAN.md + 14-07-PLAN.md（卡片设计规则 + 触发按钮 6px 圆角）"
  test: 8
  original_root_cause: "MobileIngredientCard layout missing 4-rule design (footer pinned + truncation + placeholders + right-align)"
