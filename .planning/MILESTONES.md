# Milestones

## v1.0 — 访客点菜邀请 (2026-05-29)

**Phases:** 4 | **Plans:** 6 | **Status:** ✅ Shipped

### Accomplishments
1. GuestInvitation 数据模型 + Alembic 迁移 + 虚拟 guest 用户
2. 邀请创建/访客菜品浏览/订单提交 API + 飞书通知集成（13 个集成测试）
3. 注册用户邀请管理 UI（创建/分享/列表/撤销）+ 访客订单 Badge
4. 访客移动端点菜全流程（浏览/购物车/提交/确认/错误状态）
5. UAT 10/10 通过，修复路由、筛选联动、剪贴板兼容性问题

### Key Decisions
- 链接 token 使用 UUID4 ✓ Good
- 访客订单复用 Order 模型 + 虚拟 __guest__ 用户 ✓ Good
- 一次性使用通过原子性事务实现 ✓ Good
- 访客页面独立于主 SPA ✓ Good
- 惰性过期检查 ✓ Good

### Known Gaps
- GORD-06 访客备注功能已延期至 v2
- CORS allow_origins ["*"] 待收紧

### Stats
- Timeline: 2026-05-24 → 2026-05-29 (5 days)
- Commits: 52 on feature/guest_order
