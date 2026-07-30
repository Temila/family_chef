# Phase 15: Navigation Restructure & Test Data - Context

**Gathered:** 2026-07-29
**Status:** Ready for planning

## Phase Boundary

导航体系精简 + 移动端菜品卡片一致性验证 + 测试 seed 数据。具体范围：
- Header 重组：仅保留头像 + 主题切换；其他功能按钮移到下方 div；头像下拉菜单仅编辑资料 + 退出登录
- Sidebar footer 清理：移除主题切换/退出按钮，footer 保留显示版本号
- 主题切换 IconButton 移到 md-header 右侧紧贴 avatar
- 厨师/管理员移动端首页添加 菜品管理 + 食材管理 入口
- md-bottom-bar 全角色 首页 在最左、我的 在最右、移除 logout 按钮；按角色权限过滤菜品/食材 tab
- 创建 8 种组合（食谱×介绍×图片）的测试菜谱 seed 数据（仅 dev 环境）
- 点菜页面 OrderPage 的"展开筛选"迁移到 Sheet 弹窗

**不在范围**（已在 Phase 14 完成）：AdminDishesPage / AdminIngredientsPage 高级筛选 Sheet 化、Card 布局一致性、表格对齐、深色模式 modal 边框。

<decisions>
## Implementation Decisions

### Header 重组 (NAV-01)

- **D-NAV01-01:** 保留 Header `actions` prop 机制；Page 传入 `<div className="header-action-bar">` 而非内联按钮。该 div 顶部带 `border-bottom` 与 header 视觉分割。
- **D-NAV01-02:** Header 主体保留左 (logo / 返回按钮) + 中 (页面标题) + 右 (主题切换 + 头像) 三栏结构。仅移除原来混在中间的 `actions` 渲染。
- **D-NAV01-03:** 新增 `header_action_bar` 样式：高度 56px (与 header 等高或更大)、`border-top: 1px solid var(--md-color-outline-variant)`、背景 `var(--md-color-surface)`、右侧 padding `var(--md-spacing-4)`、内部 `display: flex; gap: var(--md-spacing-2); align-items: center; justify-content: flex-end;`。

### 头像下拉菜单 (NAV-02)

- **D-NAV02-01:** 菜单仅两个 menuitem："编辑资料" + "退出登录"。主题切换按钮已统一移到 header 主体（见 D-NAV03-03）。
- **D-NAV02-02:** "编辑资料" → `navigate('/profile')`，复用现有 `UserProfilePage`。
- **D-NAV02-03:** 在两个 menuitem 之间插入 `<Divider />` (Phase 11 已有的 `composites/Divider` 组件)，体现"中性动作"与"危险动作"的语义分组。
- **D-NAV02-04:** 保留菜单顶部 `display_name + role` 信息区（不删除）。它提供用户身份上下文，是 MD3 menu 推荐的"header info"模式。

### Sidebar footer 清理 (NAV-03)

- **D-NAV03-01:** Sidebar footer 区块保留，但内容从"主题切换 + 退出"改为"显示版本号"。版本号读取自 `config.json` 或 `package.json`（agent 决定数据源，优先 `config.json`，因为后端有 `app.version`）。
- **D-NAV03-02:** Sidebar 顶部 logo 保留（餐厅图标 + 品牌）。
- **D-NAV03-03:** 主题切换 IconButton 移到 `md-header` 右侧栏，紧贴 avatar 左侧。位置：`header__right` 内、`<button className="md-header__theme-toggle">` + `Icon name={theme}`。
- **D-NAV03-04:** Sidebar 移除两按钮后，`useState` 主题状态可以从 Sidebar 删除（统一由 `theme.toggleTheme()` 直接调用 + DOM 事件广播给 Sidebar 重渲染，或简单保留局部状态）。
- **D-NAV03-05:** Sidebar 的 `logout()` 调用全部移除（logout 路径仅保留在 header 头像下拉）。

### 厨师/管理员移动端首页入口 (NAV-04)

- **D-NAV04-01:** `UserHomePage.jsx` 当前仅显示 `开始点菜 + 口味偏好` (基础) + `订单管理` (chef/admin 追加)。Phase 15 追加：**chef + admin 都增加 `菜品管理` + `食材管理` 两个菜单项**。普通 user 角色不显示。
- **D-NAV04-02:** 明确化：所谓"食谱管理" = `菜品管理` (路由 `/chef/dishes`)。之前归类为"食谱管理"是描述模糊，已统一为菜品管理。
- **D-NAV04-03:** 复用现有 quick-action grid 样式（响应式 `repeat(${menuEntries.length}, 1fr)`)，仅扩展 menuEntries 数组。无需新建"工作台"区块。
- **D-NAV04-04:** chef 看到 4 个 menuEntries (开始点菜 / 口味偏好 / 菜品管理 / 食材管理)，admin 看到 4 个 (开始点菜 / 口味偏好 / 订单管理 / 菜品管理 / 食材管理)。user 保持 2 个 (开始点菜 / 口味偏好) + 收藏 + 订单 navigation 来自 BottomBar。

### md-bottom-bar tab 顺序 (NAV-05)

- **D-NAV05-01:** 全角色通用约束：**"首页" (或 admin 的"后台") 必须在最左边**，"我的"必须在最右边；从底部导航移除 "退出" 按钮（退出统一走 header 头像下拉菜单）。
- **D-NAV05-02:** Chef 7 tab = `首页 / 订单 / 菜品 / 食材 / 愿望 / 点菜 / 我的`（路径 `/home` `/chef/orders` `/chef/dishes` `/ingredients` `/chef/wishes` `/order` `/profile`）。
- **D-NAV05-03:** Admin 7 tab = `后台 / 菜品 / 食材 / 愿望 / 用户 / 点菜 / 我的`（路径 `/admin` `/admin/dishes` `/ingredients` `/admin/wishes` `/admin/users` `/order` `/profile`）。移除 `退出` tab。
- **D-NAV05-04:** User 4 tab = `首页 / 点菜 / 愿望 / 我的`。**User 角色不显示 菜品 / 食材 tab**(按角色权限过滤)。
- **D-NAV05-05:** 同一图标逻辑跨角色一致：`home`/`dashboard` 仅首个出现；`ramen-dining` (点菜) 仅在非首位时不冲突；`person` 仅末位。中间 tab 顺序按 agent 决策，满足"一致排序逻辑"。

### 测试菜谱 seed 数据 (DATA-01 / BUG-06)

- **D-DATA01-01:** 8 种组合（食谱×介绍×图片 = 2³=8）作为 fixture，**仅在 dev 环境注入**。通过环境变量触发：`ENVIRONMENT=development` 或 `AUTO_SEED_DEMO_DISHES=1` 时执行；production 默认跳过。
- **D-DATA01-02:** 8 个菜品全部 `created_by=admin`（使用现有默认 admin 账号，不新建 chef）。命名按 `[1]..[8]` 开头便于识别（如 `Test Dish 1 · 有食谱有介绍有图`）。
- **D-DATA01-03:** 字段状态**随机混合**：`status` ∈ {`'published'`, `'draft'`}、`is_popular` ∈ {true, false}、`is_semifinished` ∈ {true, false}、`is_featured` ∈ {true, false}（如果后端支持）。
- **D-DATA01-04:** 8 个菜品关联默认分类（initial_data 的 `preset_categories` 中随机一个）。无食材关联（避免影响 wishlist 逻辑）。
- **D-DATA01-05:** 注入位置：`backend/app/initial_data.py` 新增 `create_seed_test_dishes()` 函数，在 `create_preset_ingredients()` 之后调用。环境变量检查在函数入口处。

### 所有高级筛选弹窗化 (UI-01)

- **D-UI01-01:** Phase 15 需补齐的 UserRole 浏览器弹窗化范围 = **3 处**：
  1. `OrderPage.jsx` "展开筛选 ▼" 按钮（联级式 chip 过滤）→ Sheet 弹窗
  2. `AdminDishesPage.jsx` "高级筛选" 按钮（Phase 14 已完成，确认即可）
  3. `AdminIngredientsPage.jsx` "高级筛选" 按钮（Phase 14 已完成）
- **D-UI01-02:** 触发按钮位置统一：位于页面顶部（搜索/清空行内或紧邻），不打扰主操作。OrderPage 把现有"展开筛选 ▼" `<Chip>` 元素替换为 `<Button variant="tonal">` 然后打开 Sheet。
- **D-UI01-03:** Sheet 内部 layout 复用现有 `Sheet composite` + footer 双按钮（"清空" + "应用"）。filter 状态保留在 Page 顶层，Sheet 仅提供 UI 容器。
- **D-UI01-04:** 不在范围内的"filter chip"（如 AdminUsersPage 角色 chip、AdminCategoriesPage 类型 chip）**不算"高级筛选"**，无需 Sheet 化。继续作为 inline chip 排列。

### the agent's Discretion

- **版本号数据源**：D-NAV03-01 中"版本号"具体从何处获取 — 推荐复用 `config.yaml` 中 `app.version` 字段（如果存在），否则从 `package.json` 读取。agent 通过环境变量或 fetch API 注入。
- **D-NAV05-05 中间 tab 顺序的"一致逻辑"**：agent 按"使用频率"或"工作流先后"决定中间 tab 顺序。例如：admin 与 chef 都有 `菜品 / 食材`，放在中段相邻位置，能体现"管理任务"语义。
- **D-DATA01-03 随机数种子**：建议使用固定种子（如 `random.seed(42)`），保证 dev 环境每次 8 个菜品状态一致，方便截图对比。
- **8 个菜品的 status 反映**：随机混合 status 字段建议同时影响 `is_visible` — 但 research 阶段需确认后端是否根据 `status` 字段过滤。如 backend 已过滤，agent 决策是否要在测试菜品上同时设置 `dish_chefs.status='published'` 保证 admin 能看到。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 15 — phase goal, success criteria, requirements list (NAV-01..05, BUG-06, DATA-01, UI-01)
- `.planning/REQUIREMENTS.md` §Navigation / UI Components / Bugfixes / Data — full requirement definitions
- `.planning/PROJECT.md` §Current Milestone — v1.3 context
- `.planning/PROJECT.md` §Key Decisions — historical decisions relevant to navigation (D-12, D-SNACK-01, etc.)

### Phase 14 Artifacts (carried forward)
- `.planning/phases/14-ui-bugfix-filter-popup/14-CONTEXT.md` — D-05/D-06 卡片策略, D-08 全局 CSS 重置, D-11 modal border, Sheet component pattern
- `frontend/src/components/composites/Sheet.jsx` — Phase 14 完成的 Sheet 组件
- `frontend/src/components/composites/Modal.jsx` — Modal composite (Sheet 委托)
- `frontend/src/components/composites/Sheet.css` — bottom-sheet 移动端样式

### Header / Sidebar / BottomBar Source
- `frontend/src/components/composites/Header.jsx` — current Header 来源（含 actions prop、avatar dropdown）
- `frontend/src/components/composites/Header.css` — Header 样式
- `frontend/src/components/composites/Sidebar.jsx` — current Sidebar 来源（含 footer 主题切换/退出）
- `frontend/src/components/composites/Sidebar.css` — Sidebar 样式
- `frontend/src/components/composites/BottomBar.jsx` — current BottomBar 来源（chef/admin/user 三组 tabs）
- `frontend/src/components/composites/BottomBar.css` — BottomBar 样式
- `frontend/src/components/composites/Divider.jsx` — Phase 11 完成的 Divider 组件，用于 NAV-02 菜单分隔

### Page Source
- `frontend/src/pages/UserHomePage.jsx` — 移动端首页 quick-action grid 来源，NAV-04 切入点
- `frontend/src/pages/OrderPage.jsx:336-341` — "展开筛选" Chip 位置，UI-01 切入点
- `frontend/src/pages/OrderPage.jsx:30-89, 286-340` — filter 状态、cuisine/region/sort 逻辑
- `frontend/src/pages/AdminDishesPage.jsx:520-561` — admin 菜品高级筛选触发按钮
- `frontend/src/pages/AdminIngredientsPage.jsx:276-284` — admin 食材高级筛选触发按钮
- `frontend/src/pages/ChefDishesPage.jsx:63-118` — chef 菜品筛选状态 + API 参数
- `frontend/src/pages/UserProfilePage.jsx` — "编辑资料" 跳转目标

### Card / Domain Source
- `frontend/src/components/DishCard.jsx` — 菜品卡片，BUG-06 视觉验证目标
- `frontend/src/components/composites/Card.jsx` — Card primitive (footer slot)
- `frontend/src/components/primitives/Card.css` — Card 样式
- `frontend/src/components/primitives/base.css` — MD3 颜色/间距/圆角/动效 tokens

### Backend Source
- `backend/app/initial_data.py` — admin / 分类 / 食材 seed 注入模式（DATA-01 模仿）
- `backend/app/models/dish.py` — Dish 模型 schema (status, is_popular, is_semifinished, image_url, recipe, description 字段)
- `backend/app/models/dish.py:65-75` — DishChef 模型 (admin 创建菜品是否需关联)

### Conventions
- `.planning/codebase/STACK.md` — confirmed stack
- `.planning/codebase/CONVENTIONS.md` §Frontend / Cross-Cutting — JSX 命名、CSS 变量、错误处理

### Design System Tokens
- `frontend/src/components/primitives/base.css` — `--md-color-*`, `--md-spacing-*`, `--md-radius-*`, `--md-motion-*` 全部 MD3 tokens
- `frontend/src/css/styles.css` — global CSS 重置 + 主题切换变量

### State Files
- `.planning/STATE.md` — v1.3 跨 phase 状态、deferred items
- `.planning/phases/15-navigation-restructure-test-data/15-DISCUSS-CHECKPOINT.json` — 本次讨论决策（备份）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Sheet composite** (`composites/Sheet.jsx`): Phase 14 完成的响应式 modal/sheet，wrapper of `<Modal variant="bottom-sheet">`。公开 API: `open`, `onClose`, `title`, `footer`, `children`。Agent 复用不需要新增组件。
- **Modal composite** (`composites/Modal.jsx`): visual variants `centered` (PC) + `bottom-sheet` (mobile)；Outline border 自动应用 (D-11)。
- **Divider composite** (`composites/Divider.jsx`): Phase 11 完成，用于 avatar 菜单内菜单项分隔。
- **Card primitive** (`primitives/Card.jsx`): 含 `image` + `footer` slot，用于 DishCard 视觉验证。
- **useAuth** (`contexts/AuthContext.jsx`): 提供 `user` (含 `role`)、`logout()` 方法。
- **theme utility** (`utils/theme.js`): `theme.getTheme()`, `theme.toggleTheme()`, 已 localStorage 持久化。
- **MD3 design tokens** (`primitives/base.css`): 颜色/间距/圆角/动效全套，无需新建 token。

### Established Patterns

- **CSS Grid + flex column + margin-top: auto** (Phase 14 D-05/D-06): 卡片统一布局模式。菜品/食材/愿望卡片使用同一策略，新增 DATA-01 验证不需要新规则。
- **role 分支 tabs 配置** (BottomBar.jsx:30-58): if-else 角色分支返回 tabs 数组。Phase 15 NAV-05 修改直接在 role 分支内重排。
- **role + menuEntries 数组** (UserHomePage.jsx:12-34): if (chef || admin) push。Phase 15 NAV-04 增加 `菜品管理` + `食材管理` 元素。
- **签约 Field-trigger utility class** (Phase 10 决策): form-input Utility 保留，select 暂存。Phase 15 不涉及新 form 控件。
- **Sheet trigger 模式** (AdminDishesPage.jsx:553-561): `tonal` Button + `onClick={() => setShowAdvFilter(true)}` + Sheet 渲染。

### Integration Points

- **Header 主体修改**: `composites/Header.jsx` 删除 `actions` JSX 渲染 + `header__right` 插入 `theme-toggle IconButton`。
- **Sidebar footer 修改**: `composites/Sidebar.jsx` 删除 footer 主题切换/退出 button，footer 内容改为 `<div className="md-sidebar__version">v{version}</div>`。
- **BottomBar tabs 修改**: `composites/BottomBar.jsx` 三组 tabs 数组重排 + 移除 logout 项 + 加上菜品/食材/愿望等 tab。
- **UserHomePage 修改**: `pages/UserHomePage.jsx` menuEntries 数组扩展 chef/admin 元素。
- **OrderPage 修改**: `pages/OrderPage.jsx` "展开筛选" Chip 替换为 tonal Button + Sheet 包装现有 filter section。
- **Sheet 模式复用**: 三处 (Dishes/Ingredients/Order) 共用 Sheet composite，关键差异仅在 trigger 按钮位置和 Sheet 内 category/state。

### Anti-Patterns to Avoid

- **不要重复创建 Sheet 变体**: 已有 Sheet 组件，UI-01 不需要新建组件。
- **不要新建 HeaderActionBar 容器**: Phase 14 决策用 inline div。
- **不要删 Sidebar 整个 footer div**: 决策保留 + 显示版本号。
- **不要在 AdminUsersPage/AdminCategoriesPage 强行 Sheet 化 chip**: 用户判定它们不是"高级筛选"。

</code_context>

<specifics>
## Specific Ideas

- **"食谱管理"语义修正**: 用户在讨论中明确"食谱管理"就是"菜品管理"。注意后续 phase requirement 文档同步修正。
- **version 字段**: `config.yaml` 后端有 `app.version`，前端可通过 `import.meta.env.VITE_VERSION` 或静态从 `package.json` 读取。Agent 决定数据源，优先 `package.json` 因为前端构建时确定。
- **8 种组合的命名约定**: `[1]..[8]` 前缀方便定位到具体菜品。中文命名示例：`测试菜品 1 (有食谱有介绍有图)` —— agent 决定具体命名。
- **Header 主题切换 IconButton 位置**: 必须在 `header__right` 内部，avatar 左侧。视觉上与 avatar 处于同一 row。

</specifics>

<deferred>
## Deferred Ideas

- **MOTION-05**: MD3 motion duration/easing tokens 完善 — v2 deferred
- **GORD-06**: 访客备注功能 — v2 deferred
- **底部导航栏 Badge 整合**: 未来 phase 优化（当前已实现 `Badge` for chef pending 订单）
- **Sidebar logo 替换为品牌缩写**: 视觉优化项，本 phase 不动

---

*Phase: 15-Navigation Restructure & Test Data*
*Context gathered: 2026-07-29*
