# Phase 4: Frontend Guest - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

访客通过手机打开邀请链接即可浏览菜品、加入购物车、提交订单，体验完整且移动端友好。具体交付：
1. 访客打开邀请链接后看到移动端优先的菜品浏览页（无侧边栏、无导航栏）（GUX-01, GUX-02）
2. 访客可将菜品加入购物车并设置数量（GORD-03），无需选择厨师（已绑定）（GORD-04）
3. 访客提交订单后看到确认页面，展示订单摘要（GORD-07）
4. 链接过期、已使用或无效时，访客看到友好的中文错误提示（GUX-03, GUX-05）
5. 访客页面在微信内置浏览器中正常工作

**不包含：** 备注功能（GORD-06 移除）、访客注册/登录、访客修改订单、二维码生成、分享功能、邀请管理（Phase 3 已完成）

</domain>

<decisions>
## Implementation Decisions

### 访客页架构
- **D-01:** 在 App.jsx 中添加 `/guest/:token` 路由，放在 PcLayout 外、AuthProvider 外。使用独立 ToastProvider 包裹访客页面组件，不共享注册用户的 Auth/Categories Context
- **D-02:** 访客页面不使用 ApiClient 单例，直接用 fetch 调用 `/api/guest/*` 端点。避免 ApiClient 的 401 自动跳转 /login 行为。访客端只需 3 个 API：GET 菜品列表、POST 提交订单、GET 订单摘要
- **D-03:** 单路由 `/guest/:token` + 页面内部状态切换。根据 token 验证结果在同一个页面中显示不同内容：菜品浏览（活跃）、订单确认（提交后）、已使用摘要、错误提示
- **D-04:** 共享现有 styles.css，继承访客手机系统明暗偏好（prefers-color-scheme）。复用现有组件类名（dish-card、badge、btn 等），添加访客专用 CSS 覆盖不需要的元素

### 菜品浏览与购物车
- **D-05:** 新建 GuestDishCard 组件（不复用 DishCard）。简化为：图片 + 菜名 + 分类 + 加购按钮。无收藏按钮、无饮食警告、无厨师头像、无点击跳转详情页
- **D-06:** 卡片内直接 +/- 步进器加购。初始显示"+"按钮，点击后数量变为 1 并显示"- 数量 +"控制器。类似外卖 App 体验，单手操作友好
- **D-07:** 筛选功能：搜索框 + 全部分类筛选（地域、菜系、口味、季节、食材分类）。不包含收藏筛选和排序选择。需注意：访客路由在 CategoriesProvider 外，需单独获取分类数据（可通过 fetch 直接调用 `/api/categories` 或在页面内管理分类状态）
- **D-08:** 底部固定购物车栏（类似美团/饿了么），显示已选数量和"提交订单"按钮。点击展开购物车详情面板，可调整数量或删除菜品
- **D-09:** 不提供备注功能，与现有点单系统保持一致。原需求 GORD-06（备注字段）从 Phase 4 移除

### 提交后确认
- **D-10:** 访客提交订单成功后，页面内容替换为全页确认页（非弹窗）
- **D-11:** 确认页内容：标题"点单成功" + 订单号 + 菜品列表（菜名 × 数量）+ 厨师名 + "已通知厨师，请耐心等待"提示 + 底部"关闭本页即可"引导

### 错误状态展示
- **D-12:** 链接过期/无效时显示全页错误状态：大图标 + 中文标题（"邀请链接已过期"/"无效的邀请链接"）+ 简短说明 + "请联系邀请人"提示
- **D-13:** 已使用链接特殊处理：显示只读订单摘要（订单号 + 菜品列表），而非"已使用"错误页。利用后端已有的 GET /{token}/summary 接口
- **D-14:** 微信内置浏览器兼容性：planner 确保使用标准 CSS/JS，避免不兼容特性。访客页不需要 Web Share API，CSS 变量和 flexbox 可安全使用

### the agent's Discretion
- GuestDishCard 的具体布局（卡片高度、图片比例、文字截断）由 planner 参考现有 DishCard 决定
- 购物车展开面板的具体样式（高度、动画、背景遮罩）由 planner 参考现有 OrderPage 的 cart-detail-panel 决定
- 筛选区域的折叠/展开方式由 planner 参考 OrderPage 的 filter-chips 模式决定
- 确认页和错误页的具体排版、图标选择、颜色由 planner 决定
- 访客页面内部分类数据的获取方式（直接 fetch 还是简单 Context）由 planner 决定

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与路线图
- `.planning/REQUIREMENTS.md` — GORD-03, GORD-04, GORD-06(已移除), GORD-07, GUX-01, GUX-02, GUX-03, GUX-04, GUX-05 的完整需求定义
- `.planning/ROADMAP.md` §Phase 4 — 成功标准和需求映射

### 前期阶段上下文（已锁定决策）
- `.planning/phases/02-backend-core/02-CONTEXT.md` — 后端 API 设计决策、访客端点路由组织（/api/guest 前缀）、一次性链接原子性、DishListResponse 复用
- `.planning/phases/03-frontend-authenticated/03-CONTEXT.md` — 前端邀请管理 UI 决策、链接拼接格式（`window.location.origin + '/guest/' + token`）

### 后端访客 API（已实现，Phase 2）
- `backend/app/routers/guest.py` — 完整的访客路由：GET /{token}/dishes（菜品浏览）、POST /{token}/orders（订单提交）、GET /{token}/summary（已使用摘要）
- `backend/app/services/guest_service.py` — GuestService 业务逻辑
- `backend/app/schemas/guest.py` — GuestOrderCreate schema（items: [{dish_id, quantity}]）

### 前端页面参考
- `frontend/src/App.jsx` — 路由定义、ProtectedRoute 模式、PcLayout 布局、Provider 嵌套结构
- `frontend/src/pages/OrderPage.jsx` — 现有点菜页（购物车模式、底部固定栏 cart-bar、cart-detail-panel、筛选 filter-chips、菜品卡片网格、IntersectionObserver 无限滚动）— 主要参考对象
- `frontend/src/components/DishCard.jsx` — 现有菜品卡片组件（了解但不复用）

### 前端组件参考（可复用样式模式）
- `frontend/src/components/Loading.jsx` — 加载状态组件
- `frontend/src/components/EmptyState.jsx` — 空状态组件（icon + text）
- `frontend/src/components/Badge.jsx` — 状态标签组件

### 前端样式
- `frontend/src/css/styles.css` — 全局样式，BEM 命名，响应式断点（420/768/1200px），dish-card、cart-bar、cart-detail-panel、filter-chips 等类名

### API 客户端（了解但不使用）
- `frontend/src/api/client.js` — ApiClient 单例（了解其 401 跳转逻辑，访客页面不使用此类）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OrderPage.jsx` 的 cart-bar + cart-detail-panel 模式 — 底部固定购物车栏、展开面板、数量调整 stepper 的 HTML/CSS 结构可直接复用或参考
- `OrderPage.jsx` 的 filter-chips 模式 — 搜索栏、筛选芯片的 HTML/CSS 可复用
- `EmptyState.jsx` — 错误页和空状态可复用此组件（icon + text 模式）
- `Loading.jsx` — 加载状态组件
- `styles.css` 中的 dish-card、dish-grid、cart-bar、filter-chips 等 CSS 类 — 访客页面复用这些类名保持视觉一致

### Established Patterns
- **页面组件模式** — `export default function XxxPage()` 函数组件，useState + useEffect 数据加载
- **数据加载模式** — useState + useEffect，try/catch 错误处理，loading 状态管理
- **无限滚动** — OrderPage 使用 IntersectionObserver + page 递增模式，访客菜品列表可复用此模式
- **购物车 localStorage** — OrderPage 使用 `fc_cart` key 存储购物车，访客页面可能需要独立 key（如 `fc_guest_cart_{token}`）或不用 localStorage（token 已绑定厨师，更简单）
- **CSS 响应式** — 断点 420px / 768px / 1200px，访客页面以移动端优先

### Integration Points
- `frontend/src/App.jsx` — 添加 `/guest/:token` 路由，在 PcLayout Route 之前、在 AuthProvider 外
- `backend/app/routers/guest.py` — 三个已实现的 API 端点（菜品浏览、订单提交、摘要查看）
- `frontend/src/css/styles.css` — 可能需要添加 `.guest-*` 前缀的访客专用样式

### Creative Options
- 访客页面可以完全独立设计而不受 PcLayout/BottomBar 约束，创造更沉浸的移动端体验
- 购物车栏可以利用现有 cart-bar CSS 类，也可以创建 guest-cart-bar 变体
- 错误页可以复用 EmptyState 组件（传不同的 icon 和 text），也可以创建专用 GuestErrorState

</code_context>

<specifics>
## Specific Ideas

- 确认页标题使用"点单成功"（非"提交成功"），更贴近用户语言
- 已使用链接显示只读订单摘要而非错误页，让访客可以回顾自己点了什么
- 卡片内 +/- 步进器类似美团/饿了么的外卖 App 体验，对移动端单手操作友好
- 访客购物车不需要 localStorage 持久化（一次性场景），可用纯 React state 管理

</specifics>

<deferred>
## Deferred Ideas

- **备注功能（GORD-06）** — 与现有点单系统保持一致移除。如未来需要可恢复
- **邀请剩余时间倒计时（EUX-01）** — v2 需求
- **二维码生成（EUX-02）** — v2 需求
- **访客显示名（EUX-03）** — v2 需求

</deferred>

---

*Phase: 4-Frontend Guest*
*Context gathered: 2026-05-26*
