# Phase 9: Motion & State Layers - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

为所有可交互面增加 MD3 反馈语义——state-layer（hover/pressed/focused/disabled 8/10/12/38%）+ Ripple 涟漪（pointer 位置感知、双兼容）+ 悬浮 elevation 过渡 + MD3 焦点环应用 + 触控目标 ≥48dp 审计。Phase 10/11 的组件换皮消费本 phase 产出的动效工具。仅换皮，后端零改动。

</domain>

<decisions>
## Implementation Decisions

### Ripple 涟漪实现

- **D-01: React <Ripple> 组件作为核心实现**
  - 通过 onPointerDown 获取落点坐标 → 创建 CSS 动画 span → 动画结束自动移除
  - 坐标精确控制满足 MD3 要求（pointer 位置起算、半径覆盖元素最大边）
  - Phase 9 创建独立的 `Ripple.jsx` 组件 + `ripple.css` 工具样式
  - Phase 10 的 Button/Card 组件内部内置 Ripple（Phase 9 通过 `<Ripple>` 包裹现有按钮/卡片）

- **D-02: Ripple 应用范围** — 按钮 + 卡片
  - btn / btn-primary / btn-secondary / btn-outline / fab / btn-icon
  - card / dish-card / wish-card / quick-action / list-item
  - 卡片涟漪从点击区起算，不干扰 elevation 过渡
  - filter-chip、tab-item 等次要元素暂不添加 Ripple

- **D-03: Ripple 视觉使用品牌色强调**
  - 使用 `--md-color-primary` 12% opacity 做涟漪颜色
  - 动画时长 500ms，MD3 emphasized easing
  - 释放后 150ms 淡出

### State-layer 状态层

- **D-04: CSS ::before 伪元素实现 state-layer**
  - 每个交互类添加 `::before` 块作为 state-layer 层
  - 用 opacity 控制 hover(8%)/pressed(10%)/focused(12%)/disabled(38%) 状态
  - CSS-only，无 JS 开销
  - 在已有 background 的元素上通过 `background: transparent` + `::before` overlay 处理叠加

- **D-05: State-layer 色值按 Surface 类型区分**
  - Surface/Surface-Variant 背景：`--md-color-primary` 叠加
  - Primary-Container/Surface-Container 背景：`--md-color-on-surface` 叠加

- **D-06: 一次性全量替换现有 :hover background 规则**
  - 生成工具类 `.state-hover` / `.state-pressed` / `.state-focused` / `.state-disabled`
  - 所有交互元素的 `:hover/:active/:focus-visible/:disabled` 统一通过 state-layer 实现
  - 移除 btn / card / list-item / dish-card / filter-chip 等核心交互类的直接 `:hover { background }` 规则

### 卡片悬浮行为

- **D-07: MD3 纯 elevation 过渡（纯正 MD3）**
  - 彻底移除全部 `:hover` 中的 border-color 和 translateY 变化
  - 卡片悬浮仅 `box-shadow: var(--md-elevation-2)` + elevation-1→2 平滑过渡
  - 使用 `--md-motion-duration-short: 150ms` + `--md-motion-easing-standard`
  - 移动端无 hover 不变

- **D-08: 访客页面保留禁用悬浮**
  - `.guest-page .dish-card` 保持 `cursor: default`，不触发 elevation 变化和 state-layer
  - 符合访客只能浏览不能交互的定位

### 触控目标 ≥48dp

- **D-09: 统一约束 + padding 补偿策略**
  - 全局 CSS 规则强制所有 interactive 元素 `min-height/min-width: 48px` 触控区
  - 对于 qty-stepper button (30px)、theme-toggle (36px)、header-back (36px)、modal-close (32px)、dish-fav-btn (28px) 等极小元素：用 padding 补偿到 48px 触控区，视觉保持原尺寸
  - 先 Playwright 脚本测量所有页面，输出 <48dp 违规清单
  - 全部完成后 UAT 阶段人工复查

### Disabled 样式统一

- **D-10: 统一 CSS 全局规则**
  - 所有交互元素 `:disabled`：`opacity: 0.38; cursor: not-allowed; box-shadow: none;`
  - 移除 pointer-events:none（保留可聚焦性 for accessibility）
  - 配合 state-layer `::before` 的 disabled 38% 叠加

### Material Symbols 图标铺路

- **D-11: Phase 9 铺路，Phase 10-12 渐进替换**
  - Phase 9 创建 Icon 组件骨架（基于 `@material-symbols/svg-400` NPM 包 + Vite 按需加载）
  - 定义替换模式和命名约定
  - API: `<Icon name="home" size={24} fill weight grade />` 支持 MD3 可变字体参数
  - 实际 emoji 替换分散到 Phase 10-12 的组件换皮中逐步完成
  - 页面 inline emoji 在 Phase 12 最终清理

### Sidebar/Header 交互反馈

- **D-12: Sidebar/Header 导航项加入 Phase 9 的 state-layer + focus ring**
  - `.pc-sidebar-item` 添加 state-layer hover/pressed/focused
  - `.header-back` 添加 state-layer + Ripple
  - 布局尺寸（sidebar 宽度 240px→80dp 等）属于 Phase 11 COMPO-09 范畴

### the agent's Discretion
- Ripple 组件具体 DOM 结构（span 创建/清理细节）
- State-layer `::before` 的 `z-index` 和 `pointer-events` 层级细节
- Playwright 脚本的具体选择器和测量逻辑

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/ROADMAP.md` — Phase 9 goal + 2 plans breakdown + success criteria
- `.planning/REQUIREMENTS.md` — TOKEN-11 / MOTION-01..04 / UX-03 / LOGIC-01..03
- `.planning/PROJECT.md` — v1.2 MD3 重构目标与约束
- `.planning/phases/08-md3-design-token-foundation/08-CONTEXT.md` — Phase 8 decisions (token naming, elevation, motion tokens, focus ring tokens)

### 现有代码 anchor
- `frontend/src/css/tokens.css` — MD3 令牌定义（motion duration/easing, elevation 0-5, focus ring 令牌已就位）
- `frontend/src/css/styles.css` — 需添加 state-layer/ripple/elevation-transition/disabled 统一规则
- `frontend/src/components/` — 现有 8 个组件需要 state-layer/Ripple 接入

### MD3 规范
- `https://m3.material.io/components/buttons/overview` — Button state-layer + ripple 规范
- `https://m3.material.io/components/cards/overview` — Card elevation transition 规范
- `https://m3.material.io/foundations/interaction/state-layers` — State-layer 色值/透明度规范
- `https://m3.material.io/styles/motion/easing-and-duration/tokens-specs` — Motion tokens
- `https://m3.material.io/foundations/accessible-design/minimum-touch-targets` — Touch target 48dp
- `https://fonts.google.com/icons` — Material Symbols 图标库
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`--md-motion-duration-{short,medium,long}`** + **`--md-motion-easing-{standard,emphasized}`**：Phase 8 已定义的 motion 令牌，Ripple/elevation 过渡直接消费
- **`--md-elevation-{0..5}`**：5 级阴影令牌，卡片 elevation-1→2 过渡直接使用
- **`--md-focus-ring-{outer,inner}`**：Phase 8 焦点环令牌 + styles.css 已有部分焦点环消费者（.btn:focus-visible 等）
- **`--md-color-primary`**：Ripple 涟漪色（12% opacity）和 state-layer（8/10/12/38%）的基础色
- **现有 `:focus-visible` 规则**（styles.css:471-485）：可直接扩展为 state-layer + focus ring 完整系统

### Established Patterns
- **CSS 变量驱动主题**：所有色值通过 `var(--md-*)` 引用，state-layer 色值按此模式扩展
- **`.btn:disabled` 已有 opacity 规则**：可作为 disabled 统一规则的起点
- **卡片 transition 已使用 motion tokens**：.card/dish-card 已有 `transition: all var(--md-motion-duration-medium) var(--md-motion-easing-emphasized)`
- **Guest 页面 hover 禁用模式**：`.guest-page .dish-card { cursor: default; transform: none; }` 为访客禁用模式提供了模式参考

### Integration Points
- `frontend/src/css/styles.css` — 主要添加位置：state-layer 工具类、ripple CSS、elevation 过渡调整、disabled 统一规则、触控 ≥48dp 全局规则
- `frontend/src/css/tokens.css` — 如需新增 state-layer 相关令牌
- `frontend/src/components/` — 新增 `Ripple.jsx` 组件 + 新增 `Icon.jsx` 组件骨架
- `frontend/package.json` — 新增 `@material-symbols/svg-400` 依赖
- `frontend/src/pages/` — 各页面的交互元素消费 state-layer / ripple（通过现有 CSS 类自动生效）

</code_context>

<specifics>
## Specific Ideas

- **Ripple 品牌色强调**：用户偏好 primary 12% opacity 涟漪（而非 MD3 标准的 on-surface 8%），让交互反馈更温暖
- **卡片 elevation 过渡 150ms**：用户偏好更干脆的抬升感，而非 MD3 标准的 250ms
- **全量替换现有 :hover 背景色**：用户希望一次性用 state-layer 系统替代所有零散的 hover background 规则
- **Material Symbols 渐进替换**：Phase 9 骨架 → Phase 10/11 组件内置 → Phase 12 最终清理
- **Playwright 脚本 + UAT 人工复检**：触控目标审计先用自动化脚本覆盖，再人工兜底
</specifics>

<deferred>
## Deferred Ideas

### Sidebar/Header 布局尺寸 MD3 化 — 属于 Phase 11 (COMPO-09)
- 用户希望 sidebar 和 header 也按 MD3 规范进行视觉优化
- 交互反馈（state-layer/ripple/focus-ring）已在 Phase 9 的 D-12 覆盖
- 实际布局尺寸（sidebar 宽度 80dp、header 高度 64dp MD3 化、active pill 样式等）属于 Phase 11 Navigation Components 的 COMPO-09 范围
- Phase 9 计划中注明 sidebar/header 的布局调整在 Phase 11 处理

### 主题选择器 UI（用户可自选主题）— 独立 future phase（from Phase 8）
- Phase 8 `tokens.css` 已按 `[data-theme="xxx"]` 结构铺路
- UI 实现（用户偏好持久化、主题管理）属于独立能力
</deferred>

---

*Phase: 9-Motion & State Layers*
*Context gathered: 2026-07-27*
