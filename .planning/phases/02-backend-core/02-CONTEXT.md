# Phase 2: Backend Core - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

所有邀请和访客下单 API 端到端可用（可通过 API 客户端完整测试）。具体交付：
1. Chef 角色用户可通过 API 创建邀请链接（自动绑定自己为厨师）(INV-01)
2. User 角色用户可通过 API 创建邀请链接并指定厨师 (INV-02)
3. 访客通过邀请 token 可浏览绑定厨师的上架菜品（无需认证）(GORD-01, GORD-02)
4. 访客通过 token 提交一次性订单后，链接自动变为只读，重复提交被拒绝 (GORD-05, GUX-04, DATA-04)
5. 访客提交订单后绑定的厨师收到飞书通知（标注"访客订单"）(NOTIF-01)

</domain>

<decisions>
## Implementation Decisions

### 访客菜品浏览范围
- **D-01:** 访客看到完整菜品详情 — 图片、名称、描述、食材列表、分类标签，与注册用户一致。仅过滤为指定厨师上架的菜品
- **D-02:** 复用现有 DishListResponse schema，不创建专用 GuestDishResponse。保持接口一致性
- **D-03:** 访客菜品列表支持分页和分类筛选，与注册用户的菜品列表 API 一致
- **D-04:** 不显示饮食警告（忌口/过敏）— 访客无偏好数据，现有 get_dietary_warnings 依赖用户偏好，对访客无意义

### 一次性链接的原子性保障
- **D-05:** 使用事务内状态检查 — 在 async session 同一个事务中执行 status 检查 + 订单创建 + status 更新。SQLite 单写者模式下此方案足够安全
- **D-06:** 采用检查-操作-更新模式 — 先检查 status=active + expires_at 未过期，不满足则返回错误，满足后继续创建订单和更新状态
- **D-07:** 标记邀请为 used 和创建访客订单在同一个数据库事务中。如果订单创建失败，整体回滚，邀请状态恢复

### 飞书通知的访客订单标注
- **D-08:** 修复现有 `send_order_notification` 调用签名不匹配 bug（order_service.py:347 传 4 个位置参数但方法期望 `(self, receive_id, data: dict)`）+ 扩展 data dict 增加 `is_guest` 标识。不新建独立的访客通知方法
- **D-09:** 访客订单飞书通知在订单号后加【访客订单】标签，点单人名称显示"访客"
- **D-10:** 访客订单飞书通知采用同步发送 + 失败忽略（try/except），与现有订单通知策略一致

### 公开端点安全与路由组织
- **D-11:** CORS allow_origins=["*"] 和无 rate limiting 标记为已知风险，不在 Phase 2 处理。延后到 v2 或安全专项阶段
- **D-12:** 访客 API 端点组织在独立的 router 文件（`guest.py`），使用 `/api/guest` 前缀。清晰分离公开端点和认证端点，便于未来单独添加安全中间件

### the agent's Discretion
- 邀请创建端点的具体请求/响应 schema 设计由 planner 决定
- 访客订单提交端点的请求体结构（菜品列表格式、备注字段）由 planner 根据现有 OrderCreate schema 决定
- 已使用链接的只读订单摘要返回格式由 planner 决定
- 惰性过期检查的具体实现位置（service 层 helper 还是 query 级别）由 planner 决定

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求与路线图
- `.planning/REQUIREMENTS.md` — INV-01, INV-02, GORD-01, GORD-02, GORD-05, GUX-04, NOTIF-01, DATA-04 的完整需求定义
- `.planning/ROADMAP.md` §Phase 2 — 成功标准和需求映射

### Phase 1 上下文（已锁定决策）
- `.planning/phases/01-data-foundation/01-CONTEXT.md` — 数据层决策：虚拟 guest 用户、guest_invitations 表结构、Order FK、索引设计

### 现有模型与服务
- `backend/app/models/order.py` — Order 和 OrderItem 当前结构（user_id NOT NULL, 虚拟 guest 用户, guest_invitation_id FK）
- `backend/app/models/user.py` — User 模型（角色 admin/chef/user，is_active 字段）
- `backend/app/models/dish.py` — DishChef 多对多关联模型（status 过滤厨师上架菜品）
- `backend/app/models/__init__.py` — 模型导出注册
- `backend/app/services/order_service.py` — 订单创建逻辑（create_order, generate_order_no, 飞书通知调用 — 有 bug 需修复）
- `backend/app/services/dish_service.py` — 菜品查询逻辑（list_dishes 的过滤和分页模式供访客 API 复用）
- `backend/app/routers/auth.py` — get_current_user_from_token 依赖（访客端点不使用此依赖）

### 飞书集成
- `backend/app/integrations/feishu.py` — FeishuClient.send_order_notification 方法签名（line 82-88 期望 data: dict 参数）。需要修复 order_service.py:347 的调用签名不匹配

### Schemas
- `backend/app/schemas/dish.py` — DishListResponse（访客菜品浏览复用此 schema）
- `backend/app/schemas/order.py` — OrderCreate, OrderItemCreate（参考但访客端点可能需要简化版）
- `backend/app/schemas/common.py` — PageResponse（分页响应包装）

### 路由注册
- `backend/app/main.py` — 所有 router 注册模式（line 63-77）。新 guest router 需在此注册，prefix="/api/guest"

### 数据库
- `backend/app/database.py` — get_db 依赖（访客端点复用此依赖获取 db session）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DishService.list_dishes()` — 已有完整的菜品过滤（按厨师、分类、状态）和分页逻辑。访客 API 可在 router 层做 token 验证 + 厨师过滤，service 层复用此方法
- `OrderService.generate_order_no()` — 订单号生成逻辑（ORD + 日期 + 序号），访客订单可直接复用
- `OrderService.create_order()` — 现有订单创建流程（验证菜品、创建 order items），访客订单需要简化版（无需 auto-split，厨师已绑定）
- `FeishuClient.send_order_notification()` — 飞书卡片通知模板（已有菜品清单、食材清单等模板），扩展 is_guest 标识即可支持访客标注
- `PaginationParams` — 分页工具类（backend/app/utils/pagination.py），访客菜品列表复用

### Established Patterns
- **Service 是 @staticmethod 单例** — 新 GuestService 应遵循此模式：类 + @staticmethod + 模块级实例 `guest_service = GuestService()`
- **Router → Service → Model 分层** — Router 处理 HTTP 和认证，Service 处理业务逻辑
- **Pydantic schema 分离 Create/Update/Response** — 访客端点的请求/响应 schema 遵循此模式
- **路由前缀 /api/{resource}** — 所有路由使用 /api/ 前缀，访客端点使用 /api/guest
- **错误处理** — Service 层抛 ValueError，Router 层捕获并转换为 HTTPException（含中文错误消息）
- **飞书通知在 try/except 中同步发送** — 通知失败不影响主流程

### Integration Points
- `backend/app/main.py` line 77 后 — 注册新 guest router
- `backend/app/routers/auth.py` — get_current_user_from_token 依赖（访客端点不使用，但邀请创建端点需要使用）
- `backend/app/services/order_service.py:347` — 修复飞书通知调用签名 bug
- `backend/app/models/order.py` — Order 模型已有 guest_invitation_id FK（Phase 1 创建）
- 虚拟 guest 用户（Phase 1 创建）— 访客订单的 user_id 指向此用户

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 2-Backend Core*
*Context gathered: 2026-05-24*