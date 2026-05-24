# Phase 1: Data Foundation - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

数据库结构支持访客邀请和访客订单。具体交付：
1. 创建 `guest_invitations` 表（UUID4 token、inviter_id、chef_id、status、expires_at）
2. 创建虚拟 guest 用户（替代 orders.user_id nullable 方案）
3. 给 orders 表添加 `guest_invitation_id` 外键
4. 单次 Alembic 迁移，可正向执行且可回滚
5. 邀请记录惰性过期（查询时检查 expires_at）

</domain>

<decisions>
## Implementation Decisions

### 邀请表字段设计
- **D-01:** `guest_invitations` 表同时保留 `inviter_id`（创建者）和 `chef_id`（负责厨师）两个字段，语义清晰，支持 Chef 自建和 User 指定厨师两种场景
- **D-02:** 使用 `status` (String(20): active/used/expired/revoked) + `expires_at` (DateTime) 双字段表示邀请状态，惰性检查过期时比对 expires_at 与当前时间
- **D-03:** 不加 `guest_name` 字段，属于 v2 需求 EUX-03，当前 out of scope

### 迁移策略（重大设计变更）
- **D-04:** **不修改 `orders.user_id` 为 nullable**。替代方案：创建虚拟 guest 用户（is_active=False），所有访客订单的 user_id 指向此虚拟用户
- **D-05:** 通过 `orders.guest_invitation_id IS NOT NULL` 识别访客订单，而非通过 user_id 或角色
- **D-06:** 虚拟 guest 用户设 `is_active=False`，登录时需检查此字段拒绝登录（现有系统未检查 is_active，这是已有 tech debt）
- **D-07:** 单次 Alembic 迁移完成全部操作：创建 guest_invitations 表 + 在 users 表中插入 guest 虚拟用户 + 给 orders 表添加 guest_invitation_id 列

### 模型关系与索引
- **D-08:** Order 侧建 `guest_invitation_id` FK 指向 GuestInvitation（遵循现有模式：orders 表通过 FK 指向其他表）
- **D-09:** guest_invitations 表建 4 个索引：
  - `token` — UNIQUE 索引（查询邀请，防重复）
  - `inviter_id` — 普通索引（用户查看自己的邀请列表）
  - `expires_at` — 普通索引（过期查询）
  - `(status, expires_at)` — 复合索引（惰性过期检查：status=active AND expires_at < now）

### the agent's Discretion
- 虚拟 guest 用户的具体字段值（username、password_hash、display_name）由 planner 决定
- guest_invitations 表的 created_at、updated_at 时间戳列由 planner 按现有模型惯例决定
- Order 模型的 SQLAlchemy relationship 名称和 back_populates 由 planner 按现有模式决定

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DATA-01, DATA-02, DATA-03, DATA-05, INV-03 的完整需求定义
- `.planning/ROADMAP.md` §Phase 1 — 成功标准和需求映射

### 现有模型参考
- `backend/app/models/order.py` — Order 和 OrderItem 当前结构（user_id NOT NULL, 现有 relationships）
- `backend/app/models/user.py` — User 模型（role 字段当前仅 admin/chef/user，无 guest）
- `backend/app/models/dish.py` — DishChef 多对多关联模型（参考 status String(20) 模式）
- `backend/app/models/__init__.py` — 模型导出注册（新模型需要在此注册）

### 数据库与迁移
- `backend/app/database.py` — Base 类、get_db 依赖、init_db 启动流程
- `backend/alembic/` — 现有 10 个迁移文件的编写模式参考
- `backend/app/initial_data.py` — 种子数据逻辑（虚拟 guest 用户应在类似位置创建或在此处创建）

### 已知问题
- `.planning/STATE.md` §Blockers/Concerns — 原先列出的 "Order.user_id NOT NULL constraint" blocker 已通过虚拟用户方案规避

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/app/models/dish.py:DishChef` — 同样使用 `status = Column(String(20))` 模式存储状态枚举，guest_invitations.status 应沿用
- `backend/app/database.py:Base` — 所有模型的 ORM 基类
- `backend/app/initial_data.py` — 种子数据创建模式（create_if_not_exists），虚拟 guest 用户可在此处或迁移中创建

### Established Patterns
- **状态字段用 String(20)** — Dish.status, DishChef.status, Order.status 均为 String(20)，不用 Enum
- **时间戳用 server_default=func.now()** — created_at/updated_at 的标准模式
- **FK 在 orders 侧** — orders 表通过 user_id → users, chef_id → users 建关系，guest_invitation_id → guest_invitations 遵循此模式
- **Alembic 迁移文件命名** — 使用 alembic revision --autogenerate 生成，带描述性 message
- **模型在 `__init__.py` 导出** — 新模型必须加入 `__all__` 列表

### Integration Points
- `backend/app/models/__init__.py` — 新 GuestInvitation 模型需在此导出
- `backend/app/initial_data.py` — 虚拟 guest 用户可能需要在此种子数据中创建（或迁移脚本中直接 INSERT）
- `backend/app/services/order_service.py` — Phase 2 将在此服务中引用 guest_invitation_id，但 Phase 1 仅做数据层
- `backend/alembic/versions/` — 新迁移文件存放位置

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

*Phase: 1-Data Foundation*
*Context gathered: 2026-05-24*
