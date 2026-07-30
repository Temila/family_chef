# Phase 15: Navigation Restructure & Test Data - Research

**Researched:** 2026-07-30
**Domain:** React navigation shell, responsive Sheet filters, FastAPI/SQLAlchemy development seed data, mobile card verification
**Confidence:** HIGH for current code paths; MEDIUM for unresolved product semantics inherited from CONTEXT.md

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

</decisions>

### the agent's Discretion

- **版本号数据源**：D-NAV03-01 中"版本号"具体从何处获取 — 推荐复用 `config.yaml` 中 `app.version` 字段（如果存在），否则从 `package.json` 读取。agent 通过环境变量或 fetch API 注入。
- **D-NAV05-05 中间 tab 顺序的"一致逻辑"**：agent 按"使用频率"或"工作流先后"决定中间 tab 顺序。例如：admin 与 chef 都有 `菜品 / 食材`，放在中段相邻位置，能体现"管理任务"语义。
- **D-DATA01-03 随机数种子**：建议使用固定种子（如 `random.seed(42)`），保证 dev 环境每次 8 个菜品状态一致，方便截图对比。
- **8 个菜品的 status 反映**：随机混合 status 字段建议同时影响 `is_visible` — 但 research 阶段需确认后端是否根据 `status` 字段过滤。如 backend 已过滤，agent 决策是否要在测试菜品上同时设置 `dish_chefs.status='published'` 保证 admin 能看到。

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | md-header 仅保留头像菜单和主题切换，其他按钮移到下方 div | Header 当前 actions 渲染、全部 actions 调用点、建议 action-bar 结构。[VERIFIED: .planning/REQUIREMENTS.md] |
| NAV-02 | 头像下拉仅保留编辑资料和退出登录 | Header 当前菜单项、Divider 可复用模式、UserProfilePage 路由。[VERIFIED: .planning/REQUIREMENTS.md] |
| NAV-03 | Sidebar 移除主题切换和退出登录 | Sidebar 当前 footer 两按钮与版本源缺口。[VERIFIED: .planning/REQUIREMENTS.md] |
| NAV-04 | chef/admin 移动端首页提供菜品管理和食材管理入口 | UserHomePage 与 AdminHomePage 的实际路由/入口差异。[VERIFIED: .planning/REQUIREMENTS.md] |
| NAV-05 | bottom-bar 首页/后台在最左、我的在最右、按角色显示 tab | 当前三组 tabs 与 App.jsx 路由授权矩阵。[VERIFIED: .planning/REQUIREMENTS.md] |
| BUG-06 | 通过组合种子数据验证移动端菜品卡片一致性 | Admin/Chef mobile card 的 stretch、footer、truncate、placeholder 实现审计。[VERIFIED: .planning/REQUIREMENTS.md] |
| DATA-01 | 8 个有/无食谱、介绍、图片组合的开发 seed | initial_data 启动钩子、Dish schema、status/visibility 过滤冲突。[VERIFIED: .planning/REQUIREMENTS.md] |
| UI-01 | 高级筛选统一使用弹出子页面 | Phase 14 Sheet API 与 OrderPage 当前 filter state/markup。[VERIFIED: .planning/REQUIREMENTS.md] |

</phase_requirements>

## Summary

当前实现已经有可直接复用的 `Sheet`、`Modal`、`Divider`、`Card`、主题工具和三组角色导航数组，不需要引入新框架或新 UI 包。[VERIFIED: codebase source — `frontend/src/components/composites/Sheet.jsx:25-63`, `Modal.jsx:31-145`, `Divider.jsx:9-25`, `Card.jsx:17-65`, `utils/index.js:7-37`]

计划的主要风险不是组件缺失，而是现有契约与 Phase 15 决策有三处不一致：主题工具没有 DOM 事件广播；管理员实际使用 `AdminHomePage` 而非 `UserHomePage`；Dish 的 `status`/`DishChef.status` 语义与要求中的 `published`/`draft` 混用。[VERIFIED: codebase source — `frontend/src/utils/index.js:7-37`, `frontend/src/App.jsx:121-225`, `backend/app/models/dish.py:7-75`, `backend/app/services/dish_service.py:72-122`]

**Primary recommendation:** 先把当前 source-of-truth 契约锁定为“Header actions 仍由 Page 提供但由 Header 渲染到 header 下方、Sidebar 只显示版本、BottomBar 只导航、OrderPage 仅移动 filter UI、不移动现有 state”，再把 seed 数据限定为可幂等的开发启动 fixture；在计划中单独放置一个 status 语义 checkpoint，不要用 `DishChef` 关系掩盖 `Dish.status` 的可见性冲突。[VERIFIED: codebase source — findings below]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Header/Sidebar/BottomBar rendering and responsive layout | Browser / Client | — | These are React composites and CSS media-query components; no API or persistence is needed for their normal render path。[VERIFIED: `frontend/src/components/composites/Header.jsx:70-149`, `Sidebar.jsx:74-135`, `BottomBar.jsx:65-95`] |
| Role-specific navigation authorization | Frontend Server (SSR) | Browser / Client | The SPA renders links in Browser/Client, but actual role enforcement is in `ProtectedRoute` and route declarations in `App.jsx`。[VERIFIED: `frontend/src/App.jsx:40-64`, `121-289`] |
| Theme persistence and visual broadcast | Browser / Client | — | `theme` writes `data-theme` and `localStorage`; no server state is involved。[VERIFIED: `frontend/src/utils/index.js:7-37`] |
| Order filter UI state and dish-list request parameters | Browser / Client | API / Backend | `OrderPage` owns filter state and builds API params; `dish_service.list_dishes()` applies the resulting filters。[VERIFIED: `OrderPage.jsx:44-109`, `dish_service.py:49-227`] |
| Development dish fixture creation | Database / Storage | API / Backend | Seed code creates `Dish`, `DishCategory`, and optionally `DishChef` records through the existing async SQLAlchemy session during startup。[VERIFIED: `initial_data.py:401-422`, `main.py:227-245`, `models/dish.py:7-75`] |
| Mobile card geometry | Browser / Client | — | Grid and card CSS determine stretch, truncation, placeholders, and footer alignment; seed data only supplies content combinations.[VERIFIED: `styles.css:290-308`, `Card.css:9-93`, `AdminDishesPage.jsx:697-765`] |

## Project Constraints (from AGENTS.md)

- Continue using FastAPI + React and do not introduce a new framework。[VERIFIED: `AGENTS.md:12-12`]
- Continue using SQLite; schema changes require Alembic. Phase 15 should not add a schema migration because the requested seed fields already map to existing Dish columns except unsupported `is_featured`。[VERIFIED: `AGENTS.md:13-13`; `models/dish.py:7-26`]
- Preserve mobile-friendly behavior because guest and mobile users are primary targets。[VERIFIED: `AGENTS.md:15-15`]
- Keep Chinese user-facing strings, comments, and docstrings; use English technical identifiers。[VERIFIED: `AGENTS.md:211-213`]
- Follow backend async SQLAlchemy/session conventions, service layering, and frontend functional-component/React-context conventions。[VERIFIED: `AGENTS.md:107-165`, `166-208`]
- Backend application configuration comes from YAML rather than `.env`; do not read secret files during this phase。[VERIFIED: `AGENTS.md:214-217`]
- The project instruction says development is on `feature/guest_order`; the current checked-out branch is `feature/ui-rebuild`, so the planner/operator must resolve the branch discrepancy before execution。[VERIFIED: `AGENTS.md:17-17`; `git status --short --branch` on 2026-07-30]
- Do not edit repository files outside a GSD workflow; this research was started with `gsd-sdk query init.phase-op 15` before writing the artifact。[VERIFIED: `AGENTS.md:358-368`; command output]
- No project-defined `.claude/skills/**/SKILL.md` or `.agents/skills/**/SKILL.md` files were found; no extra project skill rules apply。[VERIFIED: project skill glob audit]

## Standard Stack

### Existing stack to reuse

| Library / mechanism | Version or state | Purpose in Phase 15 | Why use it |
|---|---|---|---|
| React | `^19.2.5` | Navigation composites, pages, local state | Already owns all frontend components。[VERIFIED: `frontend/package.json:19-24`] |
| React Router DOM | `^7.15.0` | Existing `navigate`, protected route paths, menu actions | All target routes already exist in `App.jsx`; no new routing package is needed。[VERIFIED: `frontend/package.json:19-24`; `App.jsx:121-289`] |
| FastAPI + SQLAlchemy async | Existing project stack | Startup fixture and existing dish list API | `initial_data.py` and `dish_service.py` already use the project session/model patterns。[VERIFIED: `AGENTS.md:37-47`; source files cited above] |
| Existing `Sheet` composite | Phase 14 source | OrderPage advanced filter container | It delegates to Modal and exposes `open`, `onClose`, `title`, `footer`, `children`。[VERIFIED: `Sheet.jsx:8-23`, `28-63`] |
| Existing `Card` primitive + CSS tokens | Phase 10/14 source | Mobile card verification | Card root/body/footer already implement flex and footer slots。[VERIFIED: `Card.jsx:45-61`, `Card.css:9-93`] |

**Installation:** None. Phase 15 should not add a package; all requested behavior is covered by existing dependencies.[VERIFIED: `frontend/package.json:1-41`; `backend/pyproject.toml` stack from project context]

### Package Legitimacy Audit

Not applicable: no external package installation is recommended for this phase. Do not add a package merely to implement a modal, event bus, seed generator, or responsive navigation; existing project code covers each concern.[VERIFIED: source audit above]

## Validation Architecture

> The current `.planning/config.json` explicitly sets `workflow.nyquist_validation` to `false`, but this section is included because Phase 15 requested a future-proof validation contract.[VERIFIED: `.planning/config.json:19-24`]

### Test Framework

| Property | Value |
|---|---|
| Frontend framework | Playwright `1.62.0` available through the existing `@playwright/test` dependency。[VERIFIED: `frontend/package.json:26-39`; `npx playwright --version`] |
| Frontend config | `frontend/playwright.config.js`；dev server is `npm run dev -- --host 127.0.0.1 --port 4173`。[VERIFIED: `playwright.config.js:3-14`] |
| Backend framework | pytest with async fixtures and in-memory SQLite。[VERIFIED: `backend/tests/conftest.py:12-27`, `31-60`] |
| Quick frontend command | `cd frontend && npx playwright test tests/phase15-navigation.spec.js --grep "Header|BottomBar|Sheet"` |
| Quick backend command | `uv run --project backend pytest backend/tests/test_initial_data.py -q` |
| Full frontend command | `cd frontend && npx playwright test` |
| Full backend command | `uv run --project backend pytest` |
| Build/lint gate | `cd frontend && npm run check:all`；the repository has a known pre-existing full-lint baseline issue, so plans should distinguish new failures from baseline。[VERIFIED: `frontend/package.json:6-17`; `.planning/STATE.md:61-63`] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| NAV-01 | Header main row has theme + avatar on right; Page actions render in a separate `.header-action-bar` below it; all action callsites still work | Playwright + source assertion | `npx playwright test tests/phase15-navigation.spec.js --grep "action bar"` | ❌ Wave 0 |
| NAV-02 | Avatar menu retains identity info and exactly two menuitems, Edit Profile and Logout, with Divider between them | Playwright | `npx playwright test tests/phase15-navigation.spec.js --grep "avatar menu"` | ❌ Wave 0 |
| NAV-03 | Sidebar footer has version text and no theme/logout buttons; logo/nav remain | Playwright | `npx playwright test tests/phase15-navigation.spec.js --grep "Sidebar footer"` | ❌ Wave 0; current Phase 12 test asserts the opposite |
| NAV-04 | Chef and admin mobile home surfaces expose dish and ingredient management without exposing them to ordinary user | Playwright/manual role UAT | `npx playwright test tests/phase15-navigation.spec.js --grep "home entries"` | ❌ Wave 0 |
| NAV-05 | Chef/admin/user tab arrays have the locked counts/order and every path resolves under the existing `ProtectedRoute` matrix | Unit-style source assertion + Playwright | `npx playwright test tests/phase15-navigation.spec.js --grep "bottom tabs"` | ❌ Wave 0 |
| BUG-06 | Seeded content combinations render equal-height mobile cards, clipped text, bottom-aligned action rows, and placeholders | Playwright with dev seed + visual/manual viewport check | `npx playwright test tests/phase15-navigation.spec.js --grep "seeded cards"` | ❌ Wave 0; data fixture also needed |
| DATA-01 | Development guard creates exactly eight idempotent dishes with all 2³ field combinations and correct owner/category relations; production/default mode creates none | pytest integration/unit | `uv run --project backend pytest backend/tests/test_initial_data.py -q` | ❌ Wave 0 |
| UI-01 | OrderPage filter trigger opens Sheet; chips remain controlled by Page state; clear/apply/close preserve intended filter behavior | Playwright + focused source assertion | `npx playwright test tests/phase15-navigation.spec.js --grep "OrderPage filter"` | ❌ Wave 0 |

### Known validation gaps to plan first

- `frontend/tests/phase12-bugfix.spec.js` currently expects two Sidebar footer buttons, including theme and logout; NAV-03 intentionally invalidates those assertions, so update or replace those tests before declaring the frontend suite green。[VERIFIED: `phase12-bugfix.spec.js:88-110`]
- `frontend/tests/md3-compliance.spec.js` currently counts `.md-sidebar__footer button` as touch targets; after the footer becomes version text, that test needs a new footer invariant rather than a button count。[VERIFIED: `md3-compliance.spec.js:104-128`]
- No seed-specific backend test file exists; existing backend tests use fixtures and manually construct `DishChef(status="published")` where visibility is needed。[VERIFIED: backend test glob; `backend/tests/test_guest.py:24-54`, `test_wishes.py:27-55`]
- No phase-specific Header/BottomBar/Sheet integration test exists; current Playwright fixtures are primitive/shell fixtures and do not exercise `OrderPage` filters or all three roles。[VERIFIED: `frontend/tests/*.spec.js`; `phase12-bugfix.jsx:58-77`]

## Findings

### 1. Backend Dish visibility filtering and the three status concepts

**Role is not passed into `DishService.list_dishes()`.** The router authenticates `current_user`, then passes only `user_id`, `status_filter`, `chef_filter`, and filters to the service; there is no role-specific branch in the service itself.[VERIFIED: `backend/app/routers/dishes.py:28-70`; `backend/app/services/dish_service.py:49-65`]

**Default list visibility is a conjunction.** When `status_filter` is omitted, the data query and count query both require `Dish.status == "enabled"`, `Dish.is_semifinished == False`, and an `exists` subquery with `DishChef.status == "published"`.[VERIFIED: `backend/app/services/dish_service.py:72-83`, `228-241`]

```python
if status_filter and status_filter != "all":
    query = query.where(Dish.status == status_filter)
elif not status_filter:
    query = query.where(
        Dish.status == "enabled",
        Dish.is_semifinished == False,
        exists(
            select(DishChef.id).where(
                and_(DishChef.dish_id == Dish.id, DishChef.status == "published")
            )
        ),
    )
```

**`status=all` bypasses both default predicates.** `AdminDishesPage` sends `params.status = "all"`, so the admin list does not require `Dish.status == enabled` or a published `DishChef` row; its admin visibility does not depend on `DishChef`.[VERIFIED: `AdminDishesPage.jsx:140-156`; `dish_service.py:72-83`]

**Chef management sends a different explicit filter.** `ChefDishesPage` sends `status: 'enabled'`; its publish tabs add `chef_filter: 'my-published'` or `'my-hidden'`, so a chef-management seed view requires `Dish.status == enabled` and a row for the current chef. The current `my-hidden` data query checks for absence of a published row, while the count query checks for an explicit hidden row, which is another pre-existing count inconsistency not caused by this phase.[VERIFIED: `ChefDishesPage.jsx:108-127`; `dish_service.py:88-112`, `328-351`]

**`OrderPage` sends no status filter.** It calls `api.getDishes(buildParams(1))` without `status`, so ordinary browsing uses the default `enabled + non-semifinished + published DishChef` filter. `getPublishedChefs()` independently filters response chefs by `publish_status === 'published'` before adding to cart.[VERIFIED: `OrderPage.jsx:83-109`, `136-153`; `dish_service.py:72-83`]

**The model has two independent columns, not an `is_visible` column.** `Dish.status` defaults to `draft` in the ORM model and has `is_popular` and `is_semifinished` as independent booleans; `DishChef.status` defaults to `hidden` and represents per-chef publication. No `is_visible` or `is_featured` column exists in `Dish`.[VERIFIED: `backend/app/models/dish.py:7-26`, `65-75`]

**The current accepted-value contract is internally inconsistent.** `DishCreate.status` defaults to `enabled`, admin creation forcibly sets status to `enabled`, and `update_dish_status()` accepts only `enabled`/`disabled`; however, the list query description mentions `published`, `hidden`, `draft`, `all`, and raw ORM/schema writes can still carry arbitrary strings such as `published` or `draft`.[VERIFIED: `backend/app/schemas/dish.py:6-34`; `backend/app/routers/dishes.py:39-40`, `144-147`; `backend/app/services/dish_service.py:502-521`]

**Planning consequence:** `DishChef` rows are not needed for the `AdminDishesPage` seed preview because that page requests `status=all`; they are needed if the same records must appear in normal `/order` browsing or chef-specific published tabs. Adding `DishChef(status='published')` alone will not make a `Dish.status='draft'` or `'published'` record appear in the default query because that query also requires `Dish.status == 'enabled'`.[VERIFIED: code paths above]

**Additional mismatch:** `DishDetailPage` only renders its add-to-cart bar when `dish.status === 'published'`, while list browsing uses `'enabled'`; a seeded `'published'` record may pass the detail-page cart check but never arrive in normal `/order` results.[VERIFIED: `DishDetailPage.jsx:222-235`; `dish_service.py:72-83`]

### 2. Sheet component reuse, scrolling, and footer behavior

`Sheet` is a thin wrapper around `Modal`, hardcoding `variant="bottom-sheet"` and forwarding `open`, `onClose`, `title`, `footer`, `children`, focus, and accessibility props. It does not own filter state or add another modal implementation.[VERIFIED: `frontend/src/components/composites/Sheet.jsx:8-23`, `28-63`]

```jsx
<Sheet
  open={showAdvFilter}
  onClose={() => setShowAdvFilter(false)}
  title="高级筛选 — 菜品"
  footer={footerNode}
>
  {filterContent}
</Sheet>
```

Phase 14's `AdminDishesPage` invocation uses a tonal Button to set the open state, renders the Sheet conditionally, keeps `advCategoryIds` and `sfFilter` in the Page, and supplies a footer with `清空` and `应用` buttons.[VERIFIED: `frontend/src/pages/AdminDishesPage.jsx:553-607`]

**Scrollable content is already supported.** The modal surface has `max-height: 90vh` and `overflow-y: auto`; the body has `flex: 1` and `overflow-y: auto`; the footer is outside the body, `flex-shrink: 0`, and has a top border. There is no `position: sticky` rule, so the reliable contract is “footer stays outside the scrolling body,” not literal CSS sticky positioning.[VERIFIED: `frontend/src/components/composites/Modal.css:27-40`, `92-107`; `Sheet.css:16-36`]

**OrderPage can replicate the pattern without replacing its confirmation Modal.** It currently imports `Modal` for chef selection and order confirmation, so the plan should add a `Sheet` import and use `Sheet` only for the filter block; existing order Modals remain `Modal`.[VERIFIED: `OrderPage.jsx:7-19`, `581-681`]

### 3. Header `actions` prop call sites

The actual composite is imported through a stable re-export (`components/Header.jsx` → `components/composites/Header.jsx`). The composite currently renders `{actions}` inside `.md-header__right` immediately before the avatar.[VERIFIED: `frontend/src/components/Header.jsx:1-6`; `frontend/src/components/composites/Header.jsx:88-91`]

All current Page-level `Header actions` call sites that must be audited for D-NAV01-01 are:

| File and lines | Current payload | Required planning treatment |
|---|---|---|
| `pages/AdminDishesPage.jsx:524-536` | Existing inline `<div style=...>` containing parse/add buttons | Add `className="header-action-bar"`; preserve button handlers |
| `pages/AdminIngredientsPage.jsx:245-253` | Existing inline `<div style=...>` containing parse/add buttons | Add the action-bar class; preserve handlers |
| `pages/ChefDishesPage.jsx:494-508` | Existing inline `<div style=...>` containing parse/add buttons | Add the action-bar class; preserve handlers |
| `pages/AdminUsersPage.jsx:133-136` | Direct `Button` | Wrap in `<div className="header-action-bar">` |
| `pages/AdminCategoriesPage.jsx:113-116` | Direct `Button` | Wrap in `<div className="header-action-bar">` |
| `pages/OrderDetailPage.jsx:60-62` | Direct back `Button` | Wrap in action bar; do not silently remove the action |
| `pages/DishDetailPage.jsx:128-139` | Direct favorite `IconButton` | Wrap in action bar; preserve favorite behavior |

[VERIFIED: codebase grep for `actions=` and direct reads at each cited range]

The prescribed implementation is to render the main `<header>` first, without `actions` in its right column, then render the passed action node below it. When `actions` is absent, no empty action bar should be emitted.[VERIFIED: D-NAV01-01/02 and current `Header.jsx:70-149`]

### 4. Theme toggle DOM broadcast

No DOM event broadcast currently exists. `theme.toggleTheme()` calls `getTheme()`, writes the `data-theme` attribute and `fc_theme` localStorage key through `setTheme()`, then returns the new theme; it does not call `dispatchEvent`, `CustomEvent`, or any subscription mechanism.[VERIFIED: `frontend/src/utils/index.js:7-37`]

`Sidebar` currently owns `currentTheme` state only to render the footer theme icon and calls `setCurrentTheme(theme.toggleTheme())`; once both footer buttons are removed, that state, `useState` import, `theme` import, `handleToggleTheme`, and `logout` destructuring can be deleted from Sidebar.[VERIFIED: `frontend/src/components/composites/Sidebar.jsx:13-33`, `103-133`]

The new Header theme IconButton needs its own render update because reading `theme.getTheme()` directly is not reactive. Keep a small Header-local `currentTheme` state and set it to the return value from `theme.toggleTheme()`, or add a real event system; the first option is smaller and matches the locked scope.[VERIFIED: `theme` implementation above; React render behavior is an implementation requirement for the new button]

### 5. Seed insertion pattern and startup wiring

`initial_data.py` currently has separate async functions for admin/guest initialization, categories, and ingredients. `create_preset_ingredients()` opens its own `async_session_factory` session, skips when any ingredient exists, inserts rows, commits, and logs.[VERIFIED: `backend/app/initial_data.py:11-57`, `60-171`, `401-422`]

Startup imports and awaits the three functions in order: `create_initial_data()`, `create_preset_categories()`, then `create_preset_ingredients()`.[VERIFIED: `backend/app/main.py:227-245`]

The prescribed insertion point is therefore straightforward: add `create_seed_test_dishes` to the import and call it after `create_preset_ingredients()`. The environment guard must be the first executable decision in that function so production/default startup exits before opening a write session.[VERIFIED: D-DATA01-01/05; `main.py:237-241`]

Recommended implementation shape:

```python
async def create_seed_test_dishes():
    if not (
        os.environ.get("ENVIRONMENT") == "development"
        or os.environ.get("AUTO_SEED_DEMO_DISHES") == "1"
    ):
        return

    async with async_session_factory() as session:
        # find admin, existing [1]..[8] seed names, and preset region categories
        # create only missing fixture rows, then commit once
        ...
```

[VERIFIED: project async-session pattern; the exact function is a recommendation based on `initial_data.py:401-422`]

The seed should be idempotent rather than blindly inserting eight rows on every startup. Use the stable `[1]` … `[8]` name prefix/identifier to detect existing rows, or skip the whole fixture when all eight stable names already exist; partial recovery should be decided explicitly in the plan.[VERIFIED: D-DATA01-02 naming rule; `initial_data.py:63-69`, `401-422` show existing skip-on-existing initialization style]

The existing `Dish` model can store name, description, recipe, image URL, `status`, `is_popular`, `is_semifinished`, and `created_by`, and `DishCategory` can link each seed to a category. It has no `is_featured`; do not add a migration for that optional flag in this UI/data fixture phase.[VERIFIED: `models/dish.py:7-26`, `44-52`; `schemas/dish.py:6-34`]

### 6. BottomBar tab order and route compatibility

Current BottomBar has three role branches. Admin currently has seven entries including logout; chef has five entries with Home fourth; user already has the desired four-entry count/order. Logout is the only tab without a `path` and is handled by `logout()` in the click callback.[VERIFIED: `frontend/src/components/composites/BottomBar.jsx:22-58`, `67-90`]

The locked seven-tab arrays are compatible with the current route declarations:

| Role | Locked path | App route authorization | Result |
|---|---|---|---|
| Chef | `/home` | `requiredRoles={['user', 'chef']}` | Allowed |
| Chef | `/chef/orders` | `['chef', 'admin']` | Allowed |
| Chef | `/chef/dishes` | `['chef']` | Allowed |
| Chef | `/ingredients` | `['admin', 'chef']` | Allowed |
| Chef | `/chef/wishes` | `['chef', 'admin']` | Allowed |
| Chef | `/order` | any authenticated role | Allowed |
| Chef | `/profile` | any authenticated role | Allowed |
| Admin | `/admin`, `/admin/dishes`, `/ingredients`, `/admin/wishes`, `/admin/users`, `/order`, `/profile` | Each is allowed for admin in `App.jsx` | Allowed |
| User | `/home`, `/order`, `/my-wishes`, `/profile` | Each is allowed for user | Allowed |

[VERIFIED: `frontend/src/components/composites/BottomBar.jsx:33-57`; `frontend/src/App.jsx:121-289`]

The implementation should replace only the `tabs` arrays and remove `logout` from the destructured auth values/callback. Preserve `isActive()` prefix matching and the chef pending-order `Badge`.[VERIFIED: `BottomBar.jsx:25-26`, `60-63`, `67-89`]

### 7. OrderPage filter trigger, state, and side effects

The filter state is already Page-owned: `selectedRegion`, `selectedCuisine`, `selectedFilters`, `favoritesOnly`, `sortBy`, and `showFilters` are all `useState` values at the top of `OrderPage`.[VERIFIED: `frontend/src/pages/OrderPage.jsx:44-53`]

The `useEffect` at lines 75-77 reloads dishes whenever the filter values change. There is no URL synchronization and no filter-specific localStorage; the only localStorage access in this page is `fc_cart` for the cart at lines 126-134.[VERIFIED: `OrderPage.jsx:71-81`, `126-134`; codebase grep for `URLSearchParams`/filter state]

The existing inline block at lines 364-441 contains region, dependent cuisine, and `filterTypes` chips. `filteredCuisines` is derived from `selectedRegion`, and selecting a region clears the selected cuisine. The new Sheet should wrap this content without moving those states into the composite.[VERIFIED: `OrderPage.jsx:286-288`, `364-441`]

```jsx
<Button variant="tonal" size="sm" onClick={() => setShowFilters(true)}>
  高级筛选
</Button>

{showFilters && (
  <Sheet
    open
    onClose={() => setShowFilters(false)}
    title="高级筛选"
    footer={/* 清空 + 应用 */}
  >
    {/* existing region/cuisine/filterTypes chips */}
  </Sheet>
)}
```

[VERIFIED: Phase 14 invocation at `AdminDishesPage.jsx:553-607`; target state/markup at `OrderPage.jsx:335-441`]

**Important apply-semantics finding:** because chip setters currently update the state that is in the `loadDishes` effect dependencies, clicking a chip triggers the API reload immediately even while the Sheet is open. A footer `应用` button can therefore close the Sheet, but it cannot be a true deferred-apply button unless the plan introduces draft filter state and committed filter state. The locked instruction says filter state stays Page-owned, so the low-risk recommendation is to preserve current immediate-apply semantics and use `应用` as close/confirm; make deferred apply a user checkpoint if desired.[VERIFIED: `OrderPage.jsx:44-109`; `[ASSUMED]` only if treating “应用” as deferred apply, which the current code does not establish]

A `清空` handler should reset `selectedRegion`, `selectedCuisine`, and `selectedFilters`; `favoritesOnly` and `sortBy` are separate top-level controls and should not be silently reset unless the product decision explicitly defines “all filters.”[VERIFIED: current state separation at `OrderPage.jsx:44-50`; reset behavior is a plan recommendation]

### 8. Card visual verification status

The Phase 14 card structure is substantially present for the admin/chef mobile management cards. The shared `Card` root is already `display:flex; flex-direction:column`, its body is `flex:1`, and its footer is a separate right-aligned flex slot.[VERIFIED: `frontend/src/components/primitives/Card.css:9-16`, `75-93`]

The mobile management list is a CSS Grid whose direct cards stretch by default, and each card has a minimum height. Admin/Chef dish cards use a footer with equal-width action buttons, two-line name clamp, single-line category ellipsis, and a fixed-height chef information row with a transparent placeholder when no published chef exists.[VERIFIED: `frontend/src/css/styles.css:290-308`; `AdminDishesPage.jsx:697-765`; `ChefDishesPage.jsx:680-739`]

WishCard also has the full card-root flex column, `marginTop: 'auto'` footer, right-justified actions, and a `minHeight` secondary-information placeholder.[VERIFIED: `frontend/src/components/WishCard.jsx:146-160`, `194-215`, `246-260`]

AdminIngredients mobile cards have the same footer and explicitly reserve `minHeight: '1.2rem'` for missing aliases; their name and secondary line are clamped/ellipsized.[VERIFIED: `frontend/src/pages/AdminIngredientsPage.jsx:390-452`]

There are two limits to the statement “all four rules are already implemented everywhere.” The reusable `DishCard` has flex/footer and secondary ellipsis but no explicit missing-secondary `minHeight`, and the `OrderPage` inline cards have an ellipsized category line but no explicit mobile `height: 100%` on the grid wrapper; the `height:100%` rule is only present for desktop `.pc-layout .dish-grid`.[VERIFIED: `DishCard.jsx:16-80`; `OrderPage.jsx:448-515`; `styles.css:324-338`]

The admin/chef mobile management cards do not render the seed recipe, description, or image fields in their card body; they render name, categories, status, and chef information. Therefore the 8 seed combinations will prove card geometry and missing-field placeholders on those pages, but they will not by themselves prove that recipe/description/image content is displayed in a card. The image/description/recipe combination is visible on detail surfaces, while OrderPage uses image and category but not recipe/description.[VERIFIED: `AdminDishesPage.jsx:697-765`; `DishDetailPage.jsx:141-220`; `OrderPage.jsx:460-515`]

**Planning consequence:** use `AdminDishesPage` as the deterministic seed-card visual target because it requests `status=all`; separately verify `DishDetailPage` content combinations if the acceptance test requires observing recipe/description/image presence. Do not claim that default `/order` shows the fixture until the status checkpoint in Finding 1 is resolved.[VERIFIED: `AdminDishesPage.jsx:140-156`; status findings above]

### 9. DATA-01 status impact

With the exact locked values `Dish.status ∈ {'published', 'draft'}`, the default dish list will hide every seed row because it requires `Dish.status == 'enabled'` before checking `DishChef.status == 'published'`. This is true even if all eight rows get a published `DishChef` relation.[VERIFIED: `dish_service.py:72-83`; `models/dish.py:16`, `71`]

The admin management list is different: it explicitly sends `status='all'`, and the service’s `status_filter == 'all'` branch does not apply the default enabled/published predicates. Admin can therefore see raw `published`/`draft` fixture rows without `DishChef` rows.[VERIFIED: `AdminDishesPage.jsx:140-156`; `dish_service.py:72-83`]

The requirement and code also disagree on the meaning of “published.” In the ORM/service status update path, `enabled`/`disabled` are Dish-level availability values; `published`/`hidden` are DishChef-level publication values. `DishDetailPage` has a separate stale check for `Dish.status == 'published'`.[VERIFIED: `dish_service.py:502-552`; `DishDetailPage.jsx:222-235`]

**Recommended plan decision:** honor the user’s requested raw seed values only for an admin management-card fixture, create no `DishChef` rows solely to make admin visible, and add a human checkpoint stating that these fixtures are not expected in ordinary `/order` until the product owner resolves the status vocabulary. If the acceptance criterion requires the eight cards in ordinary `/order`, the plan must first change either the seed status values or the list visibility contract; adding only `DishChef` rows is insufficient.[VERIFIED: all code paths above]

## Recommended Architecture

### Source-of-truth file map

| Plan area | Files to touch | Prescriptive implementation |
|---|---|---|
| Header structure | `frontend/src/components/composites/Header.jsx`, `Header.css` | Keep `actions` prop; render the main three-column header without actions, then render the supplied action node below as `.header-action-bar`; add Header-local theme state; insert theme IconButton immediately before avatar. |
| Header callers | `AdminDishesPage.jsx`, `AdminIngredientsPage.jsx`, `ChefDishesPage.jsx`, `AdminUsersPage.jsx`, `AdminCategoriesPage.jsx`, `OrderDetailPage.jsx`, `DishDetailPage.jsx` | Ensure every `Header actions` payload is a `<div className="header-action-bar">`; do not remove existing handlers. |
| Avatar menu | `Header.jsx`, `Header.css` | Keep identity info; use only Edit Profile and Logout menuitems; call `navigate('/profile')` for edit; import/use existing `Divider` between the two actions; keep logout only here. |
| Sidebar | `Sidebar.jsx`, `Sidebar.css` | Keep logo/nav/footer; delete theme/logout state and controls; render a version text node. Prefer a build-time frontend version source, but resolve the `config.yaml` `0.1.0` vs `frontend/package.json` `0.0.0` mismatch before locking the display value.[VERIFIED: `config.yaml:8-11`; `frontend/package.json:1-5`] |
| Bottom navigation | `BottomBar.jsx` | Replace role arrays with the locked Chef 7/Admin 7/User 4 arrays; remove `logout` destructuring and action branch; preserve badge and active-prefix logic. |
| Mobile home entries | `UserHomePage.jsx`, `AdminHomePage.jsx` | Add chef dish/ingredient quick actions to `UserHomePage`; audit `AdminHomePage` separately because `/admin` renders `AdminHomePage`, not `UserHomePage`. Its existing quick actions already include dish and ingredient management, so avoid duplicating a second admin workbench unless the UI decision requires the locked five-item common menu. |
| Order Sheet | `OrderPage.jsx` | Add `Sheet` import; replace only the `showFilters` Chip/inline filter block with a tonal Button + Sheet; keep all filter state and setters in Page; use existing `Sheet` footer layout; leave order confirmation and chef picker as `Modal`. |
| Seed fixture | `backend/app/initial_data.py`, `backend/app/main.py` | Add guarded, deterministic, idempotent `create_seed_test_dishes()` after preset ingredients; look up existing admin and preset categories; create 8 Dish + DishCategory records; omit `DishIngredient`; do not add unsupported `is_featured` schema. |
| Regression tests | `frontend/tests/phase15-navigation.spec.js` (new), `frontend/tests/phase12-bugfix.spec.js`, `frontend/tests/md3-compliance.spec.js`, `backend/tests/test_initial_data.py` (new) | Replace stale Sidebar-button assertions, add role/navigation/Sheet tests, and cover guard/idempotency/status relations in backend tests. |

[VERIFIED: current source files and route/data findings above]

### Recommended wave structure

**Wave 0 — Contract and test migration.** Update the stale Phase 12 fixture/test expectations for the new Sidebar footer, define the role fixtures needed for Header/BottomBar, and add the seed test harness. Resolve the status vocabulary and version-source checkpoints before implementation is considered locked.[VERIFIED: current test/source findings above]

**Wave 1 — Header/Sidebar shell.** Implement Header action-bar rendering, Header theme IconButton/local state, avatar menu reduction/Divider, Sidebar footer version, and all seven action call-site wrappers. Run targeted shell tests before changing navigation arrays.[VERIFIED: D-NAV01/02/03; source map above]

**Wave 2 — Role navigation and home surfaces.** Implement BottomBar arrays and remove logout. Add chef quick actions to `UserHomePage`; verify existing admin quick actions on `AdminHomePage` rather than assuming the shared page is used for admin.[VERIFIED: `App.jsx:121-225`; `UserHomePage.jsx:8-59`; `AdminHomePage.jsx:17-188`]

**Wave 3 — OrderPage Sheet.** Copy the proven Phase 14 Sheet invocation shape, preserving Page-owned filter state and all existing dependent cuisine/reset logic. Add a focused long-content test to confirm the body scrolls while the footer remains visible.[VERIFIED: `AdminDishesPage.jsx:553-607`; `Modal.css:92-107`; `OrderPage.jsx:364-441`]

**Wave 4 — Development seed and card verification.** Add the guarded/idempotent seed, then run the app with `ENVIRONMENT=development` or `AUTO_SEED_DEMO_DISHES=1`; inspect the eight rows in AdminDishes mobile cards and detail pages. Keep production/default startup tests negative.[VERIFIED: `main.py:227-245`; `initial_data.py:401-422`; findings 1/8/9]

### Architecture diagram

```text
Authenticated browser
        │
        ├── Header main row ── theme.toggleTheme() ──> document[data-theme] + localStorage
        │        ├── theme IconButton
        │        └── avatar ──> { Edit Profile | Divider | Logout }
        │
        ├── Page-provided actions ──> .header-action-bar below Header
        │
        ├── Sidebar (desktop) ──> role nav + version text
        │
        └── BottomBar (mobile)
                 └── role-specific ordered paths

OrderPage
   search / favorites / sort + tonal filter trigger
        │
        └── Sheet
             ├── Page-owned region/cuisine/chip state
             └── footer: 清空 | 应用/关闭
                    │
                    └── existing loadDishes effect ──> GET /api/dishes

Startup
   FastAPI startup ──> initial admin/categories/ingredients
                    └── dev guard ──> 8 Dish records + category links
                                      └── AdminDishes status=all mobile cards
```

[VERIFIED: data flow follows the cited current components/services; seed branch is the recommended design]

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Responsive modal/sheet behavior | A second OrderPage-specific overlay, focus trap, scroll lock, or ESC handler | Existing `Sheet` → `Modal` composite | `Modal` already owns focus return/trap, ESC, scroll lock, slots, and scrim; Sheet already hardcodes responsive behavior。[VERIFIED: `Modal.jsx:27-145`; `Sheet.jsx:25-63`] |
| Menu separator | A custom border/divider with new semantics | Existing `Divider` composite | Divider already renders semantic `hr[role="separator"]` and is the locked Phase 11 asset。[VERIFIED: `Divider.jsx:9-25`] |
| Theme persistence/event bus | A new global state library or ad-hoc window event for this phase | Existing `theme` utility + Header-local state | Utility already persists theme; Sidebar no longer needs reactive theme state after its buttons are removed。[VERIFIED: `utils/index.js:7-37`; `Sidebar.jsx:28-33`] |
| Card equal-height/footer mechanics | A seed-specific CSS hack or per-card absolute-positioned buttons | Existing Card flex/body/footer plus mobile grid stretch | Card primitive and Phase 14 card consumers already provide the correct layout primitives.[VERIFIED: `Card.css:9-93`; `styles.css:290-308`] |
| Seed randomization | A new data-generation package | Python stdlib `random.Random(42)` or a fixed explicit matrix | No package is required; fixed state output is necessary for repeatable screenshots. The fixed seed is a user-discretion recommendation, not an existing project contract。[VERIFIED: no new dependency in `package.json`; D-DATA01 discretion]
| Role security | Client-only hiding as authorization | Existing `ProtectedRoute` role checks | BottomBar links are presentation; App route guards remain the security boundary。[VERIFIED: `App.jsx:40-64`, `121-289`] |

## Risks & Mitigations

### Risk 1 — Status vocabulary makes seed data disappear from the intended screen

**What goes wrong:** `published`/`draft` seed rows are excluded from default `/order` because the service requires `enabled` plus a published `DishChef`.[VERIFIED: `dish_service.py:72-83`]

**Mitigation:** Make the AdminDishes `status=all` management-card surface the explicit seed verification target, add no misleading DishChef rows solely for admin visibility, and gate any request to show them in `/order` behind a human status-vocabulary decision.[VERIFIED: `AdminDishesPage.jsx:140-156`]

### Risk 2 — Admin home is the wrong page for the planned edit

**What goes wrong:** Adding five entries only to `UserHomePage` will not change the admin `/admin` home because `App.jsx` maps `/admin` to `AdminHomePage` and maps `/home` only to user/chef roles.[VERIFIED: `App.jsx:121-129`, `195-200`; `AdminHomePage.jsx:17-20`]

**Mitigation:** Plan an explicit admin-home audit. Existing `AdminHomePage.quickActions` already contains `菜品管理` and `食材管理`, so verify rather than duplicate; implement only the missing chef path unless the locked visual design requires the common grid.[VERIFIED: `AdminHomePage.jsx:61-73`]

### Risk 3 — Existing regression tests assert removed controls

**What goes wrong:** Phase 12 Playwright tests will fail after removing Sidebar theme/logout, and MD3 touch tests may fail because the footer no longer contains buttons.[VERIFIED: `phase12-bugfix.spec.js:88-110`; `md3-compliance.spec.js:104-128`]

**Mitigation:** Treat test migration as Wave 0, replacing those assertions with “version text/no action buttons” and preserving the global touch-target checks for actual interactive elements.[VERIFIED: tests cited above]

### Risk 4 — Theme icon becomes stale

**What goes wrong:** `theme.toggleTheme()` changes DOM/localStorage but does not broadcast an event; a Header icon derived only from `theme.getTheme()` will not necessarily rerender.[VERIFIED: `utils/index.js:17-31`]

**Mitigation:** Keep Header-local `currentTheme` state and update it from `theme.toggleTheme()`; remove Sidebar theme state after its controls are deleted.[VERIFIED: React component state locations cited above]

### Risk 5 — Header action migration silently drops actions on less obvious pages

**What goes wrong:** Direct `Button`/`IconButton` payloads in AdminUsers, AdminCategories, OrderDetail, and DishDetail are not visually separated if only the existing multi-button div callsites are updated.[VERIFIED: actions callsite table above]

**Mitigation:** Add a source audit asserting every `Header actions` prop is a `.header-action-bar` wrapper, then exercise at least one direct-action page and one multi-action page in Playwright.[VERIFIED: current grep inventory]

### Risk 6 — Sheet footer is mistaken for a deferred Apply transaction

**What goes wrong:** Current chip setters immediately trigger `loadDishes`; users may expect “应用” to be the first point at which a request occurs.[VERIFIED: `OrderPage.jsx:71-109`]

**Mitigation:** Preserve immediate behavior for this phase, label the footer action as close/confirm in the plan, or stop and obtain a decision before introducing draft/committed filter state.[VERIFIED: D-UI01-03 plus current effect dependencies]

### Risk 7 — Version source displays the wrong release

**What goes wrong:** The backend config currently says `0.1.0`, while `frontend/package.json` currently says `0.0.0`; blindly reading either source may display a misleading version.[VERIFIED: `config.yaml:8-11`; `frontend/package.json:1-5`]

**Mitigation:** Choose one source in the plan and add an explicit alignment task or health endpoint contract. Do not attempt to import YAML into the browser without an existing YAML build dependency.[VERIFIED: current config/build files; no YAML package in `frontend/package.json`]

### Risk 8 — Dirty branch/worktree causes incorrect phase assumptions

**What goes wrong:** The current branch is `feature/ui-rebuild`, the AGENTS branch instruction says `feature/guest_order`, and the worktree contains uncommitted Phase 14/source and planning changes.[VERIFIED: `git status --short --branch`; `AGENTS.md:17`]

**Mitigation:** Do not reset or overwrite worktree changes during planning. The executor should confirm branch and intended baseline before applying Phase 15 plans.[VERIFIED: GSD workflow constraint and git status]

## Open Questions

1. **Which status vocabulary is authoritative for DATA-01?**
   - What we know: `Dish.status` list visibility requires `enabled`; admin update accepts `enabled`/`disabled`; `DishChef.status` uses `published`/`hidden`; the locked seed decision requires `published`/`draft`.[VERIFIED: `models/dish.py:16`, `71`; `dish_service.py:72-83`, `502-552`; CONTEXT D-DATA01-03]
   - What is unclear: whether the seed is intended only for AdminDishes management-card screenshots or must appear in ordinary `/order`/detail add-to-cart flows.
   - Recommendation: make AdminDishes `status=all` the default visual target and require a human checkpoint before changing seed values or list semantics for `/order`.[VERIFIED: `AdminDishesPage.jsx:140-156`]

2. **Does NAV-04 require a new admin quick-action grid?**
   - What we know: `/admin` renders `AdminHomePage`, whose existing quickActions already include dish and ingredient management; `UserHomePage` is not the admin route.[VERIFIED: `App.jsx:121-129`, `195-200`; `AdminHomePage.jsx:61-73`]
   - What is unclear: D-NAV04-04 says admin has 4 menu entries but lists five items, and the requirement text still uses the ambiguous “食谱管理” wording.
   - Recommendation: preserve the explicit corrected label `菜品管理`, audit existing AdminHomePage as satisfying the two admin entries, and implement the missing chef entries unless the product owner explicitly wants a redesigned admin grid.[VERIFIED: CONTEXT D-NAV04-01/02/04]

3. **What is the final version display source?**
   - What we know: backend `config.yaml`/`Settings.APP_VERSION` is `0.1.0`; frontend package version is `0.0.0`; no current health version field exists.[VERIFIED: `config.yaml:8-11`; `backend/app/config.py:29-38`; `frontend/package.json:1-5`; `main.py:259-262`]
   - What is unclear: whether to align package metadata, add a health version field/fetch, or use a build-time environment value.
   - Recommendation: use one build-time source with an explicit alignment task; do not leave a hardcoded divergent literal in Sidebar.[VERIFIED: current source audit]

4. **Should Sheet “应用” defer network reload?**
   - What we know: current filter state updates trigger the API effect immediately.[VERIFIED: `OrderPage.jsx:71-109`]
   - What is unclear: whether the footer is merely a close/confirm affordance or a transaction boundary.
   - Recommendation: preserve current behavior unless product explicitly requests draft state; otherwise a second filter state model expands UI-01 beyond a container migration.[VERIFIED: current behavior and D-UI01-03]

5. **Should seeded `is_featured` be added?**
   - What we know: frontend `DishCard` reads `dish.is_featured`, but backend `Dish`, `DishCreate`, and `DishUpdate` have no `is_featured` field.[VERIFIED: `DishCard.jsx:46-49`; `models/dish.py:7-26`; `schemas/dish.py:6-34`]
   - What is unclear: whether this stale frontend field is intended for a future schema phase.
   - Recommendation: do not add a migration in Phase 15; omit the field because D-DATA01 explicitly says “if backend supports.”[VERIFIED: current model/schema and locked decision]

6. **Which project branch should execute Phase 15?**
   - What we know: AGENTS says `feature/guest_order`; current checkout is `feature/ui-rebuild`.[VERIFIED: `AGENTS.md:17`; git status output]
   - What is unclear: whether the instruction is historical and the current milestone intentionally continues on `feature/ui-rebuild`.
   - Recommendation: add a pre-execution human confirmation, not a code task.[VERIFIED: workflow risk]

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | Vite/React build and Playwright dev server | ✓ | v26.1.0 (project target is Node 22) | Use project Docker Node 22 if compatibility appears |
| npm / npx | Frontend scripts and Playwright | ✓ | npm 11.13.0 / npx 11.13.0 | — |
| frontend/node_modules | Existing React/Vite/Playwright dependencies | ✓ | Present | `npm install` only if lockfile state requires it |
| Python | Backend tests/seed code | ✓ | Python 3.12.3 (project requires 3.11+) | Use backend virtual environment |
| uv | Backend dependency runner | ✓ | uv 0.6.0 | Use existing backend environment only if uv unavailable |
| backend/.venv | Backend runtime | ✓ | Present | — |
| Playwright browsers | Frontend browser validation | ✓* | Playwright CLI 1.62.0; browser launch should be confirmed in Wave 0 | Install browser binaries only if the executor’s environment lacks them |
| Docker | Optional full-stack runtime | ✓ | 27.0.3 | Run bare-metal backend/frontend commands |

[VERIFIED: command availability audit on 2026-07-30; project versions from `STACK.md` and package/config files]

**Missing dependencies with no fallback:** None identified.[VERIFIED: availability audit]

**Missing dependencies with fallback:** None identified; Node 26 differs from the documented Node 22 target, so use Docker Node 22 if Vite/Playwright compatibility fails.[VERIFIED: availability audit and `STACK.md:19-28`]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control for this phase |
|---|---|---|
| V2 Authentication | yes, regression-sensitive | Do not move logout out of the authenticated Header menu; keep `AuthContext.logout()` and protected routes unchanged。[VERIFIED: `Header.jsx:49-52`, `App.jsx:40-64`] |
| V3 Session Management | yes, regression-sensitive | Header logout must use the existing logout path; no new token or storage mechanism。[VERIFIED: current Header logout at `Header.jsx:131-142`; `AuthContext` project pattern] |
| V4 Access Control | yes | BottomBar visibility is convenience only; retain `ProtectedRoute` role checks for every target path。[VERIFIED: `App.jsx:40-64`, `121-289`] |
| V5 Input Validation | low | Seed values are developer-authored constants; do not expose a public seed endpoint or accept seed names from users。[VERIFIED: phase scope and existing startup pattern] |
| V6 Cryptography | no new control | No tokens, passwords, encryption, or cryptographic code changes are needed.[VERIFIED: phase file map]

### Known threat patterns

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| Accidental production demo data | Tampering / Information disclosure | Guard before session writes; require exact development env or explicit opt-in; test default/production path creates zero seed rows。[VERIFIED: D-DATA01-01 and startup flow] |
| Client-only role hiding mistaken for authorization | Elevation of privilege | Keep existing role-protected routes; test direct navigation to `/admin/*`, `/chef/*`, and `/ingredients` as each role。[VERIFIED: `App.jsx:40-64`, `121-289`] |
| Logout action lost during Header/Sidebar relocation | Session management failure | Add a browser test that invokes Header avatar → 退出 and verifies auth state/redirect。[VERIFIED: current Header logout path `Header.jsx:131-142`] |
| Publicly exposed seed trigger | Information disclosure | Use startup environment variables only; do not add an unauthenticated HTTP seed route.[VERIFIED: recommended architecture]

## Sources

### Primary — HIGH confidence

- `.planning/phases/15-navigation-restructure-test-data/15-CONTEXT.md` — locked decisions, discretion areas, phase boundary, and deferred ideas.
- `.planning/REQUIREMENTS.md` — NAV-01..05, BUG-06, DATA-01, UI-01 definitions and traceability.
- `.planning/ROADMAP.md` — Phase 15 goal, dependencies, and success criteria.
- `frontend/src/components/composites/Header.jsx` / `Header.css` — current Header actions/menu/theme integration.
- `frontend/src/components/composites/Sidebar.jsx` / `Sidebar.css` — current footer controls and layout.
- `frontend/src/components/composites/BottomBar.jsx` / `BottomBar.css` — current role arrays and responsive navigation.
- `frontend/src/components/composites/Sheet.jsx` / `Sheet.css` / `Modal.jsx` / `Modal.css` — Phase 14 Sheet API, scrolling, footer, focus, and scrim behavior.
- `frontend/src/utils/index.js` — theme persistence and absence of event broadcast.
- `frontend/src/pages/OrderPage.jsx` — filter state, request effect, trigger, and inline filter block.
- `backend/app/initial_data.py` / `backend/app/main.py` — startup seed insertion pattern and call order.
- `backend/app/models/dish.py` / `schemas/dish.py` / `services/dish_service.py` / `routers/dishes.py` — Dish/DishChef fields and visibility predicates.
- `frontend/src/pages/AdminDishesPage.jsx`, `ChefDishesPage.jsx`, `AdminIngredientsPage.jsx`, `WishCard.jsx`, `DishCard.jsx`, `Card.jsx`/`Card.css` — card layout and visual-rule audit.
- `frontend/src/App.jsx`, `UserHomePage.jsx`, `AdminHomePage.jsx` — route/role matrix and actual home surfaces.
- `frontend/tests/*.spec.js`, `playwright.config.js`, `backend/tests/conftest.py` — existing validation infrastructure and stale assertions.

### Secondary — MEDIUM confidence

- None used. This phase’s findings were codebase/planning-document research rather than ecosystem discovery.[VERIFIED: tool strategy execution]

### Tertiary — LOW confidence

- None. No unverified WebSearch or training-only library claims were used.

## Assumptions Log

> All implementation facts in this report were verified against the current repository or copied as user constraints. Recommendations that remain unresolved are listed as Open Questions rather than presented as facts.

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| — | None | — | — |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing package/config/source files were inspected; no new package recommendation。[VERIFIED: `frontend/package.json`, project stack files]
- Architecture: HIGH — all target composites, pages, routes, seed hooks, models, and service predicates were read directly。[VERIFIED: source citations throughout]
- Pitfalls: HIGH for current code behavior; MEDIUM for product intent where CONTEXT status/version/home-count decisions contradict current code。[VERIFIED: findings and open questions]

**Research date:** 2026-07-30
**Valid until:** 2026-08-06 for this fast-moving uncommitted working tree; re-check source files if Phase 14 changes are committed or branch is switched.[VERIFIED: git status and project state]
