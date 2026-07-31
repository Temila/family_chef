# Phase 14: UI Bugfix & Filter Popup - Context

**Gathered:** 2026-07-29
**Status:** Ready for planning

## Phase Boundary

修复 v1.2 已知的 CSS/UI 缺陷（底部导航栏宽度间隙、表格表头错位、愿望单卡片高度、食材管理下拉按钮圆角及按钮对齐、深色模式弹出页对比度），并将高级筛选从内联展开式改为弹出子页面交互。本阶段只覆盖 admin 端两个筛选页（AdminDishesPage、AdminIngredientsPage）作为示范，所有高级筛选弹窗化推迟到 Phase 15。

**不在本阶段范围（推迟到 Phase 15）：** md-header/md-sidebar 重组（NAV-01/02/03）、厨师移动端首页入口（NAV-04）、bottom-bar 首页图标位置（NAV-05）、所有页面高级筛选弹窗化（UI-01）、测试菜谱 seed 数据（BUG-06 / DATA-01）。

<decisions>
## Implementation Decisions

### 筛选弹窗视觉模式（UI-01 partial / UI-02 / UI-03）

- **D-01 (PC 端)**: 居中 basic modal（沿用现有 `composites/Modal` 默认 480px 居中样式）。视觉与现有"添加"/"编辑"模态保持一致。
- **D-02 (移动端)**: 底部 sheet — 自屏幕底部滑入，圆角仅顶部 16px，遮盖整个屏幕宽度。
- **D-03 (Bottom-bar 交互)**: 筛选弹窗打开时**隐藏** md-bottom-bar（modal scrim z-index 500 已覆盖，bottom-bar z-index 200 自动被遮挡），关闭后恢复。无需额外状态联动。
- **D-04 (实现路径)**: **新增 Sheet 复合组件**（在 `frontend/src/components/composites/` 下），复用 Modal composite 基础结构，新增 `md-modal--bottom-sheet` 变体。桌面（≥1024px）下不应用 sheet 样式（保持居中 modal）。这是 MD3 设计系统一致的方案，避免页面级重复代码。

### 卡片按钮对齐与高度统一（BUG-03 / BUG-05）

- **D-05 (范围)**: 覆盖 3 类卡片 —— 食材管理卡片（BUG-05）、愿望单卡片（BUG-03）、菜品卡片（Phase 15 BUG-06 一致性）。三类卡片统一使用同一布局策略。
- **D-06 (布局策略)**: **Grid stretch** —— 外层容器 CSS Grid（已有 `.mobile-card-list--grid` 是 grid），grid 默认 `align-items: stretch` 让每行最高卡片高度被同 row 其他卡片继承。每张卡片内部 flex column：内容顶部 + 操作按钮区 `margin-top: auto` 推到底部。
- **D-07 (跨 viewport 一致)**: 桌面端（≥1024px）使用 `.pc-data-table` 表格视图，移动端（<1024px）使用 grid 卡片视图——两套布局各自独立，无需同步高度。

### 下拉按钮与菜单容器（BUG-04）

- **D-08 (▾ 触发按钮样式)**: 用户指定的全局 CSS 重置规则，覆盖 MD3 48dp 触控目标要求，**仅作用于以下交互元素**：button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), .theme-toggle, .qty-stepper button, .menu-item, .chef-select-item, .wish-picker-item, .guest-add-btn, .preference-tag button, .quick-action —— 统一 `min-width: 12px; min-height: 12px`。颜色保持现有策略（透明背景 + var(--md-color-primary) 文字色 + ▾ 字符，hover 时出现 background var(--md-color-surface-container-high)）。
- **D-09 (下拉菜单容器 z-index 与遮挡)**: 必须位于页面最上层不被遮挡。两种实现任选其一（agent 决策）：
  - 方案 A：`position: fixed` + 通过 trigger ref 计算 top/left 坐标
  - 方案 B：React Portal 渲染到 document.body
  - 同时去除外层容器的 `overflow: hidden` 限制以避免裁剪
- **D-10 (菜单容器圆角)**: 沿用现有 `var(--md-radius-md)` (16px)，不缩小（本阶段"1/4"指的是触发按钮尺寸，不是菜单容器）。

### 深色模式弹出页面边框（BUG-07 / UI-03）

- **D-11**: `.md-modal` 添加 `border: 1px solid var(--md-color-outline-variant)`（浅色模式几乎不可见，深色模式下提供边缘对比度）。**不**使用 primary 主题色边框（避免视觉噪音）。`md-modal--full-screen` 与 `md-modal--bottom-sheet` **不**应用边框（铺满屏幕时不需要）。

### 底部导航栏宽度修复（BUG-01）

- **D-12**: 移除 `BottomBar.css` 中 `max-width: 420px` / `max-width: 768px` 限制与 `left: 50%; transform: translateX(-50%)` 居中逻辑。改为 `width: 100%; left: 0; transform: none;`，让 md-bottom-bar 在 ≤1023px 所有分辨率下都铺满视口宽度（仍保留 `@media (min-width: 1024px) { display: none }`）。

### 表格表头 ::before 占位（BUG-02）

- **D-13**: 现有 `frontend/src/css/styles.css:348-354` 的 `.pc-data-table th::before` 已存在（32px 宽）。Phase 13 fix-sweep 已知遗留：部分页面表格未应用 `.pc-data-table` class 导致错位。**审计 + 修复**：检查所有 `<table>` 元素，确保使用 `.pc-data-table` class；缺失的补上。如 ::before 32px 与某些首列内容仍不对齐，可调宽到 48px。

### the agent's Discretion

- 食材管理卡片按钮固定到底部时，**是否拆出 actions slot 到 Card primitive footer**（与 WishCard 现有 footer slot 模式一致）—— agent 视实现便利性决定。如 WishCard footer slot 已稳定可复用，新食材卡也复用 footer slot。
- 底部 sheet 动画（translate Y + transition）—— agent 参考 MD3 motion token `var(--md-motion-duration-medium)` + `var(--md-motion-easing-emphasized)`。
- 全局 CSS 重置规则（D-08）落地位置 —— 推荐放 `frontend/src/css/styles.css` 中现有 `.pc-data-table` 附近的新增"compact interactive targets"分区，便于维护。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 14 — phase goal, success criteria, requirements list (BUG-01/02/03/04/05/07, UI-02/03)
- `.planning/REQUIREMENTS.md` §Bugfixes / UI Components — full requirement definitions
- `.planning/PROJECT.md` §Current Milestone — v1.3 context

### Design System (v1.2 MD3)
- `.planning/codebase/STACK.md` — confirmed stack: React 19 + Vite + CSS tokens
- `.planning/codebase/CONVENTIONS.md` §Frontend Conventions — component patterns, CSS variable usage, BEM class naming
- `frontend/src/components/primitives/base.css` — MD3 tokens (colors, spacing, radius, motion durations)
- `frontend/src/components/composites/Modal.css` — current Modal styling (basis for sheet variant)
- `frontend/src/components/composites/Modal.jsx` — Modal composite public API

### Bug Source Code
- `frontend/src/components/composites/BottomBar.css` — BUG-01 root cause (max-width + centering)
- `frontend/src/components/composites/BottomBar.jsx` — BottomBar API
- `frontend/src/css/styles.css:344-354` — table th::before (BUG-02 baseline)
- `frontend/src/components/WishCard.jsx` — WishCard footer slot pattern (BUG-03 reference)
- `frontend/src/pages/AdminIngredientsPage.jsx:328-377,410-503` — dropdown trigger button + menu (BUG-04/05 source)
- `frontend/src/pages/AdminIngredientsPage.jsx:280-298` — current inline advanced filter accordion
- `frontend/src/pages/AdminDishesPage.jsx:478-523` — current inline advanced filter accordion

### Prior Phase Artifacts
- `.planning/STATE.md` §Deferred Items — list of v1.2 known defects (BUG-01/02/03 specifically listed)
- Phase 13 fix-sweep commit `0f808f6` — 9 frontend issues already addressed; check what was already fixed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`Modal` composite** (`frontend/src/components/composites/Modal.jsx`): props `open`, `onClose`, `title`, `actions`, `children`, supports `md-modal--full-screen` variant. Phase 14 work adds `md-modal--bottom-sheet` variant.
- **MD3 design tokens** (`frontend/src/components/primitives/base.css`): colors (`--md-color-primary`, `--md-color-surface-container-*`, `--md-color-outline-variant`), spacing (`--md-spacing-1..6`), radius (`--md-radius-xs..full`), motion (`--md-motion-duration-*`, `--md-motion-easing-*`).
- **Card primitive** (`frontend/src/components/primitives/Card.jsx`): already supports `footer` slot (used by WishCard). Can reuse for食材卡按钮区。
- **Grid containers** (`.mobile-card-list`, `.mobile-card-list--grid`): already CSS Grid with `grid-template-columns: 1fr/2/3/4` responsive. Just need to ensure `align-items: stretch` is preserved (it is by default).

### Established Patterns
- **CSS variable usage**: All visual values via `var(--md-*)` tokens, zero hardcoded.
- **Touch target spec**: Phase 11 established 48dp minimum (`UX-04`). **Conflict with D-08**: user explicitly overrides this for specific small interactive elements — implementation must respect both.
- **Modal scrim**: existing `z-index: 500` already higher than bottom-bar's `z-index: 200`; no new stacking needed for hiding bottom-bar.
- **Dropdown trigger pattern** (`AdminIngredientsPage.jsx:328`): 24×24 inline-styled button with click-outside handler. Pattern is duplicated in mobile view (lines 420-468). Refactor opportunity: extract `<DropdownTrigger>` + `<DropdownMenu>` reusable components, but agent's discretion.

### Integration Points
- **AdminDishesPage** and **AdminIngredientsPage**: replace inline filter accordion (`{showAdvFilter && ...}` blocks) with new Sheet/Modal trigger button + state-driven open/close.
- **BottomBar.css**: direct edit, single file change.
- **Modal.css**: add `md-modal--bottom-sheet` variant media query (only @media (max-width: 1023px)).
- **styles.css**: add global `.compact-interactive-targets` rule (or equivalent selector list from D-08).
- **WishCard.jsx, DishCard.jsx, AdminIngredientsPage cards**: ensure card body is `display: flex; flex-direction: column;` and button row uses `margin-top: auto`.

</code_context>

<specifics>
## Specific Ideas

- **v1.1 reference (superseded by D-08)**: User originally referenced "v1.1 样式" for trigger button, then provided exact CSS reset rule instead. v1.1 era had no rounded chevron button — dropdown affordance was a plain text caret. Implementation should match the CSS reset (12px min-target), not literally copy a v1.1 era file.
- **Sheet vs Modal pattern**: User chose "PC 居中 + 移动底部 sheet" hybrid. Implementation can be either (a) one Modal component with media-query CSS variant, or (b) two distinct components. Both acceptable; agent chooses by code reuse.
- **Dropdown z-index fix** (D-09): user explicitly flagged occlusion as ongoing problem. If chose React Portal, must still implement click-outside via Portal-aware ref forwarding.

</specifics>

<deferred>
## Deferred Ideas

These were considered but belong to other phases per ROADMAP.md scope:

- **NAV-01/02/03 (md-header/md-sidebar 重组)** → Phase 15
- **NAV-04 (厨师移动端首页入口)** → Phase 15
- **NAV-05 (bottom-bar 首页图标位置)** → Phase 15
- **UI-01 (所有高级筛选弹窗化)** → Phase 15 — Phase 14 only demos the pattern on AdminDishesPage + AdminIngredientsPage
- **DATA-01 / BUG-06 (测试菜谱 seed)** → Phase 15
- **BUG-06 implicit** (mobile dish cards consistent size) — addressed structurally in D-05/D-06 for dish cards within Phase 14 scope; full visual validation needs Phase 15 seed data

</deferred>

---

*Phase: 14-UI Bugfix & Filter Popup*
*Context gathered: 2026-07-29*