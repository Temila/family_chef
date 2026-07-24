# 家味 · Family Chef

## What This Is

家庭点菜系统（家味·Family Chef）：家庭成员通过手机浏览菜单、点菜、管理口味偏好；厨师发布菜品、接单、通过飞书收到通知。v1.0 新增"访客点菜邀请"，让未注册访客通过一次性链接参与点菜。v1.1 正在新增"菜品愿望单"——注册用户可以提交菜单上没有的菜，由厨师认领并推进到上架或拒绝，形成完整闭环。

## Core Value

让家庭成员和访客都能简单、愉快地参与到家庭用餐的菜品选择与准备。

## Current Milestone: v1.1 菜品愿望单 (Dish Wish List) — SHIPPED 2026-07-24

**Goal:** 让注册用户在菜单里找不到想吃的菜时，向厨师提交"愿望单"，厨师认领并推进（准备中 → 已上架 / 已拒绝），形成完整闭环。

**Status:** 3/3 phases delivered (Phase 5: Data Foundation & Wish Lifecycle API, Phase 6: Notifications Integration, Phase 7: Wish List Frontend). 23/23 requirements satisfied. 16/16 E2E flows verified. 5/5 HUMAN-UAT items passed. Audit status: `passed`.

**Target features:**
- 用户提交愿望（菜名 + 参考链接 + 备注）；所有注册用户可提交，不含访客
- 状态生命周期：待处理 → 准备中（厨师独占认领）→ 已上架（手动关联菜品） / 已拒绝（含拒绝原因）
- 用户在已上架前可编辑/撤销，修改通知认领厨师
- 可见性：提交者本人 + 厨师/管理员
- 通知：用户端应用内红点（状态变化），厨师端飞书推送新愿望
- 厨师端认领/推进流程的 UI

## Next Milestone Goals

下一里程碑（v1.2 或后续）候选议题（来自 v1.1 audit tech_debt）：
- 自动 `alembic upgrade head`（`AUTO_MIGRATE` env 候选）— 解决启动迁移缺口
- 修复 `f94f55868e87` 迁移以解决 alembic chain 缺陷
- 收窄 CORS / 全面刷新后端 pytest 漂移（107 失败既有）
- 后端启动迁移决策落地、CMDB 化 CORS/CSP
- 评估重新开启访客备注延期 GORD-06
- Wish 增强（WISH-F01 标签 / WISH-F02 多链接 / WISH-F03 评论 / WISH-F04 历史）

## Requirements

### Validated

- ✓ 邀请链接生成与管理（INV-01~07） — v1.0
- ✓ 访客无认证菜品浏览与下单（GORD-01~05, GORD-07） — v1.0
- ✓ 访客移动端友好页面（GUX-01~05） — v1.0
- ✓ 飞书访客订单通知 + 厨师端访客标识（NOTIF-01~02） — v1.0
- ✓ 数据模型 + 迁移 + 原子性事务（DATA-01~05） — v1.0
- ✓ 用户注册与登录（JWT 认证） — existing
- ✓ 菜品 CRUD（含图片、食材、分类、厨师关联） — existing
- ✓ 订单创建（按厨师自动拆单） — existing
- ✓ 飞书卡片消息通知 — existing
- ✓ 收藏、口味偏好管理 — existing
- ✓ 菜品愿望单（WISH-01~04, FLOW-01~05, PERM-01~04, DATA-06~08, NOTIF-03~06, UX-01~03） — v1.1

### Active

- [ ] 访客备注功能（GORD-06，延期自 v1.0 → v2）

### Out of Scope

- 访客注册/登录 — 访客流程完全无账号
- 访客修改或取消订单 — 提交后只读
- 同一链接多次点菜 — 严格一次性
- 支付集成 — 家庭应用非商业场景
- 愿望标签分类（辣/素食等）— 保持简单，参考链接已能表达上下文
- 多参考链接 — 单 URL 字段足够
- 愿望评论/对话 — 状态流转 + 拒绝原因已闭环
- 社区投票/点赞池 — 可见性限定，非社区许愿墙
- 访客提交愿望 — 限定注册用户
- 愿望自动转菜品（草稿）— 避免自动创建清理负担
- 愿望过期/回收机制 — v1.1 不设时效

## Context

- **Shipped v1.0**: 访客点菜邀请功能完整交付，4 phases / 6 plans / 52 commits
- **Shipped v1.1**: 菜品愿望单后端+通知+前端完整交付，3 phases / 11 plans（Phase 5-7，含 07-04 + 07-05 gap-closure），104 commits
- **Tech stack**: FastAPI + SQLAlchemy 2.0 (async) + React 19 + Vite + SQLite
- **Feature branch**: feature/guest_order
- **Known tech debt**: app.url 占位 / 迁移 f94f55868e87 SQLite batch 缺陷 / 启动未自动 alembic upgrade / CORS 通配 / 后端测试套件漂移 107 fail / 前端 lint 红基线

## Constraints

- **Tech Stack**: FastAPI + React，不引入新框架
- **Database**: SQLite + Alembic 迁移
- **Security**: UUID4 token，惰性过期，原子性事务
- **Mobile**: 移动端优先
- **No Auth**: 访客路由不走 JWT

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 链接 token 使用 UUID4 | 不可猜测、无需额外加密 | ✓ Good |
| 邀请数据存独立表 (guest_invitations) | 与订单解耦，便于管理生命周期 | ✓ Good |
| 访客订单复用 Order 模型 | user_id 指向虚拟 __guest__ 用户 | ✓ Good |
| 访客页面独立于主 SPA | 绕过 ProtectedRoute，无认证干扰 | ✓ Good |
| 2 小时过期在数据库层检查 | 惰性过期，无需后台任务 | ✓ Good |
| 一次性使用原子性事务 | 同一事务 check+create+update | ✓ Good |
| Wish 认领用原子条件 UPDATE | 避免多人同时认领同一愿望（D-01） | ✓ Good |
| `naive_utc_now()` UTC-naive 时钟辅助 | 防止 UTC+08 本地时间与 SQLite UTC 默认值比较错误 | ✓ Good |
| `batch_alter_table(recreate=always)` 迁移 | 绕过 SQLite ADD COLUMN 限制 | ✓ Good |
| `compute_has_unread` 身份屏蔽 | 红点仅对提交者披露真实值 | ✓ Good |
| `WishNotificationService` 独立模块 | 收件人解析 + 失败隔离脱离集成层 | ✓ Good |
| `fetchedOnce` + `setTimeout(100)` | 区分"列表真正就绪"与".finally 翻 loading" race | ✓ Good |
| NOTE(07-04) 源码标记 | 不擅自做架构决策，留下 TODO | ✓ Good |

## Evolution

<details>
<summary>v1.0 → v1.1 evolution (2026-07-21 → 2026-07-24)</summary>

v1.1 在 v1.0 家庭点菜系统上新增"菜品愿望单"完整闭环：注册用户提交 → 厨师认领 → 推进（关联菜品）或拒绝（带原因）。配套飞书推送与应用内未读红点，三角色（用户/厨师/管理员）共用统一 WishCard + 状态徽章组件。

**新增要求**: WISH-01~04 / FLOW-01~05 / PERM-01~04 / DATA-06~08 / NOTIF-03~06 / UX-01~03 — 23 项全部满足。

**未解决**: v1.0 的 GORD-06 访客备注延期维持，进 v2 候选。

</details>

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-07-24 after v1.1 milestone close*
