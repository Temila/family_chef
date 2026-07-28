# Roadmap: 家味 · Family Chef

## Milestones

- ✅ **v1.0 访客点菜邀请** — Phases 1-4 (shipped 2026-05-29)
- ✅ **v1.1 菜品愿望单** — Phases 5-7 (shipped 2026-07-24)
- 🚧 **v1.2 MD3 重构** — Phases 8-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 访客点菜邀请 (Phases 1-4) — SHIPPED 2026-05-29</summary>

- [x] Phase 1: Data Foundation (1/1 plans) — completed 2026-05-24
- [x] Phase 2: Backend Core (2/2 plans) — completed 2026-05-25
- [x] Phase 3: Frontend Authenticated (2/2 plans) — completed 2026-05-25
- [x] Phase 4: Frontend Guest (1/1 plan) — completed 2026-05-26

</details>

<details>
<summary>✅ v1.1 菜品愿望单 (Phases 5-7) — SHIPPED 2026-07-24</summary>

- [x] Phase 5: Data Foundation & Wish Lifecycle API (3/3 plans) — completed 2026-07-21
- [x] Phase 6: Notifications Integration (3/3 plans) — completed 2026-07-22
- [x] Phase 7: Wish List Frontend (5/5 plans, incl. 07-04 + 07-05 gap-closure) — completed 2026-07-23

</details>

### 🚧 v1.2 MD3 重构 (Phases 8-12) — IN PROGRESS 2026-07-24

**Milestone Goal:** 将前端重构为严格遵循 Material Design 3 (Material You) 规范——5 级圆角体系 + MD3 配色令牌 + elevation/state layer + 8dp 网格 + Ripple/悬浮动效。仅换皮，保留所有 React 业务逻辑、状态管理、数据请求、JWT 鉴权；后端零改动。

- [x] Phase 8: MD3 Design Token Foundation (3/3 plans) (completed 2026-07-27)
- [x] Phase 9: Motion & State Layers (2/2 plans, 1/2 planned) (completed 2026-07-27)
- [x] Phase 10: Primitive Components (3/3 plans) (completed 2026-07-28)
- [x] Phase 11: Composite & Navigation Components (3/3 plans) (completed 2026-07-28)
- [ ] Phase 12: Page-Level Refactor + 8dp Grid + HUMAN-UAT (0/4 plans)

## Phase Details

### Phase 5: Data Foundation & Wish Lifecycle API

**Goal**: Wish data model, migration, and complete lifecycle API (submit, list, claim, advance, reject) with visibility/permission enforcement — ready for frontend and notifications to consume
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: DATA-06, DATA-07, DATA-08, WISH-01, WISH-02, FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, PERM-01, PERM-02, PERM-03, PERM-04
**Success Criteria** (what must be TRUE):

  1. A registered user can submit a wish (dish name + optional reference URL/note) via API and retrieve their own wish list
  2. A chef can claim a pending wish; the wish becomes "准备中" with that chef as exclusive owner, and concurrent claims are safely rejected (no double-claim)
  3. The claiming chef can advance a wish to "已上架" by linking a published dish, or reject it with a required reason; both terminal transitions lock further user edits
  4. Chefs/admins can list all wishes filtered by status and claiming chef, and a chef can list their own "我的认领"
  5. Visibility and ownership rules are enforced — non-permitted users receive 403/404; users can only edit/cancel their own non-published wishes

**Plans**: 3 plansPlans:
**Wave 1**

- [x] 05-01-PLAN.md — Wish model + Pydantic schemas + Alembic migration (DATA-06, DATA-07)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — WishService + WishPermissionError + 8 lifecycle/permission methods (DATA-08, PERM-01..04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-03-PLAN.md — Wishes router + main.py registration + 22 tests incl. 8 STRIDE security cases (WISH-01/02, FLOW-01..05)

### Phase 6: Notifications Integration

**Goal**: Wish lifecycle events trigger the right notifications — in-app unread badges for submitters and Feishu pushes for chefs
**Depends on**: Phase 5
**Requirements**: NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06
**Success Criteria** (what must be TRUE):

  1. When a wish's status changes (claimed / 准备中 / 已上架 / 已拒绝), the submitter has an unread badge surfaced via API
  2. After the submitter views the wish detail, the unread badge is cleared
  3. When a new wish is submitted, chefs receive a Feishu push notification carrying the wish info
  4. When a submitter edits or cancels a claimed wish, the claiming chef receives a Feishu notification

**Plans**: 3 plansPlans:
**Wave 1**

- [x] 06-01-PLAN.md — Data layer: naive_utc_now helper + APP_URL setting + 2 Wish columns + Alembic batch migration (NOTIF-03/04 foundation)

**Wave 2** *(blocked on Wave 1 completion; 06-02 and 06-03 are parallel — non-overlapping files)*

- [x] 06-02-PLAN.md — Badge API: WishListResponse.has_unread + router compute/clear side-effect + badge lifecycle tests (NOTIF-03/04)
- [x] 06-03-PLAN.md — Feishu + Service + Hooks: send_wish_notification + WishNotificationService + 5 hook wirings + integration tests (NOTIF-03/05/06)

### Phase 7: Wish List Frontend

**Goal**: 注册用户和厨师都能通过移动端友好的 UI 完成各自的愿望单工作流——用户提交/查看/编辑/撤销，厨师认领/推进/关联菜品/拒绝/查看我的认领——共用统一的 WishCard + 状态徽章组件
**Depends on**: Phase 5 (Phase 6 may run in parallel — no UI dependency on notifications)
**Requirements**: WISH-03, WISH-04, UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):

  1. User can submit a wish from a mobile-friendly form (dish name required, optional reference link and note) and browse their own wish list as cards
  2. User can edit a wish's content (name / link / note) while it is not yet "已上架", and the change is reflected immediately in the list
  3. User can cancel (delete) a wish while it is not yet "已上架", with the card disappearing from the list
  4. Wish cards show clear status badges/colors distinguishing 待处理 / 准备中 / 已上架 / 已拒绝 — the same WishCard + status badge component is reused across user list and chef queue
  5. Chef can view the wish queue on mobile with filters by status and claiming chef, and a separate "我的认领" view showing only their claimed wishes
  6. Chef can claim a pending wish (immediately shows as theirs "准备中"), advance it by linking a published dish (→ 已上架), or reject it with a required reason — all from the shared card affordances

**Plans**: 4 plans + 1 gap-closure plan
Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Foundation: ApiClient 8 wish methods (status→status_filter) + statusBadge extension + CSS tokens + ConfirmModal a11y + WishCard + WishFormModal + WishRejectModal + WishAdvanceModal

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — Pages: UserWishesPage (create/edit/cancel/FAB) + ChefWishesPage (tabs/polling/claim/advance/reject) + AdminWishesPage (viewAsAdmin wrapper)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-03-PLAN.md — Integration: App.jsx routes + Sidebar/BottomBar nav entries + Phase-6 /wishes/:id deep-link redirect + ?wish=:id highlight + verification gate

**Gap-closure wave** *(post-verification, H-3 deep-link highlight race)*

- [x] 07-05-PLAN.md — Gap closure: fix deep-link highlight race (fetchedOnce flag + setTimeout(100) in UserWishesPage + ChefWishesPage) + Playwright regression script

**UI hint**: yes

### Phase 8: MD3 Design Token Foundation

**Goal**: 前端设计系统彻底以 MD3 令牌（圆角/配色/elevation/间距/排版/动效）重写——所有 5 级圆角、MD3 配色（含 tonal palette）、5 级阴影、8dp 网格、motion 令牌、深浅色双向覆盖全部就位；foundation 级别的硬编码直角（4px/6px）一次性清除，为后续组件换皮铺路
**Depends on**: Phase 7 (v1.1 complete)
**Requirements**: TOKEN-01, TOKEN-02, TOKEN-03, TOKEN-04, TOKEN-05, TOKEN-06, TOKEN-07, TOKEN-08, TOKEN-09, TOKEN-10, TOKEN-12, TOKEN-13, TOKEN-14, MOTION-04, MOTION-05, UX-02, UX-04, UX-05, LOGIC-01, LOGIC-02, LOGIC-03
**Success Criteria** (what must be TRUE):
  1. 5 级圆角令牌（`--md-radius-xs:8px / sm:12px / md:16px / lg:24px / xl:28px / full:9999px`）在 `:root` 中定义并被现有 components 全平台消费；改一处令牌值即可全平台同步生效（TOKEN-01..05）；**FAB 圆角采用 MD3 标准 16px（Phase 8 讨论调整）**
  2. MD3 完整配色令牌族（Primary/On-Primary/Primary-Container/On-Primary-Container + Secondary/Tertiary + Error + Surface/Surface-Variant/Surface-Container-Lowest..Highest + On-Surface + Outline/Outline-Variant + tonal palette tone 0–100）已替换旧的 60-30-10 自定义色板，浅色 `[data-theme]` 与深色 `[data-theme="dark"]` 双向覆盖完整（TOKEN-06..09、TOKEN-14、UX-04）
  3. 5 级 elevation 阴影令牌（level 0..5）+ 8dp 网格间距令牌（`--md-spacing-1:4px` .. `--md-spacing-8:56px`）已写入 `:root`，所有 foundation 级别的 padding/margin/gap 引用令牌而非裸 px；中英文字体栈（苹方 / Noto Sans SC / Noto Serif SC）作为 `--md-font-*` 令牌就位（TOKEN-10、TOKEN-12、UX-05）
  4. Motion duration / easing 令牌（emphasized `500ms cubic-bezier(0.2,0,0,1)`、standard `250ms cubic-bezier(0.2,0,0,1)` 等）+ MD3 焦点环令牌（`--md-focus-ring-outer:2px var(--md-on-primary)` + `--md-focus-ring-inner:2px var(--md-surface)`）就位，为 Phase 9 消费侧提供基础（TOKEN-12、MOTION-04、MOTION-05、UX-02）
  5. `frontend/src/index.css:102` 与 `frontend/src/App.css:121` 等位置的硬编码 4px / 6px 直角全部清除，替换为对应令牌；并加入 lint / grep 检查防止回归（TOKEN-13）

**Plans**: 3 plans
Plans:
**Wave 1**
- [x] 08-01-PLAN.md — MD3 配色令牌族（Primary/Secondary/Tertiary/Error/Surface/Outline + tonal palette tone 0–100）+ 浅深色双模式覆盖（TOKEN-06..09、TOKEN-14、UX-04）
**Wave 2** *(blocked on Wave 1)*
- [x] 08-02-PLAN.md — 5 级圆角令牌 + 5 级 elevation 阴影令牌 + 8dp 网格间距令牌 + 中英文字体栈令牌（TOKEN-01..05、TOKEN-10、TOKEN-12、UX-05）
**Wave 3** *(blocked on Wave 2)*
- [x] 08-03-PLAN.md — Motion duration/easing 令牌 + MD3 焦点环令牌 + foundation 级别硬编码直角（4px/6px）一次性清除 + lint 防护（TOKEN-13、MOTION-04、MOTION-05、UX-02）

**UI hint**: yes

### Phase 9: Motion & State Layers

**Goal**: 所有可交互面表现 MD3 反馈语义——state-layer（hover/pressed/focused/disabled 8/10/12/38%）+ Ripple 涟漪（pointer 位置感知、双兼容）+ 悬浮 elevation 过渡 + MD3 焦点环应用；为 Phase 10/11 的组件换皮提供"动效消费层"
**Depends on**: Phase 8
**Requirements**: TOKEN-11, MOTION-01, MOTION-02, MOTION-03, MOTION-04, UX-03, LOGIC-01, LOGIC-02, LOGIC-03
**Success Criteria** (what must be TRUE):
  1. MD3 state-layer 工具类/工具样式就位——hover 叠加 8% primary tint、pressed 10%、focused 12%、disabled 38%，可被任何按钮/卡片/列表项/链接消费（TOKEN-11）
  2. 按钮（filled/tonal/outlined/text 4 变体）增加 Ripple 涟漪：从 mousedown/touchstart 落点起算、pointer 位置决定起点、半径自适应元素最大边、touch 与 mouse 双兼容、动画时长符合 MD3 motion duration（≈500ms emphasized）（MOTION-01）
  3. 卡片悬浮时阴影从 elevation-1 → elevation-2 平滑过渡（150–250ms emphasized easing），不抖动；可点击列表项 / 链接的悬浮以 state-layer 颜色叠加而非边框变化表达（MOTION-02、MOTION-03）
  4. MD3 焦点环（2px On-Primary @ 100% 外环 + 2px Surface @ 100% 内环）通过 keyboard tab 出现在所有可交互元素上；不动 mouse 时不闪现（MOTION-04 消费侧）
  5. 所有按钮 / IconButton / FAB / 列表项操作的可点击区 ≥ 48dp（UX-03），通过 DOM 量测或视觉抽检验证

**Plans**: 2 plans
Plans:
**Wave 1**
- [x] 09-01-PLAN.md — State-layer CSS ::before 工具体系 + tokens 扩展 + Ripple.jsx + ripple.css + Icon.jsx 骨架 + 卡片 elevation-1→2 过渡清理 + disabled 统一 + 焦点环拓展 12+ 消费者 + 4 组件 Ripple 包裹 + prefers-reduced-motion（TOKEN-11、MOTION-01..04）
**Wave 2** *(blocked on Wave 1)*
- [x] 09-02-PLAN.md — Playwright 触控目标 ≥48dp 审计脚本 + 全局 CSS min-size 规则 + 7 个极小组件 padding 补偿 + 回归验证（UX-03、LOGIC-01..03）

**UI hint**: yes

### Phase 10: Primitive Components

**Goal**: 原始（primitive）UI 组件——Button（4 变体 × 3 尺寸）、IconButton、Card（3 变体）、Input（2 变体 + 错误态）、FAB（3 变体）、Badge（3 变体）、Chip（4 变体）——作为 MD3 化 React 组件就位，替换现有 `.btn-primary/.btn-secondary/.btn-outline/.btn-icon/.card/.dish-card/.wish-card/.form-input/.fab/.badge/.filter-chip` 的视觉但保持 props 与事件绑定兼容
**Depends on**: Phase 9
**Requirements**: COMPO-01, COMPO-02, COMPO-03, COMPO-04, COMPO-05, COMPO-06, COMPO-07, LOGIC-01, LOGIC-02, LOGIC-03
**Success Criteria** (what must be TRUE):
  1. Button 组件支持 `variant="filled|tonal|outlined|text"` + `size="sm|md|lg"`，替换现有三档 `.btn-*`；保留现有 onClick / disabled / type / children / className 等 props，事件绑定零回归（COMPO-01、LOGIC-03）
  2. IconButton 渲染为 40dp 默认 / 48dp FAB-density 圆形目标；FAB 渲染为 56dp 圆形 + Extended FAB（含 label）+ Small FAB（40dp）三种形态；现有 `.fab` 与 `.btn-icon` 用法可平滑迁移（COMPO-02、COMPO-05）
  3. Card 组件支持 Elevated / Filled / Outlined 三变体，并自动继承 Phase 9 的 elevation-1 → elevation-2 悬浮过渡；现有 `.card` / `.dish-card` / `.wish-card` 视觉升级、JSX 结构与 props 不破坏（COMPO-03）
  4. Input 组件支持 Outlined / Filled 两种变体 + 错误态辅助文本 + MD3 焦点环 + label 浮动；替换 `.form-input`，表单提交 / onChange / 受控行为零回归（COMPO-04）
  5. Badge 组件支持 assist / filter / state 三种变体；Chip 组件支持 assist / filter / input / suggestion 四种变体；现有 `.badge/.badge-count/.filter-chip` 视觉统一为 MD3 风格、语义保留（COMPO-06、COMPO-07）

**Plans**: 3 plans
Plans:
**Wave 1**
- [x] 10-01-PLAN.md — Button 组件（4 variants × 3 sizes）+ IconButton 组件（40dp/48dp）+ FAB 组件（FAB/Extended FAB/Small FAB）+ Ripple 接入（COMPO-01、COMPO-02、COMPO-05）
**Wave 2** *(blocked on Wave 1；10-02 与 10-03 可并行 — 文件集不重叠)*
- [x] 10-02-PLAN.md — Card 组件（Elevated/Filled/Outlined）+ elevation 过渡 + Input 组件（Outlined/Filled + 错误态 + 焦点环）（COMPO-03、COMPO-04）
- [x] 10-03-PLAN.md — Badge 组件（assist/filter/state）+ Chip 组件（assist/filter/input/suggestion）+ 现有 `.badge-count` 计数器场景适配（COMPO-06、COMPO-07）

**UI hint**: yes

### Phase 11: Composite & Navigation Components

**Goal**: 复合 / 导航组件——Modal/Dialog、Navigation Rail（PC 侧栏）、Navigation Bar（手机底部栏）、Snackbar/Toast、List Item（1/2/3-line）、Divider——以 MD3 化 React 组件形态落地；集成到现有 App shell（PcLayout、BottomBar、ToastContext、confirm 系列）中
**Depends on**: Phase 10
**Requirements**: COMPO-08, COMPO-09, COMPO-10, COMPO-11, COMPO-12, LOGIC-01, LOGIC-02, LOGIC-03
**Success Criteria** (what must be TRUE):
  1. Modal 组件支持 Basic 与 Full-screen 两种变体，MD3 24px 圆角 + elevation-3 阴影 + scrim；现有 ConfirmModal / WishFormModal / WishRejectModal / WishAdvanceModal / Guest 端 Modal 全部以新组件为底层实现，props 与关闭/确认事件不变（COMPO-08、LOGIC-03）
  2. Navigation Rail（PC 侧栏 `.pc-sidebar`）渲染 MD3 active-state pill + 80dp 宽度；Navigation Bar（`.bottom-bar`）渲染 80dp 高度 + label 可见 + active indicator；现有 Sidebar / BottomBar 路由激活 / 角色显示 / FAB-in-rail 槽位行为零回归（COMPO-09）
  3. Snackbar 组件（替换 Toast 系统）以 MD3 inverse-surface 卡片呈现，支持 action button / 单条 / 排队 / 自动消失；现有 ToastContext 消费者 API 兼容（success / error / info 等类型保留）（COMPO-10）
  4. List Item 组件支持 1-line / 2-line / 3-line + leading icon / trailing icon / 头像 + 整行可点击；Divider 使用 `--md-outline-variant` 色值并按 surface context 选择 inset（COMPO-11、COMPO-12）

**Plans**: 3 plans
Plans:
**Wave 1**
- [x] 11-01-PLAN.md — Modal/Dialog 组件（Basic/Full-screen）+ elevation-3 + scrim + focus trap + ESC + 22 站点迁移 + styles.css modal-* 删除（COMPO-08）
**Wave 2** *(blocked on Wave 1；11-02 与 11-03 可并行 — 文件集不重叠)*
- [x] 11-02-PLAN.md — Sidebar 240px→80dp + BottomBar MD3 active pill + Sidecar Header 重写 + App.jsx 注入 + styles.css sidebar/bottombar/header 删除（COMPO-09）
- [x] 11-03-PLAN.md — SnackbarContext 重写（queue + rich tone）+ ListItem（1/2/3-line slot-based）+ Divider + 3 ListItem 调用点迁移 + styles.css toast/list-item 删除（COMPO-10、COMPO-11、COMPO-12）

**UI hint**: yes

### Phase 12: Page-Level Refactor + 8dp Grid + HUMAN-UAT

**Goal**: 把所有页面（User / Chef / Admin / Guest）的 padding / margin / gap 强制收敛到 8dp 网格令牌，最终清扫残余硬编码直角；以 HUMAN-UAT 守门，确保业务逻辑零回归——视觉/动效/组件规范全部兑现，且换皮期间无功能事故
**Depends on**: Phase 11
**Requirements**: UX-01, UX-02, TOKEN-13, LOGIC-01, LOGIC-02, LOGIC-03
**Success Criteria** (what must be TRUE):
  1. 所有页面（UserHomePage / ChefQueuePage / AdminDishesPage / UserWishesPage / ChefWishesPage / AdminWishesPage / LoginPage / PreferencesPage / InvitationsPage / GuestMenuPage / GuestConfirmPage / GuestErrorPage）的 padding / margin / gap 全部以 8dp 网格令牌（spacing-1..spacing-8）表达；不存在散乱 px 值（UX-01）
  2. 全代码库（含 components / pages / css）扫不到任何硬编码 4px / 6px 直角；CI grep 检查或 lint 规则拦截新增回归（TOKEN-13 最终关）
  3. 每个页面的所有交互元素（按钮、卡片、输入、列表项、导航项）均已切换为 Phase 10/11 的 MD3 组件；无遗留的 `.btn-primary` / `.btn-secondary` / `.btn-outline` / `.btn-icon` / `.card` / `.dish-card` / `.wish-card` / `.fab` / `.filter-chip` 等旧类被实际消费（UX-02 全平台焦点环应用收尾）
  4. 现有 E2E 流（注册登录、菜品 CRUD、订单创建、愿望单生命周期、访客点菜 5 大流）全部通过，业务逻辑零回归（LOGIC-01、LOGIC-03 验证）
  5. HUMAN-UAT 复检：UAT-1..UAT-5（User / Chef / Admin / Guest × 关键流程）在浏览器实测下视觉符合 MD3 规范且功能无事故——作为 v1.2 milestone 收尾的最终关卡

**Plans**: 4 plans
Plans:
**Wave 1**
- [x] 12-00-BUGFIX-PLAN.md — Ripple 鼠标点击回归修复 + 删除重复 Sidecar Header + Sidebar footer 主题/退出入口（UX-02、LOGIC-01..03）
**Wave 2** *(blocked on Wave 1; 12-01A and 12-01B run in parallel as line-disjoint concern lanes)*
- [ ] 12-01A-PLAN.md — 8dp 网格 spacing sweep + Login/Sidebar/BottomBar radius sweep + stylelint + check:md3 守门（UX-01、UX-02、TOKEN-13、LOGIC-01..03）
- [ ] 12-01B-PLAN.md — 5 个 motion token 消费 + 3 个 Icon 扩展 + 106 emoji 清扫 + Snackbar action + EmptyState API（UX-01、UX-02、TOKEN-13、LOGIC-01..03）
**Wave 3** *(blocked on both 12-01A and 12-01B)*
- [ ] 12-02-PLAN.md — 旧类双端审计 + Playwright MD3 合规扩展 + HUMAN-UAT 6 流最终验收（UX-01、UX-02、TOKEN-13、LOGIC-01..03）

**UI hint**: yes

## Progress

**Execution Order:**
v1.2 phases execute in numeric order: 8 → 9 → 10 → 11 → 12. Phase 8 lays the token foundation (no Phase 9 motion/state-layer can exist without it); Phase 10 primitive components depend on Phase 9's state-layer/ripple/elevation utilities; Phase 11 composite components depend on Phase 10's button/iconbutton/fab/card/input primitives; Phase 12 page-level refactor + HUMAN-UAT gate depends on all previous phases shipping.

v1.0 / v1.1 historical note: v1.0 phases 1–4 (foundation → backend → frontend-auth → frontend-guest) and v1.1 phases 5–7 (data → notifications ∥ frontend-wish) are collapsed above for readability.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Foundation | v1.0 | 1/1 | ✓ Complete | 2026-05-24 |
| 2. Backend Core | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 3. Frontend Authenticated | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 4. Frontend Guest | v1.0 | 1/1 | ✓ Complete | 2026-05-26 |
| 5. Data Foundation & Wish Lifecycle API | v1.1 | 3/3 | Complete   | 2026-07-21 |
| 6. Notifications Integration | v1.1 | 3/3 | Complete   | 2026-07-22 |
| 7. Wish List Frontend | v1.1 | 5/5 | Complete   | 2026-07-23 |
| 8. MD3 Design Token Foundation | v1.2 | 3/3 | Complete   | 2026-07-27 |
| 9. Motion & State Layers | v1.2 | 2/2 | Complete   | 2026-07-27 |
| 10. Primitive Components | v1.2 | 3/3 | Complete   | 2026-07-28 |
| 11. Composite & Navigation Components | v1.2 | 3/3 | Complete   | 2026-07-28 |
| 12. Page-Level Refactor + 8dp Grid + HUMAN-UAT | v1.2 | 1/4 | In Progress|  |
