# 家味 · Family Chef — 访客点菜邀请

## What This Is

在现有的家庭点菜系统（家味·Family Chef）上新增"访客点菜邀请"功能。家庭成员（chef 或 user 角色）可以生成一个一次性邀请链接，发给来访的朋友，让朋友在无需注册的情况下浏览菜品并提前点好想吃的菜。这是一个面向家庭社交场景的功能，让做客的朋友也能参与到家庭用餐的菜品选择中。

## Core Value

让未注册的访客通过一次性链接安全、简单地完成点菜，一次提交、即时通知厨师。

## Requirements

### Validated

- ✓ 用户注册与登录（JWT 认证） — existing
- ✓ 菜品 CRUD（含图片、食材、分类、厨师关联） — existing
- ✓ 订单创建（按厨师自动拆单） — existing
- ✓ 订单状态流转（pending → accepted → cooking → completed / cancelled） — existing
- ✓ 飞书卡片消息通知（订单状态变更通知厨师） — existing
- ✓ 收藏、口味偏好（忌口/过敏）管理 — existing
- ✓ 角色权限体系（admin / chef / user） — existing
- ✓ 文件上传（菜品图片） — existing

### Active

- [ ] Chef 角色用户可生成一次性访客点菜邀请链接（自动绑定自己为厨师）
- [ ] User 角色用户可生成一次性访客点菜邀请链接（生成时需指定一位厨师）
- [ ] 邀请链接生成后 2 小时内有效，过期自动失效
- [ ] 访客通过链接访问点菜页面，无需注册或登录
- [ ] 访客仅能看到邀请绑定的厨师所上架的菜品（含图片、食材信息）
- [ ] 访客点菜时无需选择厨师（已绑定），直接选择菜品并提交
- [ ] 一链接仅能提交一次订单，提交后链接变为只读（仅可查看订单）
- [ ] 访客提交订单后通过飞书通知绑定的厨师
- [ ] 访客点菜页面需适配移动端（朋友通常通过手机微信打开链接）

### Out of Scope

- 访客注册/登录 — 访客流程完全无账号，不收集个人信息
- 访客提交忌口/过敏信息 — v1 仅展示菜品，访客无偏好管理
- 访客修改或取消订单 — 提交后只读，修改需联系邀请人
- 邀请人限定菜品范围 — v1 展示该厨师全部上架菜品
- 多次使用同一链接 — 严格一次性
- 分享链接到社交媒体 — 仅通过私聊/短信分享

## Context

- **Brownfield 项目**: 现有系统已有完整的菜品管理、订单系统、厨师角色、飞书通知等基础能力
- **技术栈**: FastAPI + SQLAlchemy 2.0 (async) + React 19 + Vite
- **数据库**: SQLite (aiosqlite)，通过 Alembic 做迁移
- **前端路由**: React Router DOM 7，有 ProtectedRoute 机制
- **API 认证**: JWT Bearer Token，访客链接需绕过此机制
- **飞书通知**: 已有 `FeishuClient.send_order_notification()` 可复用
- **菜品-厨师关联**: `DishChef` 模型已建立菜品与厨师的多对多关系
- **订单拆单**: `OrderService.create_order_auto_split()` 已实现按厨师拆单
- **已知问题**: 刚修复了 8 个 critical 级别缺陷（密钥暴露、无认证端点、飞书签名不匹配等）

## Constraints

- **Tech Stack**: 必须沿用现有的 FastAPI + React 技术栈，不引入新框架
- **Database**: 继续使用 SQLite，需通过 Alembic 迁移新增表
- **Security**: 访客链接需使用不可猜测的 token（UUID 或类似机制），防止暴力枚举
- **Mobile**: 访客主要通过手机浏览器访问，前端必须移动端友好
- **No Auth**: 访客路由不走 JWT 认证，但需通过链接 token 验证访问权限
- **Branch**: 开发在 `feature/guest_order` 分支上进行

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 链接 token 使用 UUID4 | 不可猜测、无需额外加密、足够安全 | — Pending |
| 邀请数据存独立表 (guest_invitations) | 与订单解耦，便于管理生命周期和过期 | — Pending |
| 访客订单复用现有 Order 模型 | user_id 可为 NULL 表示访客订单，最小改动 | — Pending |
| 访客点菜页独立于主 SPA | 避免引入不必要的认证逻辑，独立页面更简洁 | — Pending |
| 2 小时过期在数据库层检查 | 无需后台定时任务，每次访问时检查即可 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-24 after initialization*
