# Phase 12: Page-Level Refactor + 8dp Grid + HUMAN-UAT - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 是 v1.2 MD3 重构的最后一 phase——把前 4 个 phase（8/9/10/11）建立的令牌、动效、primitive、composite 在所有 12 个页面（UserHomePage / ChefQueuePage / AdminDishesPage / UserWishesPage / ChefWishesPage / AdminWishesPage / LoginPage / PreferencesPage / InvitationsPage / GuestMenuPage / GuestConfirmPage / GuestErrorPage）做"页面级收敛 + 守门"：8dp grid 间距 token 化、4px/6px 直角最终清扫、emoji→Icon 全量替换、MOTION-05 motion token 全量消费、Snackbar action 按钮扩展、旧类残留审计、stylelint + CI grep 防护、HUMAN-UAT 6 流验证。同时修复 12-00-BUGFIX 中两个 v1.2 回归 bug：Ripple 鼠标点击事件阻断 + Sidecar Header 重复渲染。保留所有 React 业务逻辑、状态管理、数据请求、JWT 鉴权零回归；后端零改动。

</domain>

<decisions>
## Implementation Decisions

### 12-00-BUGFIX：v1.2 回归修复（新增 plan）

- **D-BUG-01: Ripple 鼠标点击事件被阻断 — 修复**
  - 现象：所有 `IconButton`/`Button` 用鼠标点击无效，键盘 Tab+Enter 可触发
  - 根因（待 plan 验证）：`<Ripple>` 用 `<span className="md-ripple-layer">` 包裹 `<button>`，`base.css` 给 `.md-ripple-layer` 设置 `pointer-events: none` + `isolation: isolate` + `overflow: hidden` 组合可能在某些浏览器/布局下吞掉 mouse events；`.md-interactive > :not(.md-ripple-layer)` 强制 `position: relative; z-index: 2` 可能与 ripple 容器创建冲突的 stacking context
  - 候选修复方案：
    1. 把 `onPointerDown` 从 ripple span 移到 button 上（事件在 button 上触发后 bubble 到 span）
    2. 移除 `pointer-events: none`（保留视觉层叠但允许事件）
    3. 重构 `<Ripple>` 直接包 button 不外加 span 容器（button 自己承担状态层 + ripple）
  - Phase 12 plan 选择 1 或 3，避免回归到键盘事件

- **D-BUG-02: Sidecar Header 重复渲染 — 修复**
  - 现象：DOM 中两个 `<header>` 元素
    - 第一个 xpath `/html/body/div/div/header` —— `App.jsx` 中 `PcLayout` 渲染的 `<Header />`（Phase 11 COMPO-09 Sidecar Header）
    - 第二个 xpath `/html/body/div/div/main/div` —— 各个 page 组件内部渲染的 `<Header title="..." showBack />`（原有页面级 header）
  - 决定：**保留页面级 header**（在 `<main>` 内），**删除 PcLayout 中的 Sidecar Header**
  - 影响：用户头像下拉菜单（主题切换 + 退出）从 Sidecar Header 移走——需评估是否需要其他地方补登出/主题切换入口（如 SettingsPage 或单独的 ProfileMenu 组件）
  - 评估先看是否所有需要的地方都已迁移；若不能一刀切删 Sidecar Header，则页面级 header 也可作为 fallback 设计
  - 修复范围：`App.jsx` 中 `PcLayout` 的 `<Header />` 单独删除，保留 `<Sidebar />` 与 `<main>`

### 12-01：8dp 网格 + 直角 + emoji + motion + snackbar action

#### 8dp 网格间距 token 化（UX-01）

- **D-GRID-01: 非标准间距值（10px/14px/18px/6px 等）一律舍入到最近 `--md-spacing-*` 令牌**
  - 间距尺度：`--md-spacing-1:4px / 2:8px / 3:12px / 4:16px / 5:24px / 6:32px / 7:40px / 8:56px`
  - 舍入示例：10px→8px (spacing-2)、14px→16px (spacing-4)、18px→16px (spacing-4)、6px→4px (spacing-1)
  - 视觉微调可接受（MD3 规范优先于像素级还原）

- **D-GRID-02: 审计方式 = grep + 手动替换**
  - 流程：`grep -rnE "(padding|margin|gap)[^:]*:\s*[0-9]+px" frontend/src/ --include='*.jsx' --include='*.css'` 列出所有候选 → 逐个判断替换为 `var(--md-spacing-*)`
  - 不写自动化替换脚本（避免改错）

- **D-GRID-03: CI 防护 = grep CI 检查（间距+直角合并）**
  - 在 `frontend/scripts/check-m3-tokens.sh` 写 grep 脚本
  - CI 中调用该脚本（`npm run check:md3`），非零退出码 fail
  - 拦截新裸 px 间距 + 硬编码直角回归

#### 直角最终清扫（TOKEN-13）

- **D-RADIUS-01: stylelint 引入 + 全量清扫**
  - 引入 `stylelint`（项目此前未使用）+ `stylelint-config-standard` 基础配置
  - 自定义规则：禁止 `border-radius: <number>px`（仅允许 `var(--md-radius-*)` + `0` + `50%` + `9999px`）
  - `frontend/.stylelintrc.json` 配置文件
  - 已知残留：登录页 `frontend/src/pages/LoginPage.jsx` 输入框的 4px 直角必须修复（用户原话："现在还有直角残留（例如登陆页面的输入框）"）
  - Phase 8 已扫过一轮，Phase 12 是 final pass——stylelint 长期守门

#### emoji→Icon 全量替换（Phase 10 deferred）

- **D-EMOJI-01: 68 处页面级 emoji 全部替换为 `<Icon>` 组件**
  - Phase 10 已迁移 primitive 组件内部，页面 inline emoji（loading.jsx / emptyState() util / 各种 page header emoji）遗留
  - 选集依据：Phase 10 D-07 的 30+ 图标集已经足够覆盖（home/search/add/edit/delete/check/close/restaurant/menu/person/favorite/star/schedule/notifications/share/settings/logout/arrow-back/arrow-forward/more-vert/more-horiz/chef/visibility/visibility-off/info/warning/error/refresh/filter/sort/place 等）
  - 缺少的 emoji 按需扩展 Icon.jsx 映射表
  - 调用方统一 `<Icon name="..." size={...} />`，不留裸 emoji

#### MOTION-05 补全

- **D-MOTION-01: motion duration/easing 全量消费 `--md-motion-*`**
  - Phase 8 D-05 已定义 token，但 `styles.css` 与组件 CSS 中可能仍有 `transition: ... 0.3s ...` 或 `0.5s ease` 等硬编码时间值
  - 范围：`grep -rnE "transition[^:]*:\s*[^;]*[0-9]+(s|ms)" frontend/src/css/ frontend/src/components/`
  - 替换为：`var(--md-motion-duration-{short|medium|long})` + `var(--md-motion-easing-{standard|emphasized})`
  - 例子：`transition: opacity 0.3s ease` → `transition: opacity var(--md-motion-duration-medium) var(--md-motion-easing-standard)`

#### Snackbar action 按钮启用（Phase 11 deferred）

- **D-SNACK-01: 扩展 `showToast` API 支持 action 按钮**
  - 新签名：`showToast(message, { type, action: { label, onClick }, duration })`
  - 向后兼容：现有 `showToast(message, type)` 调用零回归（参数重载）
  - UI 行为：右侧显示 `<Button variant="text">` 操作按钮 + 关闭按钮；hover 暂停计时（与现状一致）
  - Phase 12 调用示例：在撤销愿望/撤销订单场景调用 `action` 按钮（如 `action: { label: '撤销', onClick: () => api.cancelWish(id) }`）
  - SnackbarContext.jsx 中扩展 `SnackbarItem` 结构 + `showToast` 重载

### 12-02：组件采用审计 + UAT 守门

#### 旧类残留审计（UX-02 收尾）

- **D-AUDIT-01: 全量 grep 验证消费 = 0（双端验证）**
  - 范围：旧类（Phase 10/11 已删除/迁移后）的 CSS 选择器定义 + JSX className 引用两端
  - 命令样式：
    ```
    grep -rnE "className=['\"][^'\"]*\b(btn-primary|btn-secondary|btn-outline|btn-icon|btn-sm|btn-lg|card\b|dish-card\b|wish-card\b|form-input\b|fab\b|badge-(warn|danger|success|info|accent|gold|muted|count)|filter-chip\b|modal-overlay|modal-content|modal-header|modal-body|modal-footer|modal-close|pc-sidebar(-item|...)|bottom-bar|tab-item|list-item\b|toast\b|tab-icon|tab-label)\b" frontend/src/
    ```
  - 期望输出：0 残留
  - 同时 grep `frontend/src/css/styles.css` 与 `frontend/src/css/App.css` 的同名单选择器定义，期望 0 残留
  - 残留位置记录到 audit report 并修复

#### HUMAN-UAT 6 流验证

- **D-UAT-01: 6 个 E2E 流必须覆盖**
  1. **注册登录**：注册新账号 → 登录 → 访问首页（验证 LoginPage/ForceChangePasswordPage 的 token 化及表单交互）
  2. **菜品 CRUD**：管理员创建/编辑/删除菜品，厨师发布/下架（验证 AdminDishesPage/ChefDishesPage）
  3. **订单创建**：用户点菜 → 按厨师拆单 → 订单详情/状态更新（验证 OrderPage/OrderDetailPage）
  4. **愿望单生命周期**：用户提交愿望 → 厨师认领/推进/拒绝（验证 UserWishesPage/ChefWishesPage）
  5. **访客点菜**：邀请链接生成 → 访客打开 → 点菜 → 确认（验证 InvitationsPage/GuestOrderPage，移动端友好）
  6. **口味偏好**：用户设置/取消口味偏好（验证 PreferencesPage）

- **D-UAT-02: 三种验证手段并用**
  - **开发者手动 + 额外工具**：在 Chrome DevTools 手动跑 6 个流，重点检查 spacing/radius/icon button 点击/header 重复/Ripple bug
  - **Playwright 脚本辅助**：基于 Phase 9 触控 ≥48dp 审计脚本扩展，新增 spacing 验证、组件 audit、ripple 点击回归验证脚本
  - **MD3 6 维度视觉走查**：动效 / state-layer / 焦点环 / 触控 / 排版 / 间距 逐维度检查

- **D-UAT-03: 通过门（4 个全部满足才过）**
  - **人工浏览**：用户亲自走查每个界面，记录问题到 UAT-REPORT.md
  - **grep + lint + build 三重门**：`npm run lint`（基线 ≥90 errors，Phase 12 不应增加）+ `npm run build`（Vite 0 error）+ grep 0 残留
  - **DevTools DOM 检测**：事件绑定完整性 + token 使用正确性
  - **Console 零警告**：浏览器 Console 无 warning/error

- **D-UAT-04: HUMAN-UAT 报告位置**
  - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UAT-REPORT.md`
  - 每流截图 + 问题清单 + 修复状态

### Phase 12 Plan 划分

- **D-PLAN-01: 3 plans（12-00-BUGFIX → 12-01 → 12-02 串行）**
  - **12-00-BUGFIX**: 修复 Ripple 鼠标点击 + 删除 Sidecar Header（Header 重复修复）
  - **12-01-PLAN**: 8dp grid 间距 + 直角 stylelint + emoji→Icon + MOTION-05 + Snackbar action
  - **12-02-PLAN**: 旧类残留审计 + Playwright 脚本 + HUMAN-UAT 6 流验证

### 文件组织

- **D-FILE-01: 新增 stylelint 配置**
  - `frontend/.stylelintrc.json` —— 禁止硬编码 border-radius
  - `frontend/package.json` —— 添加 `stylelint` + `stylelint-config-standard` devDependency + `npm run lint:css` 脚本

- **D-FILE-02: 新增 MD3 合规检查脚本**
  - `frontend/scripts/check-m3-tokens.sh` —— grep 8dp grid + 硬编码 radius
  - `frontend/package.json` —— 添加 `npm run check:md3` 脚本

### the agent's Discretion

- **Ripple 修复具体方案选择**：plan 中选择最合适的修复方式（D-BUG-01 三选一：onPointerDown 移到 button / 移除 pointer-events / 重构 Ripple 包 button）——需先实测验证根因
- **删除 Sidecar Header 后退出/主题切换入口**：如页面级 header 无法承担，需评估新增 ProfileMenu/SettingsPage，或接受从 Sidebar footer 操作（用户已选：保留页面级 header，删除 Sidecar Header）
- **stylelint 规则集广度**：除了 `border-radius`，是否禁止其他硬编码（如 `width: 4px`、`padding-left: 6px`）；先严守 radius，其他让 grep CI 检查
- **Snackbar action 按钮的 UX 细节**：按钮在 snackbar 中的位置（左/右）、与关闭按钮的优先级、颜色（primary text vs inverse on-surface）
- **Playwright 脚本的深度**：是只跑 5 流的 happy path，还是覆盖错误流/边界 case；先 happy path 验证视觉，错误流交给 manual UAT
- **MOTION-05 的 0.5s 强调动效使用场景**：emphasized easing 主要用于哪些 transition？plan 中识别并标记
- **emoji 替换的图标选集边界**：68 处 emoji 中如有非图标语义（如分隔符 `·`、`•`）保留为字符，不强换 Icon

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目上下文
- `.planning/ROADMAP.md` — Phase 12 goal + 2 plans breakdown (12-01/12-02) + 5 success criteria
- `.planning/REQUIREMENTS.md` — UX-01/02, TOKEN-13, LOGIC-01/02/03 requirements definitions
- `.planning/PROJECT.md` — v1.2 MD3 重构目标与约束（仅换皮、保留业务逻辑）
- `.planning/phases/08-md3-design-token-foundation/08-CONTEXT.md` — Phase 8 decisions: token naming (--md-*)、elevation 5 级、motion tokens、FAB 16px (D-08)、foundation 直角清扫（D-03）
- `.planning/phases/09-motion-state-layers/09-CONTEXT.md` — Phase 9 decisions: Ripple.jsx (D-01)、state-layer (D-04..D-06)、48dp 触控 (D-09)、disabled 统一 (D-10)、Material Symbols 骨架 (D-11)、Sidebar/Header state-layer (D-12)
- `.planning/phases/10-primitive-components/10-CONTEXT.md` — Phase 10 decisions: primitives/ 子目录 (D-08)、Card slot-based (D-13)、Ripple 内置 (D-12)、30 icon 集 (D-07)、base.css 共享 (D-10)
- `.planning/phases/11-composite-navigation-components/11-CONTEXT.md` — Phase 11 decisions: Modal/Snackbar/Sidebar/BottomBar/ListItem/Divider、Sidecar Header (D-09..D-10)
- `.planning/STATE.md` — 分支状态（feature/ui-rebuild），Phase 12 必须基于此分支开发

### MD3 规范
- `https://m3.material.io/styles/layout/applying-layout` — 8dp grid 间距规范（spacing-1=4px .. spacing-8=56px）
- `https://m3.material.io/styles/shape/applying-shape` — 5 级圆角体系（8/12/16/24/28px）
- `https://m3.material.io/styles/motion/easing-and-duration/tokens-specs` — Motion duration/easing tokens
- `https://m3.material.io/foundations/interaction/state-layers` — State-layer 色值/透明度规范
- `https://m3.material.io/foundations/accessible-design/minimum-touch-targets` — Touch target 48dp
- `https://stylelint.io/` — stylelint 文档（border-radius 规则配置参考）

### 现有代码 anchor
- `frontend/src/css/tokens.css` — Phase 8 MD3 令牌定义（`--md-spacing-1..8` / `--md-radius-{xs..xl,full}` / `--md-motion-duration-{short,medium,long}` / `--md-motion-easing-{standard,emphasized}` / `--md-color-*` / `--md-elevation-*`）
- `frontend/src/css/styles.css` — 需 8dp grid 化、MOTION-05 补全的全局样式（仍有部分硬编码 px 与 transition 时间）
- `frontend/src/css/index.css` — CSS 入口（`@import tokens.css; @import styles.css;`）
- `frontend/src/components/primitives/base.css` — `.md-interactive` + `.md-ripple-layer` 定义（D-BUG-01 修复目标）
- `frontend/src/components/primitives/Ripple.jsx` — Ripple 组件（onPointerDown 在 span 上，D-BUG-01 需重构）
- `frontend/src/components/primitives/Icon.jsx` — Phase 10 Icon 映射表（D-EMOJI-01 扩展入口）
- `frontend/src/contexts/ToastContext.jsx` — SnackbarProvider，D-SNACK-01 扩展点
- `frontend/src/App.jsx` — PcLayout 渲染 Sidecar Header（D-BUG-02 删除点）

### 12 个待 token 化页面
- `frontend/src/pages/UserHomePage.jsx`
- `frontend/src/pages/ChefOrdersPage.jsx`
- `frontend/src/pages/AdminDishesPage.jsx`
- `frontend/src/pages/UserWishesPage.jsx`
- `frontend/src/pages/ChefWishesPage.jsx`
- `frontend/src/pages/AdminWishesPage.jsx`
- `frontend/src/pages/LoginPage.jsx` — 已知直角残留位置
- `frontend/src/pages/PreferencesPage.jsx`
- `frontend/src/pages/InvitationsPage.jsx`
- `frontend/src/pages/GuestOrderPage.jsx`
- `frontend/src/pages/DishDetailPage.jsx`
- `frontend/src/pages/UserProfilePage.jsx` / `UserOrdersPage.jsx` / `UserFavoritesPage.jsx`
- `frontend/src/pages/OrderPage.jsx` / `OrderDetailPage.jsx`
- `frontend/src/pages/AdminHomePage.jsx` / `AdminUsersPage.jsx` / `AdminStatsPage.jsx` / `AdminLogsPage.jsx` / `AdminCategoriesPage.jsx` / `AdminChefsPage.jsx` / `AdminIngredientsPage.jsx` / `ChefDishesPage.jsx` / `ForceChangePasswordPage.jsx`

### NPM 依赖（新增）
- `stylelint` —— border-radius 直角规则
- `stylelint-config-standard` —— stylelint 基础配置

### v1.2 验证 anchor
- Phase 9 触控 ≥48dp Playwright 脚本（`frontend/scripts/` 或同目录）—— Phase 12 扩展基础
- Phase 10/11 已迁移的 30+ 文件 grep 验证命令模板 —— Phase 12 全量 grep 复用

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`--md-spacing-{1..8}`**（tokens.css）：8dp 网格令牌全平台消费，padding/margin/gap 直接 var() 引用
- **`--md-radius-{xs,sm,md,lg,xl,full}`**（tokens.css）：5 级圆角令牌；硬编码 4px/6px 必须替换为 `var(--md-radius-xs:8px)` 或最近档位
- **`--md-motion-duration-{short,medium,long}`** + **`--md-motion-easing-{standard,emphasized}`**（tokens.css）：MOTION-05 消费侧，替换散落 `0.3s ease` 等
- **`--md-state-layer-*`**（tokens.css）：Phase 9 已就位状态层系统，状态修复不动
- **`<Ripple>` 组件**（primitives/Ripple.jsx）：Phase 10 D-12 内置模式，bug 修复目标
- **`<Icon>` 组件**（primitives/Icon.jsx）：30+ 图标映射表，emoji 替换入口
- **`statusBadge()` 工具**（utils/index.js）：业务语义工具，D-SNACK-01 调用示例可复用
- **`<Button>` `<IconButton>` `<Card>` `<Input>` `<FAB>` `<Badge>` `<Chip>` `<Modal>` `<ListItem>` `<Divider>` `<SnackbarContext>`**：Phase 10/11 全部 primitive + composite

### Established Patterns
- **CSS 变量驱动主题**：所有视觉通过 `var(--md-*)` 引用——Phase 12 守门确保不引入新硬编码
- **CSS class 拼接**：Phase 10/11 已迁移到 component prop pattern；Phase 12 审计确保无双轨
- **复合组件内部 slot 模式**：Phase 10 Card 与 Phase 11 ListItem slot-based，Phase 12 不破坏
- **Provider 单例导出**：SnackbarContext 当前是 Provider + useToast hook 双导出——D-SNACK-01 重载签名保留兼容
- **App.jsx Provider 链**：AuthProvider > CategoriesProvider > SnackbarProvider > Routes —— Phase 12 仅修改 PcLayout 内的 Sidecar Header
- **分支约束**：所有 Phase 12 工作必须在 `feature/ui-rebuild` 分支（STATE.md 已说明）

### Integration Points
- **`frontend/src/main.jsx`**：React 入口，不动
- **`frontend/src/index.css`**：CSS 入口，不动
- **`frontend/src/App.jsx`**：删除 PcLayout 中的 `<Header />`（D-BUG-02）
- **`frontend/src/contexts/ToastContext.jsx`**：showToast 重载（D-SNACK-01）
- **`frontend/src/components/primitives/`**：基 CSS / Ripple / Icon 修复/扩展
- **`frontend/src/pages/`**：12 个页面 padding/margin/gap 全部 token 化、emoji 替换
- **`frontend/src/css/styles.css`**：MOTION-05 全量消费 motion token、清理直角残留
- **`frontend/scripts/`**：新增 `check-m3-tokens.sh`（grep CI）
- **`frontend/.stylelintrc.json`** + `frontend/package.json`：新增 stylelint 依赖
- **`.planning/phases/12-page-level-refactor-8dp-grid-human-uat/`**：CONTEXT.md（本文）+ DISCUSSION-LOG.md + UAT-REPORT.md

</code_context>

<specifics>
## Specific Ideas

- **Ripple 鼠标点击 bug 已识别**：用户亲自验证"所有图标按钮都无法用鼠标点击，但可以通过键盘tab选中后enter交互"，必须 Phase 12-00 优先修复
- **Header 重复已识别**：xpath `/html/body/div/div/header` 与 `/html/body/div/div/main/div` 两个 header，保留第二个（页面级）删除第一个（PcLayout 的 Sidecar Header）
- **登录页直角残留已知**：`frontend/src/pages/LoginPage.jsx` 输入框有 4px 硬编码直角，需 Phase 12 修复
- **stylelint 引入**：项目目前未用 stylelint，Phase 12 引入并配置 border-radius 规则
- **CI 防护合并**：grep CI 检查（间距+直角）与 stylelint 都作为 CI 门
- **MOTION-05 是一次"消费侧补全"**：token 已定义（Phase 8），本次扫 `styles.css` 中 transition/0.3s/0.5s 等散落时间值
- **Snackbar action 调用场景明确**：撤销愿望/撤销订单作为示例调用
- **emoji 替换与 Ripple bug 修复解耦**：emoji 是 68 处替换，Ripple 是 1 处修复
- **UAT 由用户亲自走查**：用户原话"我会人工浏览每个界面，并告诉你问题"
- **HUMAN-UAT 报告位置**：`.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UAT-REPORT.md`

</specifics>

<deferred>
## Deferred Ideas

### Stylelint 规则的扩展范围 — 独立 polish
- Phase 12 仅引入 border-radius 规则；其他规则（width/padding/font-size 硬编码）暂不强制
- 后续 polish phase 可扩展 `declaration-property-value-allowed-list` 等规则
- 由 stylelint + grep CI 双重守门（grep 覆盖间距+直角，stylelint 覆盖直角）

### 主题选择器 UI — 独立 future phase（from Phase 8）
- Phase 8 预留 `[data-theme="xxx"]` token 结构
- 用户偏好持久化、ThemeProvider、主题选择器属于独立能力
- 删除 Sidecar Header 后，原 Sidecar Header 中的 theme toggle menu 也需评估迁移（可能落到 ProfileMenu 或独立 SettingsPage）

### Avatar 组件化 — 独立 future phase（from Phase 11）
- Phase 11 D-21+ 已识别 Sidebar 底部 user chip 是首字母 avatar
- 当前 1 处使用，不需要组件化

### Snackbar swipe-to-dismiss 手势 — 独立 future phase（from Phase 11）
- 当前 Snackbar 仅 ✕ 按钮手动关闭 + 自动计时
- MD3 spec 支持 swipe-to-dismiss（mobile），需 framer-motion / 自定义 pointer event 处理

### BottomBar 折叠/展开手势 — 独立 future phase（from Phase 11）
- 当前 BottomBar = 80dp 固定高度

</deferred>

---

*Phase: 12-Page-Level Refactor + 8dp Grid + HUMAN-UAT*
*Context gathered: 2026-07-28*