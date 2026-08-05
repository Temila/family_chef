# Phase 18: Custom Editor & Seasonal Auto-Switch - Context

**Gathered:** 2026-08-05
**Status:** Ready for planning

<domain>
## Phase Boundary

用户在 /theme 页面通过实时颜色编辑器（种子色驱动，WCAG AA 由 MD3 引擎保证，可选择 9 种 MD3 变体）创建、命名、编辑、删除无限数量的自定义皮肤；并支持按季节自动切换。自动切换遵循"开关互斥"模型——开启时仅使用四季预设、手动应用被禁止——并正确处理半球（手动切换，默认北半球）。

依赖 Phase 17：消费 apply 引擎（`buildCssSync`/`injectThemeCss`）+ 后端 CustomTheme CRUD API + /theme 页面与 ThemeCard 预览作用域。

</domain>

<decisions>
## Implementation Decisions

### 季节定义（SEAS-01/02）

- **D-01（节气而非气象学）：** 季节边界按中文节气划分：立春 / 立夏 / 立秋 / 立冬（`almanac_ea.SOLAR_TERMS_ZHS`）。不是固定月份的"气象学"划分。
- **D-02（skyfield 预生成表，非运行时）：** 用 skyfield 本地脚本生成节气时刻表，**精确到天**即可，覆盖 **2020–2099 年**。生成结果以 JSON 常量嵌入前端（`frontend/src/theme/solar-terms.js` 或同目录 JSON 模块）。零运行时依赖、零网络、确定性、离线可用。运行时**不**引入 skyfield，后端**不**新增 API。
- **D-03（本地时区判定）：** 前端用用户本地时区将节气时刻转当前日期，与表内日期比较得出当前季节。季节评估仅在季节边界发生一次（存储 `fc_last_season`），非每次 mount 都触发（ROADMAP 成功标准 5，沿用）。
- **D-04（季节 → 预设映射）：** 四季只映射到对应季节预设（春→spring preset、夏→summer、秋→autumn、冬→winter），不映射到默认/自定义主题。

### 半球处理（SEAS-03）

- **D-05（手动切换，无自动侦测）：** 无浏览器半球 API，不做时区启发式，不做 IP 定位；仅提供手动切换。默认**北半球**，用户可在设置子页切到南半球。
- **D-06（半球存储于 localStorage）：** 半球偏好为设备级设置，存 localStorage（如 `fc_hemisphere`），不存后端。
- **D-07（南半球季节取反）：** 节气时刻表本身是北半球天文学定义；南半球时季节取反映射：立春→秋、立夏→冬、立秋→春、立冬→夏。

### 自动切换交互（SEAS-02/04）

- **D-08（开关位于主题设置子页面）：** 季节自动切换开关、半球切换、开关说明都在 /theme 的"主题设置"子页面内，不与卡片网格抢空间。（沿用 Phase 14 "高级筛选改为弹出子页面"的子页面形态，但此处作为 /theme 页内的设置子页。）
- **D-09（互斥模型，取代 SEAS-04 的 TTL override）：** 开启自动切换后，**手动应用被禁止**——用户此时对任何主题的点击都不应用，完全按当前季节匹配四季预设。开关处**醒目提醒**该行为（说明"开启后仅使用四季主题，手动应用失效"）。SEAS-04 原文"手动选择挂起自动切换（带 TTL override）"被此互斥模型**取代**，不再实现 TTL。
- **D-10（开启时卡片点击行为）：** 自动切换 ON 时：点击**自定义**主题卡片 → 进入编辑器（允许编辑）；点击**预设**卡片 → 无操作（既不能应用也不能编辑）。活动主题仅由季节匹配决定，且选中指示显示在当前季节预设卡片上。
- **D-11（关闭后恢复手动）：** 关闭自动切换开关即恢复手动选择能力；开启/关闭都即时生效并持久化。

### 编辑器入口与形态（EDIT-01/02/04/05/06）

- **D-12（独立页面）：** 编辑器为独立路由页 `/theme/editor`（含 Header + BottomBar，可深链），不是 Sheet/Modal。入口：/theme 页面"新建"按钮 + 各自定义 ThemeCard 的"编辑"入口。
- **D-13（编辑器内作用域预览）：** 拖拽实时预览作用在**编辑器内**一块作用域预览上（复用 Phase 17 的 `data-fc-theme-scope` 边界 + 真实 `<Card>/<Button>/<Chip>` primitive），拖拽时直写该容器 CSS 变量，不触发整应用重渲染、不重排整 app。`buildCssSync(sourceColors, variant)` 的 CSS 结果以 scoped 选择器应用进容器。**只有保存**才把新主题应用到整 app（通过现有 `setActiveTheme` 路径）。
- **D-14（变体选择器 = Chip 横向滚动）：** 9 种 MD3 变体（TonalSpot / Vibrant / Expressive / Content / Mono / Neutral / Fidelity / Rainbow / FruitSalad）用一行横向滚动 Chip 组呈现，复用现有 Chip primitive，选中态 `secondary-container`。显示**纯英文原名**（不翻译成中文）。
- **D-15（保存语义 = 显式保存 + 保存后自动应用）：** 显式"保存"按钮。新建 → `POST /api/themes`；编辑已有自定义 → 原地 `PUT /api/themes/{id}`；编辑预设（fork）→ 预填名（如"我的春"）+ `POST` 新建。保存成功后**自动应用**新主题并返回 /theme 页。
- **D-16（重名拦截）：** 自定义主题名称必须唯一，重名时阻止保存并弹提示——与 17 D-12 的 `uq_custom_themes_user_name` 唯一约束一致。空名/纯空格/超 100 字符同样拦截。不做自动后缀。
- **D-17（删除）：** 沿用 17 决策，自定义主题硬删除（`DELETE /api/themes/{id}`），预设不可删。

### the agent's Discretion

- **天气表数据结构**：year-indexed MM-DD 字典 vs 扁平节气事件数组 — 建议 year 索引 + 每节气日期，便于本地时区对比。
- **变体在 menu 的排序**：建议按 Material 官方顺序 TonalSpot 优先显示。
- **编辑器页布局**：三色 picker（react-colorful）+ hex 输入 + 变体 Chip + 命名输入 + 作用域预览 + 保存/取消按钮的具体排布。
- **预设 fork 预填名**：按 17 D-01 的"我的春/我的夏/..."命名提示。
- **删除确认**：删除自定义主题是否弹确认 Snackbar/对话框——建议轻量确认。
- **编辑时活动主题处理**：进入编辑器时活动主题保持当前应用状态不动，仅在保存后变更。

### Folded Todos

无 — `todo.match-phase 18` 返回 0 条匹配。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与范围
- `.planning/REQUIREMENTS.md` § "v1.5 Requirements" lines 73-94（EDIT-01~07, SEAS-01~04 原文与验收）
- `.planning/ROADMAP.md` § "Phase 18" — 阶段目标、依赖、成功标准 5 条、研究标记 HIGH、"开放产品决策 (a)(b)(c)"
- `.planning/PROJECT.md` § "Current Milestone: v1.5" + § "Constraints" — v1.5 目标特性与技术约束

### 前期决策（必须遵守）
- `.planning/phases/17-theme-system-foundation-engine-page-presets-persistence/17-CONTEXT.md` — D-01 预设 fork 语义（编辑预设→另存为新自定义，槽永不改）、D-04 变体 TonalSpot 保留参数、D-05 作用域 CSS-var 边界、D-08 `injectThemeCss` 幂等 apply、D-12 CustomTheme 模型 + uq 唯一约束、D-14 后端 /api/themes、D-15/16/17 同步语义
- `.planning/STATE.md` § "Decisions" + § "Branch State" — Phase 8-17 与 theming 相关的既有决策
- `.planning/REQUIREMENTS.md` § v2 "Future"（HCT-PICKER / JSON-EXPORT / URL-SHARE / IMG-THEME）— 本阶段明确不实现，防 scope creep

### 现有代码（复用/接入面）
- `frontend/src/theme/theme-engine.js` — `buildCssSync(sourceColors, variant)`；line 95-99 预留了 `variant` 参数（当前 `void variant`），Phase 18 必须实现 9 变体派生的真实分支
- `frontend/src/theme/presets.js` — 5 个预设常量（默认/春夏秋冬），季节映射的目标
- `frontend/src/theme/theme-context.jsx` — `useTheme()`：`activeTheme`/`setActiveTheme`/`customThemes`/`resetToDefault`；`fc_active_theme` localStorage；季节开关与抱半球偏好将在此扩展
- `frontend/src/theme/fouc-bootstrap.js` + `frontend/index.html` — FOUC 内联脚本（自动切换若是首屏主题来源，需确认 bootstrap 交互，agent 决定是否纳入）
- `frontend/src/pages/ThemePage.jsx` — 卡片网格宿主；"主题设置子页"入口 + "新建"按钮挂载点
- `frontend/src/components/theme/ThemeCard.jsx` + `ThemePreview.jsx` — 卡片即预览；`data-fc-theme-scope` 作用域模式（编辑器作用域预览复用 D-13）
- `frontend/src/components/primitives/` — Chip（变体选择器）、Card/Button（作用域预览）
- `frontend/src/api/client.js` — `getThemes/createTheme/updateTheme/deleteTheme`（Phase 17 已实现）
- `backend/app/routers/themes.py` + `backend/app/services/custom_theme_service.py` + `backend/app/models/custom_theme.py` — 后端 CRUD/migración/模型（无需本阶段后端改动，如无异常）
- `.planning/phases/17-theme-system-foundation-engine-page-presets-persistence/17-01-PLAN.md`（后端主题 CRUD 的既有接口/校验语义参考）

### 工具/依赖
- `react-colorful` — EDIT-01 指定的颜色选择器依赖（需新增到 `frontend/package.json` dependencies）
- `@material/material-color-utilities@^0.4.0` — 已装 devDep；`themeFromSourceColor` 已用于引擎；变体派生（Vibrant/Expressive 等）需研读 MCU `variant` API
- skyfield — 仅**开发期**用于预生成节气表脚本（可放 `scripts/generate-solar-terms.*`），不进入运行时依赖

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`theme-engine.js` `buildCssSync(sourceColors, variant)`**: 已同步派生得 light/dark CSS 文本；`variant` 参数已预留（`theme-engine.js:99` `void variant`），Phase 18 需改为按 variant 分派 MCU 派生路径，并把结果发给 scoped 容器（编辑器预览）与全局 `<style id="fc-dynamic-theme">`（保存后）。
- **`ThemeCard`/`ThemePreview` 的 `data-fc-theme-scope` 作用域**: 编辑器内作用域预览可完全复用——在编辑器容器边界应用某主题的全部 `--md-color-*`，内部渲染真实 primitive。
- **`useTheme()` Context（`__Context` 已暴露 lightTokenNames）**: 添加 `seasonEnabled`/`hemisphere`/季节匹配逻辑到 ThemeProvider，保留既有 apply 契约。
- **Chip primitive（secondary-container 选中态）**: 9 变体选择器，含触控目标。
- **后端 /api/themes CRUD**: Phase 17 已交付，编辑/删除/新建直接调用，无需后端改动（除可能的变体校验无需变更——已是白名单校验）。

### Established Patterns
- **Spring `@staticmethod` service + 薄 router**: 后端无新表，沿用现状。
- **`fc_*` localStorage 约定**: 活动主题 `fc_active_theme`；半球与季节开关沿用同前缀，避免与旧 `fc_theme`（明暗）混淆。
- **体感语言**: 全中文用户面向文案（开关醒目提醒、重名提示、保存 toast），变体名除外（D-14 纯英文）。
- **Yolo/auto_advance 配置**: `config.json` `mode=yolo`、`auto_advance=true`，discuss 完成后将自动衔接 plan-phase。

### Integration Points
- `frontend/src/pages/ThemePage.jsx` — 新增"新建 / 主题设置"入口 + 设置子页路由 + 编辑入口挂载到 ThemeCard。
- `frontend/src/theme/theme-context.jsx` — 季节解析/半球/恢复逻辑宿主。
- `frontend/src/App.jsx` — 注册 `/theme/editor` 路由（ProtectedRoute，roles user/chef/admin）。
- `frontend/src/api/client.js` — 已有主题 CRUD 方法；无需新增端点。
- `scripts/` — skyfield 预生成脚本放置处。

</code_context>

<specifics>
## Specific Ideas

- **节气表精度与覆盖**: skyfield "精确到天即可" + 2020–2099（用户明确要求，比最初建议的更长跨度）。
- **skyfield 参考代码**: 用户提供 `almanac_ea.solar_terms(eph)` + `SOLAR_TERMS_ZHS` 用法（skyfield 的东半球节气接口）——预生成脚本按此实现。
- **开关醒目提醒**: 用户强调"开关处做醒目提醒"——视觉上要比普通说明更突出（如强调色横幅/警示样式），不静默。
- **编辑器 = 独立页面**: 用户明确选择独立路由页而非 Sheet/全屏 Modal，与现有筛选子页形态区分。

</specifics>

<deferred>
## Deferred Ideas

- **后端 skyfield API（运行时）** — 已否决（选预生成表）。
- **时区启发式自动侦测半球 / IP 定位** — 已否决（选手动）。
- **TTL override 挂起模型（SEAS-04 原语义）** — 已被 D-09 互斥模型取代。
- **整应用实时换色（拖拽时）** — 已否决（选作用域预览）。
- **HCT-PICKER / JSON-EXPORT / URL-SHARE / IMG-THEME / CONTRAST-PANEL** — v2 Future（REQUIREMENTS.md），本阶段不实现。

### Reviewed Todos (not folded)

无匹配 todos。

</deferred>

---

*Phase: 18-Custom Editor & Seasonal Auto-Switch*
*Context gathered: 2026-08-05*