# Phase 10: Primitive Components - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

为前端创建 7 个 MD3 化 React primitive 组件（Button 4 variants × 3 sizes、IconButton、Card 3 variants、Input 2 variants + error、FAB 3 forms、Badge 3 variants、Chip 4 variants），同时**全量换皮**现有 30+ 调用点（替换 `<button className="btn-*">` 等为 `<Button variant=...>` 等组件用法），删除旧 CSS，保留所有事件绑定与业务逻辑零回归。Phase 11 之后再处理 Modal/Nav 等复合组件，Phase 12 仅做页面级重组 + 8dp 网格 + HUMAN-UAT。
</domain>

<decisions>
## Implementation Decisions

### 迁移策略与范围

- **D-01: 全量换皮（30+ 文件）**
  - Phase 10 不只创建 7 个 primitive 组件，还把现有 30+ 调用点的 `<button className="btn-primary">`、`<input className="form-input">`、`<div className="dish-card">` 等全部替换为 `<Button variant="filled">`、`<Input>`、`<Card>` 等组件用法。
  - 验证手段：Phase 10 跑 `npm run lint` + `npm run build` 确保 0 error；UAT 留给 Phase 12（"Page-Level Refactor + 8dp Grid + HUMAN-UAT"）。
  - Phase 12 之后只做页面级重组（页面结构、8dp 间距）+ UAT，不再处理 primitive 替换。

- **D-02: 换皮后立即删除旧 CSS**
  - 全量换皮后删除所有旧选择器：`.btn-primary/.btn-secondary/.btn-outline/.btn-icon/.btn-sm/.btn-lg/.btn/.card/.dish-card/.wish-card/.form-input/.fab/.badge-*` 系列（badge-warn/danger/success/info/accent/gold/muted/badge-count）以及 `.filter-chip`。
  - 调用点漏换会导致样式丢失（裸奔），需 grep 验证零残留才删 CSS（建议 grep 命令：`grep -rE 'className=.*(\bbtn-(primary|secondary|outline|icon|sm|lg)\b|\bcard\b|\bdish-card\b|\bwish-card\b|\bform-input\b|\bfab\b|\bbadge-(warn|danger|success|info|accent|gold|muted|count)\b|\bfilter-chip\b)' frontend/src/`）。

- **D-03: 6 个搜索栏紧凑按钮提取为 `.btn-search` 工具类**
  - 在 `AdminIngredientsPage.jsx`、`ChefDishesPage.jsx`、`AdminDishesPage.jsx` 各 2 个，共 6 处 `btn-sm` + inline style 覆盖（`padding: 4px 10px; fontSize: 0.75rem`）— 比 `btn-sm` 还小的紧凑变体（用于搜索栏）。
  - 提取为 `frontend/src/css/styles.css` 中的 `.btn-search` 工具类（与 `.btn-primary` 等平级，独立 class），用于紧凑搜索按钮。
  - `<Button>` 组件本身不引入 `size="xs"`（忠于 MD3 spec 仅 sm/md/lg），`.btn-search` 是项目专用工具类。
  - 调用方写法：`<button className="btn-search btn-primary">搜索</button>`（两个 class 拼接；plain CSS，无 CSS modules）。

- **D-04: Phase 10 验证：lint + build；UAT 留 Phase 12**
  - Phase 10 完成后跑 `npm run lint`（基线已知 ≥90 errors——Phase 10 不应增加新 error）+ `npm run build`（Vite 构建 0 error）。
  - 人工 UAT（包括 Playwright 触控目标审计）由 Phase 12 HUMAN-UAT 步骤执行。

### Icon 实现

- **D-05: 迁移到 Material Symbols SVG tree-shaking**
  - Phase 9 D-11 + RESEARCH.md:96 明确推迟的 SVG tree-shaking 在 Phase 10 执行。
  - 移除/废弃 `material-symbols` 字体包（NPM，已在 Phase 8 devDependencies），新增 `@material-symbols-svg/react`（2025 v1.0.38，purpose-built React + tree-shaking，替代过时的 `@material-symbols/svg-400` 2022 包）。
  - 删除 `frontend/src/css/` 中对 `material-symbols/outlined.css` 的 @import；token.css/styles.css 维持现状不动。
  - 重写 `frontend/src/components/Icon.jsx`：内部维护 `name → SVG 组件` 映射表（详见 D-06）。

- **D-06: Icon.jsx 维护 name→SVG 映射表**
  - 调用方 API 不变：`<Icon name="home" size={24} fill={0} weight={400} grade={0} />`。
  - 内部实现：`const ICONS = { home: HomeIcon, search: SearchIcon, ... }`，每个 entry 是从 `@material-symbols-svg/react` 单独 import 的组件（Vite 自动 tree-shake 未用图标）。
  - 新增图标时手动注册到 `ICONS` 表（可控、可静态分析）。

- **D-07: Phase 10 定义固定 ~30 图标集**
  - 完整子集（30 个）：`home / search / add / edit / delete / check / close / restaurant / menu / person / favorite / star / schedule / notifications / share / settings / logout / arrow-back / arrow-forward / more-vert / more-horiz / chef / visibility / visibility-off / info / warning / error / refresh / filter / sort / place`
  - 选集依据：现有 68 处 emoji 出现位置 + MD3 spec 高频图标 + Phase 10/11/12 预见需求（modal close、nav rail、toast action 等）。
  - 后续 Phase 11/12 如需新增图标，需修改 Icon.jsx 映射表（可接受代价）。

### 组件与 CSS 文件组织

- **D-08: 新建 `frontend/src/components/primitives/` 子目录**
  - 7 个 primitive 组件（Button、IconButton、Card、Input、FAB、Badge、Chip）+ 配套 .css 全部放 `primitives/`。
  - 与现有 domain 组件（Sidebar / BottomBar / DishCard / WishCard / ConfirmModal 等）泾渭分明，primitive 与 composite 语义清晰。
  - 现有 `frontend/src/components/Icon.jsx` 需迁移到 `primitives/Icon.jsx`（同时重写为 SVG tree-shaking 版本）。
  - 现有 `frontend/src/components/Ripple.jsx` 也迁到 `primitives/Ripple.jsx`（Phase 9 已有，逻辑不变，仅迁移路径）。

- **D-09: 每个 primitive co-located `.css` 文件**
  - 模式：`primitives/Button.jsx` + `primitives/Button.css`（与现有 `Ripple.jsx` + `ripple.css` 模式一致）。
  - 组件内 `import './Button.css'`。
  - 7 个新 CSS 文件，纯 global CSS，无 CSS Modules。

- **D-10: 新增 `primitives/base.css` 装公共规则**
  - 共享样式集中在 `frontend/src/components/primitives/base.css`：
    - state-layer 通用类（hover/pressed/focused/disabled 的 `::before` 模式）
    - ripple 容器基础（与 Phase 9 `ripple.css` 模式一致）
    - MD3 焦点环（`--md-focus-ring-outer/inner` 应用规则）
    - 触控目标 ≥48dp 通用规则
  - 各组件 .css 通过 `@import './base.css';` 复用。
  - main.jsx 不直接 import base.css（仅各组件 .css 内部 import 即可——Vite 自动汇总到 bundle）。

### 关键技术决策

- **D-11: Input 组件支持多种 label 模式**
  - 三种用法：
    1. `<Input label="名称" />` —— MD3 浮动 label（默认 Outlined variant）
    2. `<Input label="名称" placeholder="..." />` —— 浮动 label + placeholder
    3. `<Input />`（无 label）—— 当作普通受控 input
  - 现状 12 个表单调用点中，`<label className="form-label">Name</label><input className="form-input" placeholder="...">` 模式继续可用——调用方传入 `label` prop 即启用 MD3 浮动 label，不传则维持 MD3 Outlined/Filled 但无浮动 label（视觉接近现有 form-label 在上方的样式）。
  - 实现：CSS-only `:placeholder-shown` + `:not(:placeholder-shown)` 选择器处理浮动，无 JS state（最简单且无 controlled/uncontrolled 边界）。
  - Outlined/Filled 两种 variant + 错误态（`error` prop + 辅助文本 slot）。
  - focus ring + floating label 动画使用 `--md-motion-duration-short` + `--md-motion-easing-standard`。

- **D-12: Ripple 由 primitive 组件内部内置**
  - Button / IconButton / FAB / Card 组件内部自己 render `<Ripple>`（仅当 `disabled === false`）。
  - 调用方写 `<Button onClick={...}>...</Button>` 即可——无需手动包裹。
  - 原 `<Ripple disabled={...} style={{ width: '100%' }}>` 外部调用方式保留（不删除 Ripple.jsx 公开 API），让 WishCard / Header / Sidebar 等已有调用继续工作（这些是 Phase 10 之外的 composite，不在 30+ 全量换皮范围）。
  - 内部实现注意：`onClick` 监听从 `Ripple` 容器 ref 上转发（用 `React.cloneElement` 或 `forwardRef` 包装 button DOM 节点，确保 click 事件正常冒泡）。

- **D-13: Domain Card 完全重新抽象为 slot-based `<Card>`**
  - DishCard / WishCard / GuestDishCard 重构为使用新的 `<Card>` primitive：
    - `<Card variant="elevated">` 默认（elevation-1，hover elevation-2 自动继承 Phase 9 过渡）
    - slots：`image`（可选，aspect-ratio 4/3）、`header`、`body`（必需）、`footer`（可选）
    - JSX 模式：`<Card image={<img src={dish.image_url} />} footer={<Badge />}>...</Card>`
  - 3 个 domain card 变成薄包装，业务数据（dish/wish）只通过 props 传入，不再有自包含 className="dish-card" 逻辑。
  - 删除 `.dish-card` / `.wish-card` / `.guest-dish-card` 旧 CSS（由 Card primitive 接管视觉）。
  - 副作用：WishCard 的 danger button（D-08 撤销/拒绝按钮）、WishFormModal 的字段布局等 domain 内部布局不在 Card primitive 范围内——这些属于 domain 组件内部实现，不影响 Card primitive 设计。

- **D-14: Chip 组件实现完整 MD3 4 变体**
  - `variant="assist"` — 不可点击、带 leading icon 或勾选
  - `variant="filter"` — 可点击选中/取消（替换现有 `.filter-chip`）
  - `variant="input"` — 带删除（leading icon + trailing close）
  - `variant="suggestion"` — 不可点击、带 leading icon
  - Phase 10 全部实现 4 变体（即使当前只用 filter），为 Phase 11/12 预留——避免后续阶段再补充。

- **D-15: Badge 组件仅视觉，保留 `statusBadge()` 工具**
  - 新 `<Badge>` 只负责 MD3 视觉（`variant="assist|filter|state"` + `tone` 调色：primary/secondary/tertiary/error/success/warn/info/muted）。
  - `frontend/src/utils/index.js` 中的 `statusBadge()` 工具保留原状（中文状态映射：`pending → 待处理 / badge-warn` 等）。
  - 调用方写法：`<Badge variant="state" tone="warn">{statusBadge(wish.status).text}</Badge>`。
  - 旧 `<Badge>`（components/Badge.jsx）重构为新 `<Badge>` primitive，但保持 `statusBadge()` 工具函数不变（业务语义独立于视觉）。
  - 调用点改写模式：`<Badge status={...} />`（现有 Badge.jsx 接 `status` 或 `text`/`type` prop）→ `<Badge variant="state" tone={...}>{statusBadge(status).text}</Badge>` 或保留 `<Badge status={...} />` 但 Badge.jsx 内部自动调用 `statusBadge()`（向后兼容调用点）。

- **D-16: Extended FAB 用 `variant="extended"` + `label` prop**
  - API：`<FAB variant="extended" icon="add" label="新建菜品" />`（与 Button variant API 一致）。
  - 3 种形态由 variant + size 组合：
    - `<FAB icon="add" />` —— 56dp 圆形（默认）
    - `<FAB variant="extended" icon="add" label="新建菜品" />` —— 56dp 高 Extended FAB（含 label）
    - `<FAB size="small" icon="add" />` —— 40dp Small FAB（圆角 MD3 16px，**不**走 `radius-full`——遵循 Phase 8 D-08）
  - FAB 不放在 `Button` 子目录或独立导出（`<FAB />` 单组件，统一入口）。

- **D-17: Button loading 状态内置 spinner**
  - `<Button loading={isPending} onClick={...}>保存</Button>`。
  - `loading === true` 时：自动 `disabled` + label 左侧显示 16dp 圆形 spinner（用 SVG `<circle>` + CSS `animation: spin 0.8s linear infinite`，颜色继承 `currentColor`）。
  - spinner 写在 `Button.jsx` 内联（不抽独立组件，单一使用场景）。
  - 原 disabled 文案替换（如 "保存中..."）的旧模式在 Phase 10 调用点改写时统一升级为 `loading={isPending}`。

### the agent's Discretion

- **Card slot 具体命名**（`image` / `header` / `body` / `footer` 是推荐，可按 domain card 实际结构微调，例如 WishCard 可能需要 `actions` slot 容纳多按钮）
- **Card 各 variant 的 elevation 数值**（Elevated = elevation-1 default + hover elevation-2 / Filled = no shadow + surface-container-lowest fill / Outlined = 1px outline-variant + no shadow——按 MD3 spec 推导）
- **Input 浮动 label 字体大小/位移精确数值**（MD3 spec 给 floating label 12sp 字体 + 16dp 上移，具体数值在 CSS 中体现）
- **Button `size="sm|md|lg"` 精确 padding/fontSize 数值**（MD3 spec：sm=10px padding / md=16px / lg=24px，fontSize 14/14/16，按 spec 推导）
- **IconButton 默认 40dp / FAB-density 48dp 切换**（`size="default" | "fab"` 或 `density="default" | "fab"`，由 agent 决定 API 命名）
- **MD3 Badge tone 命名**（`tone="primary|secondary|tertiary|error|warn|success|info|muted"` 是推荐，可与现有 `statusBadge()` 的 `cls` 字段名映射对齐）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目上下文
- `.planning/ROADMAP.md` — Phase 10 goal + 3 plans breakdown (10-01/10-02/10-03) + 5 success criteria
- `.planning/REQUIREMENTS.md` — COMPO-01..07 / LOGIC-01..03 requirements definitions
- `.planning/PROJECT.md` — v1.2 MD3 重构目标与约束（仅换皮、保留业务逻辑）
- `.planning/phases/08-md3-design-token-foundation/08-CONTEXT.md` — Phase 8 decisions: token naming (--md-*)、elevation 5 级、motion tokens、FAB 16px (D-08)
- `.planning/phases/09-motion-state-layers/09-CONTEXT.md` — Phase 9 decisions: Ripple.jsx (D-01)、state-layer (D-04..D-06)、卡片纯 elevation 过渡 (D-07)、48dp 触控 (D-09)、disabled 统一 (D-10)、Material Symbols 骨架 (D-11)
- `.planning/phases/09-motion-state-layers/09-UI-SPEC.md` — Phase 9 UI 设计契约（state-layer、focus ring、touch target 数值规范）
- `.planning/phases/09-motion-state-layers/09-RESEARCH.md` §Material Symbols research — `@material-symbols-svg/react` (2025 v1.0.38) 作为 SVG tree-shaking 推荐包

### MD3 规范
- `https://m3.material.io/components/buttons/overview` — Button 4 variants (Filled/Tonal/Outlined/Text) + 3 sizes + state-layer 规范
- `https://m3.material.io/components/cards/overview` — Card 3 variants (Elevated/Filled/Outlined) + elevation 规范
- `https://m3.material.io/components/text-fields/overview` — Input Outlined/Filled variants + 浮动 label 规范
- `https://m3.material.io/components/floating-action-button/overview` — FAB / Extended FAB / Small FAB 规范
- `https://m3.material.io/components/badges/overview` — Badge 规范
- `https://m3.material.io/components/chips/overview` — Chip 4 variants (assist/filter/input/suggestion) 规范
- `https://m3.material.io/components/icon-buttons/overview` — IconButton 规范
- `https://m3.material.io/styles/shape/applying-shape` — 5 级圆角体系应用
- `https://m3.material.io/styles/elevation/tokens` — Elevation 5 级 + surface tint 透明度
- `https://fonts.google.com/icons` — Material Symbols 图标库（图标选集依据）

### 现有代码 anchor
- `frontend/src/css/tokens.css` — Phase 8 MD3 令牌定义（--md-radius-*, --md-color-*, --md-elevation-*, --md-spacing-*, --md-motion-*, --md-focus-ring-*, --md-state-layer-*）
- `frontend/src/css/styles.css` — Phase 9 现有 .btn-*、.card、.dish-card、.form-input、.fab、.badge-*、.filter-chip 样式（将被删除）
- `frontend/src/css/ripple.css` — Phase 9 Ripple 容器基础样式（参考 base.css 设计）
- `frontend/src/components/Ripple.jsx` — Phase 9 Ripple 组件（需迁到 primitives/Ripple.jsx）
- `frontend/src/components/Icon.jsx` — Phase 9 Material Symbols font skeleton（需重写为 SVG tree-shaking + 迁到 primitives/）
- `frontend/src/components/Badge.jsx` — 现有 Badge（接 statusBadge util + type prop，重构为新 primitive）
- `frontend/src/components/DishCard.jsx` — 现有 domain card（重构为 slot-based Card）
- `frontend/src/components/WishCard.jsx` — 现有 domain card（含 Ripple + danger button，重构为 slot-based Card）
- `frontend/src/components/GuestDishCard.jsx` — 访客 domain card（重构为 slot-based Card）
- `frontend/src/utils/index.js` — `statusBadge()` 工具函数（保留，新增 tone 映射可选）

### NPM 依赖
- `@material-symbols-svg/react` (2025 v1.0.38) — 替换 `@material-symbols/svg-400` (2022 stale) 与 `material-symbols` (font-based)，需新增到 frontend/package.json dependencies
- `material-symbols` (v0.45.9) — 当前在 devDependencies，Phase 10 后从 devDependencies 移除

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`--md-state-layer-{hover,pressed,focused,disabled}` + `--md-state-layer-{primary,on-surface}`**（tokens.css:185-190）：Phase 9 已就位状态层系统，primitives/base.css 直接消费。
- **`--md-elevation-{0..5}`**（tokens.css:162-167）：5 级阴影令牌，Card elevated variant 直接使用 elevation-1 → elevation-2。
- **`--md-motion-duration-{short,medium,long}` + `--md-motion-easing-{standard,emphasized}`**（tokens.css 已定义）：ripple / elevation / focus ring / label 浮动 / spinner 旋转等动画均消费。
- **`--md-focus-ring-{outer,inner}`**（tokens.css:181-182）：MD3 焦点环应用于 Button / IconButton / FAB / Input focus-visible。
- **`--md-radius-{xs,sm,md,lg,xl,full}`**（tokens.css:144-149）：Button 用 sm、Card 用 md、FAB 用 md（16px，D-08）、Chip/Badge 用 full、Modal/Dialog 用 lg（Phase 11）。
- **`<Ripple>` 组件**（components/Ripple.jsx）：Phase 9 已就位；primitive Button/Card 内部 import 并 disabled-prop 控制。
- **`<Icon>` 组件**（components/Icon.jsx）：Phase 9 骨架，需重写为 SVG tree-shaking。
- **`statusBadge()` 工具**（utils/index.js:52）：现有中文状态映射保留，新 Badge 通过 tone 字段与之映射。

### Established Patterns

- **CSS 变量驱动主题**：所有视觉通过 `var(--md-*)` 引用——primitives 内部样式零硬编码色值/直角。
- **CSS class 拼接**：`className="btn btn-primary btn-sm"`（30+ 文件使用此模式），Phase 10 换皮后变成 `<Button variant="filled" size="sm">`（无需 className 拼接）；特殊类 `.btn-search` 仍是 className 拼接（项目专用工具类）。
- **同目录多文件**：现有 `.btn-primary::before` 状态层规则在 styles.css 多处重复出现（每个 variant 独立 rule），Phase 10 抽到 primitives/base.css 共享——打破此 pattern。
- **内联 style 透传**：WishCard 中 danger button 用 `style={{ borderColor: ..., color: ... }}` 内联——Phase 10 重构 Card slot 后，这种 inline style 仅出现在 domain card 内部按钮，primitive 不需要支持此模式。
- **Form label 在 input 之外**：现有 12 个表单调用点 `<label className="form-label">Name</label><input className="form-input">`——Input 组件用 `label` prop 提供 MD3 浮动 label，无 label 时回退到无 label 模式。

### Integration Points

- **`frontend/src/main.jsx`**：CSS 引入入口（`./index.css` → tokens.css + styles.css）——不变；primitive CSS 由 Vite 自动 bundle。
- **`frontend/package.json`**：新增 `@material-symbols-svg/react` dependency；移除 `material-symbols` devDependency。
- **`frontend/src/components/`**：新增 `primitives/` 子目录；现有 Icon.jsx / Ripple.jsx / Badge.jsx 迁移到 primitives/ 并重写/重构；其余 domain 组件（Sidebar/Header/BottomBar/DishCard/WishCard/GuestDishCard/各种 Modal）需更新 JSX 引用路径与组件用法。
- **`frontend/src/css/styles.css`**：换皮完成后删除大量旧 `.btn-*`、`.card`、`.dish-card`、`.wish-card`、`.form-input`、`.fab`、`.badge-*`、`.filter-chip` 选择器（按 D-02）。
- **30+ 消费文件**：所有 `<button className="btn-*">`、`<input className="form-input">`、`<div className="dish-card">`、`<div className="wish-card">` 等调用点需全量替换为 primitive 组件用法。
- **后端零改动**：本 phase 仅前端换皮，backend/app/* 无任何修改。

</code_context>

<specifics>
## Specific Ideas

- **Material Symbols 用 @material-symbols-svg/react 而非 @material-symbols/svg-400**：Phase 9 RESEARCH.md 明确推荐 2025 的 react 包，废弃 2022 过时包——这是 Phase 10 的关键迁移点。
- **Ripple 内部内置但保留外部 API**：primitive Button/Card 内部内置 Ripple，但 Ripple.jsx 公开 API 不变（WishCard / Sidebar / Header 等 composite 继续手动包裹）——双轨兼容。
- **Card 完全 slot 抽象**：DishCard/WishCard/GuestDishCard 重构为薄包装，业务内容通过 slot 传入——这是 v1.2 MD3 重构中最深的一次组件重构（Phase 12 页面级重组的基石）。
- **30 个图标精确定义**：所有图标名称在 D-07 列出，是 Phase 10 Icon.jsx 映射表的精确内容——planner 不需要再做选集决策。
- **`.btn-search` 工具类**：项目专用工具类，独立 className（不引入 Button size="xs"），保留 MD3 spec 纯洁性。
- **UAT 留 Phase 12**：本 phase 只跑 lint+build 0 error 即可——人工/Playwright 验收由 Phase 12 HUMAN-UAT 步骤统一处理。
- **loading 状态纯 SVG spinner**：无依赖、CSS animation、`currentColor` 继承——比引入 spinner NPM 包更轻。
- **statusBadge 工具不迁移**：utils/index.js 的 statusBadge() 函数保留原状——业务语义与视觉分层，新 Badge 仅消费 tone 字段。

</specifics>

<deferred>
## Deferred Ideas

### 页面级 emoji → Icon 全面清理 — Phase 12
- 68 处 emoji 散落在 components/pages 中，Phase 10 替换了 primitive 组件内部的 Icon 用法，但页面内 inline emoji（loading.jsx / emptyState() util / 各种 page header emoji）不在 Phase 10 范围。
- Phase 12 "Page-Level Refactor + 8dp Grid + HUMAN-UAT" 时统一清理页面级 emoji → `<Icon>`。

### Sidebar / Header / BottomBar 布局尺寸 MD3 化（80dp Navigation Rail） — Phase 11 (COMPO-09)
- Phase 9 D-12 已为 sidebar/header 接入 state-layer/focus ring，但布局尺寸（sidebar 80dp、active pill 等）属于 Phase 11 Navigation Rail / Navigation Bar 范围。

### 主题选择器 UI — 独立 future phase
- Phase 8 D-04 预留 `[data-theme="xxx"]` token 结构，UI 实现（用户偏好持久化、ThemeProvider、主题选择器）属于独立能力。

### Input 错误态的具体校验规则（form validation 库）
- 本 phase Input 组件仅暴露 `error` prop + 辅助文本 slot，具体校验规则（必填、邮箱、字符长度等）由调用方控制，不引入 formik/react-hook-form 等验证库。

</deferred>

---

*Phase: 10-Primitive Components*
*Context gathered: 2026-07-27*