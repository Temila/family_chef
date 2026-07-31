# Roadmap: 家味 · Family Chef

## Milestones

- ✅ **v1.0 访客点菜邀请** — Phases 1-4 (shipped 2026-05-29)
- ✅ **v1.1 菜品愿望单** — Phases 5-7 (shipped 2026-07-24)
- ✅ **v1.2 MD3 重构** — Phases 8-13 (shipped 2026-07-29)
- ✅ **v1.3 Bugfix + UI Refinements** — Phases 14-15 (shipped 2026-07-30)
- ✅ **v1.4 Tech Debt Cleanup** — Phase 16 (shipped 2026-07-30)

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

<details>
<summary>✅ v1.4 Tech Debt Cleanup (Phase 16) — SHIPPED 2026-07-30</summary>

- [x] **Phase 16: Tech Debt Cleanup** — 修复全部 10 项积累的 tech debt：CORS 确认已修复；快速修复（::before 确认、app.url、 migration batch、IN-01 encodeURIComponent）；中等修复（版本号 config.yaml 源、auto_migrate、IN-04 actingId）；以及两个大项（108 个测试修复、101 个 lint error 修复） — 4 plans (completed 2026-07-30)

**Requirements**: TD-01 ~ TD-10 (all 10/10 satisfied)

</details>
- [ ] 16-04-PLAN.md — TD-10 frontend lint baseline cleanup (101 errors → 0)

</details>

<details>
<summary>✅ v1.3 Bugfix + UI Refinements (Phases 14-15) — SHIPPED 2026-07-30</summary>

- [x] **Phase 14: UI Bugfix & Filter Popup** — 修复所有已知 CSS/布局缺陷：底部导航栏、表格、愿望单卡片、深色模式对比度等；高级筛选改为弹出子页面 — 7 plans (completed 2026-07-29)
- [x] **Phase 15: Navigation Restructure & Test Data** — 重组导航组件：精简 md-header/md-sidebar，统一 avatar 下拉菜单，厨师首页入口；创建测试 seed 数据 (completed 2026-07-30)

</details>



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
| 15. Navigation Restructure & Test Data | v1.3 | 6/6 | ✓ Complete | 2026-07-30 |
| 16. Tech Debt Cleanup | v1.4 | 0/0 | Planning | — |
