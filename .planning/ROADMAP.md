# Roadmap: 家味 · Family Chef

## Milestones

- ✅ **v1.0 访客点菜邀请** — Phases 1-4 (shipped 2026-05-29)
- ✅ **v1.1 菜品愿望单** — Phases 5-7 (shipped 2026-07-24)
- ✅ **v1.2 MD3 重构** — Phases 8-13 (shipped 2026-07-29)
- 🚧 **v1.3 Bugfix + UI Refinements** — Phases 14-15 (in progress)

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

**Known gaps deferred to next milestone:**

1. md-bottom-bar 宽度存在问题，部分分辨率下左右两端存在空隙
2. 所有表格表头与内容错位，表头左侧缺少 ::before 占位
3. 移动端愿望单卡片：每行仅一个卡片，宽度根据屏幕自适应，高度统一

</details>

<details open>
<summary>🚧 v1.3 Bugfix + UI Refinements (Phases 14-15) — IN PROGRESS</summary>

- [x] **Phase 14: UI Bugfix & Filter Popup** — 修复所有已知 CSS/布局缺陷：底部导航栏、表格、愿望单卡片、深色模式对比度等；高级筛选改为弹出子页面 — 4 plans in 2 waves (completed 2026-07-29) + 3 gap-closure plans in 2 waves (14-05/06/07 — VERIFICATION Gap 1/2 + REVIEW CR-01/WR-05/WR-01/06) — COMPLETE 2026-07-29
- [ ] **Phase 15: Navigation Restructure & Test Data** — 重组导航组件：精简 md-header/md-sidebar，统一 avatar 下拉菜单，厨师首页入口；创建测试 seed 数据覆盖组合场景

</details>

## Phase Details

*Detailed phase descriptions for shipped milestones are archived in `.planning/milestones/`. See `v1.2-ROADMAP.md` for full Phase 8-13 details.*

### Phase 14: UI Bugfix & Filter Popup

**Goal**: 修复 v1.2 已知所有 CSS/UI 缺陷——底部导航栏宽度、表格错位、愿望单卡片、食材管理按钮圆角及对齐、深色模式弹出页对比度；高级筛选改为弹出子页面交互
**Depends on**: Phase 13 (v1.2 Bugfix Sweep)
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04, BUG-05, BUG-07, UI-02, UI-03
**Success Criteria** (what must be TRUE):

  1. 所有分辨率下底部导航栏（md-bottom-bar）填满宽度，左右两端无空隙
  2. 表格表头（th）与表体内容列对齐，th 有 ::before 占位符
  3. 移动端愿望单卡片为单列全宽，所有卡片高度统一
  4. 食材管理下拉菜单按钮圆角缩小到原来的 1/4
  5. 移动端食材管理页面上，编辑和删除按钮固定到每张卡片的最下方，各行卡片按钮在同一水平线上对齐
  6. 深色模式下弹出页面周围有主题色边框，与背景有明显对比
  7. 弹出筛选页面不破坏底部导航栏布局

**Plans**: 7 plans (4 original + 3 gap-closure)
**UI hint**: yes
Plans:
**Wave 1**

- [x] 14-01-PLAN.md — Sheet composite + D-11 dark-mode border (Wave 1)
- [x] 14-02-PLAN.md — Bugfix sweep: BottomBar, table th, card uniformity, D-08 CSS reset (Wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 14-03-PLAN.md — Advanced-filter Sheet migration + Portal dropdown z-index fix on admin pages (Wave 2)

**Wave 1 (gap closure)**

- [x] 14-04-PLAN.md — UAT gap closure: BUG-02 table alignment + BUG-04 dropdown race + unified card design rules for WishCard/DishCard/MobileIngredientCard (4 design rules: uniform size, right-aligned buttons, text truncation, missing-field placeholders)

**Wave 1 (gap closure round 2 — operator priority)**

- [x] 14-05-PLAN.md — BUG-02 表头对齐覆盖全 7 页：拆分基线 + pc-data-table--with-leading 修饰类（VERIFICATION Gap 1 关闭）

**Wave 2 (gap closure round 2 — parallel)**

- [x] 14-06-PLAN.md — Portal dropdown 键盘激活 + scroll/resize/orientationchange 关闭（REVIEW CR-01 + WR-01/06 缓解）
- [x] 14-07-PLAN.md — ChefDishesPage Portal 迁移 + AdminIngredientsPage 触发按钮 6px 圆角（REVIEW WR-05 + VERIFICATION Gap 2 关闭）

### Phase 15: Navigation Restructure & Test Data

**Goal**: 导航体系精简——md-header 仅保留头像+主题切换，其他功能按钮移到下方 div；md-sidebar 取消主题切换和退出登录；厨师移动端首页添加入口；bottom-bar "首页"图标在最左边；创建测试 seed 数据覆盖组合场景
**Depends on**: Phase 14
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, BUG-06, DATA-01, UI-01
**Success Criteria** (what must be TRUE):

  1. 用户看到 md-header 中仅含用户头像（含下拉菜单）和主题切换按钮，其他功能按钮出现在 header 下方独立的 div 中
  2. 用户头像下拉菜单只显示"编辑资料"和"退出登录"两个选项
  3. md-sidebar 中不再显示主题切换和退出登录按钮
  4. 厨师角色用户在移动端首页能看到"菜品管理"和"食谱管理"入口按钮
  5. md-bottom-bar 中最左边的图标是"首页"
  6. Seed 数据包含覆盖 2³=8 种组合的测试菜谱（有/无食谱 × 有/无介绍 × 有/无图片）
  7. 移动端菜品卡片在不同内容组合下渲染为统一尺寸（同宽同高）
  8. 因内容差异导致卡片高度不一致时，按钮仍保持在同一水平线上对齐
  9. 所有高级筛选控件改为弹出子页面交互（类似"添加"按钮的弹窗行为）

**Plans**: 6 plans (Wave 0 test migration + Wave 1 header/sidebar shell + Wave 2 multi-button callers + Wave 3 single-button callers/bottom-bar/user-home + Wave 4 order-page sheet + Wave 5 seed + tests)
**UI hint**: yes
Plans:
- [x] 15-01-PLAN.md — Wave 0 test migration: replace phase12-bugfix.spec.js and md3-compliance.spec.js Sidebar footer button assertions with NAV-03 contract (version text + zero buttons)
- [x] 15-02-PLAN.md — Wave 1 header/sidebar shell: Header action-bar wrapper + theme IconButton + 2-item avatar menu with Divider; Sidebar footer version text + cleanup imports/state
- [ ] 15-03-PLAN.md — Wave 2 multi-button Header caller wraps: AdminDishesPage, AdminIngredientsPage, ChefDishesPage actions wrapped in .header-action-bar
- [ ] 15-04-PLAN.md — Wave 3 single-button callers + BottomBar + UserHomePage: 4 single-button Header wraps; BottomBar 7/7/4 tab arrays with logout removed; UserHomePage chef 菜品管理 + 食材管理 entries
- [ ] 15-05-PLAN.md — Wave 4 OrderPage filter Sheet migration: tonal 高级筛选 Button replaces 展开筛选 Chip; Sheet wraps existing filter chip block with 清空/应用 footer
- [ ] 15-06-PLAN.md — Wave 5 backend seed (8 dev dishes covering 2³ combinations) + main.py wiring + frontend Playwright tests + backend pytest cases

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Foundation | v1.0 | 1/1 | ✓ Complete | 2026-05-24 |
| 2. Backend Core | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 3. Frontend Authenticated | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 4. Frontend Guest | v1.0 | 1/1 | ✓ Complete | 2026-05-26 |
| 5. Data Foundation & Wish Lifecycle API | v1.1 | 3/3 | Complete | 2026-07-21 |
| 6. Notifications Integration | v1.1 | 3/3 | Complete | 2026-07-22 |
| 7. Wish List Frontend | v1.1 | 5/5 | Complete | 2026-07-23 |
| 8. MD3 Design Token Foundation | v1.2 | 3/3 | Complete | 2026-07-27 |
| 9. Motion & State Layers | v1.2 | 2/2 | Complete | 2026-07-27 |
| 10. Primitive Components | v1.2 | 3/3 | Complete | 2026-07-28 |
| 11. Composite & Navigation Components | v1.2 | 3/3 | Complete | 2026-07-28 |
| 12. Page-Level Refactor + 8dp Grid + HUMAN-UAT | v1.2 | 4/4 | Complete | 2026-07-29 |
| 13. Bugfix Sweep | v1.2 | 3/3 | Complete | 2026-07-29 |
| 14. UI Bugfix & Filter Popup | v1.3 | 7/7 | ✓ Complete | 2026-07-29 |
| 15. Navigation Restructure & Test Data | v1.3 | 2/6 | In Progress|  |
