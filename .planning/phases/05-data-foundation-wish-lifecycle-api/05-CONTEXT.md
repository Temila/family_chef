# Phase 5: Data Foundation & Wish Lifecycle API - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the complete **backend foundation** for the Dish Wish List (v1.1) feature:

- SQLAlchemy `Wish` model + Alembic migration that preserves v1.0 data (DATA-06, DATA-07)
- Status machine service layer (`WishService`) implementing the full lifecycle: 待处理 → 准备中 → 已上架 / 已拒绝 / 已撤销, with concurrent-claim safety (DATA-08, FLOW-02, FLOW-03, FLOW-04)
- REST endpoints under `/api/wishes` covering: submit, list (role-aware), detail, edit, cancel, claim, advance, reject, my-claims (WISH-01, WISH-02, FLOW-01, FLOW-05)
- Visibility and ownership rules enforced at the service layer (PERM-01..04)
- Extension points (clean service method signatures) that Phase 6 notifications can hook into — but **no notification firing in this phase**

**Out of scope (Phase 6/7):**
- Actual Feishu push + in-app unread badge firing (Phase 6)
- All frontend work — pages, WishCard, status badge component (Phase 7)

</domain>

<decisions>
## Implementation Decisions

### 认领并发安全策略 (DATA-08)
- **D-01:** 防止「同一愿望被两个厨师同时认领」采用 **原子条件 UPDATE**:
  ```python
  result = await db.execute(
      update(Wish)
      .where(Wish.id == wish_id, Wish.status == "待处理")
      .values(status="准备中", claimed_by_chef_id=chef_id)
  )
  if result.rowcount == 0:
      # 待处理 已被别人抢走,或状态已变 / 不存在
      raise ValueError("该愿望已被认领或状态已变更")
  ```
  Service **不**用 SELECT-then-UPDATE, **不**加 version 字段, **不**用 `with_for_update()` (SQLite/aiosqlite 无真正行锁)。
- **D-02:** 失败的认领尝试返回 **HTTP 400 + 中文消息** (遵循现有 `order_service.cancel_order` → `ValueError` → router 转 `HTTPException(400, detail=str(e))` 的约定)。**不**用 409 Conflict。

### 可见性与权限语义 (PERM-01..04)
- **D-03:** 未授权的**读访问**(非提交者、非该愿望认领厨师、非管理员访问他人愿望详情) 一律返回 **404 Not Found** — 不区分「不存在」与「存在但无权看」, 避免泄露愿望 ID 是否存在。Service 在查不到/无权看时都返回 `None`, router 统一转 404。
- **D-04:** 已认领愿望被其他厨师/用户尝试 **mutate** (推进/拒绝/编辑) 时返回 **403 Forbidden + 中文消息** (例: "该愿望已被厨师 {chef_name} 认领")。理由: 厨师在列表里能看到待处理愿望, 点进去才发现被抢 — 显式 403 + 提示认领者更可调试, 不伤害 UX。
- **D-05 — 厨师可见范围 (refines PERM-01 / FLOW-01 literal text):**
  - **Submitter** 看到自己的所有愿望 (任意状态)
  - **Chef** 看到: 所有 `status='待处理'` 的愿望 (认领队列) **+** `claimed_by_chef_id == self.id` 的愿望 (我的认领)
  - **Chef 看不到** 其他厨师已认领的 `准备中/已上架/已拒绝/已撤销` 愿望
  - **Admin** 看到所有愿望 (含按 `status` / `claimed_by_chef_id` 筛选, FLOW-01)
  - **Mutate 权限** (claim/advance/reject): claim 需 chef/admin 角色 + 原子 UPDATE 成功; advance/reject 需是 `claimed_by_chef_id` 本人或 admin (PERM-03/04)
  - **⚠ 下游需同步更新 `.planning/REQUIREMENTS.md`** — PERM-01 当前文本 "愿望仅对提交者本人、厨师、管理员可见" 应改为 "愿望仅对提交者本人、**认领该愿望的厨师 + 待处理状态下的所有厨师**、管理员可见"; FLOW-01 "厨师/管理员可查看所有愿望列表" 应改为 "管理员可查看所有愿望列表; 厨师看到 待处理队列 + 我的认领"。这是 Phase 5 范围内的文档调整, 不影响代码。

### 编辑/撤销窗口 (WISH-03, WISH-04)
- **D-06:** 按需求字面执行: `待处理` 和 `准备中` 状态下, **提交者本人** 都可编辑 (dish_name / reference_url / note) 和撤销。进入 `已上架` 或 `已拒绝` 后愿望锁定, 不可编辑/撤销。
- **D-07:** 撤销 = **软删除** `status='已撤销'`, 与现有 `Order.status='cancelled'` 模式一致; 不做物理 DELETE, 不加 TTL。
  - **⚠ 下游需更新 `.planning/REQUIREMENTS.md`** — WISH-04 "撤销（删除）愿望" 中 "(删除)" 措辞调整为 "(软删除, status='已撤销')" 避免误解。
- **D-08:** 用户在 `准备中` 状态编辑/撤销时, Phase 6 必须 fire NOTIF-06 飞书通知给认领厨师。Phase 5 服务层**不**直接调 `feishu_client`, 但要确保 `update_wish()` 和 `cancel_wish()` 方法签名/返回值能被 Phase 6 干净地包裹或挂钩 (推荐: 在 service 方法尾部留下 `# Phase 6 hook: notify claiming chef` 注释占位)。

### 关联菜品资格 & 完整性 (FLOW-03)
- **D-09:** 推进到 `已上架` 时, 关联的 `dish_id` 必须满足: 存在 `DishChef` 行, `dish_id == 目标菜品`, `chef_id == 当前认领厨师`, `status == 'published'`。验证失败统一 raise `ValueError("你未发布此菜品或菜品不可用")` → 400。
- **D-10:** `已上架` 是**终态**。一旦关联, 即使后续 `Dish.status` 被改为 `disabled` 或 `DishChef` 被删除, 愿望保持 `status='已上架'` 且 `related_dish_id` 不变。`related_dish_id` 使用普通 `ForeignKey("dishes.id")` (不带 ON DELETE SET NULL / CASCADE), 与 PROJECT.md "惰性过期" 原则一致 — 关联时的状态已记录, 后续变化不影响已完成的愿望。

### 状态机 (照搬 Order 模式)
- **D-11:** `Wish.status` 用 `Column(String(20), nullable=False, default="待处理")` — **不**用 Python `Enum` 类, **不**用 SQLAlchemy `Enum` type, **不**加 DB-level CHECK constraint。状态机表在 `WishService` 内部用 `valid_transitions` dict 实现, 与 `OrderService.update_order_status` 完全对齐。允许值: `"待处理"`, `"准备中"`, `"已上架"`, `"已拒绝"`, `"已撤销"`。
- **D-12 — `valid_transitions` 表:**
  ```
  "待处理"   -> ["准备中", "已撤销"]      # 厨师认领; 用户撤销
  "准备中"   -> ["已上架", "已拒绝", "已撤销"]  # 认领厨师推进/拒绝; 用户撤销
  "已上架"   -> []                          # 终态
  "已拒绝"   -> []                          # 终态
  "已撤销"   -> []                          # 终态
  ```

### the agent's Discretion
- API endpoint 路径与 HTTP 动词的具体命名 (例: `POST /api/wishes/{id}/claim` vs `POST /api/wishes/{id}/actions/claim`) — 研究现有 `orders.py` 与 `dishes.py` 的状态变更路由约定 (`PUT /{resource}/{id}/status`, `PUT /dishes/{dish_id}/chef-publish`) 后选择最贴近的。
- 分页与筛选查询参数的具体拼写 (`status`, `claimed_by_chef_id`, `page`, `page_size`) — 遵循 `PageResponse[T]` + `PaginationParams` 约定。
- `WishListResponse` schema 是否在路由层扁平化注入 `submitter_name` / `claimed_by_chef_name` (参考 `guest.py` 中 `inv_data.chef_name = inv.chef.display_name` 的模式) — 推荐扁平化, 减少前端嵌套访问。
- Alembic migration revision id 用 autogenerate 后的默认值, 文件名遵循 `<revision>_<description>.py`。

### Folded Todos
*(无 — `gsd-sdk query todo.match-phase` 返回 0 matches)*

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — v1.1 requirements 全集, 重点: WISH-01/02, FLOW-01..05, PERM-01..04, DATA-06/07/08 (Phase 5 涉及 14 项)。**注意 D-05 与 D-07 对 PERM-01 / FLOW-01 / WISH-04 文本的修订**
- `.planning/ROADMAP.md` §Phase 5 — Goal, Depends on, Requirements 映射, Success Criteria (5 条验收点)
- `.planning/PROJECT.md` — Constraints (FastAPI + SQLite + Alembic), Key Decisions 表 (v1.0 模式参考)

### Codebase Maps (analysis date 2026-05-24)
- `.planning/codebase/STACK.md` — Python 3.11 / FastAPI / SQLAlchemy 2.0 async / Alembic / aiosqlite
- `.planning/codebase/ARCHITECTURE.md` — 分层架构 (Router → Service → Model), 服务单例模式, `get_db` / `get_current_user_from_token` / `require_role` 依赖注入
- `.planning/codebase/INTEGRATIONS.md` — Feishu `feishu_client` 单例 (Phase 6 用); SQLite WAL mode
- `.planning/codebase/CONVENTIONS.md` — 命名 / 错误处理 / Chinese-first 错误消息约定
- `.planning/codebase/STRUCTURE.md` §"Where to Add New Code" — 新增 model / service / router / migration 的步骤

### Existing Patterns to Mirror
- `backend/app/models/order.py` — status-machine 模型字段约定
- `backend/app/models/guest_invitation.py` — 生命周期实体 (status + timestamps + Index)
- `backend/app/services/order_service.py` — `valid_transitions` 状态机 + `ValueError` 模式 (见 `update_order_status` 与 `cancel_order`)
- `backend/app/routers/auth.py:123` — `require_role(*roles)` 依赖工厂
- `backend/app/routers/guest.py` — 资源路由的依赖注入、错误转换、列表响应组装模式

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`Order` model** (`backend/app/models/order.py`): status 字段、`func.now()` 时间戳、`user_id` / `chef_id` 双 FK 模式 — Wish 模型直接照抄。
- **`OrderService.update_order_status` / `cancel_order`** (`backend/app/services/order_service.py:296, 373`): 状态机 + ownership check + ValueError 抛错的标准实现, WishService 一一对应。
- **`GuestInvitation` model** (`backend/app/models/guest_invitation.py`): 生命周期 + Index 组合 (`status, expires_at`), Wish 表的索引设计可参考。
- **`require_role(*roles)`** (`backend/app/routers/auth.py:123`): 角色门控依赖, 直接复用。
- **`PageResponse[T]` + `PaginationParams`** (`backend/app/schemas/common.py`, `backend/app/utils/pagination.py`): 列表端点统一包装。
- **`selectinload()`** eager loading 模式 — `Wish` 关联 `User` (submitter) 和 `User` (claimer) 时使用。
- **`feishu_client` 单例** (`backend/app/integrations/feishu.py`): Phase 6 直接复用, Phase 5 不调用。

### Established Patterns
- **分层**: Router (HTTP/依赖注入/错误转换) → Service (业务逻辑 + DB 查询 + 状态机) → Model (纯 ORM 定义)。
- **Service 即单例**: `class WishService: @staticmethod async def ...`, 模块底部 `wish_service = WishService()`。
- **错误流转**: Service raise `ValueError("中文消息")` → Router catch → `HTTPException(status_code=400, detail=str(e))`。
- **可见性**: Service 接受 `current_user: User` 参数, 在 query 中根据角色动态过滤 (参考 `list_orders` 的 `user_id` / `chef_id` 条件构造)。
- **DB 操作**: `await db.flush()` + `await db.refresh(obj)`, commit 由 `get_db` 依赖在请求结束时统一处理。
- **Lazy import**: 跨服务调用 (如 service → `feishu_client`) 用方法内 import 避免循环依赖。

### Integration Points
- **新文件**: `backend/app/models/wish.py`, `backend/app/schemas/wish.py`, `backend/app/services/wish_service.py`, `backend/app/routers/wishes.py`。
- **`backend/app/models/__init__.py`**: export `Wish`。
- **`backend/app/main.py`**: `app.include_router(wishes_router, prefix="/api")`。
- **Alembic migration**: `cd backend && uv run alembic revision --autogenerate -m "add wishes table"` → 在 `backend/alembic/versions/` 生成新 revision (链在 `d4e5f6a7b8c9_add_dish_chef_status.py` 之后)。
- **测试**: `backend/tests/test_wishes.py` (参考 `test_orders.py` 的 fixtures 与 httpx async client 模式)。
- **Phase 6 hook 点**: `WishService.update_wish()` / `cancel_wish()` / `claim_wish()` / `advance_wish()` / `reject_wish()` 的方法签名要保持稳定, 让 Phase 6 可以在 transition 完成后注入通知逻辑。

</code_context>

<specifics>
## Specific Ideas

- 用户语义里的「厨师仅可见 待处理 + 我的认领」要在状态变化的失败提示里闭环: 当厨师 B 对一个刚被认领的愿望点推进, 后端返回 403 + "已被厨师 A 认领" 的中文消息, 前端弹窗 OK 后刷新列表 — 这条 UX 流在 Phase 7 实现, 但 Phase 5 的 403 响应体必须包含 `claimed_by_chef_name` 字段 (或可被前端拼接出该信息) 以支撑提示文本。建议 `error_detail` 形如 `"该愿望已被厨师 {name} 认领"`。
- `Wish` 表索引设计建议: `Index("ix_wishes_user_id", "user_id")`, `Index("ix_wishes_status", "status")`, `Index("ix_wishes_claimed_by_chef_id", "claimed_by_chef_id")`, 组合 `Index("ix_wishes_status_chef", "status", "claimed_by_chef_id")` 优化厨师队列查询。

</specifics>

<deferred>
## Deferred Ideas

- **愿望状态变更历史记录 (WISH-F04)** — 当前状态变化只在 `updated_at` 列上反映; 完整的轨迹 (谁/何时/从哪个状态变到哪个状态) 属于 v1.1+ enhancement, 在 REQUIREMENTS.md 已列为 WISH-F04 deferred。Phase 5 不实现 `WishStatusHistory` 表。
- **愿望标签分类 / 多参考链接 / 评论对话 (WISH-F01/02/03)** — REQUIREMENTS.md 已列为 deferred, 不在本阶段。
- **愿望过期/回收机制** — PROJECT.md Out of Scope, 后续可按需添加。
- **404 vs 403 的更细分化** — 未来如果有审计/反爬需求, 可重新评估 visibility 错误响应的精确性。

### Reviewed Todos (not folded)
*(无 — 无 todo 匹配本 phase)*

</deferred>

---

*Phase: 5-Data Foundation & Wish Lifecycle API*
*Context gathered: 2026-07-21*
