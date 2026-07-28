---
phase: 10-primitive-components
plan: 03
subsystem: ui
tags: [md3, primitives, react, badge, chip, accessibility, migration]

requires:
  - phase: 10-primitive-components/10-01
    provides: "primitives/ 目录、Icon 与 base.css 共享交互契约"
  - phase: 10-primitive-components/10-02
    provides: "Card/Input primitives 与共享消费者迁移基础"
provides:
  - "Badge primitive：3 variants × 8 tones、count 模式与 status/text/type 向后兼容 adapter"
  - "Chip primitive：assist/filter/input/suggestion 四变体、aria-pressed filter 与独立移除动作"
  - "全量旧 Badge/filter-chip 消费迁移及 styles.css 遗留选择器清理"
affects: [11-md3-composite-components, 12-page-level-refactor]

tech-stack:
  added: []
  patterns:
    - "视觉-only Badge 将旧 statusBadge cls 映射为 MD3 semantic tone"
    - "Filter Chip 使用 native button + aria-pressed + 固定 18dp check slot"
    - "Input Chip 以独立中文 aria-label 移除按钮承载删除动作"

key-files:
  created:
    - "frontend/src/components/primitives/Badge.jsx"
    - "frontend/src/components/primitives/Badge.css"
    - "frontend/src/components/primitives/Chip.jsx"
    - "frontend/src/components/primitives/Chip.css"
  modified:
    - "frontend/src/css/styles.css"
    - "frontend/src/components/Sidebar.jsx"
    - "frontend/src/components/BottomBar.jsx"
    - "frontend/src/components/DishCard.jsx"
    - "frontend/src/components/WishCard.jsx"
    - "frontend/src/pages/AdminDishesPage.jsx"
    - "frontend/src/pages/ChefDishesPage.jsx"
    - "frontend/src/pages/OrderPage.jsx"
    - "frontend/src/pages/GuestOrderPage.jsx"

key-decisions:
  - "保留 statusBadge() 原实现，通过 Badge 内部 CLS_TO_TONE adapter 隔离业务状态与视觉 tone（D-15）"
  - "Filter Chip 选中态固定使用 secondary-container/on-secondary-container，且不接入 Ripple（D-14）"
  - "原 filter-chip select 改用保留的 .form-input 兜底，等待 Phase 11 Select primitive；.form-input 本计划不删除"

patterns-established:
  - "Badge visual adapter: legacy status/text/type → semantic tone，不向业务调用方泄漏旧 CSS class"
  - "Chip interaction semantics: filter=native toggle button，input=独立 remove action，assist/suggestion 默认静态"

requirements-completed: [COMPO-06, COMPO-07, LOGIC-01, LOGIC-02, LOGIC-03]

duration: 10min
completed: 2026-07-28
---

# Phase 10 Plan 03: Badge + Chip Primitives Summary

**MD3 Badge（3 variants × 8 tones + 向后兼容状态映射）与 Chip（4 variants + 可访问 filter/input 交互）落地，并完成全前端旧 badge/filter-chip 调用和 CSS 选择器清理。**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-28T02:11:37Z
- **Completed:** 2026-07-28T02:21:52Z
- **Tasks:** 2
- **Files modified:** 35（含 4 个新 primitive 文件、旧 Badge.jsx 删除、消费者与 CSS 迁移）

## Accomplishments

- 新增 `Badge` primitive，提供 assist/filter/state、8 个 semantic tone、24dp count 模式及旧 `status/text/type` API adapter；`statusBadge()` 保持不变。
- 新增 `Chip` primitive，完整实现 assist/filter/input/suggestion；filter 使用 native button + `aria-pressed` + 18dp 固定 check slot，input 使用独立可访问移除按钮。
- Sidebar/BottomBar count badge、DishCard、WishCard、订单/菜品/管理员状态徽章迁移到新 Badge。
- 12 个页面中的旧 filter-chip 迁移到新 Chip；解析结果标签采用 input Chip，订单偏好采用 assist Chip，原生排序 select 改用 Phase 11 前保留的 `.form-input`。
- `styles.css` 中旧 `.badge*`、`.badge-count`、`.filter-chip`、`.filter-chips` 选择器和焦点/触控残留全部清除；`.form-input` 按计划保留。
- Vite production build 成功；ESLint 保持既有 93 errors / 21 warnings 基线，无新增问题。

## Task Commits

Each task was committed atomically:

1. **Task 1: Badge primitive + consumer migration + legacy badge CSS cleanup** — `8834e8c` (feat)
2. **Task 2: Chip primitive + filter migration + legacy filter-chip CSS cleanup** — `0605173` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `frontend/src/components/primitives/Badge.jsx` — semantic tone matrix、count 模式、旧 status/text/type adapter。
- `frontend/src/components/primitives/Badge.css` — 24dp pill、3 variants、8 tones、24dp compact count。
- `frontend/src/components/primitives/Chip.jsx` — 4 variants、filter aria-pressed、input remove action、静态/交互语义切换。
- `frontend/src/components/primitives/Chip.css` — 32dp visual / 48dp interactive target、secondary-container selected、18dp check slot。
- `frontend/src/css/styles.css` — 清除全部 legacy badge/filter-chip 规则；保留 select 依赖的 `.form-input`。
- `frontend/src/components/{Sidebar,BottomBar,DishCard,WishCard}.jsx` — count/status/category/availability Badge 迁移。
- `frontend/src/pages/{AdminDishes,ChefDishes,Order,GuestOrder,ChefOrders,UserOrders,ChefWishes,AdminUsers,AdminIngredients,AdminCategories,AdminLogs,OrderDetail}Page.jsx` — Chip/Badge 消费迁移并保留原事件与状态逻辑。

## Decisions Made

1. **D-15 compatibility adapter** — `statusBadge()` 仍是中文业务状态单一来源；新 Badge 只将其旧 `cls` 字段映射为 semantic tone，避免业务语义绑定 CSS。
2. **Chip selected color** — filter 选中态固定使用 `secondary-container` / `on-secondary-container` / transparent border，未使用 primary。
3. **Select deferred to Phase 11** — `OrderPage` 的排序 select 不再使用已删除的 `.filter-chip`，改用有意保留的 `.form-input`；其他 select 继续等待 Select primitive。
4. **No Ripple for Chip** — Chip 通过颜色 state-layer 与 check micro-motion 反馈，组件代码和 CSS 均无 Ripple 引用。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run lint` 仍以退出码 1 报告 93 errors / 21 warnings；这是 Phase 10-02 已记录的项目基线，10-03 未增加 error。`npm run build` 通过。

## Known Stubs

None. 新 Badge/Chip primitive 与所有迁移消费者均接入真实 props/state/callback；未引入 placeholder 数据或未接线 UI。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 10 primitive library 完整交付：Button、IconButton、FAB、Card、Input、Badge、Chip、Icon、Ripple 与共享 base.css 均已就位。
- Phase 11 可开始 Composite & Navigation Components；其 Select primitive 需要吸收本阶段有意保留的 `.form-input` select 消费。
- 无代码阻塞；人工视觉 UAT 按 D-04 继续留在 Phase 12 汇总执行。

## Self-Check: PASSED

- 4 个 Badge/Chip primitive 文件存在；旧 `components/Badge.jsx` 已删除。
- Task commits `8834e8c`、`0605173` 均存在于 git log。
- styles.css 中 legacy badge/filter-chip/filter-chips selector 数量为 0。
- JSX 中 legacy badge tone/count/filter-chip className 数量为 0；旧 Badge import 数量为 0。
- Sidebar/BottomBar 已使用 `./primitives/Badge` 且无内联 `function Badge`。
- `.form-input` CSS 保留 2 条（base + focus），符合 Phase 11 Select 延期约定。
- Chip 源码/CSS 中 Ripple 引用为 0；filter selected 使用 secondary container tokens。
- `npm run build` exit 0；`npm run lint` 保持 93-error 基线（0 新增）。
- `backend/app/*` 修改数量为 0。

---

*Phase: 10-primitive-components*
*Completed: 2026-07-28*
