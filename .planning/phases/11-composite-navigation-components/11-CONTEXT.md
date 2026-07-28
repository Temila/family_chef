# Phase 11: Composite & Navigation Components - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

为前端创建 6 个 MD3 化 React composite 组件——Modal/Dialog（Basic/Full-screen）、Navigation Rail（PC 侧栏 80dp）、Navigation Bar（手机底部栏 80dp）、Snackbar/Toast（Rich tone + 队列）、List Item（1/2/3-line slot-based）、Divider（inset/full），并**全量迁移**现有调用点（22 个 modal-overlay 站点、213 个 showToast 调用、Sidebar 240px→80dp 重构、BottomBar MD3 化、3 个 .list-item 站点）。Phase 10 primitives（Button/IconButton/Card/Input/FAB/Badge/Chip）+ Ripple + 30 个 Icon 是本 phase 消费基础；保留所有事件绑定与业务逻辑零回归；后端零改动。
</domain>

<decisions>
## Implementation Decisions

### Modal/Dialog 组件

- **D-01: 统一 `<Modal>` primitive（单一组件、双变体）**
  - 单组件双 variant：`<Modal variant="basic|full-screen" open onClose title closeIcon header footer actions>{children}</Modal>`
  - slots：`header`（自定义 header slot，覆盖默认 title + close）、`footer`（自定义 footer slot）、`actions`（标准操作按钮组，Phase 11 暂不强制使用）、`children`（modal-body 内容）
  - `closeIcon` prop 控制是否渲染右上角 ✕（默认 `true`；WishFormModal 显式 `false`，由 footer actions 关闭）
  - 全量替换：22 个站点（7 个独立 Modal 组件 + 15 个 inline `modal-overlay`）→ `<Modal>` 重写
  - 删除 `frontend/src/css/styles.css` 中的 `.modal-overlay` / `.modal-content` / `.modal-header` / `.modal-body` / `.modal-footer` / `.modal-close` 全部选择器（与 Phase 10 D-02 同样验证手段：grep 残留 = 0）

- **D-02: full-screen 变体——caller 显式 opt-in**
  - `variant="full-screen"` 占用 100vw × 100vh，header pin 顶部、close icon 左上
  - caller 显式传入，无 auto-detection（避免 magic）；WishForm / CreateLink 可在 mobile 上使用 full-screen（max-width: 600px 媒体查询由 caller 处理）
  - Esc 键关闭、focus trap、背景滚动锁定、`role="dialog"` `aria-modal="true"` 等 a11y 行为继承 Basic 变体（无需重复实现）

- **D-03: header/footer slots + actions 必填为 ReactNode**
  - `header` slot 覆盖默认 `title + closeIcon` 渲染；`footer` slot 覆盖默认 actions 渲染
  - `actions` prop = ReactNode 数组（通常是 1-3 个 `<Button>`）；`<Modal>` 渲染时自动包 `<div class="modal-actions">` flex right-aligned
  - 7 个 Modal 组件迁移模式：变成 thin wrapper，pass `<WishForm>` / `<ConfirmForm>` 等表单内容作为 children；delete internal `<div className="modal-overlay">` 结构
  - 内部状态机：`onClose` 由 backdrop 点击 / close icon / Esc 触发，调用方提供 cancel handler

### Snackbar/Toast 组件

- **D-04: 保留 `showToast(message, type)` API + 新增 Rich tone 视觉**
  - 213 个 `showToast(message, type='success')` 调用零回归——签名不变、参数不变
  - 内部升级：`type` 映射到 MD3 Rich tone 视觉——左侧 4dp 色条 + icon + inverse-surface 卡片
  - 4 个 tone：`success`（primary）、`warn`（tertiary/amber）、`error`（error/red）、`info`（secondary）
  - 视觉：bg = `--md-color-inverse-surface`（深灰）；text = `--md-color-inverse-on-surface`；左侧 4dp 色条用对应 tone color；icon 在色条右侧

- **D-05: 队列（queue）支持**
  - 内部用 React state 数组维护 active snackbars（最多同时显示 3 条；超过排队）
  - 每条独立计时器（默认 success/info = 4000ms、warn/error = 6000ms）
  - 新消息 push 到顶部，旧消息向下挤压（保留位置感）
  - 实现：`SnackbarProvider` 内部 `useState<SnackbarItem[]>` + `useRef<Set<timeoutId>>` 管理 timer；item 包含 `id` / `message` / `tone` / `createdAt` / `timerId`

- **D-06: 位置——顶部固定 + 下堆叠**
  - position: `fixed; top: 80px; left: 50%; transform: translateX(-50%)`（与现状 `.toast { top: 80px }` 一致；不重建用户习惯）
  - 多条堆叠：最新的在顶部（旧的在下方依次消失）
  - Mobile offset 调整：top: `calc(env(safe-area-inset-top, 0px) + 16px)`
  - PC 端不与 BottomBar 冲突（BottomBar 是 mobile-only，PC 端无此元素）

- **D-07: 自动消失 + 手动关闭**
  - 自动消失：4 秒（success/info）/ 6 秒（warn/error）；hover 时暂停计时（避免用户错过）
  - 手动关闭：右侧 ✕ 按钮（默认 always render）；点 ✕ 立即移除
  - Phase 11 不引入 `action` 按钮（Phase 12 撤销/重试场景再补）；当前 API 仅 `message` + `type` 两参数

- **D-08: `ToastContext` 升级为 `SnackbarContext` 但保留 useToast 钩子别名**
  - `ToastContext.jsx` 内部重写为 `SnackbarProvider`，导出 `SnackbarContext`（含 showToast）
  - `useToast()` 钩子保留作为别名（兼容 213 个 `import { useToast }` 调用），内部从 `SnackbarContext` 取值
  - 旧 `frontend/src/contexts/ToastContext.jsx` 替换为新 `frontend/src/contexts/SnackbarContext.jsx`；或保留文件名但内部全面重写（推荐保留文件名减少 import 改动）
  - `frontend/src/App.jsx` 中 `<ToastProvider>` 标签改名 `<SnackbarProvider>`（仅 1 处改动）

### Navigation Rail（PC 侧栏）

- **D-09: 严格 MD3 80dp 窄边栏**
  - `pc-sidebar` 宽度 240px → **80dp**（`width: 80px`）
  - 仅渲染 icon（隐藏 label）；active state 用 MD3 indicator pill（primary-container 背景 + 32dp 高的 pill 容器在 icon 周围）
  - 80dp 触控目标保证：每个 nav item 高度 ≥ 80dp（与 MD3 spec 一致）；icon 居中 24dp
  - 现有 `.pc-sidebar-item.active { background: primary-container }` 已就位——升级为 MD3 indicator pill（pill 是 56dp 宽、24dp 高，居中在 80dp item 中）

- **D-10: 被挤出的 logo / user info / logout 移到 Sidecar Header**
  - `frontend/src/components/Header.jsx` 重写为顶部 sidecar bar：
    - 左侧：`🍲 家味` logo + `Family Chef` 副标题
    - 中间：当前页 page title（通过 `useLocation` 推断，或 caller 传入）
    - 右侧：用户头像（点击下拉：`display_name` + role + 主题切换 + 退出）
  - `Sidebar.jsx` 仅保留 80dp 窄栏：顶部 logo icon（缩小到 32dp）、中部 nav items、底部 user avatar（48dp）
  - `frontend/src/App.jsx` 中 `<Sidebar />` 与 `<main className="pc-main">` 之间插入 `<Header />`（仅 PC 端显示，< 1024px 隐藏）

- **D-11: Sidebar 80dp 触控 + active indicator pill**
  - 每个 `.pc-sidebar-item` 高度 80dp（`min-height: 80px`）；icon 居中；hover state-layer（已 Phase 9 D-12）；active pill 居中（width: 56px, height: 32px, border-radius: 16px, bg: primary-container）
  - Badge count（`usePendingOrderCount`）继续保持——pill 右上角定位
  - Ripple 由 primitive Phase 10 D-12 已提供；Sidebar item 改用 `<Ripple>` 包裹 `<button>` 维持现结构

### Navigation Bar（手机底部栏）

- **D-12: 80dp 高度 + active indicator pill + label 始终可见 + safe-area 适配**
  - `.tab-item` 高度 80dp（现状已通过 `--md-nav-height` token 实现）；active indicator pill 居中（width: 64px, height: 32px, pill 形状，bg: secondary-container）
  - label 始终可见（`.tab-label` 字体 12sp = 0.75rem，weight 500）
  - safe-area 适配：`padding-bottom: env(safe-area-inset-bottom)`（已实现，验证 + 调优）
  - transition: pill background 颜色切换 `var(--md-motion-duration-short) var(--md-motion-easing-standard)`

- **D-13: 现有 Sidebar / BottomBar 集成——行为零回归**
  - 角色路由（admin / chef / user）的 navItems / tabs 列表保持现状，仅 emoji → Icon 替换（`home` / `menu` / `chef` / `person` / `logout` / `notifications` 等，30 icon 集已覆盖）
  - `usePendingOrderCount` Badge 显示保持
  - `logout` / `navigate(path)` 行为不变
  - 访客页面（GuestOrderPage）**不**显示 Sidebar / BottomBar（现状已正确，保持）

- **D-14: FAB-in-rail 棆位——保持现状（页面层 Floating FAB）**
  - FAB 继续在页面层（`.fab` className fixed positioning），不在 Sidebar 里
  - Phase 10 已统一 FAB 视觉（16dp 圆角、primary-container 填充、elevation-3），无需 Phase 11 额外工作

### List Item 组件

- **D-15: slot-based `<ListItem>` primitive（1/2/3-line 全覆盖）**
  - API：`<ListItem variant="1-line|2-line|3-line" onClick? disabled?>{slots}</ListItem>`
  - 子组件（compound components）：
    - `<ListItem.Leading>` — 40×40dp 容器（image/avatar/icon，居中）
    - `<ListItem.Content>` — 文本容器
    - `<ListItem.Headline>` — 主标题（必需；1-line 时单行截断；2/3-line 时 headline + supporting）
    - `<ListItem.Supporting>` — 副标题（可选；仅 2/3-line 渲染）
    - `<ListItem.Trailing>` — 尾部（icon/badge/checkbox；可选；可包含可点击元素，stopPropagation 自动）
  - 视觉：background = `--md-color-surface`；hover state-layer；active state-layer（list item click）；底部 1px `--md-color-outline-variant` divider（last-child 除外，由 List Item 内部控制）
  - 迁移：3 个 JSX 站点（AdminHomePage / InvitationsModal / InvitationsSection）改用 `<ListItem>`

- **D-16: 整行 onClick + clickable 标志**
  - 有 `onClick` prop 时：`clickable=true`（cursor: pointer + Ripple 内部内置 + state-layer hover）
  - 无 `onClick` prop 时：`clickable=false`（cursor: default + 无 ripple/state-layer，纯展示）
  - `<ListItem.Trailing>` 子元素点击自动 `stopPropagation`（通过 compound component 内部捕获 + `e.stopPropagation()`），避免点 trailing 按钮触发整行 onClick
  - `disabled` prop：`disabled=true` → opacity 0.38 + cursor not-allowed + 无 ripple/state-layer（与 Phase 9 D-10 disabled 统一规则一致）

- **D-17: `<Divider>` 独立组件**
  - `<Divider />`（全宽）或 `<Divider inset />`（左侧缩进 56dp，对齐 headline 起点）
  - 视觉：1px 高 `--md-color-outline-variant` 横线
  - `<ListItem>` 内部自动在 item 间加 divider（last-child 除外）；独立使用时 caller 显式放置
  - 现有 `.list-item { border-bottom }` 改由 `<Divider>` 接管——删除 styles.css 中的 list-item 边框规则

### 文件组织 & 迁移策略

- **D-18: 新建 `frontend/src/components/composites/` 子目录**
  - 6 个 composite 组件（Modal、Sidebar、BottomBar、Snackbar、ListItem、Divider）+ 配套 .css 全部放 `composites/`
  - 与 Phase 10 `primitives/` 子目录并存；primitive 与 composite 语义清晰
  - 现有 `Sidebar.jsx` / `BottomBar.jsx` / `ToastContext.jsx` / `ConfirmModal.jsx` / `WishFormModal.jsx` 等迁移到 `composites/` 并重写

- **D-19: 每个 composite co-located `.css` 文件**
  - 模式：`composites/Modal.jsx` + `composites/Modal.css`（与 Phase 10 primitives/ 模式一致）
  - 组件内 `import './Modal.css'`
  - Snackbar 不单独放 CSS（与 ToastContext 现有结构一致）

- **D-20: 全量迁移 + 立即删除旧 CSS（与 Phase 10 D-02 模式）**
  - Phase 11 Plan 2 + 3 全量换皮完成后删除 styles.css 中：
    - `.modal-overlay` / `.modal-content` / `.modal-header` / `.modal-body` / `.modal-footer` / `.modal-close`
    - `.pc-sidebar` / `.pc-sidebar-item` / `.pc-sidebar-header` / `.pc-sidebar-logo` / `.pc-sidebar-subtitle` / `.pc-sidebar-nav` / `.pc-sidebar-footer` / `.pc-sidebar-user` / `.pc-sidebar-icon` / `.pc-sidebar-footer-actions`
    - `.bottom-bar` / `.tab-item` / `.tab-icon` / `.tab-label`
    - `.list-item` / `.list-item-img` / `.list-item-info` / `.list-item-name` / `.list-item-meta`
    - `.toast` / `.toast-success` / `.toast-error` / `@keyframes slideDown`
  - 验证手段：grep -rE 'className=.*(\bmodal-(overlay|content|header|body|footer|close)\b|\bpc-sidebar(-item|...)\b|\bbottom-bar\b|\btab-item\b|\blist-item\b|\btoast\b|\btab-icon\b|\btab-label\b)' frontend/src/ → 期望 0 残留

- **D-21: 验证手段——lint + build + UAT 留 Phase 12**
  - Phase 11 完成后跑 `npm run lint`（基线已知 ≥90 errors——Phase 11 不应增加新 error）+ `npm run build`（Vite 构建 0 error）
  - Playwright 触控目标审计 + HUMAN-UAT 留给 Phase 12 "Page-Level Refactor + 8dp Grid + HUMAN-UAT"

### the agent's Discretion

- **Modal close icon 字符**：MD3 spec 推荐 `close` Icon，但现有 7 个 Modal 全部用 `✕` 字符——保留 `✕` 还是切换到 `<Icon name="close">` 由 agent 决定（视觉一致 vs MD3 native）
- **ListItem.Headline 默认 ellipsis 行为**：单行截断 + 多行展开（`text-overflow: ellipsis` for 1-line / `-webkit-line-clamp: 2` for 2-line 等）；具体 CSS 由 agent 决定
- **Snackbar tone 色条颜色精确值**：success = primary、warn = tertiary、error = error、info = secondary（与现有 `--md-color-*` token 一致）；具体 hex/HSL 由 agent 推导
- **Sidebar 80dp 后 logo icon 选择**：🍲 emoji（现状）vs `restaurant` Icon（30 icon 集内）；agent 决定（推荐 Icon 以 MD3 一致性）
- **BottomBar active indicator pill 颜色**：secondary-container（MD3 spec）vs primary-container（与 Sidebar active 一致）；agent 决定
- **Divider 缩进数值**：inset = 56dp（MD3 spec 对齐 headline）vs 16dp（简单左 padding）；agent 决定
- **`<ListItem>` 内部 props 透传**：onClick / disabled / className / style 全部透传到根 `<div>` / `<button>`；agent 决定 root element 是 `<div>` 还是 `<button>`（onClick 时为 button，无 onClick 时为 div）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目上下文
- `.planning/ROADMAP.md` — Phase 11 goal + 3 plans breakdown (11-01/11-02/11-03) + 4 success criteria
- `.planning/REQUIREMENTS.md` — COMPO-08..12 / LOGIC-01..03 requirements definitions
- `.planning/PROJECT.md` — v1.2 MD3 重构目标与约束（仅换皮、保留业务逻辑）
- `.planning/phases/08-md3-design-token-foundation/08-CONTEXT.md` — Phase 8 decisions: token naming (--md-*)、elevation 5 级、motion tokens、FAB 16px (D-08)
- `.planning/phases/09-motion-state-layers/09-CONTEXT.md` — Phase 9 decisions: Ripple.jsx (D-01)、state-layer (D-04..D-06)、卡片纯 elevation 过渡 (D-07)、48dp 触控 (D-09)、disabled 统一 (D-10)、Material Symbols 骨架 (D-11)、Sidebar/Header state-layer (D-12)
- `.planning/phases/10-primitive-components/10-CONTEXT.md` — Phase 10 decisions: primitives/ 子目录 (D-08)、Card slot-based (D-13)、Ripple 内置 (D-12)、30 icon 集 (D-07)、base.css 共享 (D-10)

### MD3 规范
- `https://m3.material.io/components/dialogs/overview` — Modal/Dialog (Basic / Full-screen) + scrim + elevation-3 + 24px 圆角规范
- `https://m3.material.io/components/navigation-rail/overview` — Navigation Rail 80dp 宽 + active indicator pill 规范
- `https://m3.material.io/components/navigation-bar/overview` — Navigation Bar 80dp 高 + label 始终可见 + active pill 规范
- `https://m3.material.io/components/snackbar/overview` — Snackbar inverse-surface + queue + action button 规范
- `https://m3.material.io/components/lists/overview` — List Item 1-line/2-line/3-line + leading/trailing icon 规范
- `https://m3.material.io/components/dividers/overview` — Divider inset/full + --md-color-outline-variant 规范
- `https://m3.material.io/styles/shape/applying-shape` — 5 级圆角体系应用（Modal = `--md-radius-lg: 24px`）
- `https://m3.material.io/styles/elevation/tokens` — Modal elevation-3 + surface tint 透明度
- `https://m3.material.io/styles/motion/easing-and-duration/tokens-specs` — Motion duration/easing tokens（Snackbar enter/exit、active indicator 切换）
- `https://m3.material.io/foundations/layout/applying-layout/window-size-classes` — Window size classes（PC >=1024px / Mobile <640px）——Sidecar Header 仅 PC 显示
- `https://fonts.google.com/icons` — Material Symbols 图标库（Sidebar/BottomBar 需要的 icon 子集）

### 现有代码 anchor
- `frontend/src/css/tokens.css` — Phase 8 MD3 令牌定义（`--md-radius-*` / `--md-color-*` / `--md-elevation-*` / `--md-spacing-*` / `--md-motion-*` / `--md-focus-ring-*` / `--md-state-layer-*` / `--md-nav-height`）
- `frontend/src/css/styles.css` — 现有 `.modal-overlay/content/header/body/footer/close` / `.pc-sidebar/*` / `.bottom-bar` / `.tab-item` / `.list-item/*` / `.toast` / `.toast-success` / `.toast-error` / `@keyframes slideDown`（Phase 11 全量删除）
- `frontend/src/components/primitives/base.css` — Phase 10 共享 state-layer / focus ring / 触控 ≥48dp 规则（composite 消费）
- `frontend/src/components/primitives/Ripple.jsx` — Phase 9 Ripple 组件（Sidebar/BottomBar/ListItem 内部使用）
- `frontend/src/components/primitives/Badge.jsx` — Phase 10 Badge primitive（Sidebar/BottomBar 角标）
- `frontend/src/components/primitives/Icon.jsx` — Phase 10 Icon primitive（Sidebar/BottomBar emoji 替换）
- `frontend/src/components/Sidebar.jsx` — 现有 240px 宽 Sidebar（Phase 11 重写为 80dp 窄栏）
- `frontend/src/components/BottomBar.jsx` — 现有手机底部栏（Phase 11 MD3 化）
- `frontend/src/components/Header.jsx` — 现有顶部 header（Phase 11 升级为 Sidecar Header）
- `frontend/src/components/ConfirmModal.jsx` — 现有确认弹窗（Phase 11 thin wrapper 化）
- `frontend/src/components/WishFormModal.jsx` — 现有愿望表单弹窗（Phase 11 thin wrapper 化）
- `frontend/src/components/WishRejectModal.jsx` — 现有拒绝愿望弹窗（Phase 11 thin wrapper 化）
- `frontend/src/components/WishAdvanceModal.jsx` — 现有推进愿望弹窗（Phase 11 thin wrapper 化）
- `frontend/src/components/CreateLinkModal.jsx` — 现有创建链接弹窗（Phase 11 thin wrapper 化）
- `frontend/src/components/InvitationsModal.jsx` — 现有邀请列表弹窗（Phase 11 thin wrapper 化）
- `frontend/src/components/ChefSelectModal.jsx` — 现有厨师选择弹窗（Phase 11 thin wrapper 化）
- `frontend/src/contexts/ToastContext.jsx` — 现有单条 Toast（Phase 11 升级为 SnackbarContext）
- `frontend/src/App.jsx` — 顶层 Provider 注入 + Sidebar + Header + Outlet 装配（Phase 11 改 `<ToastProvider>` → `<SnackbarProvider>` + 插入 Sidecar Header）

### 全量调用点
- 213 个 `showToast(message, type)` 调用（grep `showToast(` frontend/src/）——零回归约束
- 22 个 Modal 站点（15 inline `modal-overlay` + 7 独立 Modal 组件 import）
- 15 个 JSX 站点直接写 `<div className="modal-overlay">` —— Phase 11 改写为 `<Modal>`
- 8 个 JSX 站点 `import { useToast }` ——保持 import 路径，仅内部升级
- 3 个 JSX 站点使用 `.list-item` —— Phase 11 改写为 `<ListItem>`
- Sidebar / BottomBar 是单点组件（各 1 个 .jsx）

### NPM 依赖
- 无新依赖（Phase 11 复用 Phase 8/9/10 全部依赖：material-symbols-svg/react / material-color-utilities / React 19）
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`--md-radius-lg: 24px`**（tokens.css）：Modal/Dialog 圆角直接使用
- **`--md-elevation-3`**（tokens.css）：Modal 阴影 + Snackbar 阴影
- **`--md-color-scrim`**（tokens.css）：Modal scrim 背景（已就位）
- **`--md-color-inverse-surface` + `--md-color-inverse-on-surface`**（tokens.css）：Snackbar 视觉直接使用（已就位）
- **`--md-color-surface-container-*`**（tokens.css）：ListItem 背景、active indicator pill 填充
- **`--md-color-outline-variant`**（tokens.css）：Divider 颜色、ListItem 内部底部分隔
- **`--md-state-layer-*`**（tokens.css）：Snackbar 关闭按钮 hover 反馈
- **`--md-motion-duration-{short,medium,long}` + `--md-motion-easing-{standard,emphasized}`**（tokens.css）：Snackbar enter/exit、active indicator 切换、divider transition
- **`--md-focus-ring-{outer,inner}`**（tokens.css）：Modal 关闭按钮 / Snackbar 关闭按钮 focus-visible
- **`--md-nav-height`**（tokens.css）：BottomBar 80dp 高度
- **`<Ripple>` 组件**（primitives/Ripple.jsx）：Sidebar item / ListItem 内部手动包裹（Phase 10 D-12 Button/Card 已内置，composite 维持外部包裹模式）
- **`<Icon>` 组件**（primitives/Icon.jsx）：Sidebar / BottomBar emoji 替换（30 icon 集覆盖）
- **`<Badge>` 组件**（primitives/Badge.jsx）：Sidebar/BottomBar pending count 角标
- **`trapFocusWithin` 工具**（utils/index.js）：Modal a11y focus trap 复用（7 个 Modal 已有）
- **`<Button>` 组件**（primitives/Button.jsx）：Modal footer actions / Snackbar 关闭按钮（Phase 10 已就位）
- **`<Input>` 组件**（primitives/Input.jsx）：WishFormModal / WishRejectModal / WishAdvanceModal / CreateLinkModal 表单内容

### Established Patterns
- **CSS 变量驱动主题**：所有视觉通过 `var(--md-*)` 引用——composite 内部样式零硬编码色值/直角
- **CSS class 拼接**：`className="modal-overlay modal-content"` 模式被 `<Modal>` 组件封装；现有 15+ 个站点使用此模式需 grep + 全量替换
- **Compound components**：Phase 10 Card 的 `image/header/body/footer` slot 模式——Phase 11 ListItem 采用相同 `Leading/Content/Headline/Supporting/Trailing` 子组件模式
- **Snackbar position consistency**：现状 `.toast { top: 80px; left: 50%; transform: translateX(-50%) }` —— D-06 保留位置不重建用户习惯
- **Provider 单例导出**：ToastContext 当前是 Provider + useToast hook 双导出模式——SnackbarContext 维持同模式
- **Ripple 外部包裹**：现有 Sidebar / Header / WishCard 等 composite 用 `<Ripple style={{ width: '100%' }}><button>...` 包裹——Phase 11 维持此模式（不引入复合组件内部 ripple 包裹）

### Integration Points
- **`frontend/src/main.jsx`**：CSS 引入入口（`./index.css` → tokens.css + styles.css）——不变；composite CSS 由 Vite 自动 bundle
- **`frontend/src/App.jsx`**：SnackbarProvider 替换 ToastProvider、Sidebar + Sidecar Header + main layout 调整
- **`frontend/src/components/`**：新增 `composites/` 子目录；现有 Sidebar / BottomBar / Header / 7 个 Modal 组件 / ToastContext 迁移并重写
- **`frontend/src/css/styles.css`**：换皮完成后删除 ~150 行旧 modal/sidebar/bottombar/list-item/toast CSS（按 D-20）
- **`frontend/src/contexts/`**：ToastContext 重写为 SnackbarContext（或保留文件名全面重写）
- **22 个 Modal 消费文件**：所有 `<div className="modal-overlay">` 与 7 个独立 Modal import 调用点改写
- **3 个 List Item 消费文件**：AdminHomePage.jsx / InvitationsModal.jsx / InvitationsSection.jsx 改写
- **213 个 showToast 调用方**：仅 useToast hook import 路径保持（内部升级），调用代码零修改
- **后端零改动**：本 phase 仅前端换皮，backend/app/* 无任何修改
</code_context>

<specifics>
## Specific Ideas

- **严格 MD3 80dp 窄边栏**：用户明确要求 PC 端 Sidebar = 80dp（与 MD3 spec 完全一致），不用 240px 中文友好折中——user info / logo / logout 全部移到 Sidecar Header
- **Modal 22 站点全量重写**：用户明确 Phase 11 立即全量重写（不推迟到 Phase 12），删除全部旧 modal-* CSS
- **Snackbar Rich tone + 队列**：用户明确选 Rich Snackbar（左侧 4dp 色条 + icon + tone 区分），不引入 action 按钮（Phase 12 撤销场景再补）
- **Snackbar 顶部固定 + 下堆叠**：用户明确保持现状 `.toast { top: 80px }` 位置不重建用户习惯
- **FAB 保持页面层 Floating**：用户明确 FAB 不嵌入 Sidebar（保持 .fab className fixed positioning）
- **3-line ListItem + slots**：用户明确选全 MD3 ListItem 1/2/3-line + slot-based（与 Phase 10 Card 一致的设计哲学）
- **ListItem 整行 onClick**：用户明确选 clickable 标志 + 整行点击 + trailing 自动 stopPropagation
- **Divider 独立组件**：用户明确引入独立 `<Divider>`（不仅 ListItem 内部隐式），未来页面级分隔符场景可独立使用
- **ToastContext 文件名策略**：推荐保留 `ToastContext.jsx` 文件名（减少 import 改动），内部重写为 SnackbarProvider；useToast hook 保留别名（兼容 213 个 import）
- **30 icon 集覆盖 Sidebar/BottomBar**：home / menu / chef / person / logout / notifications / settings 等已在 Phase 10 D-07 定义，无需新增
- **验证手段 = lint + build，UAT 留 Phase 12**：与 Phase 10 D-04 模式一致——人工/Playwright 验收由 Phase 12 HUMAN-UAT 步骤统一处理
- **Modal full-screen caller 显式 opt-in**：避免 magic auto-detection；WishForm / CreateLink 可在 mobile 上由 caller 自行判断
</specifics>

<deferred>
## Deferred Ideas

### Snackbar action 按钮 — Phase 12 候选
- 当前 213 个 showToast 调用全是简单消息反馈（成功/失败），无撤销/重试场景
- Phase 12 "Page-Level Refactor + 8dp Grid + HUMAN-UAT" 时若有破坏性操作的 Undo 需求（如撤销愿望、撤销订单），可启用 `showSnackbar({message, action: {label, onClick}, duration})` API
- 当前 SnackbarContext 架构已为此预留扩展点（showSnackbar 可与 showToast 并存），Phase 12 补全即可

### 用户可自选主题 UI（用户偏好持久化）— 独立 future phase（from Phase 8）
- Phase 8 D-04 预留 `[data-theme="xxx"]` token 结构，UI 实现（用户偏好持久化、ThemeProvider、主题选择器）属于独立能力
- Phase 11 Header 右侧 user menu 预留主题切换位置（未来 Phase 可启用）

### BottomBar 折叠/展开手势 — 独立 future phase
- 当前 BottomBar = 80dp 固定高度（与 MD3 Navigation Bar 一致），无展开/折叠手势
- 若未来需要节省屏幕空间或支持更多 nav items，可加 collapsed/expanded 模式

### Snackbar swipe-to-dismiss 手势 — 独立 future phase
- 当前 Snackbar 仅 ✕ 按钮手动关闭 + 自动计时
- MD3 spec 支持 swipe-to-dismiss（mobile），需 framer-motion / 自定义 pointer event 处理
- 推迟到有更丰富的 mobile 反馈需求时再补

### ToastContext → SnackbarContext 文件改名 — 本 phase 保留文件名
- 内部重写但保留 `frontend/src/contexts/ToastContext.jsx` 文件名（减少 8 个 import 改动）
- 未来 Phase 可清理性 rename（一次性 import 替换 + git rename detection）

### Avatar 组件化 — 推迟到 Phase 12 或独立 future phase
- Phase 11 ListItem leading 容器标准化（40×40dp）但**不**抽独立 `<Avatar>` 组件
- Sidebar 底部 user chip 当前是首字母 avatar（仅 1 处使用），不需要组件化
- 未来若有多处复用场景（评论区、订单列表）再补 Avatar primitive
</deferred>

---
*Phase: 11-Composite & Navigation Components*
*Context gathered: 2026-07-28*