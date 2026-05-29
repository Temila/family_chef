# 家味 · Family Chef — 访客点菜邀请

## What This Is

家庭点菜系统（家味·Family Chef）上的"访客点菜邀请"功能。家庭成员（chef 或 user 角色）可以生成一个一次性邀请链接，发给来访的朋友，让朋友在无需注册的情况下浏览菜品并提前点好想吃的菜。v1.0 已完整交付。

## Core Value

让未注册的访客通过一次性链接安全、简单地完成点菜，一次提交、即时通知厨师。

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

### Active

- [ ] 访客备注功能（GORD-06，延期自 v1.0）

### Out of Scope

- 访客注册/登录 — 访客流程完全无账号
- 访客修改或取消订单 — 提交后只读
- 同一链接多次点菜 — 严格一次性
- 支付集成 — 家庭应用非商业场景

## Context

- **Shipped v1.0**: 访客点菜邀请功能完整交付，4 phases / 6 plans / 52 commits
- **Tech stack**: FastAPI + SQLAlchemy 2.0 (async) + React 19 + Vite + SQLite
- **UAT**: 10/10 tests passed, 3 issues found and fixed inline
- **Feature branch**: feature/guest_order, ready for merge

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

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-05-29 after v1.0 milestone*
