# Phase 8: MD3 Design Token Foundation - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

## Phase Boundary

将前端设计系统彻底以 MD3 令牌（圆角 / 配色 / elevation / 间距 / 排版 / 动效）重写——5 级圆角、MD3 配色（含 tonal palette）、5 级阴影、8dp 网格、motion 令牌、深浅色双向覆盖全部就位；foundation 级别的硬编码直角（4px/6px）一次性清除，为 Phase 9-12 的组件换皮铺路。仅换皮，保留所有 React 业务逻辑、状态管理、数据请求、JWT 鉴权；后端零改动。

## Implementation Decisions

### 主色与品牌色策略

- **D-01: Key color palette（已锁定）**
  - Primary `#34834E`（深绿，食材/自然）
  - Primary Container `#C8E6C9`
  - Secondary `#506446`（橄榄绿）
  - Tertiary `#F5B43C`（暖琥珀，烹饪/温暖）

- **D-02: 现有 60-30-10 自定义色全部收拢到 MD3 体系**
  - 删除 `gold #C9A84C`（由 Tertiary `#F5B43C` 取代）
  - 语义色（success / warn / danger / info）派生为对应 container 变体，不再独立色值
  - 现有 `badge-warn` / `badge-danger` 等组件引用色值迁移

- **D-03: Tonal palette 用 `@material/material-color-utilities` 自动派生 13 tones**
  - 从 Primary / Secondary / Tertiary 三个 key color 派生 tone 0/10/20/.../100
  - 输出 hardcoded 为 CSS 变量（不运行时计算）
  - 通过 `scripts/generate-tokens.cjs` 一次性生成 `tokens.css`

- **D-04: 主题扩展能力预留**
  - `tokens.css` 内 token 结构按 `[data-theme="xxx"]` 设计，方便未来加主题
  - Phase 8 不实现主题选择器 UI（仅留 token 结构入口）

### Token 实现路径

- **D-05: Token 命名约定——完全重命名为 `--md-*` 前缀**
  - 一次性 grep+替换所有现有 `var(--radius-*)` / `var(--accent)` / `var(--bg-*)` 引用
  - 命名映射：
    - `--radius-{sm,md,lg,xl,full}` → `--md-radius-{xs,sm,md,lg,xl,full}`
    - `--accent` / `--accent-light` / `--accent-hover` / `--accent-gradient` → `--md-color-primary` / `--md-color-on-primary` / `--md-color-primary-container` / `--md-color-on-primary-container` 等
    - `--bg-{primary,secondary,card,card-hover,elevated,input}` → `--md-color-surface` / `--md-color-surface-container-{lowest,low,medium,high,highest}`
    - `--text-{primary,secondary,muted}` → `--md-color-on-surface` / `--md-color-on-surface-variant`
    - `--border` / `--border-medium` / `--border-strong` → `--md-color-outline` / `--md-color-outline-variant`
    - `--shadow-{sm,md,lg,accent}` → `--md-elevation-{0,1,2,3,4,5}`
    - `--font-display` / `--font-body` → `--md-font-display` / `--md-font-body`
    - `--transition-fast` / `--transition-normal` → `--md-motion-duration-{short,medium,long}` + `--md-motion-easing-{standard,emphasized}`
  - 不保留双轨/别名（直接重命名，扫描一次性完成）

- **D-06: 独立 `frontend/src/css/tokens.css`，由 `scripts/generate-tokens.cjs` 生成**
  - token 全部集中在 `tokens.css`，`styles.css` 仅引用 token
  - `scripts/generate-tokens.cjs` 用 `material-color-utilities` 从 key color 派生
  - 静态生成后手工 hardcode 到 `tokens.css`（不引入 build-time 自动生成——保持简单）
  - `index.css` 改写为只保留 body 基础样式 + `@import './css/tokens.css'`
  - `App.css` 整体清除（Vite demo 残留）

- **D-07: Phase 7 domain-specific token 完全迁入 MD3 体系**
  - 删除 `--unread-dot #E74C3C` → 改用 `--md-color-error` 派生红点
  - 删除 `--size-unread-dot 8px` → 改用具体 px 值或新增 `--md-size-unread-dot`
  - 删除 `--space-wish-card-stack 16px` → 改用 `--md-spacing-4`

### FAB 圆角与 Elevation

- **D-08: FAB 圆角采用 MD3 标准 16px**
  - **⚠️ 需更新 ROADMAP.md 与 REQUIREMENTS.md 中 TOKEN-05 的数值（原锁定 28px）**
  - 56dp FAB / Extended FAB 用 16px 圆角
  - Small FAB（40dp）可用全圆

- **D-09: Elevation 5 级采用 MD3 标准 surface tint + shadow 组合**
  - Level 0 = 无 tint 无 shadow
  - Level 1-3 = 仅 surface tint（无 shadow）
  - Level 4-5 = surface tint + shadow
  - Light mode 与 Dark mode 下 surface tint 透明度按 MD3 规范递进（5/8/11/12/14% vs 5/8/11/16/19%）
  - 通过 `--md-elevation-0` ~ `--md-elevation-5` 暴露 token

### the agent's Discretion

- **E-01: Elevation 具体数值与 dark mode 差异**——按 MD3 规范推导 surface tint 透明度、shadow blur/offset
- **E-02: Material Symbols 子集**——按现状 emoji 出现位置枚举需要的图标，最小化打包
- **E-03: `tokens.css` 与 `styles.css` 的职责划分细节**——保证 `tokens.css` 只放 `:root` 与 `[data-theme="dark"]` 的 token，组件样式全部留在 `styles.css`

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/ROADMAP.md` — Phase 8 milestone goal + 3 plans breakdown + success criteria
- `.planning/REQUIREMENTS.md` — TOKEN-01..14 / MOTION-04..05 / UX-02 / UX-04 / UX-05 / LOGIC-01..03 详细定义
- `.planning/PROJECT.md` — v1.2 MD3 重构的目标与约束

### MD3 规范
- `https://m3.material.io/styles/color/the-color-system/key-colors-tones` — Key colors & tones 派生规则
- `https://m3.material.io/styles/elevation/tokens` — Elevation 5 级 + surface tint 透明度
- `https://m3.material.io/styles/shape/applying-shape` — 5 级圆角体系
- `https://m3.material.io/styles/motion/easing-and-duration/tokens-specs` — Motion duration / easing tokens

### 现有代码 anchor
- `frontend/src/css/styles.css` — 当前 60-30-10 自定义色板 + 5 级旧 radius（将被重写）
- `frontend/src/index.css:102` — `border-radius: 4px` (`.counter` Vite 残留)
- `frontend/src/App.css:121` — `border-radius: 6px` (Vite demo 链接)
- `frontend/src/main.jsx` — CSS 引入顺序（需要调整为 `tokens.css` → `styles.css`）

### 代码库扫描得到的 insight
- 现有 emoji 图标位置：搜索 `frontend/src/components/*.jsx` 与 `frontend/src/pages/*.jsx` 中 `🏠 🛒 ❤️ 📊` 等 emoji 用法，作为 Material Symbols 子集映射依据
- 现有 `var(--accent)` 等 token 引用：`frontend/src/css/styles.css` 内 100+ 处，需一次性替换

## Existing Code Insights

### Reusable Assets
- **`scripts/run.sh` / `scripts/run-dev.sh`**：现有的 npm + uvicorn 启动脚本，新 token 生成脚本可挂到 npm run 链上
- **`@material/material-color-utilities` (NPM)**：用于生成 tonal palette 的官方 MD3 工具库
- **`@material-symbols/*-400` (NPM)**：用于按需加载 Material Symbols 图标

### Established Patterns
- **CSS 变量驱动主题**：`styles.css:9-48` 已建立 `:root` + `[data-theme="dark"]` 双层覆盖模式，迁移到 `tokens.css` 后保持同样结构
- **本地字体加载**：`styles.css:7` 通过 `@import url('fonts.googleapis.com/css2?family=Noto+...')` 引入字体，迁移 Material Symbols 时复用同一模式（CDN 或 NPM 包）
- **token 引用解耦**：现有 styles.css 已实现 token 与样式解耦（所有颜色通过 `var(--*)` 引用），迁移到 `--md-*` 前缀时无须改动组件层结构

### Integration Points
- **`frontend/src/main.jsx`**：CSS 引入入口，需要在 styles.css 之前先 import tokens.css
- **`frontend/index.html`**：Google Fonts 引入位置，Material Symbols 也可在此 link
- **`frontend/package.json`**：新增 `@material/material-color-utilities` 与 `@material-symbols/*` devDependency；新增 `npm run gen:tokens` script
- **`scripts/`**：新增 `scripts/generate-tokens.cjs`（用 material-color-utilities 派生 tonal palette）
- **`frontend/vite.config.js`**：检查是否需要为 Material Symbols 添加子集优化配置

## Specific Ideas

- **家味绿 + 琥珀配色灵感**：用户明确提到 "家味"——绿色对应食材/新鲜/家庭菜园，琥珀对应烹饪/温暖/灶火
- **品牌色全部收拢**：用户偏好 token 表纯净、零独立色值冲突；Tertiary 取代 gold 后视觉角色清晰（暖色锚点）
- **预留主题扩展**：用户提到未来想加"用户可自选主题"功能，Phase 8 通过 `[data-theme="xxx"]` token 结构铺路
- **FAB 16px 选择**：用户偏好严格 MD3 规范而非保留 ROADMAP 锁定的 28px（视觉更柔和）
- **Material Symbols NPM + Vite**：用户偏好生产友好（离线可用、性能可控）而非 CDN 动态加载

## Deferred Ideas

### 主题选择器 UI（用户可自选主题）— 独立 future phase

- **为什么延后**：用户提到希望前端支持多主题切换（用户自选），但 Phase 8 仅是 token 体系铺路，UI 实现（用户偏好持久化、主题管理）属于独立能力
- **Phase 8 已铺路**：`tokens.css` 按 `[data-theme="xxx"]` 结构组织，未来加新主题只需新增 token block
- **未来 phase 范围**：实现 ThemeProvider、用户偏好持久化（localStorage）、主题选择 UI（可能 3 状态 light/dark/system）

### 当前 backlog 中与 Phase 8 相关的已知技术债（来自 STATE.md）

| 类别 | 项 | 备注 |
|------|---|------|
| 技术债 | 前端全量 lint 基线红（≥90 errors） | Phase 8 完成后应跑一次 lint 看是否回归 |
| 技术债 | 硬编码 4px/6px 直角（App.css:121, index.css:102） | **Phase 8 直接处理**（D-05 + Vite 模板清理） |

---
*Phase: 8-MD3 Design Token Foundation*
*Context gathered: 2026-07-24*