# Phase 14: UI Bugfix & Filter Popup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-29
**Phase:** 14-UI Bugfix & Filter Popup
**Areas discussed:** 筛选弹窗视觉模式, 食材卡按钮对齐策略, 下拉按钮圆角 1/4 范围

---

## 筛选弹窗视觉模式

| Option | Description | Selected |
|--------|-------------|----------|
| 全屏 modal（移动友好） | Modal--full-screen：移动端铺满桌面端限制 max-width 600-800px | |
| Basic 居中 modal | md-modal 默认 480px 宽、居中 | |
| 底部 sheet（仅移动端） | 仅在移动端使用（桌面不变） | |
| **PC 居中 + 移动底部 sheet** | 桌面端居中、移动端底部 sheet 组合 | ✓ |

**User's choice:** pc端居中，移动端底部sheet
**Follow-up:** Bottom-bar 处理 → "隐藏底部栏（推荐）" — 筛选打开时隐藏 md-bottom-bar
**Follow-up:** 实现路径 → "新增 Sheet 复合组件" — 复用 Modal composite 基础结构，新增 md-modal--bottom-sheet 变体

---

## 食材卡按钮对齐策略

| Option | Description | Selected |
|--------|-------------|----------|
| Grid stretch（推荐） | CSS Grid stretch + flex column inside cards + margin-top: auto for buttons | ✓ |
| 固定 minHeight | 每张卡设置 min-height，按钮区块 margin-top: auto | |
| JS 测高同步 | JS 测量同 row 最长卡片高度，其他卡设为同样高度 | |

**User's choice:** Grid stretch（推荐）
**Scope multi-select:** 食材管理卡片（BUG-05）, 菜品卡片（一致性）, 愿望单卡片（BUG-03） — all three

---

## 下拉按钮圆角 1/4 范围

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 ▾ 触发按钮 | borderRadius:50% 改为 square/rounded-sm 或 xs | |
| 仅下拉菜单容器 | md-radius-md 16px → md-radius-xs 4px | |
| 两者都改 | 两个都改：▾ 按钮 xs，菜单容器 xs | |
| **直接给定 CSS 重置规则** | 用户提供完整 selector 列表 + min-width/height:12px | ✓ |

**User's choice:** 触发按钮 + 用户提供完整 CSS 重置规则（覆盖 17 个选择器的 min-width/min-height: 12px）
**Notes:** 「圆角缩小到原来的 1/4」具体化用户直接给出 CSS 规则。颜色「按现有策略来」即透明背景 + var(--md-color-primary) 文字色 + hover 时 background var(--md-color-surface-container-high)。
**追加约束 (用户)**: 下拉菜单容器必须在页面最上层，不被其他元素遮挡。需 fixed positioning 或 React Portal。

---

## the agent's Discretion

- 食材管理卡片按钮区是否复用 WishCard 的 Card primitive footer slot
- 底部 sheet 动画参数（MD3 motion tokens）
- 全局 CSS 重置规则（D-08）落地在 styles.css 的哪个具体分区
- Dropdown container z-index 修复方案 A (fixed + 计算坐标) vs 方案 B (React Portal)

## Deferred Ideas

- NAV-01/02/03 (md-header/md-sidebar 重组) → Phase 15
- NAV-04 (厨师移动端首页入口) → Phase 15
- NAV-05 (bottom-bar 首页图标位置) → Phase 15
- UI-01 (所有页面高级筛选弹窗化) → Phase 15 — Phase 14 仅在 AdminDishesPage + AdminIngredientsPage 演示
- DATA-01 / BUG-06 (测试菜谱 seed) → Phase 15