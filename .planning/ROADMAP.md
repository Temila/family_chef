# Roadmap: 家味 · Family Chef

## Milestones

- ✅ **v1.0 访客点菜邀请** — Phases 1-4 (shipped 2026-05-29)
- ✅ **v1.1 菜品愿望单** — Phases 5-7 (shipped 2026-07-24)
- ✅ **v1.2 MD3 重构** — Phases 8-13 (shipped 2026-07-29)
- ✅ **v1.3 Bugfix + UI Refinements** — Phases 14-15 (shipped 2026-07-30)
- ✅ **v1.4 Tech Debt Cleanup** — Phase 16 (shipped 2026-07-30)
- 🚧 **v1.5 自定义网站皮肤 / Theme Customization** — Phases 17-18 (in progress)

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
- [x] Phase 7: Wish List Frontend (5/5 plans) — completed 2026-07-23

</details>

<details>
<summary>✅ v1.2 MD3 重构 (Phases 8-13) — SHIPPED 2026-07-29</summary>

- [x] Phase 8: MD3 Design Token Foundation (3/3 plans) — completed 2026-07-27
- [x] Phase 9: Motion & State Layers (2/2 plans) — completed 2026-07-27
- [x] Phase 10: Primitive Components (3/3 plans) — completed 2026-07-28
- [x] Phase 11: Composite & Navigation Components (3/3 plans) — completed 2026-07-28
- [x] Phase 12: Page-Level Refactor + 8dp Grid + HUMAN-UAT (4/4 plans) — completed 2026-07-29
- [x] Phase 13: Bugfix Sweep (3 plans) — completed 2026-07-29

</details>

<details>
<summary>✅ v1.3 Bugfix + UI Refinements (Phases 14-15) — SHIPPED 2026-07-30</summary>

- [x] **Phase 14: UI Bugfix & Filter Popup** — 修复所有已知 CSS/布局缺陷：底部导航栏、表格、愿望单卡片、深色模式对比度等；高级筛选改为弹出子页面 — 7 plans (completed 2026-07-29)
- [x] **Phase 15: Navigation Restructure & Test Data** — 重组导航组件：精简 md-header/md-sidebar，统一 avatar 下拉菜单，厨师首页入口；创建测试 seed 数据 — 6 plans (completed 2026-07-30)

</details>

<details>
<summary>✅ v1.4 Tech Debt Cleanup (Phase 16) — SHIPPED 2026-07-30</summary>

- [x] **Phase 16: Tech Debt Cleanup** — 修复全部 10 项积累的 tech debt：CORS 确认已修复；快速修复（::before 确认、app.url、migration batch、IN-01 encodeURIComponent）；中等修复（版本号 config.yaml 源、auto_migrate、IN-04 actingId）；以及两个大项（108 个测试修复、101 个 lint error 修复） — 4 plans (completed 2026-07-30)

**Requirements**: TD-01 ~ TD-10 (all 10/10 satisfied)

</details>

---

### 🚧 v1.5 自定义网站皮肤 / Theme Customization (In Progress)

**Milestone Goal:** 让用户能够自定义网站配色（MD3 色彩令牌），选择预设或创建无限自定义皮肤，并支持按季节自动切换。运行时用户驱动的 MD3 动态着色，叠加在现有 code-generated token 系统之上。压缩为 2 个阶段交付——Phase 17 一次性构建 apply 引擎 + /theme 页面 + 预设 + 后端持久化，Phase 18 交付自定义编辑器与季节自动切换。

- [x] **Phase 17: Theme System Foundation — Engine, Page, Presets & Persistence** - theme-engine 派生 + FOUC 防护 + 生成式 `<style>` 应用层 + ThemeContext + 深色/elevation 跟随 + /theme 卡片页 + 5 预设 + CustomTheme 模型/迁移/JWT CRUD + 跨设备对账 + hex-lint — 6 plans (completed 2026-08-04, all 7 ROADMAP success criteria verified end-to-end via 17-06)
- [x] **Phase 18: Custom Editor & Seasonal Auto-Switch** - react-colorful 种子色编辑器 + 9 种 MD3 变体 + 实时预览直写 DOM + 增删改自定义 theme + 季节解析 + 自动切换开关 + 半球 + 手动挂起 override (completed 2026-08-05)
- [ ] **Phase 19: Account-Bound Theme Preferences** - 将 Phase 18 中 localStorage 存储的主题偏好（活动主题、季节开关、半球、季节→主题映射）迁移为账号绑定（后端为真相源）；localStorage 保留为 FOUC 首帧缓存层。fc_theme (legacy light/dark) 不迁移

## Phase Details

### Phase 17: Theme System Foundation — Engine, Page, Presets & Persistence

**Goal**: 一个完整可用的 theme 系统——用户在 /theme 页面浏览 5 个预设并以卡片即时预览，一键应用并持久化到 localStorage，自定义 theme 跨设备同步（DB 为真相源），apply 层无 FOUC 且与明暗切换正交。本阶段构建所有下游消费的基础：theme-engine.js（派生 + 应用）、FOUC bootstrap、ThemeContext、/theme 卡片页（卡片即预览）、5 个预设、header 入口按钮、后端 CustomTheme 模型 + 迁移 + CRUD API + 跨设备同步。/theme 页面同时渲染自定义 theme 的展示槽位（display-ready），但创建/编辑自定义 theme 在 Phase 18 交付。
**Depends on**: Nothing (first phase of v1.5)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, TPAGE-01, TPAGE-02, TPAGE-03, TPAGE-04, TPAGE-05, TPAGE-06, TPAGE-07, SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):

  1. 当 localStorage 中已持久化一个非默认 theme 时，冷加载刷新后首帧即为该 theme，无默认绿色闪烁（在 DevTools 4× CPU throttle 下验证 FOUC-free）
  2. 自定义 theme 活动时，点击 header 现有明暗切换按钮，所有 MD3 表面正确重新着色（无苍白-on-暗或回退默认绿）——零 JS 重应用，纯 CSS 级联（生成式 `<style id="fc-dynamic-theme">` 携带独立 `:root`/`[data-theme="dark"]` 分块）
  3. 深色模式下 elevation 阴影与 surface-tint 跟随自定义配色（不再使用硬编码 rgba(0,0,0,X)）；ThemeContext 在 mount/theme 切换时应用 theme，value 被 memoized
  4. 用户可点击 header 入口按钮（位于主题切换与头像之间）跳转 /theme 页面；页面以卡片网格展示所有 theme，移动端优先响应式，每张卡片渲染该 theme 的忠实实时 mini-UI 预览（button + card + chip + surface ramp，CSS 变量作用域到卡片）
  5. /theme 展示 5 个预设（当前配色 + 春/夏/秋/冬）；点击任意卡片即全应用并持久化到 localStorage；当前活动 theme 卡片显示选中指示；预设可编辑（改色）但不可删除，5 个预设条目始终存在
  6. 用户的自定义 theme 保存到后端 DB（CustomTheme 模型 + Alembic 迁移，JWT 鉴权 per-user 归属），完整登出/登录后仍然存在；跨设备同步（DB 为真相源，localStorage 缓存活动选择，mount 时按 updatedAt 对账）；保存失败弹 toast 不静默吞掉；每个用户仅能查看自己的 theme
  7. CI hex-lint 门禁在任何组件 CSS 重新引入硬编码十六进制色时失败（维持 0 匹配不变量）

**Plans**: TBD

> 研究标记 LOW：现有 `theme` util + `generate-tokens.cjs` 提供 apply 层模板，`favorites.py` 提供精确的 per-user CRUD 模板。仅需一个小的 MCU 运行时导入 spike（确认 v0.4.0 经 Vite 打包后在浏览器可用）。
> 开放产品决策（discuss 阶段）：(a) header 入口按钮图标待确认（PROJECT.md 标注 TBD）；(b) "预设可编辑不可删除" 的精确语义（编辑是覆写预设种子色还是另存为自定义）。
**UI hint**: yes

### Phase 18: Custom Editor & Seasonal Auto-Switch

**Goal**: 用户通过实时颜色编辑器（种子色驱动，WCAG AA 由 MD3 引擎保证，9 种 MD3 变体）创建、命名、编辑、删除无限数量的自定义皮肤，并支持按季节自动切换——自动切换尊重手动选择（挂起而非覆盖）并正确处理半球。
**Depends on**: Phase 17（消费 apply 引擎 + 后端 CustomTheme CRUD API + /theme 页面）
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, SEAS-01, SEAS-02, SEAS-03, SEAS-04
**Success Criteria** (what must be TRUE):

  1. 用户可在自定义编辑器中通过 react-colorful 颜色选择器 + hex 输入选择 primary/secondary/tertiary 三种种子色；拖动选择器时实时预览即时重新着色，无感知延迟（直写 DOM，不触发整应用重渲染）
  2. 用户可从 9 种 MD3 变体（TonalSpot/Vibrant/Expressive/Content/Mono/Neutral/Fidelity/Rainbow/FruitSalad）中选择，派生配色随之改变；每个 user-saved theme 的文本角色自动满足 WCAG AA 对比度（由 MD3 SchemeTonalSpot 派生保证，用户不直接编辑派生角色如 primary-container）
  3. 用户可为自定义 theme 命名保存（数量无上限），编辑已有自定义 theme，删除自定义 theme（预设不可删）
  4. 开启季节自动切换时，app 从用户本地时区检测当前季节并自动选择对应季节预设；用户可在北半球（默认）与南半球之间切换，季节检测随之调整
  5. 手动选择 theme 挂起自动切换（带 TTL 的 override），刷新页面不会回退到自动选择且挂起可逆；季节评估仅在季节边界发生一次（存储 fc_last_season），而非每次 mount 都触发

**Plans**: 9 plans
Plans:
**Wave 1**

- [x] 18-01-PLAN.md — nine-variant MD3 engine dispatch and regression tests
- [x] 18-02-PLAN.md — blocking legitimacy gate for react-colorful and Skyfield

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 18-03-PLAN.md — scoped custom theme editor and CRUD save semantics
- [x] 18-04-PLAN.md — solar-term data, local season resolver, and cached auto-switch context

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 18-05-PLAN.md — theme settings, editor routes, guarded card actions, and custom deletion

**Wave 4** *(gap closure — diagnosed UAT fixes)*

- [x] 18-06-PLAN.md — injectThemeCss cascade ordering fix (closes Tests 6, 9, 12)
- [x] 18-07-PLAN.md — TonalSpot secondary/tertiary engine path fix (closes Test 5)
- [x] 18-08-PLAN.md — duplicate-name showToast enhancement (closes Test 8)
- [x] 18-09-PLAN.md — handleThemeClick auto-mode navigate removal (closes Test 10)

> 研究标记 HIGH：需 `/gsd-plan-phase --research-phase 18`。HCT 色彩空间行为、Variant 枚举（9 种）、直写 DOM 预览模式均需在 commit 编辑器数据模型前 spike MCU 运行时集成。
> 开放产品决策（discuss 阶段）：(a) 季节定义——气象学（3-5 月春）vs 节气（立春/立夏/立秋/立冬，更符合中文家庭场景）；(b) 半球检测方式（无浏览器半球 API，时区启发式脆弱）；(c) 自动切换 vs 手动选择的精确交互语义。
**UI hint**: yes

### Phase 19: Account-Bound Theme Preferences

**Goal**: 将 Phase 18 引入并仅存于 localStorage 的主题偏好（活动主题、季节自动切换开关、半球、季节→主题映射）迁移为账号绑定——后端为单一真相源，跨设备一致；localStorage 降级为 FOUC 首帧无网络引导的缓存层，并在登录后异步校准。自定义主题的"定义"已在 Phase 17 与账号绑定，本阶段只迁移用户的"选择与偏好"。fc_theme (legacy light/dark 变体) 维持 localStorage（仅为旧用户视觉平滑过渡，不再是新功能依赖）。
**Depends on**: Phase 18（消费 theme-context / fouc-bootstrap / ThemeSettingsPage 与所有现有 localStorage 键契约）
**Requirements**: TBD（discuss 阶段收敛）
**Success Criteria** (what must be TRUE):

  1. 后端持久化用户的活动主题、季节开关、半球、季节→主题映射（DB 为真相源）；同一账号在不同设备登录后偏好一致
  2. FOUC 首帧引导（IIFE 内联）仍能在 React hydration 之前确定首帧主题——依靠 localStorage 缓存，零网络请求；登录后异步从后端校准，差异处理策略由 discuss 阶段决定
  3. fc_last_season 维持 localStorage（纯设备级渲染缓存，语义不属于账号偏好）
  4. 登出/换账号时主题偏好不串号——按用户隔离 key 或登出时清理
  5. 离线/后端不可用时回退到 localStorage 缓存，不阻塞功能

**Plans**: TBD
> 开放产品决策（discuss 阶段）：(a) 多设备竞态策略——last-write-wins vs 时间戳合并；(b) 未登录期间本地修改如何 merge 到账号（merge-on-login vs 提示用户选择）；(c) 访客（无账号 JWT）场景下主题偏好如何处理（仅本地 / 隐藏 / 默认主题）；(d) 数据模型——单表 user_theme_preferences (1 行/用户) vs 拆分表。
**UI hint**: no（仅后端 + 引导层与 theme-context 改造，无新页面）

## Progress

**Execution Order:**
Phases execute in numeric order: 17 → 18 → 19. Phase 18 depends on Phase 17 (consumes apply engine + backend CustomTheme CRUD API + /theme page). Phase 19 depends on Phase 18 (consumes theme-context / fouc-bootstrap / ThemeSettingsPage and all current localStorage key contracts).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Foundation | v1.0 | 1/1 | ✓ Complete | 2026-05-24 |
| 2. Backend Core | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 3. Frontend Authenticated | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 4. Frontend Guest | v1.0 | 1/1 | ✓ Complete | 2026-05-26 |
| 5. Data Foundation & Wish Lifecycle API | v1.1 | 3/3 | ✓ Complete | 2026-07-21 |
| 6. Notifications Integration | v1.1 | 3/3 | ✓ Complete | 2026-07-22 |
| 7. Wish List Frontend | v1.1 | 5/5 | ✓ Complete | 2026-07-23 |
| 8. MD3 Design Token Foundation | v1.2 | 3/3 | ✓ Complete | 2026-07-27 |
| 9. Motion & State Layers | v1.2 | 2/2 | ✓ Complete | 2026-07-27 |
| 10. Primitive Components | v1.2 | 3/3 | ✓ Complete | 2026-07-28 |
| 11. Composite & Navigation Components | v1.2 | 3/3 | ✓ Complete | 2026-07-28 |
| 12. Page-Level Refactor + 8dp Grid + HUMAN-UAT | v1.2 | 4/4 | ✓ Complete | 2026-07-29 |
| 13. Bugfix Sweep | v1.2 | 3/3 | ✓ Complete | 2026-07-29 |
| 14. UI Bugfix & Filter Popup | v1.3 | 7/7 | ✓ Complete | 2026-07-29 |
| 15. Navigation Restructure & Test Data | v1.3 | 6/6 | ✓ Complete | 2026-07-30 |
| 16. Tech Debt Cleanup | v1.4 | 4/4 | ✓ Complete | 2026-07-30 |
| 17. Theme System Foundation — Engine, Page, Presets & Persistence | v1.5 | 6/6 | Complete   | 2026-08-04 |
| 18. Custom Editor & Seasonal Auto-Switch | v1.5 | 9/9 | Complete    | 2026-08-06 |
| 19. Account-Bound Theme Preferences | v1.5 | 0/0 | Not started | — |
