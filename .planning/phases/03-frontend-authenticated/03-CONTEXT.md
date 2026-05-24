# Phase 3: Frontend Authenticated - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

注册用户可通过应用 UI 创建、分享和管理邀请链接，访客订单在厨师订单列表中带"访客"标识。具体交付：
1. 用户可在首页创建访客邀请链接（INV-04）
2. 用户可通过 Web Share API 和剪贴板复制分享链接（INV-05）
3. 用户可查看自己创建的邀请列表及状态（INV-06）
4. 用户可提前撤销未使用的邀请链接（INV-07）
5. 访客订单在厨师订单列表中显示"访客"标识（NOTIF-02）

**不包含：** 访客端点菜页面（Phase 4）、二维码生成（EUX-02 v2）、邀请剩余时间倒计时（EUX-01 v2）、访客显示名（EUX-03 v2）

</domain>

<decisions>
## Implementation Decisions

### 邀请入口与导航
- **D-01:** 邀请管理功能以区块形式嵌入用户首页（UserHomePage），不创建独立页面
- **D-02:** "查看全部"按钮打开全屏 Modal 展示完整邀请列表，不通过路由跳转
- **D-03:** Chef 和 User 两个角色在首页均可见邀请区块
- **D-04:** "创建邀请"按钮仅在首页区块展示，不在全屏 Modal 中重复

### 邀请列表展示
- **D-05:** 列表采用行布局（非卡片），每行展示一条邀请
- **D-06:** 每行展示：状态 Badge、创建时间、过期时间、厨师名称（User 角色显示）、复制链接图标、撤销按钮
- **D-07:** 状态语义色：活跃=绿色、已使用=灰色、已过期=橙色、已撤销=红色
- **D-08:** 列表按 created_at 降序排列（最新在前）
- **D-09:** 首页区块展示最近 5 条邀请，"查看全部"打开全屏 Modal

### 创建邀请流程
- **D-10:** Chef 角色：点击"创建邀请"→ 一键生成 → 弹窗展示链接（含复制 + 分享按钮）
- **D-11:** User 角色：点击"创建邀请"→ 弹出厨师选择 Modal → 选择厨师 → 生成邀请 → 同一 Modal 展示链接
- **D-12:** 两角色按钮文字统一为"创建邀请"
- **D-13:** 创建后弹窗展示：完整链接、复制按钮、Web Share 按钮、"2小时内有效"提示

### 分享与复制交互
- **D-14:** 复制到剪贴板后仅显示 Toast 通知（无需按钮状态变化）
- **D-15:** Web Share 按钮和复制按钮并排显示，用户自选方式
- **D-16:** 每行"活跃"状态的邀请显示复制链接图标，支持重新复制
- **D-17:** 前端拼接完整链接：`window.location.origin + '/guest/' + token`

### 撤销确认交互
- **D-18:** 撤销操作需要二次确认弹窗
- **D-19:** 撤销按钮直接展示在行内（非下拉菜单）
- **D-20:** 撤销后乐观更新：行内状态立即变更为"已撤销"（红色），不刷新整个列表
- **D-21:** 仅"活跃"状态的邀请显示撤销按钮

### 访客订单标识
- **D-22:** 厨师订单列表中，访客订单在卡片头部 Order ID 旁显示橙色"访客订单"Badge
- **D-23:** 筛选 Tab 增加"访客订单"筛选芯片
- **D-24:** 订单详情页（/orders/{id}）同样显示橙色"访客订单"Badge

### the agent's Discretion
- 全屏 Modal 的具体 UI 风格（是否有搜索栏、分页方式）由 planner 决定
- 厨师选择 Modal 的 chef 列表格式（头像+姓名、下拉列表）由 planner 根据现有 chef_service.list_chefs() 决定
- 确认弹窗的具体文字和样式由 planner 根据现有 ToastContext / confirm 模式决定
- 筛选芯片的布局（数量、样式）由 planner 根据现有 ChefOrdersPage filter-chips 模式决定
- Order API 返回的 `is_guest` 字段名和结构由 planner 根据后端已有实现决定
- 链接在行内的截断显示形式由 planner 决定

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与路线图
- `.planning/REQUIREMENTS.md` — INV-04, INV-05, INV-06, INV-07, NOTIF-02 的完整需求定义
- `.planning/ROADMAP.md` §Phase 3 — 成功标准和需求映射

### Phase 2 上下文（已锁定决策）
- `.planning/phases/02-backend-core/02-CONTEXT.md` — 后端 API 设计决策、GuestService 模式、事务原子性
- `.planning/phases/02-backend-core/02-RESEARCH.md` — 访客 API 端点和 GuestService 技术研究

### 前端页面参考（需修改）
- `frontend/src/pages/UserHomePage.jsx` — 用户首页，需嵌入邀请区块
- `frontend/src/pages/ChefOrdersPage.jsx` — 厨师订单列表，需添加访客订单标识
- `frontend/src/pages/OrderDetailPage.jsx` — 订单详情，需添加访客订单 Badge
- `frontend/src/App.jsx` — 路由定义和 ProtectedRoute 模式（如需要新增页面路由）

### 可复用组件参考
- `frontend/src/components/Badge.jsx` — 状态标签组件（现有 pending/cooking/completed/cancelled 状态）
- `frontend/src/components/ToastContext.jsx` — Toast 通知上下文（showToast 方法）
- `frontend/src/components/Sidebar.jsx` — 侧边栏导航（如需新增导航项）
- `frontend/src/components/BottomBar.jsx` — 底部导航栏（移动端）

### 现有样式
- `frontend/src/css/styles.css` — 全局样式，BEM 命名规范，响应式断点
- `frontend/src/css/App.css` — 应用级别样式

### 前端 API 客户端
- `frontend/src/api/client.js` — ApiClient 单例，需添加邀请相关 API 方法

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Badge.jsx` — 状态标签组件，支持 status prop（现有 pending/cooking/completed/cancelled），可直接用于邀请状态展示。需扩展支持 active/used/expired/revoked
- `ToastContext.jsx` — showToast 方法可用于复制、创建、撤销等操作的反馈
- `Loading.jsx` / `EmptyState.jsx` — 加载和空状态组件，可复用
- `ChefOrdersPage.jsx` filter-chips 模式 — 筛选 Tab 的 HTML/CSS 模式可直接复用
- `Modal` 模式（如有）— 全屏 Modal 的已有实现（需确认是否存在或新建）

### Established Patterns
- **页面组件模式** — Page 组件使用 `export default function XxxPage()`，结合 Header + BottomBar 布局
- **数据加载模式** — `useState` + `useEffect` 加载数据，try/catch + showToast 错误处理
- **API 调用模式** — `api.methodName(params)`，301 自动跳转登录
- **ProtectedRoute 模式** — 页面通过 `<Route path="..." element={<ProtectedRoute><Page /></ProtectedRoute>}>` 保护
- **响应式布局** — CSS breakpoints 420/768/1200px，手机端 BottomBar + 桌面端 Sidebar

### Integration Points
- `frontend/src/pages/UserHomePage.jsx` — 新增邀请区块（邀请列表 + 创建按钮）
- `frontend/src/pages/ChefOrdersPage.jsx` — 订单卡片头部添加访客 Badge + 筛选芯片
- `frontend/src/pages/OrderDetailPage.jsx` — 订单详情页顶部添加访客 Badge
- `frontend/src/api/client.js` — 新增 API 方法：getInvitations(), createInvitation(chefId?), revokeInvitation(id)
- `frontend/src/components/Badge.jsx` — 扩展支持新的 status 值（active/used/expired/revoked）和 is_guest 标识

### Creative Options
- 全屏 Modal 可新建 InvitationsModal 组件，保持 UserHomePage 简洁
- 邀请列表 Modal 内可复用 DishCard 类似的 section 布局模式
- Chef 选择 Modal 可复用 chefs API 端点或 category select 模式

</code_context>

<specifics>
## Specific Ideas

- 状态 Badge 颜色方案与 Feishu 通知的橙色"访客订单"标签一致
- 创建后弹窗的"2小时内有效"提示帮助用户理解时效性
- 行内复制图标让用户可以随时重新获取链接（不局限于创建时）

</specifics>

<deferred>
## Deferred Ideas

- **邀请剩余时间倒计时（EUX-01）** — v2 需求，不在 Phase 3 范围
- **二维码生成（EUX-02）** — v2 需求，面对面扫码场景
- **访客显示名（EUX-03）** — v2 需求，方便厨师知道谁点的菜

</deferred>

---

*Phase: 3-Frontend Authenticated*
*Context gathered: 2026-05-25*
