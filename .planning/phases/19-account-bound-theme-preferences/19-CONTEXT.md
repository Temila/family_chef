# Phase 19: Account-Bound Theme Preferences - Context

**Gathered:** 2026-08-07
**Status:** Ready for planning

<domain>
## Phase Boundary

将 Phase 18 引入并仅存于 localStorage 的主题偏好迁移为账号绑定——后端为单一真相源、跨设备一致；localStorage 降级为 FOUC 首帧无网络引导的缓存层 + 登录后异步校准的读穿透缓存。具体迁移范围：

- **迁到后端**：`fc_active_theme`、`fc_season_enabled`、`fc_hemisphere`、`fc_season_theme_map`
- **保留在 localStorage**：`fc_theme`（legacy light/dark 变体，仅旧用户视觉平滑过渡）、`fc_last_season`（纯设备级渲染缓存键，语义不属于账号偏好）

不实现：跨用户共享主题模板、主题导入导出、URL 分享主题、协作编辑主题——这些属 v2 Future。

依赖 Phase 18：消费现有 theme-context / fouc-bootstrap / ThemeSettingsPage 与所有 `fc_*` localStorage 键契约。

</domain>

<decisions>
## Implementation Decisions

### 多设备写竞态（D-A1）

- **服务器最后写入胜（Server LWW）**：所有写入路径走 `PUT /api/users/me/theme-preferences`，服务器总是覆盖本地。本地只作为缓存，不参与写入决策。
- **不做字段级合并**：单一资源替代整体写入，简单可预测。

### 未登录场景（D-A2 + D-A3）

- **完全隐藏主题设置入口**：未登录用户（包括访客）完全不能进入主题设置。`/theme/settings` 路由在未登录时**不渲染**（路由守卫 `redirect /login` 或组件级早返回）；`Header` 的 `ThemeToggle` 按钮在未登录时**隐藏**（条件渲染 `useAuth().user`）。
- **无匿名偏好**：因 A2，未登录期间不存在"本地临时偏好"需要合并到账号——根本不会有未登录偏好的产生路径。FOUC 引导在未登录时回退到 `fc_theme`（legacy）或 DEFAULT_PRESET。
- **D-A4 联动**：未登录 = 无偏好 = 登录后 fetch 时服务器若 null，则无"本地待上传"内容（详见 D-A5）。

### 登录后首帧一致性（D-A4）

- **接受短暂不一致**：登录成功后 `theme-context` 后台静默 `GET /api/users/me/theme-preferences` → 写入 localStorage → 通过 context state 更新触发一次 `useEffect` 重新注入 CSS（`buildCssSync` + `injectThemeCss`）。
- **不强制 reload**：用户体验连续，主题在已渲染的页面上"闪一次"到服务器值。可接受的代价，换取流畅性。
- **错误处理**：fetch 失败时静默回退到本地缓存，不弹错误 toast（用户登录成功了，没必要用错误 toast 打扰）。

### 首次迁移（D-A5）

- **本地优先上传**：服务器返回 null/未设置时，客户端自动将 localStorage 中的偏好（`fc_active_theme`/`fc_season_enabled`/`fc_hemisphere`/`fc_season_theme_map`）组装成完整 payload `PUT` 到服务器。现有用户无感知升级。
- **合并去重**：上传后 `fc_last_season` 不上传（属设备级缓存，保留本地）。

### 登出/换账号（D-A6）

- **登出时清理主题偏好 localStorage**：`fc_active_theme`、`fc_season_enabled`、`fc_hemisphere`、`fc_season_theme_map` 全部 `localStorage.removeItem`。`fc_theme`、`fc_last_season` 保留（不与账号绑定）。
- **Context state 重置**：登出后 `theme-context` state 回到 DEFAULT_PRESET 与默认偏好；新用户登录前不显示任何前一个用户的主题。
- **避免按 user_id 命名空间**：因 D-A3 未登录不接触偏好，无需复杂的 `fc_active_theme:{userId}` 隔离。

### 数据模型与契约（D-A7，agent 有一定裁量空间）

- **单一资源**：一张 `user_theme_preferences` 表，1 行/用户，主键为 user_id FK ON DELETE CASCADE。
- **字段**：
  - `active_theme` JSON —— 完整活动主题对象 `{ id, name, sourceColors: {primary, secondary, tertiary}, variant, kind }`。与 `fc_active_theme` 同结构，便于 FOUC bootstrap 直读 localStorage 缓存。
  - `season_enabled` BOOLEAN —— 对应 `fc_season_enabled`
  - `hemisphere` VARCHAR(8) —— `'north'`/`'south'`，对应 `fc_hemisphere`
  - `season_theme_map` JSON —— 四季→完整主题对象映射，对应 `fc_season_theme_map`
  - `updated_at` TIMESTAMP —— last-write-wins 的时间戳
- **API 端点**：
  - `GET /api/users/me/theme-preferences` → 返回以上全部字段；不存在时返回 404 或全 null/默认值（agent 决定）
  - `PUT /api/users/me/theme-preferences` → 整体替换；upsert 语义（不存在则创建）
- **校验**：复用 Phase 17 的 `isValidSourceColors` 校验主题对象结构；季节名必须在 `{'spring','summer','autumn','winter'}` 内；半球必须在 `{'north','south'}` 内。

### the agent's Discretion

- **404 vs 全 null 响应**：GET 不存在时返回 404 让客户端触发上传 vs 返回全 null 让客户端走相同分支。任选其一，建议 404 + 客户端上传（更显式）。
- **登录后 fetch 触发时机**：在 `AuthContext` 的 `login()` 回调里直接 fire-and-forget vs 在 `ThemeProvider` 的 `useEffect([user?.id])` 里触发。后者与现有 `refreshCustomThemes` 同位置、同模式（参见 `theme-context.jsx:260-264`）。
- **PUT 频率优化**：用户连续快速切换是否需要 debounce？建议 200ms debounce 合并连续写入，避免网络风暴。
- **登出清理范围**：`fc_theme`、`fc_last_season` 是否也在登出时清理？建议保留——它们本就不与账号绑定，无跨用户风险。
- **错误降级**：fetch 失败时是否弹 toast？建议静默 + 本地回退，不打扰用户。
- **PUT 是否需要 ETag/版本号防并发覆盖**：纯 LWW 语义下不需要；如未来要做 per-field 合并再加。

### Folded Todos

无 — `todo.match-phase 19` 返回 0 条匹配。

</decisions>

<specifics>
## Specific Ideas

- **用户原话**："主题的所有设置都跟账号绑定，公用的数据可以放到本地缓存"——即"账号为本、缓存为辅"模型。
- **复用 Phase 17 CustomTheme 表的模式**：user_id FK ON DELETE CASCADE + Alembic 迁移 + 单表 per-user。新 `user_theme_preferences` 表照搬此模式。
- **复用 Phase 18 theme-context.jsx 的现有 setter 形状**：现有 `setActiveTheme` / `setSeasonEnabled` / `setHemisphere` / `setSeasonTheme` 全部"双写"扩展为：写 localStorage（保留） + 异步 PUT（新增）+ 失败回滚（agent 决定粒度）。
- **FOUC bootstrap 维持最小变动**：继续读 `fc_active_theme`、`fc_season_enabled`、`fc_hemisphere`、`fc_season_theme_map` 四个 key；只要 theme-context 维持同步写入这些 key，bootstrap 无需改动。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与范围
- `.planning/REQUIREMENTS.md` § v1.5 — FND/EDIT/SEAS/SYNC 系列需求的本阶段映射（无新增需求号，沿用现有索引）
- `.planning/ROADMAP.md` § "Phase 19" — 阶段目标、5 条成功标准、依赖 Phase 18
- `.planning/PROJECT.md` § "Current Milestone: v1.5" + § "Constraints" — 技术栈与约束（FastAPI + React + SQLite + Alembic，不引入新框架）

### 前期决策（必须遵守）
- `.planning/phases/17-theme-system-foundation-engine-page-presets-persistence/17-CONTEXT.md` — D-12 CustomTheme 模型 + uq 唯一约束 + D-14 后端 `/api/themes` + D-15/16/17 同步语义 + D-08 `injectThemeCss` 幂等 apply
- `.planning/phases/18-custom-editor-seasonal-auto-switch/18-CONTEXT.md` — D-03 季节评估缓存键 fc_last_season（保留 localStorage，**不**搬）、D-05/06 半球本就是用户偏好（搬迁语义不变）、D-08/09 开关互斥模型保留、D-13 作用域预览（无关）、D-14 变体 Chip（无关）
- `.planning/STATE.md` § "Decisions" — Phase 8-18 既有主题相关决策
- `.planning/REQUIREMENTS.md` § v2 "Future"（HCT-PICKER / JSON-EXPORT / URL-SHARE / IMG-THEME）— 本阶段明确不实现，防 scope creep

### 现有代码（复用/接入面）
- `frontend/src/theme/theme-context.jsx` — 主题 Context 宿主：`activeTheme`/`setActiveTheme`/`customThemes`/`refreshCustomThemes`/`resetToDefault`/`seasonEnabled`/`hemisphere`/`seasonThemeMap`/`setSeasonTheme` 等。所有现有 setter 需扩展为双写
- `frontend/src/theme/fouc-bootstrap.js` — FOUC IIFE 内联脚本，编译期进 index.html `<head>`，无网络；继续读 `fc_active_theme` / `fc_season_enabled` / `fc_hemisphere` / `fc_season_theme_map` 四个 key，零改动
- `frontend/src/theme/season.js` — 季节解析 + `getSeasonPresetId`；本阶段不需改动
- `frontend/src/theme/presets.js` — 5 预设 + `buildDefaultSeasonThemeMap`；`DEFAULT_SEASON_THEME_MAP` 已是默认值来源
- `frontend/src/pages/ThemeSettingsPage.jsx` — 路由 `/theme/settings`；需添加未登录守卫（路由重定向或组件级早返回）
- `frontend/src/components/ThemeToggle.jsx` — Header 主题切换按钮；需添加未登录隐藏
- `frontend/src/contexts/AuthContext.jsx` — `useAuth()` 提供 `user`/`login`/`logout`；自然 hook 点
- `frontend/src/api/client.js` — `ApiClient` 单例；新增 `getThemePreferences` / `updateThemePreferences` 方法
- `backend/app/models/custom_theme.py` — CustomTheme 模型（user_id FK CASCADE + uq 索引）；新表镜像此模式
- `backend/app/services/custom_theme_service.py` — `@staticmethod` 服务模式 + 权限错误异常类 + 错误转 HTTPException
- `backend/app/routers/themes.py` — 薄 router 模式 + `get_current_user_from_token` 依赖 + `db.commit()`/`db.refresh()` 显式管理
- `backend/app/routers/auth.py` — `get_current_user_from_token` 实现，可复用
- `backend/app/database.py` — `Base` declarative、`get_db` 依赖
- `backend/app/schemas/theme.py` — ThemeResponse 含 user_id；新 schema 同位置
- `backend/alembic/versions/3bec850ed472_add_custom_themes_table.py` — CustomTheme 迁移；新表迁移镜像此格式
- `frontend/plugins/inline-theme-bootstrap.js` — FOUC bootstrap 内联构建；零改动

### 工具/依赖
- 无新依赖——沿用 FastAPI、SQLAlchemy、aiosqlite、Alembic、React、React Router、现有 ApiClient。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CustomTheme 模型 + service + router + Alembic 模板**：`backend/app/models/custom_theme.py` (36 lines) + `custom_theme_service.py` (150 lines) + `routers/themes.py` (78 lines) + migration `3bec850ed472`。新 `UserThemePreferences` 表/服务/路由/迁移照搬此模式，预计 95% 结构复用。
- **`get_current_user_from_token`** 依赖：`backend/app/routers/auth.py` — 所有"我是谁"端点的统一鉴权入口，新端点直接 `Depends(get_current_user_from_token)`。
- **`theme-context.jsx` 的 `refreshCustomThemes` useEffect**：`theme-context.jsx:260-264` — `useEffect([user?.id, refreshCustomThemes])` + `queueMicrotask(() => refreshCustomThemes())` 是"登录后异步拉取"现成模式。新偏好 fetch 完全可以镜像此模式挂在同一个 effect 里。
- **`injectThemeCss` + `buildCssSync`**：`theme-engine.js` — 已实现的幂等注入；context state 更新时 `useEffect([activeTheme])` 自动触发注入（D-A4 接受短暂不一致的实现路径）。
- **`isValidSourceColors`**：`theme-context.jsx:62-68` — 主题对象结构校验，前端和后端都可复用。

### Established Patterns
- **后端 thin router + @staticmethod service + 异常转 HTTPException**：service 抛 `ValueError`（业务规则）或自定义权限异常（如 `ThemePermissionError`），router `try/except` 转 400/403。服务方法无状态，`(db, current_user, ...)` 是统一签名。
- **Alembic 迁移命名约定**：`{hex_prefix}_{description}.py`，如 `3bec850ed472_add_custom_themes_table.py`。新迁移遵循此约定。
- **前端 fc_* localStorage 键约定**：所有主题偏好统一 `fc_` 前缀；新 key 也按此约定。
- **API 客户端单一 `ApiClient` 类**：`frontend/src/api/client.js` — 所有 HTTP 调用集中，新端点新方法挂在此类上，保持单一关注点。
- **`@staticmethod` 服务 + 模块级单例**：`xxx_service = XxxService()` 在文件底部，新服务沿用。

### Integration Points
- **AuthContext 的 `login()` 回调**：登录成功时 `setUser(userData)` 触发 ThemeProvider 的 `useEffect([user?.id])` 重跑，进而触发偏好 fetch（无需在 AuthContext 显式调用）。
- **AuthContext 的 `logout()`**：调用 `authManager.clear()` 后 `setUser(null)`。ThemeProvider 需在 `useEffect([user?.id])` 内 logout 分支清理 localStorage + 重置 state。
- **`/theme/settings` 路由**：`frontend/src/App.jsx` — 当前受 `ProtectedRoute` 保护（roles user/chef/admin）。需确认未登录是否已被拦截；若仅是 token 验证，可复用现有守卫；若纯未登录场景需独立处理，agent 决定。
- **Header `ThemeToggle`**：当前可能对所有用户显示；需改为 `useAuth().user ? <ThemeToggle/> : null`。
- **`fouc-bootstrap.js`**：IIFE 已内联进 `index.html` 的 `<head>`，编译期 IIFE 化。读取的 `fc_*` key 维持，零改动。

</code_context>

<deferred>
## Deferred Ideas

- **跨用户共享主题模板 / 主题导入导出 / URL 分享主题** — v2 Future（REQUIREMENTS.md），本阶段不实现。
- **per-field 合并 / CRDT 协作编辑** — D-A1 选择 Server LWW 后已明确不做；如未来需要再加。
- **未登录用户主题偏好持久化** — D-A2/D-A3 已明确不做（隐藏入口即无场景）。
- **主题偏好导入其他账号** — 同上，v2。
- **登出时清理 fc_theme / fc_last_season** — 已明确不做（agent 裁量已记录）。
- **后端历史偏好变更日志** — 当前不做，未来如需审计再加。

### Reviewed Todos (not folded)

无匹配 todos。

</deferred>

---

*Phase: 19-Account-Bound Theme Preferences*
*Context gathered: 2026-08-07*