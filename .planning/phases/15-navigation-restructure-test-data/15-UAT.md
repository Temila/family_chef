---
status: complete
phase: 15-navigation-restructure-test-data
source:
  - 15-01-SUMMARY.md
  - 15-02-SUMMARY.md
  - 15-03-SUMMARY.md
  - 15-04-SUMMARY.md
  - 15-05-SUMMARY.md
  - 15-06-SUMMARY.md
started: 2026-07-30T16:05:00Z
updated: 2026-07-30T16:18:00Z
ui_language: zh-CN (per user request 2026-07-30)
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: |
  Kill any running backend/frontend. Clear any stale SQLite DB (data/family_chef.db). Start the backend with AUTO_SEED_DEMO_DISHES=1 (or ENVIRONMENT=development) and the frontend dev server. Boot completes without errors, alembic migrations apply, seed preset ingredients + 8 test dishes (测试菜品 1..8) land in the DB, GET /api/health returns {"status":"ok"}, and /api/dishes returns the seeded rows when called as admin.
result: pass

### 2. Header 主行仅含主题切换 + 头像（NAV-01）
expected: |
  在任意桌面宽度认证页（≥1024px），Header 主行只包含一个主题切换 IconButton（.md-header__theme-toggle）和头像（.md-header__avatar）。不出现解析/添加/编辑/返回按钮（除页面已有的返回按钮外）。所有页面级操作按钮都渲染在主行下方独立的栏中。
result: pass

### 3. 头像下拉菜单仅含 2 个菜单项 + Divider（NAV-02）
expected: |
  点击右上角头像，弹出下拉菜单，仅包含 2 个菜单项："✎ 编辑资料"（点击跳转 /profile）和"⏻ 退出登录"（点击后登出并跳转 /login）。两项之间有横线 Divider 隔开。无第三个"切换主题"菜单项（主题切换已在 Header 主行）。菜单顶部信息段（display_name + role）保留不变。
result: pass

### 4. 页面操作栏在 Header 下方独立渲染按钮（NAV-01）
expected: |
  打开 AdminDishesPage（或 AdminIngredientsPage / ChefDishesPage / AdminUsersPage / AdminCategoriesPage / OrderDetailPage / DishDetailPage）。Header 主行下方出现一条水平栏（.header-action-bar，高约 56px，surface 背景，顶边 1px），内含页面操作按钮（例"解析文本"+"+ 添加"）右对齐排列。Header 主行内不内联出现任何解析/添加按钮。
result: pass

### 5. Sidebar 底部仅显示版本号文本（NAV-03）
expected: |
  任意桌面宽度认证页，Sidebar 底部区域仅含一个居中文本节点"v0.0.0"（或实际版本号），样式约 12px / on-surface-variant 灰阶。Sidebar 底部无任何主题切换按钮、无任何退出登录按钮。
result: pass
resolution: 用户后续补充意见（不影响本次通过）：版号应展示实际里程碑版本 v1.3.0，且来源应为 config.yaml（而非 package.json/Vite define）。该偏好属于未来改进项，不阻塞 Phase 15 验收。

### 6. BottomBar 厨师角色（移动端 375x812）：7 个标签，最左为"首页"，无"退出"（NAV-05）
expected: |
  以厨师身份登录，移动视口（375×812）查看。底部栏显示 7 个标签（按顺序）：首页 / 订单 / 菜品 / 食材 / 愿望 / 点菜 / 我的。无任何"退出"或"logout"标签。当有待处理订单时，订单标签显示 pending Badge。
result: pass

### 7. BottomBar 管理员角色（移动端 375x812）：7 个标签，最左为"后台"，无"退出"（NAV-05）
expected: |
  以管理员身份登录，移动视口（375×812）查看。底部栏显示 7 个标签（按顺序）：后台 / 菜品 / 食材 / 愿望 / 用户 / 点菜 / 我的。无任何"退出"或"logout"标签。
result: pass

### 8. BottomBar 普通用户角色（移动端 375x812）：4 个标签，最左为"首页"，无"退出"（NAV-05）
expected: |
  以普通用户身份登录，移动视口（375×812）查看。底部栏显示 4 个标签（按顺序）：首页 / 点菜 / 愿望 / 我的。无任何"退出"或"logout"标签。
result: pass

### 9. UserHomePage 厨师角色显示"菜品管理"+"食材管理"入口（NAV-04）
expected: |
  以厨师身份登录，移动视口打开 /home。快捷入口网格显示 4 个入口（按顺序）：开始点菜 / 口味偏好 / 菜品管理 / 食材管理。点击"菜品管理"跳转 /chef/dishes；点击"食材管理"跳转 /ingredients。厨师首页无"订单管理"入口（订单通过 BottomBar 进入）。
result: pass

### 10. UserHomePage 管理员角色显示"订单管理"+"菜品管理"+"食材管理"入口（NAV-04）
expected: |
  以管理员身份登录，移动视口打开 /home。快捷入口网格显示 5 个入口，包含 订单管理、菜品管理、食材管理（顺序按锁定契约）。/admin 仍渲染 AdminHomePage，原有快捷入口（菜品管理 + 食材管理）保持不变。
result: pass
note: 用户补充：管理员身份下 /home 自动重定向到 /admin（既有行为，符合预期）。请继续测试 Test 11。

### 11. OrderPage "高级筛选"按钮打开 Sheet 弹层（UI-01）
expected: |
  /order 页面筛选区域显示一个 tonal "高级筛选"按钮（含 filter 图标），替代旧版"展开筛选 ▼ / 收起筛选 ▲"内联 Chip。点击按钮打开 Sheet 弹层（移动端底栏弹出，桌面端居中弹窗），标题"高级筛选"，底部按钮"清空"和"应用"。favoritesOnly chip 和 sortBy select 仍在按钮旁内联显示（不在 Sheet 内）。
result: pass

### 12. OrderPage Sheet："清空"重置筛选但保留 favoritesOnly + sortBy（UI-01）
expected: |
  在 Sheet 内切换一个 region/cuisine/filterType chip，触发菜品列表刷新。点击"清空"，region、cuisine、filterType 全部回到未选中状态，菜品列表重新渲染（移除这些筛选）。favoritesOnly chip 保持切换前状态（选中或未选中）。sortBy select 保持当前值（不重置为默认）。点击"应用"，Sheet 关闭。
result: pass

### 13. 移动端管理菜品卡片：8 张测试菜品统一尺寸 + 底部操作对齐（BUG-06 + DATA-01）
expected: |
  以管理员身份登录，375px 视口打开 /admin/dishes。8 张测试菜品（测试菜品 1..8，覆盖 8 种 recipe×description×image 组合）在移动卡片网格中全部可见。所有卡片外宽相同、外高相同。无论哪些卡片有图/有介绍，所有卡片底部的操作行（编辑+删除按钮或 关联/取消关联）位于同一水平线 y 坐标。image_url=null 的卡片渲染图标占位符，仍与有图的邻居对齐。
result: pass

## Summary

total: 13
passed: 13
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
