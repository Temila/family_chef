# Phase 2: Backend Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 2-Backend Core
**Areas discussed:** 访客菜品浏览范围, 一次性链接的原子性保障, 飞书通知的访客订单标注, 公开端点安全与路由组织

---

## 访客菜品浏览范围

| Question | Option | Selected |
|----------|--------|----------|
| 访客看到哪些信息？ | 完整详情（图片、名称、描述、食材、分类标签） | ✓ |
| | 精简版（仅图片、名称、食材） | |
| | 你来决定 | |
| 响应格式 | 复用现有 DishListResponse schema | ✓ |
| | 专用 GuestDishResponse | |
| | 你来决定 | |
| 分页和筛选 | 支持分页和分类筛选 | ✓ |
| | 无筛选/分页（一次返回全部） | |
| | 你来决定 | |
| 饮食警告 | 不显示（访客无偏好数据） | ✓ |
| | 显示 | |
| | 你来决定 | |

---

## 一次性链接的原子性保障

| Question | Option | Selected |
|----------|--------|----------|
| 原子性机制 | 事务内状态检查（async session 同一事务） | ✓ |
| | 乐观锁（version 字段） | |
| | 你来决定 | |
| 状态检查模式 | 检查-操作-更新模式 | ✓ |
| | CAS 更新模式 | |
| 事务范围 | 同一事务（标记 used + 创建订单） | ✓ |
| | 分步操作 | |

---

## 飞书通知的访客订单标注

| Question | Option | Selected |
|----------|--------|----------|
| 处理方式 | 修复现有 send_order_notification bug + 扩展 is_guest 标识 | ✓ |
| | 新建专用通知方法 | |
| | 你来决定 | |
| 通知格式 | 【访客订单】标签 + 点单人显示"访客" | ✓ |
| | 不同卡片样式/颜色 | |
| | 你来决定 | |
| 发送策略 | 同步发送 + 失败忽略（try/except） | ✓ |
| | 同步发送 + 重试 | |
| | 你来决定 | |

---

## 公开端点安全与路由组织

| Question | Option | Selected |
|----------|--------|----------|
| 安全防护 | 标记为已知风险，延后处理 | ✓ |
| | 基本 rate limiting | |
| | 全面安全加固 | |
| 路由组织 | 独立 router + /api/guest 前缀 | ✓ |
| | 复用现有 dishes/orders routers | |
| | 你来决定 | |

---

## the agent's Discretion

- 邀请创建端点的具体请求/响应 schema 设计
- 访客订单提交端点的请求体结构
- 已使用链接的只读订单摘要返回格式
- 惰性过期检查的具体实现位置

## Deferred Ideas

None — all discussion stayed within phase scope.