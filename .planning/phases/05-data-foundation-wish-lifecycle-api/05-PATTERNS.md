# Phase 5: Data Foundation & Wish Lifecycle API - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 7 (4 new + 1 migration + 2 small edits + 1 optional test)
**Analogs found:** 7 / 7 (every file has a direct precedent)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/app/models/wish.py` (NEW) | model | CRUD / state machine | `backend/app/models/order.py` + `backend/app/models/guest_invitation.py` | **exact** (status lifecycle + composite indexes) |
| `backend/app/schemas/wish.py` (NEW) | schema | request-response / validation | `backend/app/schemas/order.py` | **role-match** (Pydantic v1-style `Config` vs research's recommended v2 `ConfigDict`) |
| `backend/app/services/wish_service.py` (NEW) | service | CRUD + state machine + atomic UPDATE | `backend/app/services/order_service.py` | **exact** (singleton + `valid_transitions` + ValueError + `selectinload`) |
| `backend/app/routers/wishes.py` (NEW) | router (controller) | request-response | `backend/app/routers/orders.py` + `backend/app/routers/guest.py` | **exact** (FastAPI `APIRouter` + `require_role` + flatten pattern) |
| `backend/alembic/versions/<rev>_add_wishes_table.py` (NEW) | migration | DDL | `backend/alembic/versions/a9b1c2d3e4f5_add_guest_invitations_table_and_guest.py` | **exact** (additive `create_table` + `create_index`) |
| `backend/app/models/__init__.py` (EDIT) | config / barrel | n/a | self (existing `__all__` list) | **exact** |
| `backend/app/main.py` (EDIT) | config | n/a | `app.include_router(...)` block | **exact** |
| `backend/tests/test_wishes.py` (NEW, optional) | test | request-response | `backend/tests/test_orders.py` | **role-match** (assumed; not read in this pass) |

---

## Pattern Assignments

### `backend/app/models/wish.py` (model, state machine)

**Analogs (combine both):** `backend/app/models/order.py` (status + dual FK to `users.id` + timestamps) **AND** `backend/app/models/guest_invitation.py` (lifecycle table with composite `Index` in `__table_args__`).

**Imports pattern** — copy verbatim from `order.py` lines 1-5:
```python
"""愿望单模型"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
```

**Status-as-String pattern (D-11)** — from `order.py:14` and `guest_invitation.py:21`:
```python
# order.py:14
status = Column(String(20), nullable=False, default="pending")
# guest_invitation.py:21
status = Column(String(20), nullable=False, default="active")
```
**For Wish:** `status = Column(String(20), nullable=False, default="待处理")` — no Python Enum, no SQLAlchemy `Enum` type, no DB-level CHECK (D-11).

**Dual FK to users.id pattern** — from `order.py:13,15` and `guest_invitation.py:19-20`:
```python
# order.py:13,15
user_id = Column(Integer, ForeignKey("users.id"), nullable=False)   # submitter
chef_id = Column(Integer, ForeignKey("users.id"))                   # nullable, set later
# + explicit foreign_keys=[...] on relationship (order.py:25-26)
user = relationship("User", foreign_keys=[user_id])
chef = relationship("User", foreign_keys=[chef_id])
```
**For Wish:** three relationships — `submitter` (FK `user_id`), `claimer` (FK `claimed_by_chef_id`), `related_dish` (FK `related_dish_id` to `dishes.id`). Each MUST pass `foreign_keys=[...]` to disambiguate the two User FKs (order.py:25-26 shows the convention).

**Composite Index pattern** — from `guest_invitation.py:10-15`:
```python
__table_args__ = (
    Index("uq_guest_invitations_token", "token", unique=True),
    Index("ix_guest_invitations_inviter_id", "inviter_id"),
    Index("ix_guest_invitations_expires_at", "expires_at"),
    Index("ix_guest_invitations_status_expires_at", "status", "expires_at"),
)
```
**For Wish** (per CONTEXT.md specifics line 144 — 4 indexes, composite covers chef queue):
```python
__table_args__ = (
    Index("ix_wishes_user_id", "user_id"),
    Index("ix_wishes_status", "status"),
    Index("ix_wishes_claimed_by_chef_id", "claimed_by_chef_id"),
    Index("ix_wishes_status_chef", "status", "claimed_by_chef_id"),
)
```

**Timestamps pattern** — from `order.py:19-20`:
```python
created_at = Column(DateTime, nullable=False, server_default=func.now())
updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
```

**Lazy-fail FK pattern (D-10)** — `related_dish_id = Column(Integer, ForeignKey("dishes.id"))` — **no** `ondelete="CASCADE"` or `"SET NULL"`. Note contrast with `order.py:33` (`ondelete="CASCADE"` on order_items) — D-10 explicitly forbids cascade on `related_dish_id` to preserve "惰性过期".

---

### `backend/app/schemas/wish.py` (schema, request-response validation)

**Analog:** `backend/app/schemas/order.py` (existing v1-style pattern) **BUT** research recommends Pydantic v2 `ConfigDict` — planner should use the v2 style per RESEARCH.md code example lines 530-594.

**Imports pattern** — from `order.py:1-4`, upgraded to v2 per RESEARCH recommendation:
```python
"""愿望单 Schema"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
```

**Schema separation pattern (Create/Update/Response)** — from `order.py`:
- `OrderItemCreate` (lines 6-11) → bare `BaseModel` with typed fields
- `OrderCreate` (lines 13-19) → composes `List[...]`
- `OrderStatusUpdate` (line 21-23) → single-field update DTO
- `OrderListResponse` (lines 44-56) + `OrderDetailResponse` (lines 58-76) → two response shapes

**For Wish** — per RESEARCH.md lines 539-594, produce 7 schemas:
- `WishBase` (abstract base: `dish_name`, `reference_url`, `note`)
- `WishCreate(WishBase)` — submit
- `WishUpdate` — all-optional edit window (D-06)
- `WishAdvance` — `related_dish_id: int` (D-09)
- `WishReject` — `reject_reason: str = Field(..., min_length=1)` (FLOW-04 required reason)
- `WishResponse` — full row; uses `model_config = ConfigDict(from_attributes=True)`
- `WishListResponse(WishResponse)` — adds `submitter_name`, `claimed_by_chef_name` (flattened at router)
- `WishDetailResponse(WishResponse)` — adds flatten fields + `related_dish_name`

**Pydantic v2 ORM config** — note `order.py` uses **v1 style**:
```python
# order.py:34-35 (LEGACY v1 style — DO NOT COPY)
class Config:
    from_attributes = True
```
```python
# RESEARCH recommendation (Pydantic v2 — PREFERRED for new code)
model_config = ConfigDict(from_attributes=True)
```
Both work with the installed Pydantic 2.13.4; planner should prefer v2 style for new file per "State of the Art" (RESEARCH.md lines 1011-1013).

**Field constraints (V5 Input Validation)** — use `Field(..., min_length=1, max_length=100)` per RESEARCH.md examples (lines 540-542, 563). Existing `order.py` schemas omit constraints — Wish schemas should be **stricter** than Order schemas (security review requires it, RESEARCH.md § Security Domain V5).

---

### `backend/app/services/wish_service.py` (service, state machine + atomic UPDATE)

**Analog:** `backend/app/services/order_service.py` (direct template for everything: imports, singleton, `valid_transitions`, ownership check, ValueError, `selectinload`, lazy Feishu import).

**Imports pattern** — copy block from `order_service.py:1-18`, adapt:
```python
"""
家味 · Family Chef - 愿望单服务
"""
from typing import Optional, List
from sqlalchemy import select, or_, func, update        # + `update` for atomic claim (D-01)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.wish import Wish
from app.models.dish import Dish, DishChef               # DishChef for D-09 advance validation
from app.models.user import User
from app.schemas.wish import WishCreate, WishUpdate, WishAdvance, WishReject
from app.utils.pagination import PaginationParams
```

**Singleton + @staticmethod pattern** — from `order_service.py:21-24` + `435-436`:
```python
class OrderService:
    """订单服务"""

    @staticmethod
    async def create_order(db: AsyncSession, order_data: OrderCreate, user_id: int) -> Order:
        ...

# 全局订单服务实例
order_service = OrderService()
```
**For Wish:** `class WishService:` + `wish_service = WishService()` at module bottom. **Signature change:** pass `current_user: User` instead of `user_id: int` (RESEARCH.md pattern 1, lines 265-280; needed because role-aware logic in `list_wishes` and ownership checks both need the full User).

**State machine pattern (D-12)** — copy from `order_service.py:295-321` verbatim structure:
```python
# order_service.py:302-308
valid_transitions = {
    "pending": ["accepted", "cooking", "cancelled"],
    "accepted": ["cooking", "cancelled"],
    "cooking": ["completed"],
    "completed": [],
    "cancelled": [],
}

# order_service.py:316-321 (error message format)
allowed = valid_transitions.get(order.status, [])
if status not in allowed:
    raise ValueError(
        f"无效的状态转换: {order.status} -> {status}，"
        f"允许的状态: {', '.join(allowed) if allowed else '无'}"
    )
```
**For Wish** — D-12 transitions table:
```python
valid_transitions = {
    "待处理":   ["准备中", "已撤销"],
    "准备中":   ["已上架", "已拒绝", "已撤销"],
    "已上架":   [],
    "已拒绝":   [],
    "已撤销":   [],
}
```

**Ownership check + ValueError pattern** — from `order_service.py:372-400` (`cancel_order`):
```python
# order_service.py:385-394
order = result.scalar_one_or_none()
if not order:
    return None                              # router -> 404

# 权限检查：只能取消自己的订单
if order.user_id != user_id:
    raise ValueError("无权取消此订单")         # router -> 400

# 状态检查：只能取消 pending 状态的订单
if order.status != "pending":
    raise ValueError(f"无法取消状态为 '{order.status}' 的订单")
```
**For Wish:** mirror exactly — `get_wish_by_id` returns `None` for both "not found" AND "no permission" (D-03 → 404). For mutate operations, raise `WishPermissionError(ValueError)` for already-claimed cases (D-04 → 403).

**`selectinload` eager-loading pattern** — from `order_service.py:235-242`:
```python
result = await db.execute(
    select(Order)
    .options(
        selectinload(Order.items),
        selectinload(Order.chef),
    )
    .where(Order.id == order_id)
)
```
**For Wish:** `.options(selectinload(Wish.submitter), selectinload(Wish.claimer))` on every list and detail query (Pitfall 3 — N+1 prevention). Add `selectinload(Wish.related_dish)` on detail query only.

**flush + refresh pattern** — from `order_service.py:329-330` and `397-398`:
```python
order.status = status
await db.flush()
await db.refresh(order)
```
Commit is **not** called in service — router calls `await db.commit()` after service returns (see router pattern below; Pitfall 6).

**Role-aware list query pattern** — from `order_service.py:246-293` (`list_orders`):
```python
# order_service.py:257-265 — chef visibility (unassigned OR assigned-to-me)
if chef_id:
    query = query.where(
        or_(Order.chef_id == None, Order.chef_id == chef_id)
    )

# order_service.py:274-286 — count query must mirror filter exactly
count_query = select(func.count(Order.id))
if user_id:
    count_query = count_query.where(Order.user_id == user_id)
```
**For Wish (D-05)** — replace chef visibility with the more nuanced rule:
```python
if current_user.role == "admin":
    pass  # admin sees all
elif current_user.role == "chef":
    if mine:
        query = query.where(Wish.claimed_by_chef_id == current_user.id)
    else:
        query = query.where(
            or_(Wish.status == "待处理", Wish.claimed_by_chef_id == current_user.id)
        )
else:  # regular user
    query = query.where(Wish.user_id == current_user.id)
```
**Apply identical filters to `count_query`** — forgetting this is the most common bug in this pattern.

**Atomic conditional UPDATE pattern (D-01) — NEW, no direct analog in order_service:**
```python
from sqlalchemy import update
result = await db.execute(
    update(Wish)
    .where(Wish.id == wish_id, Wish.status == "待处理")
    .values(status="准备中", claimed_by_chef_id=current_user.id)
)
if result.rowcount == 0:
    # Disambiguate "not found" vs "already claimed"
    existing = await db.execute(select(Wish.id).where(Wish.id == wish_id))
    if existing.scalar_one_or_none() is None:
        return None  # -> 404 (D-03)
    raise ValueError("该愿望已被认领或状态已变更")  # -> 400 (D-02)
```
**Note:** This is the **only** significant departure from order_service patterns. The disambiguation second-query mirrors `order_service.cancel_order` lines 384-394 (existence check before permission check). See RESEARCH.md Code Examples lines 596-644 for the full `claim_wish` skeleton.

**`WishPermissionError(ValueError)` subclass (D-04) — NEW pattern:**
```python
class WishPermissionError(ValueError):
    """愿望权限错误 — router 转 403 (D-04). Subclasses ValueError so generic
    `except ValueError` still catches it as a fallback."""
    pass
```
Export from `wish_service.py` so router can `from app.services.wish_service import wish_service, WishPermissionError`. This is RESEARCH.md Assumption A1 (LOW risk).

**Lazy Feishu import pattern** — from `order_service.py:171, 334` (D-08 explicitly forbids the call but the pattern informs Phase 6 hook):
```python
# order_service.py:170-171 (inline import to avoid circular dep)
try:
    from app.integrations.feishu import feishu_client
    ...
except Exception as e:
    print(f"⚠️ 飞书通知发送失败：{e}")
```
**For Wish Phase 5:** DO NOT import `feishu_client`. Leave placeholder `# Phase 6 hook: notify claiming chef` comment at the tail of each transition method (D-08). Phase 6 will inject the actual `feishu_client.send_*` call here.

---

### `backend/app/routers/wishes.py` (router/controller, request-response)

**Analog (combine both):** `backend/app/routers/orders.py` (full CRUD pattern + error conversion + commit placement) **AND** `backend/app/routers/guest.py` (flatten response pattern at router layer).

**Imports pattern** — copy block from `orders.py:1-23`, adapt:
```python
"""
家味 · Family Chef - 愿望单路由
"""
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
```

**Router instance pattern** — from `orders.py:23` and `guest.py:26`:
```python
router = APIRouter()
```
Mounted in `main.py` via `app.include_router(wishes_router.router, prefix="/api/wishes", tags=["愿望单"])`.

**Dependency injection pattern** — from `orders.py:91-96`:
```python
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
```
**For Wish:** identical shape. Mutate endpoints (claim/advance/reject) use `current_user: User = Depends(require_role("chef", "admin"))` instead — see `guest.py:32, 51, 83` for `require_role` usage.

**Error conversion pattern (ValueError → HTTPException)** — from `orders.py:104-110`:
```python
try:
    orders = await order_service.create_order_auto_split(db, order_data, current_user.id)
except ValueError as e:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(e),
    )
```
**For Wish — D-04 requires 403 for permission errors:**
```python
try:
    wish = await wish_service.update_wish(db, wish_id, current_user, update_data)
except WishPermissionError as e:                              # 403 FIRST (subclass match)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
except ValueError as e:                                       # 400 generic
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
if not wish:                                                  # service returned None
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="愿望不存在")
```
**Critical:** `WishPermissionError` catch MUST come before generic `ValueError` catch (Python's first-match wins). `WishPermissionError` subclasses `ValueError` so a generic-only catch still works as a fallback.

**Commit placement pattern (Pitfall 6)** — from `orders.py:112, 230, 255`:
```python
# orders.py:112 — commit AFTER service returns, BEFORE response building
await db.commit()
results = []
for order in orders:
    results.append(await build_order_detail(db, order))
```
**For Wish:** every mutate route (`POST ""`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/claim|advance|reject`) ends with:
```python
await db.commit()
await db.refresh(wish)
return WishResponse.model_validate(wish)
```

**Inline role check vs `require_role` dependency** — `orders.py:208-212` does **inline** check; `guest.py:32` uses **`Depends(require_role(...))`**. **For Wish:** prefer `require_role` dependency (cleaner, matches newer guest.py pattern).

**Flatten response pattern** — from `guest.py:66-77` (the canonical example):
```python
# guest.py:66-77
items = []
for inv in invitations:
    inv_data = GuestInvitationListResponse.model_validate(inv)
    inv_data.chef_name = inv.chef.display_name if inv.chef else None
    items.append(inv_data)

return PageResponse[GuestInvitationListResponse](
    total=total,
    page=page,
    page_size=page_size,
    items=items,
)
```
**For Wish — inject both submitter_name and claimed_by_chef_name:**
```python
for w in wishes:
    item = WishListResponse.model_validate(w)
    item.submitter_name = w.submitter.display_name if w.submitter else None
    item.claimed_by_chef_name = w.claimer.display_name if w.claimer else None
    items.append(item)
```
**Requires:** `selectinload(Wish.submitter)` and `selectinload(Wish.claimer)` in the service list query — otherwise this triggers N+1 (Pitfall 3).

**Pagination query params pattern** — from `orders.py:121-127`:
```python
@router.get("", response_model=PageResponse[OrderListResponse])
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="订单状态筛选"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
```
**For Wish** — add `claimed_by_chef_id: Optional[int]` (admin filter) and `mine: bool` (FLOW-05 shortcut) per RESEARCH.md lines 803-808.

**Endpoint path convention** — `orders.py:201` uses `PUT /{id}/status`; `guest.py:80` uses `PUT /{id}/revoke` (explicit action verb). **For Wish:** follow guest.py style — `POST /{id}/claim`, `POST /{id}/advance`, `POST /{id}/reject` — because each takes a different request body shape (RESEARCH.md line 945-948 justifies the choice; this is `## the agent's Discretion`).

---

### `backend/alembic/versions/<rev>_add_wishes_table.py` (migration, DDL)

**Analog:** `backend/alembic/versions/a9b1c2d3e4f5_add_guest_invitations_table_and_guest.py` (the **current head** — RESEARCH caught CONTEXT.md error: head is `a9b1c2d3e4f5`, NOT `d4e5f6a7b8c9`).

**File header pattern** — from `a9b1c2d3e4f5_*.py:1-13`:
```python
"""add guest_invitations table and guest_invitation_id to orders

Revision ID: a9b1c2d3e4f5
Revises: d4e5f6a7b8c9
"""
from alembic import op
import sqlalchemy as sa

revision = "a9b1c2d3e4f5"
down_revision = "d4e5f6a7b8c9"   # chain from previous head
branch_labels = None
depends_on = None
```
**For Wish:**
- `revision = "<autogenerated>"` (let `alembic revision --autogenerate` pick)
- `down_revision = "a9b1c2d3e4f5"` — **CRITICAL** (Pitfall 1: CONTEXT.md line 134 incorrectly says `d4e5f6a7b8c9`; RESEARCH verified `a9b1c2d3e4f5` is the actual head).

**`create_table` pattern** — from `a9b1c2d3e4f5_*.py:17-30`:
```python
op.create_table(
    "guest_invitations",
    sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
    sa.Column("token", sa.String(36), nullable=False),
    sa.Column("inviter_id", sa.Integer(), nullable=False),
    sa.Column("chef_id", sa.Integer(), nullable=False),
    sa.Column("status", sa.String(20), nullable=False, server_default="active"),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.PrimaryKeyConstraint("id"),
    sa.ForeignKeyConstraint(["inviter_id"], ["users.id"]),
    sa.ForeignKeyConstraint(["chef_id"], ["users.id"]),
)
```
**For Wish** — RESEARCH.md lines 733-751 gives the full template. Notable differences:
- `status` server_default is `"待处理"` (Chinese literal, not ASCII) — SQLite stores UTF-8 fine.
- Three FKs: `user_id → users.id`, `claimed_by_chef_id → users.id`, `related_dish_id → dishes.id`.
- **No `ondelete` clause** on `related_dish_id` FK (D-10).

**`create_index` pattern** — from `a9b1c2d3e4f5_*.py:31-34`:
```python
op.create_index("uq_guest_invitations_token", "guest_invitations", ["token"], unique=True)
op.create_index("ix_guest_invitations_inviter_id", "guest_invitations", ["inviter_id"])
op.create_index("ix_guest_invitations_expires_at", "guest_invitations", ["expires_at"])
op.create_index("ix_guest_invitations_status_expires_at", "guest_invitations", ["status", "expires_at"])
```
**For Wish** — 4 indexes (CONTEXT.md specifics line 144):
```python
op.create_index("ix_wishes_user_id", "wishes", ["user_id"])
op.create_index("ix_wishes_status", "wishes", ["status"])
op.create_index("ix_wishes_claimed_by_chef_id", "wishes", ["claimed_by_chef_id"])
op.create_index("ix_wishes_status_chef", "wishes", ["status", "claimed_by_chef_id"])
```

**`downgrade` pattern** — from `a9b1c2d3e4f5_*.py:63-70`:
```python
def downgrade() -> None:
    # reverse order of upgrade()
    op.drop_index("ix_wishes_status_chef", table_name="wishes")
    op.drop_index("ix_wishes_claimed_by_chef_id", table_name="wishes")
    op.drop_index("ix_wishes_status", table_name="wishes")
    op.drop_index("ix_wishes_user_id", table_name="wishes")
    op.drop_table("wishes")
```

**NOT in this migration** (contrast with `a9b1c2d3e4f5`): no `bulk_insert` (Wish has no seed data), no `batch_alter_table` of existing tables (pure additive, no changes to `users`/`dishes`/`orders`).

---

### `backend/app/models/__init__.py` (EDIT — barrel export)

**Analog:** self (existing file, lines 1-29).

**Edit pattern** — append import + add to `__all__`:
```python
# Line 11 (after guest_invitation import):
from app.models.wish import Wish

# Line 26 area (inside __all__ list):
"Wish",
```

---

### `backend/app/main.py` (EDIT — router registration)

**Analog:** existing `app.include_router(...)` block (RESEARCH.md verified at `main.py:279-292`).

**Edit pattern:**
```python
from app.routers import wishes as wishes_router
# ...
app.include_router(wishes_router.router, prefix="/api/wishes", tags=["愿望单"])
```
Follow exact pattern of existing `orders`/`guest` router registrations in the same file.

---

## Shared Patterns

### Authentication & Authorization
**Source:** `backend/app/routers/auth.py:123-132` — `require_role(*roles)` factory
**Apply to:** All Wish mutate endpoints (claim, advance, reject) AND optionally the list endpoint
```python
# auth.py:123-132
def require_role(*roles: str):
    """角色权限检查装饰器"""
    async def role_checker(current_user=Depends(get_current_user_from_token)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要以下角色之一: {', '.join(roles)}",
            )
        return current_user
    return role_checker
```
**Usage in wishes.py:** `current_user: User = Depends(require_role("chef", "admin"))` for `/claim`, `/advance`, `/reject`. Submit/list/detail/cancel use plain `Depends(get_current_user_from_token)` (any authenticated user).

### Error Conversion (ValueError → HTTPException)
**Source:** `backend/app/routers/orders.py:104-110, 218-222, 244-248`
**Apply to:** Every Wish route that calls a service method
```python
try:
    result = await some_service.method(...)
except ValueError as e:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
if not result:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="...不存在")
```
**Wish extension (D-04):** add `except WishPermissionError as e: HTTPException(403)` **before** the generic `except ValueError` — see wishes.py pattern above.

### Visibility / IDOR Protection (D-03)
**Source:** No direct analog — `orders.py:192-196` returns 403 for unauthorized read (INFERIOR pattern). **Wish intentionally diverges:** service returns `None` for both "not found" and "no permission", router converts to 404. Do NOT copy orders.py:192-196.
**Apply to:** `get_wish_by_id`, `update_wish`, `cancel_wish`, `advance_wish`, `reject_wish` service methods.

### DB Session Lifecycle
**Source:** `backend/app/database.py:39-49` (`get_db` dependency — auto commit on success, rollback on exception)
**Apply to:** All Wish routes
```python
# Service does flush + refresh; router does final commit (Pitfall 6)
await db.flush()
await db.refresh(obj)
# ... back in router:
await db.commit()
```
**Critical:** every mutate route (`POST/PUT/DELETE`) MUST end with `await db.commit()` after service returns — see `orders.py:112, 230, 255`.

### Pydantic ORM Conversion (v2)
**Source:** `backend/app/routers/guest.py:68, 97` — canonical `model_validate` + flatten pattern
**Apply to:** All Wish response serialization
```python
item = WishListResponse.model_validate(wish_orm_instance)  # NOT WishListResponse(**dict)
item.submitter_name = wish.submitter.display_name if wish.submitter else None  # flatten derived field
```

### Pagination Convention
**Source:** `backend/app/utils/pagination.py:9-22` + `backend/app/schemas/common.py:18-23`
**Apply to:** `list_wishes` endpoint
```python
params = PaginationParams(page=page, page_size=page_size)
wishes, total = await wish_service.list_wishes(db, params, current_user, ...)
return PageResponse[WishListResponse](total=total, page=page, page_size=page_size, items=items)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/tests/test_wishes.py` | test | request-response | Not analyzed in this pass — RESEARCH.md lines 951-1005 provides a test skeleton derived from `backend/tests/test_orders.py` + `backend/tests/conftest.py`. Planner should treat RESEARCH.md test skeleton as the analog. |
| Atomic conditional UPDATE (`claim_wish`) | service | concurrency-safe UPDATE | **No direct analog in codebase** — `order_service` never needs atomic claim (orders are auto-split, not claimed). RESEARCH.md Pattern 3 (lines 304-324) + Code Examples (lines 596-644) provide the worked example. SQLAlchemy 2.0 `update()` statement API is the only new primitive. |
| `WishPermissionError(ValueError)` exception subclass | service | error classification | **No analog** — codebase currently raises plain `ValueError` for everything. RESEARCH.md Assumption A1 (LOW risk) recommends this thin subclass to distinguish 403 from 400 at router boundary. |

---

## Metadata

**Analog search scope:**
- `backend/app/models/` — `order.py`, `guest_invitation.py`, `__init__.py`
- `backend/app/schemas/` — `order.py`, `common.py`
- `backend/app/services/` — `order_service.py` (primary analog)
- `backend/app/routers/` — `orders.py`, `guest.py`, `auth.py`
- `backend/app/utils/` — `pagination.py`
- `backend/alembic/versions/` — `a9b1c2d3e4f5_*.py` (current head migration)
- `backend/app/main.py` — referenced via RESEARCH.md verification (not re-read)

**Files scanned:** 9 source files + 2 phase input docs (CONTEXT.md + RESEARCH.md)
**Pattern extraction date:** 2026-07-21

**Notes for planner:**
1. **Migration head correction** — RESEARCH caught an error in CONTEXT.md. Use `down_revision = "a9b1c2d3e4f5"`, NOT `d4e5f6a7b8c9`. Run `cd backend && uv run alembic heads` to re-verify at execute time.
2. **Pydantic v1 vs v2 style** — existing `order.py` schemas use v1 `class Config: from_attributes = True`. New Wish schemas should use v2 `model_config = ConfigDict(from_attributes=True)` per RESEARCH.md "State of the Art".
3. **Inline role check vs dependency** — `orders.py:208-212` does inline check; `guest.py:32, 51, 83` uses `Depends(require_role(...))`. Prefer the dependency style (cleaner, newer).
4. **Three notable divergences from Order patterns** (all locked by CONTEXT.md decisions):
   - D-01: atomic UPDATE for claim (no SELECT-then-UPDATE)
   - D-03: 404 for unauthorized reads (not 403 like orders.py:192-196)
   - D-04: `WishPermissionError` → 403 with claimer name (not generic 400)
5. **Phase 6 hooks** — leave `# Phase 6 hook: notify claiming chef` comment placeholders at transition tails (D-08). Do NOT import `feishu_client` in Phase 5.
