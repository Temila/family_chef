---
status: complete
phase: 14-ui-bugfix-filter-popup
source:
  - 14-01-SUMMARY.md
  - 14-02-SUMMARY.md
  - 14-03-SUMMARY.md
started: 2026-07-29T09:10:00Z
updated: 2026-07-29T09:30:00Z
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
result: issue
reported: "表头没有对齐，我自行尝试把style.css文件第348行从.pc-data-table th::before改为.pc-data-table thead tr::before 后正常了，但整个表偏向了页面右边，不美观。理想的情况应该是表左右的边界一样。"
severity: major

### 3. Mobile WishCard footer pinned to bottom (BUG-03)
expected: |
  On the mobile wish list (view at ~375px width), when 3 wish cards render in a grid row with varying content lengths, all cards stretch to equal height. The action footer (buttons/badges) sits at the bottom of each card, not floating mid-card.
result: issue
reported: "有问题，愿望单中每个卡片的大小都不一致，且卡片之前没有边界。"
severity: major

### 4. DishCard footer pinned to bottom (BUG-03 consistency)
expected: |
  On the admin dish grid (e.g. AdminDishesPage dish list), dish cards stretch uniformly. The card footer (badge + availability toggle) stays pinned to the bottom of each card regardless of content length.
result: issue
reported: "卡片大小一致了，但按钮没有置于卡片底部。卡片设计应该遵循以下规则：1、页面上所有卡片尺寸应该保持绝对一致。2、操作按钮置于卡片底部，与卡片边界有一个很小的间隔，各按钮大小一致，右对齐排列。3、卡片中的信息内容，每一种信息应设置最大显示范围，超出部分做截断处理，末尾显示省略号。4、对于缺失的信息内容，在排版上预留显示区域，保证各卡片的各元素严格对齐"
severity: major

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
result: issue
reported: "有问题，选择食材时点击任何按钮都会导致下拉菜单被关闭且无法触发任何选中的操作"
severity: blocker

### 8. Mobile ingredient cards bottom-align edit/delete buttons (BUG-05)
expected: |
  On AdminIngredientsPage at mobile viewport (~375px), view a row of 3 ingredient cards with varying name lengths and mixed alias presence. All 3 cards show edit (✎) and delete (🗑) buttons on the same horizontal line at the bottom of each card.
result: issue
reported: "没有对齐，参考之前的卡片设计规范进行调整"
severity: major

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
passed: 5
issues: 5
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Table headers align with first content column on all admin pages"
  status: failed
  reason: "User reported: 表头没有对齐，用户尝试把 .pc-data-table th::before 改为 .pc-data-table thead tr::before 后表头对齐了，但整个表偏向了页面右边，不美观。理想：表左右边界一样"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Mobile wish cards render with uniform row height and footer pinned to bottom"
  status: failed
  reason: "User reported: 愿望单中每个卡片的大小都不一致，且卡片之前没有边界"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "DishCard footer pinned to bottom with consistent button layout, and all cards (WishCard/DishCard/MobileIngredientCard) follow unified design rules: absolute uniform size, footer right-aligned with small gap, info truncation with ellipsis, reserved space for missing fields"
  status: failed
  reason: "User reported: 卡片大小一致了，但按钮没有置于卡片底部。用户给出 4 条卡片设计规则：1) 所有卡片绝对等大；2) 操作按钮固定卡片底部，与边界有小间隔，按钮等大右对齐；3) 信息内容设最大显示范围+省略号截断；4) 缺失字段预留空间保证元素对齐"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "AdminDishesPage ingredient dropdown user can select items without menu closing prematurely"
  status: failed
  reason: "User reported: 有问题，选择食材时点击任何按钮都会导致下拉菜单被关闭且无法触发任何选中的操作"
  severity: blocker
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Mobile ingredient card edit/delete buttons bottom-aligned across all rows in a grid"
  status: failed
  reason: "User reported: 没有对齐，参考之前的卡片设计规范进行调整。Same root cause as card design rules gap (test 4): buttons not at bottom, no truncation, no missing-field placeholder, no small gap from border"
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
