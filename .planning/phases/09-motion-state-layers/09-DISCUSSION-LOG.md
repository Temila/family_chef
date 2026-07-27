# Phase 9: Motion & State Layers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-27
**Phase:** 9-Motion & State Layers
**Areas discussed:** Ripple 实现方式, State-layer 机制, 卡片悬浮行为, 小元素触控策略, Disabled 样式统一, 图标替换为MD3风格, 页面布局优化

---

## Ripple 实现方式

| Option | Description | Selected |
|--------|-------------|----------|
| React `<Ripple>` 组件 | 通用 wrapper 组件，onPointerDown 获取坐标→创建 CSS 动画 span，精确坐标控制 | ✓ |
| CSS-only 动画 | 纯 CSS keyframes + ::before/::after，无法感知 pointer 落点位置 | |
| Canvas 或第三方库 | Canvas 渲染或 @material/ripple，导入成本高 | |

**User's choice:** React `<Ripple>` 组件
**Notes:** Phase 9 创建独立的 Ripple.jsx 组件 + ripple.css。Phase 10 内置到 Button/Card 中。范围：按钮 + 卡片。涟漪使用 --md-color-primary 12% opacity 品牌色强调。

## State-layer 机制

| Option | Description | Selected |
|--------|-------------|----------|
| CSS ::before 伪元素 | 每个交互类添加 ::before 块，opacity 控制状态，CSS-only | ✓ |
| CSS 自定义属性 | --state-layer-color + --state-layer-opacity calc 叠加 | |
| React state-layer 组件 | `<StateLayer>` 包裹交互元素，class switch 控制 | |

**User's choice:** CSS ::before 伪元素
**Notes:** 按 Surface 类型区分 tint 色。一次性全量替换现有 :hover background 规则。生成 .state-hover/.state-pressed/.state-focused/.state-disabled 工具类。

## 卡片悬浮行为

| Option | Description | Selected |
|--------|-------------|----------|
| MD3 纯 elevation 过渡 | 彻底移除 border-color + translateY，仅 elevation-1→2 | ✓ |
| 保留现有行为 | 保留 border-color + elevation + translateY 复合效果 | |
| 折中方案 | 移除 border-color 但保留微弱 translateY(-1px) | |

**User's choice:** MD3 纯 elevation 过渡
**Notes:** 150ms standard easing。访客页面保持禁用悬浮。卡片 elevation-1→2 纯过渡。

## 小元素触控策略

| Option | Description | Selected |
|--------|-------------|----------|
| 统一约束 + 例外 | 全局 min-height/min-width:48px，极小元素 padding 补偿 | ✓ |
| 只改按钮类 | 只对 btn/fab 等做 48dp 约束 | |
| 全部拉到 48dp 视觉尺寸 | 所有交互元素视觉高度 48px，可能影响密集布局 | |

**User's choice:** 统一约束 + 例外
**Notes:** 先用 Playwright 脚本测量所有页面，全部完成后 UAT 人工复查。量子 stepper 30px、theme-toggle 36px 等用 padding 补偿到 48px 触控区。

## Disabled 样式统一

| Option | Description | Selected |
|--------|-------------|----------|
| 统一 CSS 规则 | 全局 :disabled: opacity 0.38 + cursor:not-allowed + box-shadow:none + 保留可聚焦性 | ✓ |
| 仅按钮类统一 | 只统一 .btn:disabled 系列 | |

**User's choice:** 统一 CSS 规则
**Notes:** 移除 pointer-events:none。配合 state-layer ::before 的 disabled 38% 叠加。

## 图标替换为MD3风格

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 9 铺路 | 创建 Icon 组件骨架，定义替换模式，渐进替换 | ✓ |
| Phase 9 全部替换 | 一次性替换所有 emoji，任务量大 | |
| 延期到独立 phase | 不干扰 MD3 组件换皮流程 | |

**User's choice:** Phase 9 铺路（@material-symbols/svg-400 NPM + Vite 按需加载）
**Notes:** `<Icon name="home" size={24} />` API，支持 MD3 可变字体参数。实际替换在 Phase 10-12 完成。

## 页面布局优化

| Option | Description | Selected |
|--------|-------------|----------|
| 交互反馈（Phase 9 scope） | sidebar 导航项 state-layer + focus ring + header-back ripple | ✓ |
| 布局尺寸结构调整 | sidebar 宽度 240px→MD3 Navigation Rail 80dp，Phase 11 scope | 延期 |
| 两者都要 | 交互反馈 + 布局结构调整 | 部分采纳 |

**User's choice:** 交互反馈归 Phase 9（D-12），布局尺寸归 Phase 11（COMPO-09）

## Deferred Ideas

- **Sidebar/Header 布局尺寸 MD3 化** — 属于 Phase 11 COMPO-09（Navigation Components），Phase 9 仅处理交互反馈
- **主题选择器 UI** — 继承自 Phase 8，独立 future phase（`tokens.css` 已按 `[data-theme="xxx"]` 铺路）
