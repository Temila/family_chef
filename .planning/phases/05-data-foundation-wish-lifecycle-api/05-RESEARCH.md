# Phase 5: Data Foundation & Wish Lifecycle API - Research

**Researched:** 2026-07-21
**Domain:** Backend data layer + REST API (FastAPI + SQLAlchemy 2.0 async + Alembic + SQLite)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 — 认领并发安全**: 原子条件 UPDATE (`UPDATE wishes SET status='准备中', claimed_by_chef_id=:chef WHERE id=:id AND status='待处理'`); 检查 `rowcount==0` → 抛 `ValueError`. **不**用 SELECT-then-UPDATE, **不**加 version 字段, **不**用 `with_for_update()` (SQLite/aiosqlite 无真正行锁).
- **D-02 — 失败认领返回**: HTTP 400 + 中文消息, 不用 409 Conflict. 遵循现有 `order_service.cancel_order` → `ValueError` → router 转 `HTTPException(400, detail=str(e))` 约定.
- **D-03 — 未授权读访问**: 一律 404 Not Found (不区分"不存在"与"存在但无权看"); service 在查不到/无权看时都返回 `None`, router 统一转 404.
- **D-04 — 已认领愿望被他人 mutate**: 返回 403 Forbidden + 中文消息 (例: `"该愿望已被厨师 {chef_name} 认领"`). 错误体必须包含认领厨师姓名以便前端展示.
- **D-05 — 厨师可见范围** (refines PERM-01 / FLOW-01):
  - Submitter 看到自己所有愿望 (任意状态)
  - Chef 看到: 所有 `status='待处理'` 愿望 + `claimed_by_chef_id == self.id` 愿望
  - Chef **看不到**其他厨师已认领的非待处理愿望
  - Admin 看到所有愿望 (含按 `status` / `claimed_by_chef_id` 筛选)
  - Mutate 权限 (claim/advance/reject): claim 需 chef/admin 角色 + 原子 UPDATE 成功; advance/reject 需是 `claimed_by_chef_id` 本人或 admin
  - ⚠ 下游需同步更新 `.planning/REQUIREMENTS.md` PERM-01 与 FLOW-01 文本
- **D-06 — 编辑/撤销窗口**: `待处理` 与 `准备中` 状态下, 提交者本人可编辑 (dish_name/reference_url/note) 与撤销. 进入 `已上架` / `已拒绝` 后锁定.
- **D-07 — 撤销 = 软删除**: `status='已撤销'`, 与 `Order.status='cancelled'` 一致. 不物理 DELETE, 不加 TTL.
  - ⚠ 下游需更新 `.planning/REQUIREMENTS.md` WISH-04 "(删除)" 措辞 → "(软删除, status='已撤销')"
- **D-08 — Phase 6 hook 占位**: Phase 5 服务层**不**直接调 `feishu_client`; 但 `update_wish()` / `cancel_wish()` 方法签名/返回值要让 Phase 6 干净挂钩. 在 transition 完成后留 `# Phase 6 hook: notify claiming chef` 注释占位.
- **D-09 — 推进关联菜品资格**: 推进到 `已上架` 时, 必须存在 `DishChef` 行, `dish_id == 目标菜品`, `chef_id == 当前认领厨师`, `status == 'published'`. 失败 raise `ValueError("你未发布此菜品或菜品不可用")` → 400.
- **D-10 — `已上架` 是终态**: 即使后续 `Dish.status` 改 `disabled` 或 `DishChef` 被删, 愿望保持 `status='已上架'` 且 `related_dish_id` 不变. `related_dish_id` 用普通 `ForeignKey("dishes.id")` (不带 ON DELETE SET NULL / CASCADE), 遵循 PROJECT.md "惰性过期" 原则.
- **D-11 — `Wish.status` 实现**: `Column(String(20), nullable=False, default="待处理")`. **不**用 Python Enum, **不**用 SQLAlchemy Enum type, **不**加 DB-level CHECK constraint. 状态机用 `WishService` 内部 `valid_transitions` dict.
- **D-12 — `valid_transitions` 表**:
  ```
  "待处理"   -> ["准备中", "已撤销"]
  "准备中"   -> ["已上架", "已拒绝", "已撤销"]
  "已上架"   -> []
  "已拒绝"   -> []
  "已撤销"   -> []
  ```

### the agent's Discretion
- API endpoint 路径与 HTTP 动词的具体命名 (例: `POST /api/wishes/{id}/claim` vs `POST /api/wishes/{id}/actions/claim`) — 研究现有 `orders.py` 与 `dishes.py` 的状态变更路由约定后选择最贴近的.
- 分页与筛选查询参数拼写 (`status`, `claimed_by_chef_id`, `page`, `page_size`) — 遵循 `PageResponse[T]` + `PaginationParams` 约定.
- `WishListResponse` schema 是否在路由层扁平化注入 `submitter_name` / `claimed_by_chef_name` (参考 `guest.py` 中 `inv_data.chef_name = inv.chef.display_name` 的模式) — 推荐扁平化.
- Alembic migration revision id 用 autogenerate 后的默认值, 文件名遵循 `<revision>_<description>.py`.

### Deferred Ideas (OUT OF SCOPE)
- 愿望状态变更历史记录 (WISH-F04) — v1.1+ enhancement, 本 phase 不实现 `WishStatusHistory` 表.
- 愿望标签分类 / 多参考链接 / 评论对话 (WISH-F01/02/03) — 已 deferred.
- 愿望过期/回收机制 — PROJECT.md Out of Scope.
- 404 vs 403 的更细分化 — 未来审计/反爬需求时再评估.
- 实际 Feishu 推送 + in-app 未读红点 (Phase 6 NOTIF-03..06).
- 所有前端工作 — 页面、WishCard、状态徽章组件 (Phase 7 UX-01..03).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-06 | 新增 wish 表 (id, user_id, dish_name, reference_url, note, status, claimed_by_chef_id, related_dish_id, reject_reason, timestamps) | `## Architecture Patterns` § "Recommended Project Structure" + `## Code Examples` § "Wish model" — model fields & indexes derived from `Order`/`GuestInvitation` patterns; `## Standard Stack` (SQLAlchemy 2.0 declarative) |
| DATA-07 | Alembic 迁移脚本，保留 v1.0 数据 | `## Common Pitfalls` § "Alembic head correction" — verified current head is `a9b1c2d3e4f5`; `## Code Examples` § "Migration template" mirrors `a9b1c2d3e4f5_add_guest_invitations_table_and_guest.py` |
| DATA-08 | 认领/状态流转并发安全 | `## Code Examples` § "Atomic conditional UPDATE" — implements D-01 pattern |
| WISH-01 | 注册用户提交愿望 (菜名 + 可选参考链接/备注) | `## Code Examples` § "WishCreate schema" + "submit_wish service" |
| WISH-02 | 用户查看自己提交的所有愿望列表及状态 | `## Code Examples` § "list_wishes service" + D-05 visibility rules |
| FLOW-01 | 厨师/管理员可查看所有愿望列表，按状态/认领厨师筛选 | D-05 refines literal text; `## Code Examples` § "list_wishes service" — role-aware query construction |
| FLOW-02 | 厨师"认领"待处理愿望 — 独占认领，状态变"准备中" | `## Code Examples` § "claim_wish service" — atomic UPDATE per D-01 |
| FLOW-03 | 认领厨师关联已上架菜品，状态变"已上架"，愿望锁定 | `## Code Examples` § "advance_wish service" — DishChef validation per D-09 |
| FLOW-04 | 认领厨师"拒绝"愿望，必须填拒绝原因 | `## Code Examples` § "reject_wish service" + `## Code Examples` § "WishReject schema" (reject_reason required) |
| FLOW-05 | 厨师查看"我的认领" | `## Code Examples` § "list_wishes service" — `mine=True` shortcut or `claimed_by_chef_id==self` filter |
| PERM-01 | 愿望仅对提交者本人、厨师、管理员可见 | D-05 refines — Submitter/Claimer+待处理队列/Admin visibility; enforced in `list_wishes` query + `get_wish_by_id` 404-on-no-per |
| PERM-02 | 用户只能编辑/撤销自己的愿望 | `## Code Examples` § "update_wish/cancel_wish services" — `if wish.user_id != current_user.id: return None` (router → 404 per D-03, or 403 per D-04 nuance) |
| PERM-03 | 厨师只能推进自己认领的愿望 | `## Code Examples` § "advance_wish/reject_wish services" — `if wish.claimed_by_chef_id != chef_id and not is_admin: raise ValueError("该愿望已被厨师 X 认领")` |
| PERM-04 | 管理员可查看与推进所有愿望 | Admin bypass in all service methods — `if current_user.role == "admin": skip_ownership_check` |
</phase_requirements>

## Project Constraints (from AGENTS.md)

Extracted from the project root AGENTS.md (sourced from PROJECT.md, STACK.md, CONVENTIONS.md, ARCHITECTURE.md):

- **Tech stack locked**: FastAPI + SQLAlchemy 2.0 async + Alembic + aiosqlite + SQLite. No new frameworks.
- **Branch**: Development on `feature/guest_order` branch (note: this is the v1.0 branch name; v1.1 phase 5 should follow GSD config branch template `gsd/phase-5-{slug}` unless user overrides).
- **Naming**: Backend modules `snake_case.py`; test files `test_{module}.py`; Pydantic schemas `PascalCase` with `Create`/`Update`/`Response` suffix; service methods `@staticmethod`; module-level singleton `wish_service = WishService()`.
- **Error flow**: Service raises `ValueError("中文消息")` → Router catches → `HTTPException(status_code=400, detail=str(e))`. Never return raw tracebacks to client.
- **Language convention**: **Chinese** for user-facing strings, error messages, comments, docstrings. **English** for identifiers (variable/function/class names).
- **Async throughout**: All DB operations use `AsyncSession`; `await db.flush()` + `await db.refresh(obj)`, commit delegated to `get_db`.
- **DB pattern**: SQLAlchemy 2.0 declarative `Base`; `selectinload()` for eager loading relationships.
- **Lazy imports**: Cross-service calls (e.g., service → `feishu_client`) use method-internal imports to avoid circular dependency at module load.
- **Linting**: Ruff (line-length 120, target py311) configured in `backend/pyproject.toml`.
- **Tests**: pytest + pytest-asyncio (`asyncio_mode = "auto"`), httpx `AsyncClient` via `ASGITransport`, in-memory SQLite (`sqlite+aiosqlite:///:memory:`).
- **`force_pwd_change`**: Existing users with `force_pwd_change=True` are blocked at `get_current_user_from_token` — not relevant to Wish endpoints but be aware when crafting test fixtures.

## Summary

Phase 5 is a **pure backend implementation phase** that adds the data layer and complete REST API for the Dish Wish List (v1.1). No new third-party packages are introduced — the entire phase is built on the existing FastAPI + SQLAlchemy 2.0 async + Alembic + aiosqlite stack. Every architectural pattern needed already has a working precedent in the codebase: `Order` model (status machine), `OrderService.update_order_status`/`cancel_order` (state machine + ownership check + ValueError pattern), `GuestInvitation` (lifecycle table with indexes), `require_role(*roles)` dependency factory, `PageResponse[T]` + `PaginationParams` pagination, and `selectinload()` eager loading.

The phase's design space was thoroughly resolved during `/gsd-discuss-phase` (12 locked decisions D-01..D-12 in CONTEXT.md). Research verified all 12 decisions against actual code — every claim about existing patterns (status machine in `valid_transitions` dict, `ValueError` → `HTTPException(400)` conversion, `require_role` factory at `auth.py:123`, `PageResponse[T]` generic, `selectinload` eager loading, soft-delete via `status='cancelled'`) was confirmed by reading the codebase. **One factual error in CONTEXT.md was caught**: the current Alembic head is `a9b1c2d3e4f5` (guest invitations), NOT `d4e5f6a7b8c9` as stated in CONTEXT.md line 134. The new Wish migration must chain from `a9b1c2d3e4f5`.

**Primary recommendation:** Mirror `OrderService` and `guest_service` patterns exactly. Create 4 new files (`models/wish.py`, `schemas/wish.py`, `services/wish_service.py`, `routers/wishes.py`) + 1 Alembic revision + 1 test file. The implementation is mechanical given the locked decisions; the only non-trivial logic is the atomic conditional UPDATE for claim (D-01) and the role-aware visibility query (D-05).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wish data persistence | Database / Storage | — | SQLite table `wishes`, FKs to `users.id` (x2: submitter + claimer) and `dishes.id` (related_dish). Schema migration via Alembic. |
| Wish CRUD business logic | API / Backend (Service layer) | — | `WishService` static methods: submit/list/get/update/cancel/claim/advance/reject. Owns state machine, ownership checks, atomic UPDATE. |
| Wish REST endpoints | API / Backend (Router layer) | — | `routers/wishes.py` — HTTP concerns, dependency injection (`get_db`, `get_current_user_from_token`, `require_role`), error conversion (ValueError → HTTPException). |
| Visibility & permission enforcement | API / Backend (Service layer) | — | Query construction filters by `current_user.role` and `claimed_by_chef_id`; 404 on unauthorized read, 403 on unauthorized mutate. **NOT** in browser — security must be server-side. |
| Concurrent claim safety | Database / Storage | API / Backend (Service layer) | Atomic conditional UPDATE in DB (`rowcount==0` check). SQLite/aiosqlite does NOT support `with_for_update()`; rely on atomicity of single UPDATE statement. |
| State machine transitions | API / Backend (Service layer) | — | `valid_transitions` dict in `WishService` mirrors `OrderService.update_order_status`. NO DB-level CHECK constraint, NO Enum type. |
| Phase 6 notification hook | API / Backend (Service layer) | — | Method signatures + return values stay stable; service has placeholder comment `# Phase 6 hook: notify claiming chef`. No actual firing in Phase 5. |
| Frontend rendering | (Out of scope — Phase 7) | — | All UI work deferred to Phase 7. Phase 5 returns JSON only. |

## Standard Stack

### Core

All packages already installed in `backend/pyproject.toml`. **No new packages introduced in this phase.**

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| `fastapi` | 0.136.1 [VERIFIED: pip list] | REST router, dependency injection, Pydantic request validation | Existing app framework — all routers in `backend/app/routers/` use it; `require_role(*roles)` factory at `auth.py:123` is reusable. |
| `sqlalchemy` | 2.0.49 [VERIFIED: pip list] | Async ORM, declarative models, `select()`, `update()`, `selectinload()` | Existing ORM — all models in `backend/app/models/` use `DeclarativeBase` from `database.py`; `Order` model is the direct template for `Wish`. |
| `alembic` | 1.18.4 [VERIFIED: pip list] | Schema migration; chain new revision from head `a9b1c2d3e4f5` | Existing migration tool — `backend/alembic/versions/` has 10 revisions; `a9b1c2d3e4f5_add_guest_invitations_table_and_guest.py` is the template for new-table migrations. |
| `aiosqlite` | 0.22.1 [VERIFIED: pip list] | Async SQLite driver | Required by SQLAlchemy async engine; `sqlite+aiosqlite:///` URL pattern. |
| `pydantic` | 2.13.4 [VERIFIED: pip list] | Request/response validation schemas | Existing schema framework — `from_attributes = True` config for ORM conversion; `PageResponse[T]` generic in `schemas/common.py`. |
| `uvicorn[standard]` | 0.46.0 [VERIFIED: pip list] | ASGI server | Existing server — out of scope for this phase (no startup changes). |

### Supporting

| Library | Version (installed) | Purpose | When to Use |
|---------|---------------------|---------|-------------|
| `pytest` | ≥7.0.0 [VERIFIED: pyproject.toml] | Test runner | All backend tests in `backend/tests/`. |
| `pytest-asyncio` | ≥0.21.0 [VERIFIED: pyproject.toml] | Async test support (`asyncio_mode = "auto"`) | All wish service/router tests are `async def`. |
| `httpx` | 0.28.1 [VERIFIED: pip list] | Async HTTP client for tests | `AsyncClient` + `ASGITransport` pattern in `conftest.py`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `String(20)` status column (D-11) | Python `Enum` / SQLAlchemy `Enum` type / DB CHECK constraint | **Rejected by D-11.** Mirrors `Order.status` pattern; Enum types add migration complexity on SQLite (no native ALTER TYPE) and DB-level CHECK constraints are awkward to evolve. Status machine stays in Python (`valid_transitions` dict). |
| `with_for_update()` pessimistic lock (D-01) | Atomic conditional UPDATE | **Rejected by D-01.** aiosqlite has no real row-level locks; `with_for_update()` is a no-op on SQLite. Atomic UPDATE relies on SQLite's statement-level locking which IS reliable for the single-UPDATE case. |
| 409 Conflict for failed claim (D-02) | HTTP 400 + Chinese message | **Rejected by D-02.** Aligns with existing `order_service.cancel_order` → `ValueError` → 400 convention; 409 would create inconsistency. |
| 403 for unauthorized read (D-03) | 404 Not Found | **Rejected by D-03.** 404 prevents wish-ID enumeration. Trade-off: legitimate submitters get clear "not found" instead of "forbidden", but security wins. |
| Physical DELETE for cancel (D-07) | Soft delete (`status='已撤销'`) | **Rejected by D-07.** Mirrors `Order.status='cancelled'`; preserves audit trail, simplifies "did I used to have this wish?" queries. |

**Installation:**
```bash
# No installation required — all dependencies already in backend/pyproject.toml
# To verify environment:
cd backend && uv pip list | grep -iE '^(fastapi|sqlalchemy|alembic|aiosqlite|pydantic)'
```

**Version verification:** All versions confirmed via `uv pip list` in this research session (2026-07-21). Training data versions may be months stale — the actual installed versions above are authoritative.

## Package Legitimacy Audit

> This phase installs **zero new external packages**. All work reuses the existing project stack already vetted in v1.0/v1.0.x milestones. The Package Legitimacy Gate is therefore not strictly required, but the audit is included for completeness.

slopcheck was installed and is available at `/home/temila/.local/lib/python3.12/site-packages/slopcheck/`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none new) | — | — | — | — | — | No new packages introduced |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*All packages in the Standard Stack table above were already installed in the project's `backend/pyproject.toml` before this phase. They were vetted during prior milestones (v1.0 base + guest invitations phase). No new installs means no new hallucination surface.*

## Architecture Patterns

### System Architecture Diagram

```text
HTTP Request (with Bearer JWT)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Router: backend/app/routers/wishes.py              │
│  ──────────────────────────────────────────────────────     │
│  • Dependency injection:                                     │
│    - get_db (AsyncSession)                                  │
│    - get_current_user_from_token (User)                     │
│    - require_role("chef","admin") for mutate endpoints      │
│  • Pydantic request body validation (WishCreate/Update/...) │
│  • ValueError → HTTPException(400) conversion               │
│  • None → HTTPException(404) conversion (per D-03)          │
│  • Builds PageResponse[WishListResponse] with flattened     │
│    submitter_name / claimed_by_chef_name                    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Service: backend/app/services/wish_service.py              │
│  ──────────────────────────────────────────────────────     │
│  • @staticmethod async methods, db: AsyncSession first arg  │
│  • Owns:                                                    │
│    - valid_transitions state machine (D-12)                 │
│    - Role-aware visibility query construction (D-05)        │
│    - Atomic conditional UPDATE for claim (D-01)             │
│    - Ownership check before mutate (D-04, PERM-02/03)       │
│    - DishChef validation for advance (D-09)                 │
│  • Returns: Model instance / List[Model] / None / raises    │
│    ValueError("中文消息")                                    │
│  • Phase 6 hook: `# Phase 6 hook: notify claiming chef`     │
│    placeholder comments at transition tail                  │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Models: backend/app/models/wish.py                         │
│  ──────────────────────────────────────────────────────     │
│  • Wish(Base): __tablename__ = "wishes"                     │
│    Columns: id, user_id (FK users.id), dish_name,           │
│      reference_url, note, status (default "待处理"),        │
│      claimed_by_chef_id (FK users.id, nullable),            │
│      related_dish_id (FK dishes.id, nullable),              │
│      reject_reason (Text, nullable),                        │
│      created_at, updated_at (server_default=func.now())     │
│    Relationships: submitter (User), claimer (User),         │
│      related_dish (Dish)                                    │
│    Indexes: ix_wishes_user_id, ix_wishes_status,            │
│      ix_wishes_claimed_by_chef_id,                          │
│      ix_wishes_status_chef (composite)                      │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Database: SQLite (WAL mode)                                │
│  ──────────────────────────────────────────────────────     │
│  • Table "wishes" created by Alembic revision (chains from  │
│    head a9b1c2d3e4f5)                                       │
│  • v1.0 data preserved (additive migration, no destructive  │
│    ops)                                                     │
│  • Atomic UPDATE WHERE id=:id AND status='待处理' relies on │
│    SQLite statement-level atomicity (no row lock needed)    │
└─────────────────────────────────────────────────────────────┘
```

**Reading the diagram:** A user submits `POST /api/wishes` → router validates JWT + Pydantic body → calls `wish_service.submit_wish(db, current_user, wish_data)` → service creates row, flushes, returns model → router serializes via `WishResponse.model_validate(wish)` → `get_db` commits at request end. For claim, the same flow enters service but uses `update(Wish).where(...).values(...)` with `rowcount==0` check instead of `SELECT`-then-`UPDATE`.

### Recommended Project Structure

```text
backend/app/
├── models/
│   ├── __init__.py          # ADD: from app.models.wish import Wish; append "Wish" to __all__
│   └── wish.py              # NEW — Wish SQLAlchemy model
├── schemas/
│   └── wish.py              # NEW — WishCreate, WishUpdate, WishAdvance, WishReject,
│                            #       WishResponse, WishListResponse, WishDetailResponse
├── services/
│   └── wish_service.py      # NEW — WishService class + module-level `wish_service = WishService()`
├── routers/
│   └── wishes.py            # NEW — APIRouter with /api/wishes endpoints
├── main.py                  # EDIT — add: app.include_router(wishes.router, prefix="/api/wishes", tags=["愿望单"])
backend/alembic/versions/
└── <revision>_add_wishes_table.py  # NEW — chains from a9b1c2d3e4f5 (current head)
backend/tests/
└── test_wishes.py           # NEW — full endpoint coverage incl. concurrency + permission edge cases
```

### Pattern 1: Service-as-singleton with static methods
**What:** Each service is a class with `@staticmethod async` methods; instantiated once at module bottom.
**When to use:** Every backend service in this codebase.
**Example:**
```python
# Source: backend/app/services/order_service.py:21-24, 435-436
class WishService:
    """愿望单服务"""

    @staticmethod
    async def submit_wish(
        db: AsyncSession,
        current_user: User,
        wish_data: WishCreate,
    ) -> Wish:
        ...

# Module-level singleton
wish_service = WishService()
```

### Pattern 2: State machine via `valid_transitions` dict
**What:** Status stored as `String(20)`; transition validation in service-level dict.
**When to use:** All lifecycle models (Order, GuestInvitation, Wish).
**Example:**
```python
# Source: backend/app/services/order_service.py:296-321 (update_order_status)
valid_transitions = {
    "待处理": ["准备中", "已撤销"],
    "准备中": ["已上架", "已拒绝", "已撤销"],
    "已上架": [],
    "已拒绝": [],
    "已撤销": [],
}

allowed = valid_transitions.get(wish.status, [])
if target_status not in allowed:
    raise ValueError(
        f"无效的状态转换: {wish.status} -> {target_status}，"
        f"允许的状态: {', '.join(allowed) if allowed else '无'}"
    )
```

### Pattern 3: Atomic conditional UPDATE for concurrency safety
**What:** Single UPDATE statement with WHERE clause checking current state; `rowcount==0` ⇒ race lost.
**When to use:** Concurrent claim (D-01).
**Example:**
```python
# Source: locked decision D-01 in CONTEXT.md, modeled on SQLAlchemy 2.0 update() API
from sqlalchemy import update

result = await db.execute(
    update(Wish)
    .where(Wish.id == wish_id, Wish.status == "待处理")
    .values(status="准备中", claimed_by_chef_id=chef_id)
)
if result.rowcount == 0:
    # Either: wish doesn't exist, OR another chef just claimed it, OR status changed
    raise ValueError("该愿望已被认领或状态已变更")
# Re-fetch the row with relationships for response
wish = await WishService.get_wish_by_id(db, wish_id, current_user)
```

**Critical detail:** `result.rowcount` for SQLAlchemy 2.0 `update()` on aiosqlite returns the number of rows matched/modified. For SQLite, matched == modified (no `WHERE EXISTS` weirdness). 0 means no row matched the WHERE clause — exactly the race-condition signal we want.

### Pattern 4: Role-aware visibility query
**What:** Same service method returns different query results based on `current_user.role`.
**When to use:** `list_wishes` (D-05).
**Example:**
```python
# Source: derived from backend/app/services/order_service.py:247-293 (list_orders) + D-05
from sqlalchemy import or_, select

@staticmethod
async def list_wishes(
    db: AsyncSession,
    params: PaginationParams,
    current_user: User,
    status: Optional[str] = None,
    claimed_by_chef_id: Optional[int] = None,
    mine: bool = False,  # shortcut for "my claims"
) -> tuple[List[Wish], int]:
    query = select(Wish).options(
        selectinload(Wish.submitter),
        selectinload(Wish.claimer),
    )

    # D-05 visibility rules
    if current_user.role == "admin":
        pass  # admin sees all
    elif current_user.role == "chef":
        if mine:
            query = query.where(Wish.claimed_by_chef_id == current_user.id)
        else:
            # Chef sees: 待处理 queue + 自己认领的
            query = query.where(
                or_(
                    Wish.status == "待处理",
                    Wish.claimed_by_chef_id == current_user.id,
                )
            )
    else:  # regular user
        query = query.where(Wish.user_id == current_user.id)

    # Optional filters
    if status:
        query = query.where(Wish.status == status)
    if claimed_by_chef_id is not None:
        query = query.where(Wish.claimed_by_chef_id == claimed_by_chef_id)

    query = query.order_by(Wish.created_at.desc())

    # Count query (same filters, no pagination)
    count_query = select(func.count(Wish.id))
    # ... apply same filters to count_query ...

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset(params.offset).limit(params.limit)
    result = await db.execute(query)
    wishes = result.scalars().all()
    return wishes, total
```

### Pattern 5: Flattened response injection at router layer
**What:** Pydantic response model has optional name fields; router sets them after `model_validate`.
**When to use:** When list endpoint needs human-readable names alongside IDs.
**Example:**
```python
# Source: backend/app/routers/guest.py:67-77 (list_invitations)
items = []
for w in wishes:
    item = WishListResponse.model_validate(w)
    item.submitter_name = w.submitter.display_name if w.submitter else None
    item.claimed_by_chef_name = w.claimer.display_name if w.claimer else None
    items.append(item)

return PageResponse[WishListResponse](
    total=total,
    page=page,
    page_size=page_size,
    items=items,
)
```

### Anti-Patterns to Avoid

- **SELECT-then-UPDATE for claim (FORBIDDEN by D-01):** `wish = await get_by_id(); wish.status = "准备中"; await flush()` opens a TOCTOU race window between read and write. Two concurrent requests can both read `status='待处理'` and both write `status='准备中'`. **Use atomic UPDATE with WHERE clause instead.**
- **Returning 403 for unauthorized reads (FORBIDDEN by D-03):** Returning 403 instead of 404 lets attackers enumerate which wish IDs exist. Always return 404 for both "not found" and "found but not yours".
- **Inline `feishu_client` calls in Phase 5 (FORBIDDEN by D-08):** Phase 5 service layer must NOT call `feishu_client`. Leave a `# Phase 6 hook` comment placeholder. Phase 6 will wrap or hook the service methods.
- **`with_for_update()` on SQLite (FORBIDDEN by D-01):** aiosqlite silently ignores `with_for_update()`. It provides no actual row lock. Rely on atomic single-statement UPDATE.
- **Physical DELETE for cancel (FORBIDDEN by D-07):** Use `status='已撤销'` soft delete. Mirrors `Order.status='cancelled'`.
- **Adding DB-level CHECK constraint on status (FORBIDDEN by D-11):** Migration to change CHECK constraints on SQLite requires table rebuild; evolution is painful. Validate transitions in Python.
- **Fat router methods (per ARCHITECTURE.md anti-pattern):** Router should only do HTTP + dependency injection + error conversion. Business logic (state machine, ownership, validation) belongs in `WishService`.
- **Inline model construction in routers (per ARCHITECTURE.md anti-pattern):** Use Pydantic `model_validate` with `from_attributes = True` instead of manually constructing response objects field-by-field. The guest.py flatten pattern is acceptable for derived fields only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic claim with race safety | Manual mutex / lock table / `with_for_update()` | Single `update().where(status='待处理')` statement + `rowcount==0` check (D-01) | SQLite statement atomicity is sufficient; aiosqlite doesn't support real row locks; simpler & faster than alternatives. |
| Pagination | Custom offset/limit math | `PaginationParams` from `backend/app/utils/pagination.py` + `PageResponse[T]` from `backend/app/schemas/common.py` | Existing project convention used by `list_orders`, `list_invitations`, etc. Frontend already expects this shape. |
| Role-based access control | Custom decorator stack | `require_role("chef", "admin")` factory at `backend/app/routers/auth.py:123` | Existing project pattern; returns FastAPI dependency that raises 403 with Chinese message. |
| Pydantic ORM conversion | Manual `dict()` → `Model(**dict)` | `WishResponse.model_validate(wish_orm_instance)` with `model_config = ConfigDict(from_attributes=True)` | Pydantic v2 idiomatic; handles nested relationships; consistent with other schemas. |
| State machine | `transitions` library / `python-statemachine` / custom FSM class | `valid_transitions` dict in service (mirrors `OrderService.update_order_status`) | 5 states × 7 transitions is trivially small; external library is over-engineering and would introduce inconsistency with `OrderService`. |
| Eager loading relationships | N+1 queries / manual `select(User).where(id==...)` per row | `selectinload(Wish.submitter)`, `selectinload(Wish.claimer)` in the list query | Standard SQLAlchemy 2.0 pattern; prevents N+1; existing code uses this throughout. |
| Schema migration | Hand-written SQL DDL in service startup | Alembic revision (autogenerate + manual review) | Existing project convention; `alembic upgrade head` runs on deploy; preserves v1.0 data. |
| Error message localization | i18n library / message catalog | Hardcoded Chinese strings in `ValueError("中文消息")` | Project convention per AGENTS.md / CONVENTIONS.md — Chinese-first error messages. |

**Key insight:** This phase is **all precedent-following**. The codebase already has 4 lifecycle entities (Order, GuestInvitation, User, Dish); Wish is the 5th. Every design problem in Phase 5 has a worked example in existing code. The planner should resist any temptation to introduce new patterns, libraries, or abstractions.

## Runtime State Inventory

> This is a **greenfield additive phase** (new table + new endpoints), NOT a rename/refactor/migration of existing state. The Runtime State Inventory is therefore not strictly required. However, the checklist is completed below to confirm no hidden state is touched.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | **None touched.** New `wishes` table is additive; existing v1.0 tables (`users`, `dishes`, `orders`, etc.) are not modified. The new migration creates a table; no data backfill needed. | None — verified by reading migration template `a9b1c2d3e4f5_add_guest_invitations_table_and_guest.py` (pure `op.create_table` + `op.create_index`). |
| Live service config | **None.** No external services (Feishu, etc.) have Wish-related configuration yet. Phase 6 will add Feishu notification templates; Phase 5 does not. | None. |
| OS-registered state | **None.** No cron jobs, systemd units, or Task Scheduler entries reference wishes. | None. |
| Secrets/env vars | **None.** No new env vars or secrets introduced. JWT secret, DB URL, etc. all reuse existing config. | None. |
| Build artifacts / installed packages | **None.** No new packages installed; `pyproject.toml` unchanged; no `egg-info` to refresh. | None. |

**Nothing found in any category** — verified by reading existing migration patterns and the locked decisions. This is a pure additive phase.

## Common Pitfalls

### Pitfall 1: Wrong Alembic Head (CONTEXT.md error)
**What goes wrong:** CONTEXT.md line 134 states the new migration should chain after `d4e5f6a7b8c9`. **This is incorrect.** The actual current head (verified via `uv run alembic heads` on 2026-07-21) is `a9b1c2d3e4f5` (guest invitations).
**Why it happens:** CONTEXT.md was likely drafted from an older repo state before the guest invitations migration landed. The migration chain is: `... → c3d4e5f6a7b8 → d4e5f6a7b8c9 → a9b1c2d3e4f5 (head)`.
**How to avoid:** Run `cd backend && uv run alembic heads` BEFORE drafting the migration. Set `down_revision = "a9b1c2d3e4f5"` in the new revision file.
**Warning signs:** `alembic upgrade head` fails with "Multiple heads are present" or new revision is detached from main branch.

### Pitfall 2: Race Condition in Concurrent Claim (D-01 violation)
**What goes wrong:** Two chefs click "认领" on the same wish within milliseconds. If service uses SELECT-then-UPDATE, both read `status='待处理'`, both write `status='准备中'`, one overwrites the other's `claimed_by_chef_id`. End state: one wish, two chefs think they own it.
**Why it happens:** Natural-feeling SELECT-then-UPDATE pattern; SQLite's lack of row locks makes it tempting to assume single-writer safety.
**How to avoid:** Use single atomic `update(Wish).where(Wish.id == id, Wish.status == "待处理").values(status="准备中", claimed_by_chef_id=chef_id)`. Check `result.rowcount == 0` ⇒ raise `ValueError("该愿望已被认领或状态已变更")` (router converts to HTTP 400 per D-02).
**Warning signs:** Integration test with two concurrent `POST /api/wishes/{id}/claim` requests returns 201 for both.

### Pitfall 3: `selectinload` Missing on List Query (N+1 queries)
**What goes wrong:** `list_wishes` returns 20 wishes. Router calls `w.submitter.display_name` per row. Without `selectinload(Wish.submitter)`, this triggers 20 extra SELECT queries (one per wish) — visible as slow list endpoint.
**Why it happens:** Forgetting to add `.options(selectinload(...))` to the query.
**How to avoid:** Always chain `.options(selectinload(Wish.submitter), selectinload(Wish.claimer))` on list and detail queries. The flatten pattern at router layer requires these relationships to be loaded.
**Warning signs:** List endpoint takes >100ms for 20 rows; SQLAlchemy echo logs show 21 SELECT statements.

### Pitfall 4: 403 vs 404 Confusion (D-03/D-04 mismatch)
**What goes wrong:** Developer returns 403 for unauthorized read (information leak) OR returns 404 for unauthorized mutate (poor UX — chef can't tell why their advance failed).
**Why it happens:** D-03 (read = 404) and D-04 (mutate on claimed = 403) feel inconsistent at first glance.
**How to avoid:** Memorize the rule: **Reads return 404 for both "not found" and "no permission"** (prevent ID enumeration). **Mutates on already-claimed wishes return 403 + Chinese message with claimer name** (helpful error for chefs who lost the race). Document this in `wish_service.py` module docstring.
**Warning signs:** Permission tests asserting wrong status codes; frontend unable to display "已被厨师 X 认领" toast.

### Pitfall 5: `force_pwd_change=True` Users Blocked (existing pitfall inherited)
**What goes wrong:** Test fixtures create users without setting `force_pwd_change=False`. The `get_current_user_from_token` dependency raises 403 "首次登录请修改密码" before the request reaches the wish endpoint.
**Why it happens:** New User instances default to `force_pwd_change=False` per the model, but if tests explicitly construct users from scratch they may forget the field.
**How to avoid:** Use the existing `conftest.py` fixtures (`admin_token`, `user_token`, `chef_token`) — they already set `force_pwd_change=False`. If crafting custom users, set this field explicitly.
**Warning signs:** All wish endpoints return 403 "首次登录请修改密码" in tests despite correct role.

### Pitfall 6: Missing `await db.commit()` in Mutate Routes
**What goes wrong:** Service calls `await db.flush()` + `await db.refresh(wish)`, but router forgets `await db.commit()`. The `get_db` dependency commits on success — but if router raises before yielding back to dependency, the change is rolled back.
**Why it happens:** Following `orders.py` pattern which DOES commit explicitly (line 112, 230, 255) — easy to miss.
**How to avoid:** Always end mutate routes with `await db.commit()` after service returns successfully. Reference `routers/orders.py` lines 112, 230, 255 as template.
**Warning signs:** POST returns 201 but `GET /api/wishes` doesn't show the new wish; data "appears" then "disappears".

### Pitfall 7: Composite Index Order Matters for Query Plans
**What goes wrong:** Composite index `(status, claimed_by_chef_id)` is fast for chef queue queries (`WHERE status='待处理' OR claimed_by_chef_id=X`) but slow for admin filter `WHERE claimed_by_chef_id=X` alone.
**Why it happens:** SQLite B-tree indexes are leftmost-prefix; `(status, chef_id)` can't serve `WHERE chef_id=X` without scanning.
**How to avoid:** CONTEXT.md specifics (line 144) recommend four indexes: `ix_wishes_user_id`, `ix_wishes_status`, `ix_wishes_claimed_by_chef_id`, and composite `ix_wishes_status_chef`. Keep all four — the single-column `ix_wishes_claimed_by_chef_id` covers admin's `claimed_by_chef_id` filter, and the composite covers the chef queue's most common filter combination.
**Warning signs:** `EXPLAIN QUERY PLAN` shows full table scan for admin filtered queries.

## Code Examples

### Wish Model
```python
# Source: derived from backend/app/models/order.py + backend/app/models/guest_invitation.py
# Locked by D-11 (status as String(20), no Enum, no CHECK)
"""愿望单模型"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Wish(Base):
    __tablename__ = "wishes"
    __table_args__ = (
        Index("ix_wishes_user_id", "user_id"),
        Index("ix_wishes_status", "status"),
        Index("ix_wishes_claimed_by_chef_id", "claimed_by_chef_id"),
        Index("ix_wishes_status_chef", "status", "claimed_by_chef_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dish_name = Column(String(100), nullable=False)
    reference_url = Column(String(500))  # optional
    note = Column(Text)                  # optional
    status = Column(String(20), nullable=False, default="待处理")
    claimed_by_chef_id = Column(Integer, ForeignKey("users.id"))  # nullable until claimed
    related_dish_id = Column(Integer, ForeignKey("dishes.id"))    # nullable until advanced
    reject_reason = Column(Text)         # nullable; required only when status="已拒绝"
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    submitter = relationship("User", foreign_keys=[user_id])
    claimer = relationship("User", foreign_keys=[claimed_by_chef_id])
    related_dish = relationship("Dish", foreign_keys=[related_dish_id])
```

### Pydantic Schemas
```python
# Source: derived from backend/app/schemas/order.py + backend/app/schemas/guest.py conventions
"""愿望单 Schema"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class WishBase(BaseModel):
    dish_name: str = Field(..., min_length=1, max_length=100, description="菜名（必填）")
    reference_url: Optional[str] = Field(None, max_length=500, description="参考链接（可选）")
    note: Optional[str] = Field(None, description="备注（可选）")


class WishCreate(WishBase):
    pass


class WishUpdate(BaseModel):
    """编辑窗口: 仅在 待处理 / 准备中 状态下允许 (D-06)"""
    dish_name: Optional[str] = Field(None, min_length=1, max_length=100)
    reference_url: Optional[str] = Field(None, max_length=500)
    note: Optional[str] = None


class WishAdvance(BaseModel):
    """推进到 已上架 (FLOW-03, D-09)"""
    related_dish_id: int = Field(..., description="关联的已上架菜品 ID")


class WishReject(BaseModel):
    """拒绝愿望 (FLOW-04) - 拒绝原因必填"""
    reject_reason: str = Field(..., min_length=1, max_length=500, description="拒绝原因（必填）")


class WishResponse(BaseModel):
    """单条愿望响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    dish_name: str
    reference_url: Optional[str]
    note: Optional[str]
    status: str
    claimed_by_chef_id: Optional[int]
    related_dish_id: Optional[int]
    reject_reason: Optional[str]
    created_at: datetime
    updated_at: datetime


class WishListResponse(WishResponse):
    """列表项: 在路由层注入扁平化的 name 字段 (参考 guest.py:67-77)"""
    submitter_name: Optional[str] = None
    claimed_by_chef_name: Optional[str] = None


class WishDetailResponse(WishResponse):
    """详情: 含所有扁平化字段 + 可选的 related_dish_name"""
    submitter_name: Optional[str] = None
    claimed_by_chef_name: Optional[str] = None
    related_dish_name: Optional[str] = None
```

### Atomic Conditional UPDATE (claim_wish)
```python
# Source: locked decision D-01; SQLAlchemy 2.0 update() statement API
from sqlalchemy import update, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

@staticmethod
async def claim_wish(
    db: AsyncSession,
    wish_id: int,
    current_user: User,
) -> Optional[Wish]:
    """厨师认领愿望 (FLOW-02, D-01 并发安全).

    Role gate enforced at router via require_role("chef", "admin").
    Returns:
      Wish instance on success.
      None if wish_id doesn't exist (router -> 404 per D-03).
    Raises:
      ValueError: 如果愿望已被他人认领或状态变更 (router -> 400 per D-02).
    """
    # 原子条件 UPDATE — single statement, no SELECT-then-UPDATE
    result = await db.execute(
        update(Wish)
        .where(Wish.id == wish_id, Wish.status == "待处理")
        .values(status="准备中", claimed_by_chef_id=current_user.id)
    )
    if result.rowcount == 0:
        # Either wish doesn't exist OR was just claimed OR status changed.
        # Disambiguate: if wish exists, raise ValueError (400); else None (404).
        existing = await db.execute(select(Wish.id).where(Wish.id == wish_id))
        if existing.scalar_one_or_none() is None:
            return None  # router: 404 Not Found
        raise ValueError("该愿望已被认领或状态已变更")  # router: 400 Bad Request

    # Phase 6 hook: notify submitter that wish was claimed
    # (Phase 5 does NOT call feishu_client; Phase 6 will inject here)

    # Re-fetch with relationships loaded for response serialization
    result = await db.execute(
        select(Wish)
        .options(selectinload(Wish.submitter), selectinload(Wish.claimer))
        .where(Wish.id == wish_id)
    )
    return result.scalar_one_or_none()
```

**Note on disambiguation:** The extra `select(Wish.id).where(...)` after `rowcount==0` is a deliberate compromise. D-01's literal text says simply `raise ValueError`, but D-03 requires 404 for non-existent wishes. The disambiguation query is a single-column existence check (cheap) and lets us return appropriate status codes. This is consistent with `order_service.cancel_order` lines 384-394 which also does existence check before permission check.

### advance_wish with DishChef Validation (D-09)
```python
# Source: locked decisions D-09 (DishChef validation) + D-12 (state machine)
@staticmethod
async def advance_wish(
    db: AsyncSession,
    wish_id: int,
    current_user: User,
    advance_data: WishAdvance,
) -> Optional[Wish]:
    """推进愿望到 已上架 (FLOW-03, D-09).

    Requires:
      - current_user is admin OR wish.claimed_by_chef_id == current_user.id (PERM-03/04)
      - wish.status == "准备中" (D-12 valid_transitions)
      - target dish has a DishChef row with chef_id=current_user.id, status='published' (D-09)
    """
    # Load wish with eager-loaded claimer for response
    result = await db.execute(
        select(Wish)
        .options(selectinload(Wish.submitter), selectinload(Wish.claimer))
        .where(Wish.id == wish_id)
    )
    wish = result.scalar_one_or_none()
    if not wish:
        return None  # 404

    # Mutate permission: PERM-03 (chef can only advance own claims) + PERM-04 (admin bypass)
    if current_user.role != "admin" and wish.claimed_by_chef_id != current_user.id:
        # D-04: 403 + Chinese message with claimer name
        claimer = wish.claimer
        claimer_name = claimer.display_name if claimer else "其他厨师"
        raise ValueError(f"该愿望已被厨师 {claimer_name} 认领")  # router: 403

    # State machine check
    allowed = {"准备中": ["已上架", "已拒绝", "已撤销"]}.get(wish.status, [])
    if "已上架" not in allowed:
        raise ValueError(f"无法从状态 '{wish.status}' 推进到 '已上架'")

    # D-09: validate target dish is published by this chef
    chef_for_validation = wish.claimed_by_chef_id or current_user.id
    dc_result = await db.execute(
        select(DishChef).where(
            DishChef.dish_id == advance_data.related_dish_id,
            DishChef.chef_id == chef_for_validation,
            DishChef.status == "published",
        )
    )
    if dc_result.scalar_one_or_none() is None:
        raise ValueError("你未发布此菜品或菜品不可用")  # router: 400

    # Apply transition
    wish.status = "已上架"
    wish.related_dish_id = advance_data.related_dish_id
    await db.flush()
    await db.refresh(wish)

    # Phase 6 hook: notify submitter wish was fulfilled

    return wish
```

**Note on D-04 router conversion:** When service raises `ValueError("该愿望已被厨师 X 认领")`, the router's generic `except ValueError: HTTPException(400)` would yield HTTP 400. But D-04 explicitly requires **403 Forbidden**. The router needs to distinguish this case. Two options for the planner:
1. Define a custom `PermissionDeniedError(ValueError)` subclass that the router catches separately and converts to 403.
2. Use a sentinel prefix in the message and inspect it in the router.
3. (Cleaner) Raise `HTTPException(403, ...)` directly from the service for this specific case — but this breaks the "service raises ValueError" convention.

**Recommendation for planner:** Define a thin `WishPermissionError(ValueError)` exception class in `wish_service.py`. Router catches `WishPermissionError` → 403, generic `ValueError` → 400. This keeps the service-layer boundary clean while satisfying D-04. Document this clearly.

### Migration Template
```python
# Source: backend/alembic/versions/a9b1c2d3e4f5_add_guest_invitations_table_and_guest.py
"""add wishes table

Revision ID: <autogenerated>
Revises: a9b1c2d3e4f5  # CORRECTION: actual head, NOT d4e5f6a7b8c9
"""
from alembic import op
import sqlalchemy as sa


revision = "<autogenerated>"
down_revision = "a9b1c2d3e4f5"  # current head, verified via `alembic heads`
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wishes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("dish_name", sa.String(length=100), nullable=False),
        sa.Column("reference_url", sa.String(length=500), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="待处理"),
        sa.Column("claimed_by_chef_id", sa.Integer(), nullable=True),
        sa.Column("related_dish_id", sa.Integer(), nullable=True),
        sa.Column("reject_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["claimed_by_chef_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["related_dish_id"], ["dishes.id"]),  # NO ON DELETE — D-10 惰性过期
    )
    op.create_index("ix_wishes_user_id", "wishes", ["user_id"])
    op.create_index("ix_wishes_status", "wishes", ["status"])
    op.create_index("ix_wishes_claimed_by_chef_id", "wishes", ["claimed_by_chef_id"])
    op.create_index("ix_wishes_status_chef", "wishes", ["status", "claimed_by_chef_id"])


def downgrade() -> None:
    op.drop_index("ix_wishes_status_chef", table_name="wishes")
    op.drop_index("ix_wishes_claimed_by_chef_id", table_name="wishes")
    op.drop_index("ix_wishes_status", table_name="wishes")
    op.drop_index("ix_wishes_user_id", table_name="wishes")
    op.drop_table("wishes")
```

### Router Template
```python
# Source: derived from backend/app/routers/orders.py + backend/app/routers/guest.py
"""家味 · Family Chef - 愿望单路由"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user_from_token, require_role
from app.models.user import User
from app.services.wish_service import wish_service, WishPermissionError
from app.schemas.wish import (
    WishCreate, WishUpdate, WishAdvance, WishReject,
    WishResponse, WishListResponse, WishDetailResponse,
)
from app.schemas.common import PageResponse
from app.utils.pagination import PaginationParams

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WishResponse)
async def submit_wish(
    wish_data: WishCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """提交愿望 (WISH-01) — 所有注册用户可用"""
    wish = await wish_service.submit_wish(db, current_user, wish_data)
    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


@router.get("", response_model=PageResponse[WishListResponse])
async def list_wishes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="状态筛选"),
    claimed_by_chef_id: Optional[int] = Query(None, description="认领厨师筛选 (admin)"),
    mine: bool = Query(False, description="仅看我认领的 (FLOW-05)"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """愿望列表 (WISH-02, FLOW-01, FLOW-05, PERM-01) — 角色感知"""
    params = PaginationParams(page=page, page_size=page_size)
    wishes, total = await wish_service.list_wishes(
        db, params, current_user,
        status=status, claimed_by_chef_id=claimed_by_chef_id, mine=mine,
    )
    items = []
    for w in wishes:
        item = WishListResponse.model_validate(w)
        item.submitter_name = w.submitter.display_name if w.submitter else None
        item.claimed_by_chef_name = w.claimer.display_name if w.claimer else None
        items.append(item)
    return PageResponse[WishListResponse](
        total=total, page=page, page_size=page_size, items=items,
    )


@router.get("/{wish_id}", response_model=WishDetailResponse)
async def get_wish(
    wish_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """愿望详情 (PERM-01) — 未授权访问返回 404 (D-03)"""
    wish = await wish_service.get_wish_by_id(db, wish_id, current_user)
    if not wish:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="愿望不存在")
    resp = WishDetailResponse.model_validate(wish)
    resp.submitter_name = wish.submitter.display_name if wish.submitter else None
    resp.claimed_by_chef_name = wish.claimer.display_name if wish.claimer else None
    return resp


@router.put("/{wish_id}", response_model=WishResponse)
async def update_wish(
    wish_id: int,
    update_data: WishUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """编辑愿望 (PERM-02, D-06) — 仅提交者本人 + 非终态"""
    try:
        wish = await wish_service.update_wish(db, wish_id, current_user, update_data)
    except WishPermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not wish:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="愿望不存在")
    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


@router.delete("/{wish_id}", response_model=WishResponse)
async def cancel_wish(
    wish_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """撤销愿望 (WISH-04, D-07 软删除) — 仅提交者本人 + 非终态"""
    try:
        wish = await wish_service.cancel_wish(db, wish_id, current_user)
    except WishPermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not wish:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="愿望不存在")
    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


@router.post("/{wish_id}/claim", response_model=WishResponse)
async def claim_wish(
    wish_id: int,
    current_user: User = Depends(require_role("chef", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """厨师认领愿望 (FLOW-02, D-01 原子并发安全)"""
    try:
        wish = await wish_service.claim_wish(db, wish_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not wish:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="愿望不存在")
    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


@router.post("/{wish_id}/advance", response_model=WishResponse)
async def advance_wish(
    wish_id: int,
    advance_data: WishAdvance,
    current_user: User = Depends(require_role("chef", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """推进愿望到 已上架 (FLOW-03, D-09 关联菜品验证, D-10 终态)"""
    try:
        wish = await wish_service.advance_wish(db, wish_id, current_user, advance_data)
    except WishPermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not wish:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="愿望不存在")
    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


@router.post("/{wish_id}/reject", response_model=WishResponse)
async def reject_wish(
    wish_id: int,
    reject_data: WishReject,
    current_user: User = Depends(require_role("chef", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """拒绝愿望 (FLOW-04, reject_reason 必填)"""
    try:
        wish = await wish_service.reject_wish(db, wish_id, current_user, reject_data)
    except WishPermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not wish:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="愿望不存在")
    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)
```

**Endpoint path choice (per `## the agent's Discretion`):** Used `POST /{id}/claim`, `POST /{id}/advance`, `POST /{id}/reject` rather than `PUT /{id}/status` (orders.py style) because:
1. Each transition takes a different body shape (`WishAdvance` has `related_dish_id`; `WishReject` has `reject_reason`; `claim` has no body) — a single `PUT /status` endpoint would need a discriminated union, which is uglier than three explicit endpoints.
2. `guest.py` uses explicit action endpoints (`PUT /invitations/{id}/revoke`) — same precedent.
3. HTTP semantics: `POST` for non-idempotent state transitions is acceptable (claim has side effects, advance mutates related_dish_id, reject writes reject_reason).

### Test File Skeleton
```python
# Source: backend/tests/test_orders.py + backend/tests/conftest.py
"""家味 · Family Chef - 愿望单模块测试"""
import pytest
from httpx import AsyncClient


@pytest.fixture
async def user_wish(client: AsyncClient, user_token: str) -> int:
    """创建示例愿望，返回 wish_id"""
    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "宫保鸡丁", "note": "微辣"},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_submit_wish(client: AsyncClient, user_token: str):
    """WISH-01: 注册用户可提交愿望"""
    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "麻婆豆腐", "reference_url": "https://example.com/recipe"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "待处理"
    assert data["dish_name"] == "麻婆豆腐"


@pytest.mark.asyncio
async def test_claim_wish_concurrent_safety(client: AsyncClient, user_token: str, chef_token: str):
    """DATA-08, FLOW-02: 并发认领安全 — 第二个认领必须失败"""
    wish_id = await user_wish(client, user_token)
    # 第一个厨师认领成功
    r1 = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r1.status_code == 200
    assert r1.json()["status"] == "准备中"
    # 模拟"第二个厨师" — 这里需要另一个 chef_token, 见 conftest.py 扩展
    # 实际测试需创建 chef2 fixture


@pytest.mark.asyncio
async def test_unauthorized_read_returns_404(client: AsyncClient, user_token: str, chef_token: str):
    """PERM-01, D-03: 非提交者/非认领厨师/非管理员读他人愿望 → 404 (非 403)"""
    wish_id = await user_wish(client, user_token)
    # 用另一个普通用户访问 (需 user2_token fixture)
    # assert response.status_code == 404
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SQLAlchemy 1.x `Query API` (`db.query(Wish).filter(...)`) | SQLAlchemy 2.0 `select()` API (`await db.execute(select(Wish).where(...))`) | SQLAlchemy 2.0 (already in project) | All new code uses `select()`, `update()`, `insert()`, `delete()` statement API. Never use legacy `Query` API. |
| Pydantic v1 `.from_orm()` / `.dict()` | Pydantic v2 `model_validate()` / `model_dump()` | Pydantic 2.0 (already in project) | All schemas use `model_config = ConfigDict(from_attributes=True)`. |
| `backend/app/database.py` legacy `Session` | `AsyncSession` + `async_sessionmaker` | Project-wide since v1.0 | All wish service methods are `async def`, take `AsyncSession` as first arg. |
| Manual JWT validation per route | `get_current_user_from_token` + `require_role(*roles)` dependency factory | Existing since v1.0 | All wish routes use these dependencies — never write custom JWT logic. |

**Deprecated/outdated:**
- **`db.query(...)` API:** Do not use. Project standardized on 2.0 `select()` API.
- **`from_orm()`:** Replaced by `model_validate()` in Pydantic v2.
- **`.dict()`:** Replaced by `.model_dump()` in Pydantic v2 (still works but deprecated).

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `WishPermissionError(ValueError)` custom exception subclass is the cleanest way to distinguish D-04's 403 from generic D-02's 400 at the router boundary. | Code Examples § "Router Template" + advance_wish | LOW — If planner prefers alternative (sentinel string prefix, or service raises HTTPException directly), the convention is small and easily swapped. |
| A2 | `POST /{id}/claim`, `POST /{id}/advance`, `POST /{id}/reject` (three explicit action endpoints) is preferred over a single `PUT /{id}/status` endpoint. | Code Examples § "Router Template" + Architectural Responsibility Map | LOW — `## the agent's Discretion` in CONTEXT.md explicitly leaves this open. Either choice works; explicit endpoints were chosen for clarity given different body shapes. |
| A3 | The Phase 6 hook `# Phase 6 hook: notify claiming chef` is a comment placeholder only — no callback registry, no event bus, no abstract method. | Code Examples § "Service methods" | LOW — D-08 only requires "method signatures/return values stable enough for Phase 6 to wrap or hook". Comment placeholder is the minimum viable. If Phase 6 needs a callback, it can refactor then. |
| A4 | `dish_name` is `String(100)` (matching `Dish.name` length). | Code Examples § "Wish Model" | LOW — REQUIREMENTS.md doesn't specify max length; 100 chars matches the closest existing precedent. |
| A5 | Branch name follows GSD config template `gsd/phase-5-{slug}` despite AGENTS.md mentioning `feature/guest_order` for v1.0. | Project Constraints | LOW — `feature/guest_order` was the v1.0 branch; v1.1 phases should use GSD template unless user overrides. |

**All other claims in this research were verified by reading actual code in this session** (versions via `uv pip list`, alembic head via `alembic heads`, code patterns via Read tool on `order.py`, `order_service.py`, `orders.py`, `guest.py`, `auth.py`, `dish.py`, `user.py`, `conftest.py`, `test_orders.py`, and the latest two alembic revisions).

## Open Questions (RESOLVED)

1. **Should `list_wishes` for admin support a `user_id` (submitter) filter?**
   - What we know: FLOW-01 specifies "按状态/认领厨师筛选" — submitter filter not mentioned.
   - What's unclear: Whether admin debugging needs to filter by submitter (e.g., "show all wishes from user X").
   - Recommendation: Add `user_id: Optional[int] = Query(None)` as an undocumented/admin-only query param. Trivial to add now; painful to retrofit if Phase 7 frontend needs it.
   - **RESOLVED:** Not added — planner followed literal FLOW-01 text (status/claimed_by_chef_id filters only) in Plan 05-03 Task 1. Can be retrofitted if Phase 7 frontend needs it.

2. **Should `WishUpdate` allow changing `dish_name` while a chef has the wish claimed?**
   - What we know: D-06 explicitly allows editing during `准备中`. But if a chef is mid-cooking and the user changes "宫保鸡丁" to "麻婆豆腐", the chef's work is invalidated.
   - What's unclear: Whether D-06 was intentional about allowing `dish_name` changes during `准备中` or just `reference_url`/`note`.
   - Recommendation: Follow D-06 literally (allow all three fields). Phase 6 NOTIF-06 will notify the chef on edit; if the edit is significant the chef can reject. Document this behavior in service docstring.
   - **RESOLVED:** Followed recommendation — Plan 05-02 Task 1 `WishUpdate` allows all 3 fields (`dish_name`, `reference_url`, `note`) per D-06 literal text.

3. **Should the `mine=True` shortcut also work for admins?**
   - What we know: FLOW-05 is a chef feature ("我的认领"). Admins using `mine=True` would query `claimed_by_chef_id == admin.id` — probably returns empty since admins typically don't claim.
   - What's unclear: Whether admin role even has `claimed_by_chef_id` writes (D-05 says admin can claim via mutate permission).
   - Recommendation: Allow `mine=True` for any role; for admin it returns wishes they personally claimed. Trivial filter; no special-casing.
   - **RESOLVED:** Followed recommendation — Plan 05-02 Task 1 `list_wishes` accepts `mine=True` for any role.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.11+ | All backend code | ✓ | 3.12 (system) | — |
| `uv` | Package manager / alembic runner | ✓ | (in PATH) | — |
| SQLite | Database | ✓ | bundled in Python | — |
| `fastapi` | REST framework | ✓ | 0.136.1 | — |
| `sqlalchemy` | ORM | ✓ | 2.0.49 | — |
| `alembic` | Migrations | ✓ | 1.18.4 | — |
| `aiosqlite` | Async SQLite driver | ✓ | 0.22.1 | — |
| `pydantic` | Schema validation | ✓ | 2.13.4 | — |
| `pytest` + `pytest-asyncio` | Tests | ✓ | per pyproject.toml | — |
| `httpx` | Test HTTP client | ✓ | 0.28.1 | — |

**Missing dependencies with no fallback:** None — all required tooling is installed and at sufficient versions.

**Missing dependencies with fallback:** None.

**External services needed:** None. Phase 5 does NOT call Feishu or any external integration (per D-08). The Feishu integration is deferred to Phase 6.

## Security Domain

> `security_enforcement: true` (config.json line 49), `security_asvs_level: 1`. This section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **No** (Phase 5 does not modify auth) | Existing JWT auth via `get_current_user_from_token` reused unchanged. |
| V3 Session Management | **No** | Project is stateless JWT; no session changes in this phase. |
| V4 Access Control | **YES — primary security focus** | Role-based visibility (D-05), ownership checks (PERM-02/03), admin bypass (PERM-04), atomic claim (D-01). Enforced at service layer; router uses `require_role(*roles)` for HTTP-level gating. |
| V5 Input Validation | **YES** | Pydantic v2 schemas (`WishCreate`, `WishUpdate`, `WishAdvance`, `WishReject`) with `min_length` / `max_length` constraints on all string fields. `dish_name` required non-empty; `reject_reason` required when rejecting. |
| V6 Cryptography | **No** | No new crypto; JWT signing unchanged. |
| V7 Error Handling & Logging | **YES (mild)** | Service raises `ValueError("中文消息")` → router catches → `HTTPException(400, detail=str(e))`. No stack traces leaked to client. Visibility errors return 404 (no ID enumeration). |
| V8 Data Protection | **No** | No sensitive PII beyond existing user fields. |
| V13 API & Web Service | **YES** | REST endpoints follow project conventions; JSON-only responses; CORS unchanged. |

### Known Threat Patterns for FastAPI + SQLAlchemy + JWT

| Pattern | STRIDE | Standard Mitigation (in this phase) |
|---------|--------|---------------------|
| **IDOR (Insecure Direct Object Reference)** on `/api/wishes/{id}` | Elevation of Privilege / Information Disclosure | D-03: service returns `None` for both "not found" and "no permission" → router returns 404. Prevents wish-ID enumeration. Verified via `get_wish_by_id` accepting `current_user` param. |
| **Race condition on claim** (two chefs claim same wish) | Tampering | D-01: atomic conditional `UPDATE ... WHERE id=:id AND status='待处理'` + `rowcount==0` check. Single-statement atomicity on SQLite guarantees correctness. |
| **Horizontal privilege escalation** (chef A advances chef B's wish) | Elevation of Privilege | PERM-03 + D-04: service checks `wish.claimed_by_chef_id == current_user.id or current_user.role == "admin"` before mutate; raises `WishPermissionError("该愿望已被厨师 X 认领")` → router 403. |
| **Vertical privilege escalation** (regular user calls `/claim`) | Elevation of Privilege | Router uses `Depends(require_role("chef", "admin"))` — FastAPI dependency raises 403 before service is called. |
| **Business rule bypass** (advance wish without published dish) | Tampering | D-09: service validates `DishChef` row exists with `status='published'` for the claiming chef before transition; raises `ValueError("你未发布此菜品或菜品不可用")` → 400. |
| **Status transition injection** (skip states, e.g., 待处理 → 已上架 directly) | Tampering | D-12: `valid_transitions` dict enforced in service; only allowed transitions accepted. |
| **Reject without reason** (chef rejects with empty reason) | Repudiation | `WishReject` Pydantic schema requires `reject_reason: str = Field(..., min_length=1)`. FastAPI validates before service is called. |
| **Information disclosure via error messages** | Information Disclosure | Service returns Chinese-only messages (`"无权查看此愿望"`) — no internal IDs, no SQL fragments, no stack traces. |
| **SQL injection** | Tampering | SQLAlchemy 2.0 parameterized queries throughout — never string-interpolate user input into SQL. |
| **Mass assignment** (user submits extra fields like `status` or `claimed_by_chef_id` in `WishCreate`) | Tampering | Pydantic `WishCreate` schema only declares `dish_name`, `reference_url`, `note` — extra fields in request body are silently dropped by FastAPI. Status and claim fields are set only by service code on the model instance, never from user input. |

**Security verification tasks the planner should include:**
1. Test: regular user cannot `POST /api/wishes/{id}/claim` (expect 403).
2. Test: user A cannot read user B's wish by ID (expect 404, not 403).
3. Test: chef A cannot advance chef B's claimed wish (expect 403 with chef B's name in detail).
4. Test: two concurrent claims on same wish — exactly one succeeds (expect 200 + 400).
5. Test: advance wish with `related_dish_id` of unpublished dish → 400.
6. Test: reject wish without `reject_reason` → 422 (Pydantic validation).
7. Test: submit wish with `dish_name=""` → 422 (Pydantic validation).
8. Test: mass-assignment — POST `/api/wishes` with `{"dish_name":"X","status":"已上架"}` → 201 with `status="待处理"` (extra field ignored).

## Sources

### Primary (HIGH confidence)
- **Codebase read in this session** (all verified 2026-07-21):
  - `backend/app/models/order.py` — Order model pattern (status, FKs, timestamps)
  - `backend/app/models/guest_invitation.py` — Lifecycle table + Index pattern
  - `backend/app/models/user.py` — User.role field (string), display_name
  - `backend/app/models/dish.py` — DishChef model (status field, FK to dishes/users)
  - `backend/app/services/order_service.py` — `valid_transitions` dict, ValueError pattern, ownership check, `selectinload`
  - `backend/app/routers/orders.py` — Router pattern (PUT /{id}/status, DELETE /{id}, role check, ValueError → HTTPException)
  - `backend/app/routers/guest.py` — Flattened response injection (`inv_data.chef_name = inv.chef.display_name`)
  - `backend/app/routers/auth.py:123-132` — `require_role(*roles)` factory
  - `backend/app/schemas/common.py` — `PageResponse[T]` generic, `BaseResponse`
  - `backend/app/utils/pagination.py` — `PaginationParams` with `.offset` / `.limit` properties
  - `backend/app/models/__init__.py` — Model export pattern (`__all__` list)
  - `backend/app/main.py:279-292` — Router registration (`app.include_router`)
  - `backend/tests/conftest.py` — Test fixtures (`admin_token`, `user_token`, `chef_token`, `client`, `db`)
  - `backend/tests/test_orders.py` — Test pattern (pytest-asyncio, AsyncClient, assertions)
  - `backend/alembic/versions/a9b1c2d3e4f5_add_guest_invitations_table_and_guest.py` — Migration template (create_table + indexes)
  - `backend/alembic/versions/d4e5f6a7b8c9_add_dish_chef_status.py` — Simple add_column migration
- **Tool commands executed:**
  - `cd backend && uv pip list` — verified installed versions of fastapi, sqlalchemy, alembic, aiosqlite, pydantic, uvicorn, httpx
  - `cd backend && uv run alembic heads` — verified current head is `a9b1c2d3e4f5`
  - `cd backend && uv run alembic history` — verified full migration chain
  - `grep -n "include_router" backend/app/main.py` — verified router registration pattern

### Secondary (MEDIUM confidence)
- `.planning/phases/05-data-foundation-wish-lifecycle-api/05-CONTEXT.md` — Locked decisions D-01..D-12 (authored during `/gsd-discuss-phase` 2026-07-21)
- `.planning/REQUIREMENTS.md` — v1.1 requirements (DATA-06/07/08, WISH-01/02, FLOW-01..05, PERM-01..04)
- `.planning/STATE.md` — Project status, deferred items
- `.planning/config.json` — Workflow flags (`security_enforcement: true`, `nyquist_validation: false`, `parallelization: true`)
- `AGENTS.md` (project root) — Aggregated project instructions (Tech Stack, Conventions, Architecture)

### Tertiary (LOW confidence)
- None — all claims verified via codebase or config files.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all packages verified via `uv pip list` and `pyproject.toml`; no new packages introduced.
- Architecture: **HIGH** — every pattern (state machine, atomic UPDATE, role-based visibility, flatten response, migration template) has a direct codebase precedent that was read in this session.
- Pitfalls: **HIGH** — caught one factual error in CONTEXT.md (alembic head), identified 7 pitfall categories with concrete prevention strategies.
- Security: **HIGH** — ASVS categories mapped; 10 threat patterns enumerated with specific mitigations tied to locked decisions.

**Research date:** 2026-07-21
**Valid until:** 2026-08-21 (30 days — stable backend stack, no fast-moving dependencies)
**Researcher caveat:** The alembic head correction (`a9b1c2d3e4f5` not `d4e5f6a7b8c9`) should be flagged to the user during planning — it represents a factual discrepancy with CONTEXT.md that needs acknowledgment before the migration is written.
