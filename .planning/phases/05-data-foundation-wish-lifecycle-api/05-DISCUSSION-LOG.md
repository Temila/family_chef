# Phase 5: Data Foundation & Wish Lifecycle API - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 5-Data Foundation & Wish Lifecycle API
**Areas discussed:** 认领并发安全策略 (DATA-08), 未授权访问 404 vs 403 (PERM-01), 「准备中」可否编辑/撤销 (WISH-03/04), FLOW-03 关联菜品资格 & 完整性

---

## 认领并发安全策略 (DATA-08)

### Q1: 如何防住「同一愿望被两个厨师同时认领」?

| Option | Description | Selected |
|--------|-------------|----------|
| 原子条件 UPDATE | 服务层执行 `UPDATE wishes SET status='准备中', claimed_by_chef_id=:chef WHERE id=:id AND status='待处理'`, 然后 check rowcount。rowcount=0 → 报「愿望已被其他厨师认领」。单条 SQL、原子、无需重试。 | ✓ |
| SELECT-then-UPDATE + 重试 | 先 SELECT 验证 status='待处理', 再 UPDATE。有 TOCTOU 窗口, 需应用层重试或版本号。 | |
| 乐观锁 version 字段 | Wish 表加 version 列, UPDATE 时 WHERE version=:v, 行数 0 则报冲突。需额外字段。 | |

**User's choice:** 原子条件 UPDATE (Recommended)
**Notes:** SQLite/aiosqlite 无真正 SELECT FOR UPDATE, 原子条件 UPDATE 是最干净、最易测试的方案, 与 PROJECT.md "一次性使用原子性事务" v1.0 决策一脉相承。

### Q2: 失败认领返回什么 HTTP 状态?

| Option | Description | Selected |
|--------|-------------|----------|
| 400 + 中文消息 | 遵循现有约定。Service raise ValueError, router 转 HTTPException(400, detail=...)。 | ✓ |
| 409 Conflict | 语义更精确, 但偏离现有 400 约定, 前端需额外分支。 | |
| You decide | 由我选择, 默认跟 400 约定。 | |

**User's choice:** 400 + 中文消息 (Recommended)
**Notes:** 与 `order_service.cancel_order('无权取消此订单')` 等 v1.0 失败路径完全一致, 保持错误处理统一。

---

## 未授权访问 404 vs 403 (PERM-01)

### Q1: 非提交者/非厨师/非管理员访问别人愿望返回什么?

| Option | Description | Selected |
|--------|-------------|----------|
| 一律 404 Not Found | 不区分「不存在」和「存在但无权看」, 都返回 404。避免泄露愿望 ID 是否存在 (类似 GitHub private repo 404)。 | ✓ |
| 404 不存在 / 403 无权 | 语义更精确, 但泄露存在性。 | |
| 一律 400 + 中文 | 跟现有 cancel_order '无权取消此订单' 完全一致。 | |

**User's choice:** 一律 404 Not Found (Recommended)
**Notes:** 与 PERM-01「对非提交者不可见」语义最贴近。

### Q2: 厨师 B 在列表里看到 wish X 后尝试推进别人的认领, 返回什么?

| Option | Description | Selected |
|--------|-------------|----------|
| 读 404 / 变 403 | Chef B 能看到 wish X, 但尝试 mutate 时返回 403 + "你不是该愿望的认领厨师"。诚实、可调试。 | ✓ |
| 严格 404 (读+变都隐藏) | 避免任何信息泄露, 但出现「刚能看到点一下说找不到」的困惑。 | |
| 读 404 / 变 400 中文 | 跟现有 cancel_order 一致, 不泄露详情。 | |

**User's choice (free-text):** 返回 403, 提示该愿望已被厨师 A 认领, 点击确定后触发页面刷新, 刷新后该愿望对厨师 B 不可见 (厨师仅可见已发布且尚未被认领的愿望)
**Notes:** 用户的选择同时锁定了三件事: (1) mutate 失败 = 403 + 含认领厨师名字的提示; (2) 失败后前端刷新; (3) **厨师可见范围要重新限定** — 这跟 PERM-01/FLOW-01 字面冲突, 需要追问 Q3。

### Q3: 厨师可见范围应该是?

| Option | Description | Selected |
|--------|-------------|----------|
| 限定: 待处理 + 我的认领 | 重写 PERM-01/FLOW-01: 厨师看到 待处理队列 + 自己认领的; 管理员看到所有。 | ✓ |
| 保留: 厨师看全部 (跟原文) | 按 PERM-01/FLOW-01 字面, 厨师看所有愿望。 | |
| 默认限定 + 「查看全部」查询参数 | 混合方案。 | |

**User's choice:** 限定: 待处理 + 我的认领 (Recommended)
**Notes:** **此决策修订了 REQUIREMENTS.md PERM-01 与 FLOW-01 的字面文本。** 下游 planner 必须同步更新 REQUIREMENTS.md。该可见性模型也更符合厨师实际工作流 (不需要看其他厨师的在制工作)。

---

## 「准备中」可否编辑/撤销 (WISH-03/04)

### Q1: 「准备中」(已被厨师认领) 状态下, 用户还能否编辑/撤销?

| Option | Description | Selected |
|--------|-------------|----------|
| 字面: 准备中也可编辑/撤销 | 与需求字面最贴近, 准备好 NOTIF-06 厨师通知。 | ✓ |
| 锁定: 仅 待处理 可编辑/撤销 | 干净, 避免打击厨师积极性。需更新 WISH-03/04 文本。 | |
| 混合: 准备中 仅可撤销 | 待处理可改; 准备中只能撤销。 | |

**User's choice:** 字面: 准备中也可编辑/撤销
**Notes:** 保持 WISH-03/04 原文不改。但 NOTIF-06 (Phase 6) 必须实现 — 用户在准备中阶段修改会通知认领厨师。

### Q2: 用户「撤销」愿望时, 怎么实现?

| Option | Description | Selected |
|--------|-------------|----------|
| 软删除: status='已撤销' | 与现有 Order.status='cancelled' 一致, 触发 NOTIF-06, 可查历史。 | ✓ |
| 硬删除: DB DELETE | 严格按 WISH-04 字面「(删除)」。简单但丢历史。 | |
| 软删除 + TTL | 增加复杂度, 需定时任务。 | |

**User's choice:** 软删除: status='已撤销' (Recommended)
**Notes:** WISH-04 文本中「(删除)」措辞需调整为「(软删除, status='已撤销')」, 下游 planner 同步修订 REQUIREMENTS.md。

---

## FLOW-03 关联菜品资格 & 完整性

### Q1: 推进到「已上架」时, 哪些菜品可以被关联?

| Option | Description | Selected |
|--------|-------------|----------|
| 仅限该认领厨师发布的菜品 | 只能是 DishChef 中 status='published' 且 chef_id=该认领厨师 的菜品。 | ✓ |
| 任意已上架菜品 | Dish.status='enabled' 都行, 厨师可贴别人发布的菜。 | |
| 任意 + 前端默认筛自己 | 后端不强制, 前端默认筛选自己。 | |

**User's choice:** 仅限该认领厨师发布的菜品 (Recommended)
**Notes:** 防止厨师贴别人的菜充当完成, 保证工作流的诚实性。

### Q2: 愿望关联到菜品 X 后, X 被下架/删除时怎么办?

| Option | Description | Selected |
|--------|-------------|----------|
| 锁定: 不动 | 已上架 是终态, 关联后菜品变化不影响愿望。 | ✓ |
| 自动退回 准备中 + 通知厨师 | 复杂, 避免「愿挂在空中」。 | |
| SET NULL | related_dish_id 置空, 状态不变, 链接成死链。 | |

**User's choice:** 锁定: 不动 (Recommended)
**Notes:** 与 PROJECT.md「一次性使用」「惰性过期」原则一致 — 关联瞬间的状态已记录, 后续变化不影响已完成闭环。

---

## the agent's Discretion

以下决策点用户未指定, 留给 downstream planner/researcher 在不偏离上述锁定的前提下选择:

- API endpoint 路径与 HTTP 动词的具体命名 (遵循现有 `orders.py` / `dishes.py` 状态变更路由约定)
- 分页与筛选查询参数拼写 (`status`, `claimed_by_chef_id`, `page`, `page_size`)
- `WishListResponse` schema 是否扁平化注入 `submitter_name` / `claimed_by_chef_name` (推荐扁平化)
- Alembic migration revision id 用 autogenerate 默认值

---

## Deferred Ideas

- **愿望状态变更历史记录 (WISH-F04)** — 完整轨迹 (谁/何时/从哪到哪) 属于 v1.1+ enhancement, REQUIREMENTS.md 已列为 deferred
- **愿望标签分类 / 多参考链接 / 评论对话 (WISH-F01/02/03)** — REQUIREMENTS.md 已列为 deferred
- **愿望过期/回收机制** — PROJECT.md Out of Scope
- **404 vs 403 更细分化** — 未来如有审计/反爬需求可重估

---

*Discussion completed: 2026-07-21*
