# Requirements: 家味 · Family Chef — 访客点菜邀请

**Defined:** 2026-05-24
**Core Value:** 让未注册的访客通过一次性链接安全、简单地完成点菜，一次提交、即时通知厨师

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Invitation Management

- [ ] **INV-01**: Chef 角色用户可一键生成访客邀请链接（自动绑定自己为厨师）
- [ ] **INV-02**: User 角色用户生成邀请链接时可选择指定一位厨师
- [ ] **INV-03**: 邀请链接生成后 2 小时内有效，过期自动失效
- [ ] **INV-04**: 用户可复制邀请链接到剪贴板
- [ ] **INV-05**: 用户可通过微信/短信分享邀请链接（Web Share API + 剪贴板降级）
- [ ] **INV-06**: 用户可查看自己生成的邀请链接列表及状态（活跃/已使用/已过期/已撤销）
- [ ] **INV-07**: 用户可提前撤销尚未使用的邀请链接

### Guest Ordering

- [ ] **GORD-01**: 访客通过邀请链接访问点菜页面，无需注册或登录
- [ ] **GORD-02**: 访客仅能看到邀请绑定的厨师所上架的菜品（含图片、食材信息）
- [ ] **GORD-03**: 访客可将菜品加入购物车并设置数量
- [ ] **GORD-04**: 访客提交订单时无需选择厨师（已绑定），直接提交
- [ ] **GORD-05**: 一链接仅能提交一次订单，提交后链接变为只读（可查看订单内容）
- [ ] **GORD-06**: 访客可在提交订单时可选填写备注（如忌口，最多 200 字）
- [ ] **GORD-07**: 访客提交订单后看到确认页面，展示订单摘要

### Guest UX

- [ ] **GUX-01**: 访客点菜页面移动端优先适配（响应式布局，适配微信内置浏览器）
- [ ] **GUX-02**: 访客点菜页面独立于主应用布局（无侧边栏、无顶部导航）
- [ ] **GUX-03**: 链接过期时显示友好的中文错误提示（"邀请链接已过期"）
- [ ] **GUX-04**: 链接已使用时显示已提交的订单摘要（只读）
- [ ] **GUX-05**: 无效链接显示友好错误提示（"无效的邀请链接"）

### Notification

- [ ] **NOTIF-01**: 访客提交订单后通过飞书通知绑定的厨师（标注为"访客订单"）
- [ ] **NOTIF-02**: 访客订单在厨师的订单列表中可见，带"访客"标识

### Data & Security

- [ ] **DATA-01**: 邀请 token 使用 UUID4 生成，不可猜测
- [ ] **DATA-02**: 邀请数据存储在独立的 guest_invitations 表中
- [ ] **DATA-03**: 现有 Order 模型支持 user_id 为 NULL（访客订单）和 guest_invitation_id 外键
- [ ] **DATA-04**: 一次性使用通过原子性状态检查实现（提交订单和标记已用在同一事务中）
- [ ] **DATA-05**: 通过 Alembic 迁移变更数据库结构

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced UX

- **EUX-01**: 邀请链接页面显示剩余时间倒计时
- **EUX-02**: 邀请链接支持生成二维码（面对面扫码场景）
- **EUX-03**: 访客可填写显示名（方便厨师知道谁点的菜）

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 访客注册/登录 | 破坏"无摩擦"核心价值，访客不应需要账号 |
| 访客修改或取消订单 | 家庭场景下直接联系邀请人即可，技术复杂度过高 |
| 同一链接多次点菜 | 一次性是安全模型的基石，多订单破坏"一链接一订单"语义 |
| 访客偏好/过敏管理 | 一次性交互不需要持久化偏好，备注字段已足够 |
| 菜品定制（邀请人限定范围） | 厨师通过现有 DishChef 状态管理即可控制可见菜品 |
| 支付集成 | 家庭应用，非商业餐厅场景 |
| 实时订单追踪 | 家庭场景不需要，飞书通知已足够 |
| 社交媒体分享按钮 | 私密家庭场景，链接不应公开广播 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | ✓ Verified |
| DATA-02 | Phase 1 | ✓ Verified |
| DATA-03 | Phase 1 | ✓ Verified |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 1 | ✓ Verified |
| INV-01 | Phase 2 | Pending |
| INV-02 | Phase 2 | Pending |
| INV-03 | Phase 1 | ✓ Verified |
| INV-04 | Phase 3 | Pending |
| INV-05 | Phase 3 | Pending |
| INV-06 | Phase 3 | Pending |
| INV-07 | Phase 3 | Pending |
| GORD-01 | Phase 2 | Pending |
| GORD-02 | Phase 2 | Pending |
| GORD-03 | Phase 4 | Pending |
| GORD-04 | Phase 4 | Pending |
| GORD-05 | Phase 2 | Pending |
| GORD-06 | Phase 4 | Pending |
| GORD-07 | Phase 4 | Pending |
| GUX-01 | Phase 4 | Pending |
| GUX-02 | Phase 4 | Pending |
| GUX-03 | Phase 4 | Pending |
| GUX-04 | Phase 2 | Pending |
| GUX-05 | Phase 4 | Pending |
| NOTIF-01 | Phase 2 | Pending |
| NOTIF-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-24 after roadmap creation*
