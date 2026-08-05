# 家味 · Family Chef

## What This Is

家庭点菜系统（家味·Family Chef）：家庭成员通过手机浏览菜单、点菜、管理口味偏好；厨师发布菜品、接单、通过飞书收到通知。v1.0 新增"访客点菜邀请"，让未注册访客通过一次性链接参与点菜。v1.1 新增"菜品愿望单"——注册用户可以提交菜单上没有的菜，由厨师认领并推进到上架或拒绝。v1.2 完成 Material Design 3 (Material You) 前端重构——全面落实 5 级圆角体系 + MD3 配色令牌 + 涟漪/悬浮动效 + 8dp 网格 + 组件换皮，仅换皮（保留业务逻辑）。v1.5 新增"自定义网站皮肤"——用户可调整 MD3 配色令牌、选择预设或创建无限自定义主题、按季节自动切换。

## Core Value

让家庭成员和访客都能简单、愉快地参与到家庭用餐的菜品选择与准备。

## Current State

**Shipped v1.5** — 2026-08-05: 自定义网站皮肤（Theme Customization）完整交付。Phases 17-18 / 11 plans：MD3 运行时主题引擎（9 种变体 dispatch）+ FOUC bootstrap + 5 预设 + /theme 页面 + 自定义主题后端 CRUD + react-colorful 种子色编辑器（scoped 实时预览）+ 节气驱动的季节自动切换（2020-2099 本地时区解析 + 半球反转 + 互斥开关）。

## Current Milestone: v1.5 自定义网站皮肤 / Theme Customization

**Goal:** 让用户能够自定义网站配色（MD3 色彩令牌），选择预设或创建无限自定义皮肤，并支持按季节自动切换。

**Target features:**
- Header 新增 /theme 入口按钮（位于主题切换与用户头像之间，图标待 discuss 阶段确认）
- 新 /theme 页面：以卡片形式展示所有 theme，卡片本身即预览
- 5 个预设 theme：当前配色 + 春/夏/秋/冬四季主题色（仅可编辑，不可删除）
- 自定义 theme 编辑器：调整 MD3 主色/主色容器/次级色/强调色等参数，实时预览，保存为自定义 theme（数量无上限，可编辑可删除）
- 季节自动切换开关
- 存储：预设+当前选择存 localStorage；自定义 theme 存后端 DB（跨设备同步）
- 明暗切换（light/dark）保留为 header 独立按钮，不整合进 /theme

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
- ✓ 菜品愿望单（WISH-01~04, FLOW-01~05, PERM-01~04, DATA-06~08, NOTIF-03~06） — v1.1
- ✓ MD3 设计令牌（TOKEN-01~14） — v1.2
- ✓ MD3 动效反馈（MOTION-01~04） — v1.2
- ✓ MD3 组件化（COMPO-01~12, except COMPO-09 deferred） — v1.2
- ✓ 8dp 网格间距 + 触控目标 ≥48dp（UX-01~05） — v1.2
- ✓ 业务逻辑零回归（LOGIC-01~03） — v1.2
- ✓ 自定义网站皮肤（EDIT-01~07, SEAS-01~04） — v1.5

### Active

- [ ] 访客备注功能（GORD-06，延期自 v1.0 → v2）
- [ ] COMPO-09 Navigation Rail + Navigation Bar 缺陷修复 — v1.2 deferred
- [ ] MOTION-05 MD3 motion duration/easing tokens — v1.2 deferred

### Out of Scope

- 访客注册/登录 — 访客流程完全无账号
- 访客修改或取消订单 — 提交后只读
- 同一链接多次点菜 — 严格一次性
- 支付集成 — 家庭应用非商业场景

## Context

- **Shipped v1.0**: 访客点菜邀请功能完整交付，4 phases / 6 plans / 52 commits
- **Shipped v1.1**: 菜品愿望单后端+通知+前端完整交付，3 phases / 11 plans / 104 commits
- **Shipped v1.2**: Material Design 3 重构，6 phases / 18 plans / 242 files / +46k LOC
- **Shipped v1.3**: Bugfix + UI Refinements，2 phases / 13 plans（导航重组 + 筛选弹窗 + seed 数据）
- **Shipped v1.4**: Tech Debt Cleanup，1 phase / 4 plans（CORS/migration/test/lint 修复）
- **Shipped v1.5**: 自定义网站皮肤，2 phases / 11 plans（主题引擎 + 编辑器 + 季节自动切换）
- **Tech stack**: FastAPI + SQLAlchemy 2.0 (async) + React 19 + Vite + SQLite
- **Feature branch**: feature/ui-rebuild

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
| MD3 令牌生成一次/hardcode 模式 | 避免 FOUC + JS runtime 开销 | ✓ Good |
| 保留 .form-input for select | select 不在 Input primitive 范围内，Phase 11 尚未实现 Select | ✓ Good |
| D-BUG-01 Ripple fix = Option 3 hybrid | self mode on native button, wrap mode for composites | ✓ Good |
| D-EMOJI-01: 128 emoji→Icon | 统一 Material Symbols，删除 pictographic emoji 散落 | ✓ Good |

## Evolution

<details>
<summary>v1.1 → v1.2 evolution (2026-07-24)</summary>

v1.2 在保留 v1.0/v1.1 全部业务能力（访客点菜 + 菜品愿望单）基础上，将前端重构为严格 Material Design 3 (Material You) 规范。

**新增要求**: MD3 设计令牌（圆角/配色/elevation/state-layer/8dp 间距）+ Ripple 涟漪动效 + 全量组件换皮。

**保留**: 所有 React 业务逻辑、状态管理、数据请求、JWT 鉴权、飞书通知、Alembic 迁移、SQLite 模型。后端零改动。

</details>

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-08-05 after v1.5 milestone complete*

## Constraints

- **Tech Stack**: FastAPI + React，不引入新框架
- **Database**: SQLite + Alembic 迁移
- **Security**: UUID4 token，惰性过期，原子性事务
- **Mobile**: 移动端优先
- **No Auth**: 访客路由不走 JWT
