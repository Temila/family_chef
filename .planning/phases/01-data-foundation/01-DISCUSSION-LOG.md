# Phase 1: Data Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 1-Data Foundation
**Areas discussed:** 邀请表字段设计, 迁移策略, 模型关系与索引

---

## 邀请表字段设计

### Q1: chef_id 处理方式

| Option | Description | Selected |
|--------|-------------|----------|
| 两字段都保留 | inviter_id + chef_id 分开存，语义清晰 | ✓ |
| 仅存 chef_id | 省 inviter_id，丢失"谁邀请的"信息 | |
| You decide | 交给下游 agent | |

**User's choice:** 两字段都保留
**Notes:** Chef 创建时两者相同，User 创建时 chef_id 指定厨师

### Q2: 邀请状态表示

| Option | Description | Selected |
|--------|-------------|----------|
| status + expires_at | status String(20) + expires_at DateTime，惰性检查 | ✓ |
| 仅 expires_at | status 通过计算得出，无冗余但查询复杂 | |
| You decide | 交给下游 agent | |

**User's choice:** status + expires_at

### Q3: guest_name 字段

| Option | Description | Selected |
|--------|-------------|----------|
| 不加 | v1 最简设计，备注字段可传达忌口信息 | ✓ |
| 加上 guest_name | 属于 v2 EUX-03，当前 out of scope | |
| You decide | 交给下游 agent | |

**User's choice:** 不加

---

## 迁移策略

### Q1: orders.user_id nullable vs 虚拟用户

| Option | Description | Selected |
|--------|-------------|----------|
| user_id 改为 nullable | 原方案，需修改 NOT NULL 约束 | |
| 虚拟 guest 用户 | 创建虚拟用户，user_id 保持 NOT NULL | ✓ |

**User's choice:** orders.user_id 保持不允许为空，使用一个特殊的占位符来填充（虚拟 guest 用户）
**Notes:** 这是一个重大设计变更，规避了修改 user_id NOT NULL 约束的风险

### Q2: 虚拟用户登录防护与访客订单识别

| Option | Description | Selected |
|--------|-------------|----------|
| is_active=False + guest_invitation_id | 不加新角色，通过 guest_invitation_id IS NOT NULL 识别 | ✓ |
| role='guest' | 在 User.role 增加新角色枚举值 | |
| You decide | 交给下游 agent | |

**User's choice:** is_active=False + guest_invitation_id

### Q3: 迁移拆分

| Option | Description | Selected |
|--------|-------------|----------|
| 单次迁移 | 一次完成全部变更，简单直接 | ✓ |
| 分多次迁移 | 更安全但更复杂 | |
| You decide | 交给下游 agent | |

**User's choice:** 单次迁移

---

## 模型关系与索引

### Q1: Order ↔ GuestInvitation 关系方向

| Option | Description | Selected |
|--------|-------------|----------|
| Order.guest_invitation_id FK | orders 侧建外键，遵循现有模式 | ✓ |
| GuestInvitation.order_id FK | 邀请侧建外键，反向指向 | |
| You decide | 交给下游 agent | |

**User's choice:** Order.guest_invitation_id FK

### Q2: 索引策略

| Option | Description | Selected |
|--------|-------------|----------|
| 推荐 4 索引 | token (unique), inviter_id, expires_at, (status, expires_at) | ✓ |
| 最小 2 索引 | token (unique), status | |
| You decide | 交给下游 agent | |

**User's choice:** 推荐 4 索引

---

## the agent's Discretion

- 虚拟 guest 用户的具体字段值（username, password_hash, display_name）
- guest_invitations 表的时间戳列细节
- Order 模型的 SQLAlchemy relationship 命名

## Deferred Ideas

None — discussion stayed within phase scope
