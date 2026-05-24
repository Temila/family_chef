# Roadmap: 家味 · Family Chef — 访客点菜邀请

## Overview

在现有家庭点菜系统上新增访客邀请点菜功能，从数据层到完整用户体验分四阶段交付。第一阶段建立数据库基础（新表 + 迁移），第二阶段构建完整后端能力（邀请服务、访客下单 API、飞书通知），第三阶段让注册用户可以通过 UI 创建和管理邀请链接，第四阶段交付面向访客的移动端点菜页面。每阶段结束时，对应能力可端到端验证。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - 数据库模型、迁移、邀请表结构就绪
- [ ] **Phase 2: Backend Core** - 邀请服务、访客下单 API、飞书通知端到端可用
- [ ] **Phase 3: Frontend Authenticated** - 注册用户可创建、分享、管理邀请链接
- [ ] **Phase 4: Frontend Guest** - 访客通过移动端友好页面完成点菜全流程

## Phase Details

### Phase 1: Data Foundation
**Goal**: 数据库结构支持访客邀请和访客订单，为后端开发解除阻塞
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-05, INV-03
**Success Criteria** (what must be TRUE):
  1. `guest_invitations` 表存在，包含 UUID4 token、inviter_id、chef_id、status、expires_at 字段
  2. 虚拟 guest 用户存在于 users 表中 (is_active=False)，orders.user_id 保持 NOT NULL
  3. `orders` 表有 `guest_invitation_id` 外键列 (nullable)，通过 IS NOT NULL 识别访客订单
  4. Alembic 迁移可正向执行且可回滚
  5. 邀请记录在查询时自动检查 2 小时过期（惰性过期，无需后台任务）
**Plans**: 1 plan
Plans:
- [x] 01-01-PLAN.md — 创建 GuestInvitation 模型 + Order FK + Alembic 迁移 + 虚拟 guest 用户

### Phase 2: Backend Core
**Goal**: 所有邀请和访客下单 API 端到端可用（可通过 API 客户端完整测试）
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: INV-01, INV-02, GORD-01, GORD-02, GORD-05, GUX-04, NOTIF-01, DATA-04
**Success Criteria** (what must be TRUE):
  1. Chef 角色用户可通过 API 创建邀请链接（自动绑定自己为厨师）
  2. User 角色用户可通过 API 创建邀请链接并指定厨师
  3. 访客通过邀请 token 可浏览绑定厨师的上架菜品（无需认证）
  4. 访客通过 token 提交一次性订单后，链接自动变为只读，重复提交被拒绝
  5. 访客提交订单后绑定的厨师收到飞书通知（标注"访客订单"）
**Plans**: 2 plans
Plans:
- [ ] 02-01-PLAN.md — 邀请创建 + 访客菜品浏览 API（INV-01/02, GORD-01/02）
- [ ] 02-02-PLAN.md — 访客订单提交 + 飞书通知 + 已用链接摘要（GORD-05, DATA-04, NOTIF-01, GUX-04）

### Phase 3: Frontend Authenticated
**Goal**: 注册用户可通过应用 UI 创建、分享和管理邀请链接，访客订单在厨师列表中可见
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: INV-04, INV-05, INV-06, INV-07, NOTIF-02
**Success Criteria** (what must be TRUE):
  1. 用户可生成邀请链接并一键复制到剪贴板
  2. 用户可通过 Web Share API 分享链接（微信/短信），不支持时降级到剪贴板复制
  3. 用户可查看自己创建的邀请列表，每条显示状态标签（活跃/已使用/已过期/已撤销）
  4. 用户可提前撤销尚未使用的邀请链接
  5. 访客订单在厨师的订单列表中显示，带"访客"标识
**Plans**: TBD
**UI hint**: yes

### Phase 4: Frontend Guest
**Goal**: 访客通过手机打开邀请链接即可浏览菜品、加入购物车、提交订单，体验完整且移动端友好
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: GORD-03, GORD-04, GORD-06, GORD-07, GUX-01, GUX-02, GUX-03, GUX-05
**Success Criteria** (what must be TRUE):
  1. 访客打开邀请链接后看到移动端优先的菜品浏览页（无侧边栏、无导航栏）
  2. 访客可将菜品加入购物车并设置数量，提交时可填写备注（最多 200 字）
  3. 访客提交订单后看到确认页面，展示订单摘要
  4. 链接过期、已使用或无效时，访客看到友好的中文错误提示
  5. 访客页面在微信内置浏览器中正常工作
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 1/1 | ✓ Complete | 2026-05-24 |
| 2. Backend Core | 0/2 | In progress | - |
| 3. Frontend Authenticated | 0/? | Not started | - |
| 4. Frontend Guest | 0/? | Not started | - |
