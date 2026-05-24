# Phase 2: Backend Core - Pattern Map

**Mapped:** 2026-05-24
**Files analyzed:** 9 (4 new, 4 modify, 1 may-modify)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/app/routers/guest.py` | controller | request-response | `backend/app/routers/orders.py` | exact |
| `backend/app/services/guest_service.py` | service | CRUD + request-response | `backend/app/services/order_service.py` | exact |
| `backend/app/schemas/guest.py` | schema | request-response | `backend/app/schemas/order.py` | exact |
| `backend/app/main.py` | config | — | `backend/app/main.py` (lines 62-77) | self-modify |
| `backend/app/integrations/feishu.py` | integration | request-response | `backend/app/integrations/feishu.py` (lines 82-188) | self-modify |
| `backend/app/services/order_service.py` | service | CRUD | `backend/app/services/order_service.py` (lines 167-227) | self-modify |
| `backend/app/services/dish_service.py` | service | CRUD | `backend/app/services/dish_service.py` (lines 48-112) | self-modify |
| `backend/tests/test_guest.py` | test | request-response | `backend/tests/test_orders.py` | exact |
| `backend/tests/conftest.py` | config | — | `backend/tests/conftest.py` | self-modify |

## Pattern Assignments

### `backend/app/routers/guest.py` (controller, request-response)

**Analog:** `backend/app/routers/orders.py`

**Imports pattern** (orders.py lines 1-22):
```python
"""
家味 · Family Chef - 订单管理路由
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token
from app.schemas.order import OrderCreate, OrderStatusUpdate, OrderListResponse, OrderDetailResponse, OrderItemResponse
from app.schemas.common import PageResponse
from app.services.order_service import order_service
from app.middleware.logging import log_action
from app.models.user import User
from app.models.order import Order
from app.models.dish import Dish
from app.models.dish import DishChef
from app.models.preference import TastePreference
from app.models.ingredient import Ingredient

router = APIRouter()
```

**Key adaptation for guest router:**
- Import `require_role` from `app.routers.auth` (for invitation creation endpoints)
- Do NOT import `get_current_user_from_token` for guest-facing endpoints
- Import `guest_service` from `app.services.guest_service`
- Import `dish_service` from `app.services.dish_service` (for dish listing)
- Import guest schemas from `app.schemas.guest`

**Auth pattern — authenticated endpoint** (auth.py lines 123-131):
```python
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
Apply to: `POST /invitations` — use `Depends(require_role("chef", "user"))`

**Auth pattern — public endpoint (no JWT)** — use only `Depends(get_db)`, validate via path parameter `token`:
```python
@router.get("/{token}/dishes", response_model=PageResponse[DishListResponse])
async def guest_list_dishes(
    token: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
```

**Core POST handler pattern** (orders.py lines 89-116):
```python
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """创建订单（自动按厨师拆单）"""
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="订单不能为空",
        )

    try:
        orders = await order_service.create_order_auto_split(db, order_data, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    await db.commit()
    
    results = []
    for order in orders:
        results.append(await build_order_detail(db, order))
    
    return results
```

**Error handling pattern** (orders.py lines 104-108):
```python
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
```
Apply to: All endpoints that call service methods which may raise ValueError.

**Paginated GET handler pattern** (dishes.py lines 28-86):
```python
@router.get("", response_model=PageResponse[DishListResponse])
async def list_dishes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    # ... more query params ...
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """菜品列表（支持搜索和筛选）"""
    from app.utils.pagination import PaginationParams

    params = PaginationParams(page=page, page_size=page_size)

    # ... call service ...
    dishes, total = await dish_service.list_dishes(db, params, ...)

    # ... build response items ...
    items = []
    for d in dishes:
        resp = DishListResponse.model_validate(d)
        items.append(resp)

    return PageResponse[DishListResponse](
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
```
Apply to: `GET /{token}/dishes` — same pattern but without auth, with token validation first.

---

### `backend/app/services/guest_service.py` (service, CRUD + request-response)

**Analog:** `backend/app/services/order_service.py`

**Service class pattern** (order_service.py lines 21-22, 433-434):
```python
class OrderService:
    """订单服务"""

    @staticmethod
    async def create_order(
        db: AsyncSession,
        order_data: OrderCreate,
        user_id: int,
    ) -> Order:
        ...

# 全局订单服务实例
order_service = OrderService()
```
Apply to: `GuestService` class with `@staticmethod` methods, module-level `guest_service = GuestService()` singleton.

**Imports pattern** (order_service.py lines 1-18):
```python
"""
家味 · Family Chef - 订单服务
"""

from datetime import datetime
from typing import Optional, List
import uuid
from sqlalchemy import select, and_, or_, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.order import Order, OrderItem
from app.models.dish import Dish, DishIngredient, DishChef
from app.models.ingredient import Ingredient
from app.models.user import User
from app.models.preference import TastePreference
from app.schemas.order import OrderCreate, OrderItemCreate
from app.utils.pagination import PaginationParams
```

**Guest service key adaptations:**
- Import `GuestInvitation` from `app.models.guest_invitation`
- Import `uuid` for UUID4 token generation
- Import `datetime` and `timedelta` for expiry handling
- Query guest user by `username == "__guest__"` (see initial_data.py lines 38-57)
- Call `OrderService.generate_order_no(db)` for order number generation
- Lazy expiry: check `expires_at < datetime.now()` on every token lookup

**Order creation pattern** (order_service.py lines 43-90):
```python
    @staticmethod
    async def create_order(
        db: AsyncSession,
        order_data: OrderCreate,
        user_id: int,
    ) -> Order:
        """创建订单"""
        # 验证菜品存在且已上架
        dish_ids = [item.dish_id for item in order_data.items]
        result = await db.execute(
            select(Dish).where(
                and_(
                    Dish.id.in_(dish_ids),
                    Dish.status == "enabled",
                )
            )
        )
        valid_dishes = {d.id: d for d in result.scalars().all()}

        invalid_ids = set(dish_ids) - set(valid_dishes.keys())
        if invalid_ids:
            raise ValueError(f"以下菜品不存在或未上架: {', '.join(map(str, invalid_ids))}")

        # 生成订单号
        order_no = await OrderService.generate_order_no(db)

        # 创建订单
        order = Order(
            order_no=order_no,
            user_id=user_id,
            status="pending",
            notes=order_data.notes,
            meal_date=order_data.meal_date,
            meal_type=order_data.meal_type,
            chef_id=order_data.chef_id,
        )
        db.add(order)
        await db.flush()

        # 创建订单项
        for item_data in order_data.items:
            order_item = OrderItem(
                order_id=order.id,
                dish_id=item_data.dish_id,
                quantity=item_data.quantity,
                special_notes=item_data.special_notes,
            )
            db.add(order_item)
```
Apply to: Guest order creation — simplified version with pre-bound `chef_id` from invitation, `user_id` = guest user ID, and `guest_invitation_id` set. Use `flush()` + `refresh()` pattern. Commit is handled by `get_db` dependency.

**Notification pattern** (order_service.py lines 167-226):
```python
    @staticmethod
    async def notify_order(db, order, user_id):
        """发送飞书通知"""
        try:
            from app.integrations.feishu import feishu_client
            # ... build notification_data dict ...
            notification_data = {
                "order_no": order.order_no,
                "status": order.status,
                "user_name": user_name,
                "items": items_info,
                "ingredients": all_ingredients,
                "meal_date": str(order.meal_date) if order.meal_date else "",
                "meal_type": order.meal_type or "",
                "dislikes": dislikes,
                "allergies": allergies,
            }
            # ... send ...
            if chef and chef.feishu_open_id:
                await feishu_client.send_order_notification(chef.feishu_open_id, notification_data)
        except Exception as e:
            print(f"⚠️ 飞书通知发送失败：{e}")
```
Apply to: Guest order notification — same pattern but add `"is_guest": True` and `"user_name": "访客"` to notification_data. Skip dislikes/allergies (guest has no preferences).

---

### `backend/app/schemas/guest.py` (schema, request-response)

**Analog:** `backend/app/schemas/order.py`

**Schema file pattern** (order.py lines 1-73):
```python
"""订单 Schema"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

class OrderItemCreate(BaseModel):
    """订单项创建请求"""
    dish_id: int
    quantity: int = 1
    special_notes: Optional[str] = None
    chef_id: Optional[int] = None

class OrderCreate(BaseModel):
    """创建订单请求"""
    items: List[OrderItemCreate]
    notes: Optional[str] = None
    meal_date: Optional[date] = None
    meal_type: Optional[str] = None
    chef_id: Optional[int] = None

# ... Response schemas with class Config: from_attributes = True ...
```

**Key schemas to create for guest module:**
- `GuestInvitationCreate` — Optional `chef_id: Optional[int] = None` (chef doesn't need it, user must provide it)
- `GuestInvitationResponse` — `id`, `token`, `chef_id`, `status`, `expires_at`, `created_at`
- `GuestOrderCreate` — `items: List[GuestOrderItemCreate]`, `notes: Optional[str]`, `meal_date: Optional[date]`, `meal_type: Optional[str]`
- `GuestOrderItemCreate` — `dish_id: int`, `quantity: int = 1`, `special_notes: Optional[str] = None`
- `GuestOrderSummaryResponse` — For used link display (order_no, items, status, created_at)

**Pydantic V2 config pattern** (order.py lines 34-35):
```python
    class Config:
        from_attributes = True
```

---

### `backend/app/main.py` (config, modify)

**Router registration pattern** (main.py lines 62-77):
```python
# 注册路由
from app.routers import auth, users, dishes, orders, ingredients, categories, favorites, preferences, chefs, admin, feishu, tools, upload

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/users", tags=["用户管理"])
app.include_router(dishes.router, prefix="/api/dishes", tags=["菜品管理"])
app.include_router(orders.router, prefix="/api/orders", tags=["订单管理"])
app.include_router(ingredients.router, prefix="/api/ingredients", tags=["食材管理"])
app.include_router(categories.router, prefix="/api/categories", tags=["分类管理"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["收藏管理"])
app.include_router(preferences.router, prefix="/api/preferences", tags=["口味偏好"])
app.include_router(chefs.router, prefix="/api/chefs", tags=["厨师管理"])
app.include_router(admin.router, prefix="/api/admin", tags=["系统管理"])
app.include_router(feishu.router, prefix="/api/feishu", tags=["飞书集成"])
app.include_router(tools.router, prefix="/api/tools", tags=["工具"])
app.include_router(upload.router, prefix="/api/upload", tags=["文件上传"])
```

**Modification needed:** Add after line 68 (after orders router):
```python
from app.routers import guest
app.include_router(guest.router, prefix="/api/guest", tags=["访客邀请"])
```

---

### `backend/app/integrations/feishu.py` (integration, modify)

**Current send_order_notification signature** (feishu.py lines 82-86):
```python
    async def send_order_notification(
            self,
            receive_id: str,
            data: dict,
        ) -> bool:
```

**Current header construction** (feishu.py lines 170-179):
```python
        card_content = {
            "config": {
                "wide_screen_mode": True,
            },
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": f"📋 订单 {order_no}",
                },
                "template": "blue",
            },
            "elements": elements,
        }
```

**Modification needed (D-08/D-09):**
After line 88, extract `is_guest`:
```python
        is_guest = data.get("is_guest", False)
```

Modify header (around line 174-178):
```python
        if is_guest:
            header_content = f"📋 订单 {order_no}【访客订单】"
            header_template = "orange"
        else:
            header_content = f"📋 订单 {order_no}"
            header_template = "blue"
```

And override `user_name` when `is_guest`:
```python
        if is_guest:
            user_name = "访客"
```

This is backwards-compatible — existing callers don't pass `is_guest`, so `data.get("is_guest", False)` returns `False`.

---

### `backend/app/services/order_service.py` (service, modify)

**Bug location — notify_order call** (order_service.py line 163):
```python
            await OrderService.notify_order(db, order, user_id)
```

**Current notify_order signature** (order_service.py lines 167-168):
```python
    @staticmethod
    async def notify_order(db, order, user_id):
        """发送飞书通知"""
```

**Bug description:** The CONTEXT.md mentions `order_service.py:347` has a call signature mismatch — 4 positional args but method expects `(self, receive_id, data: dict)`. However, reviewing the actual code at line 163, the call is `notify_order(db, order, user_id)` which matches the static method signature `notify_order(db, order, user_id)`. The bug is that `notify_order` internally calls `feishu_client.send_order_notification(chef.feishu_open_id, notification_data)` correctly (line 224). The CONTEXT.md D-08 description may refer to a different version or a different call site. The planner should verify the exact bug location before fixing.

**Key code to reuse — generate_order_no** (order_service.py lines 24-40):
```python
    @staticmethod
    async def generate_order_no(db: AsyncSession) -> str:
        """生成订单号（ORD + 日期 + 序号），含冲突重试"""
        today = datetime.now().strftime("%Y%m%d")
        for _ in range(5):
            result = await db.execute(
                select(func.count(Order.id)).where(Order.order_no.like(f"ORD{today}%"))
            )
            count = result.scalar() or 0
            seq = str(count + 1).zfill(4)
            order_no = f"ORD{today}{seq}"
            existing = await db.execute(
                select(Order.id).where(Order.order_no == order_no)
            )
            if not existing.scalar_one_or_none():
                return order_no
        return f"ORD{today}{uuid.uuid4().hex[:8].upper()}"
```
Call this directly from `GuestService.submit_guest_order()` — no modification needed.

---

### `backend/app/services/dish_service.py` (service, may-modify)

**Relevant: list_dishes with DishChef filter** (dish_service.py lines 71-112):
```python
        if status_filter and status_filter != "all":
            query = query.where(Dish.status == status_filter)
        elif not status_filter:
            query = query.where(
                Dish.status == "enabled",
                Dish.is_semifinished == False,
                exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.status == "published")
                    )
                ),
            )

        # ... is_semifinished filter ...

        # 厨师绑定筛选
        if chef_filter == "my-published" and user_id:
            query = query.where(
                exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.chef_id == user_id, DishChef.status == "published")
                    )
                )
            )
        elif chef_filter == "my-hidden" and user_id:
            # ...
        elif chef_filter == "not-yet-published" and user_id:
            # ...
```

**Modification option (RESEARCH.md Open Question 1):** Add `target_chef_id: Optional[int] = None` parameter to `list_dishes()`. When provided, add:
```python
        if target_chef_id:
            query = query.where(
                exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.chef_id == target_chef_id, DishChef.status == "published")
                    )
                )
            )
```
Also add same condition to `count_query`. This is the cleanest way to reuse existing dish listing logic for guest access.

**Alternative:** Write a simplified query directly in `GuestService` that only filters by `chef_id + DishChef.status="published"` without all the other filter parameters.

---

### `backend/tests/test_guest.py` (test, request-response)

**Analog:** `backend/tests/test_orders.py`

**Test file pattern** (test_orders.py lines 1-43):
```python
"""
家味 · Family Chef - 订单模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.fixture
async def sample_dish(client: AsyncClient, admin_token: str) -> int:
    """创建示例菜品"""
    response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "测试菜品",
            "description": "用于订单测试",
            "status": "published",
        }
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_create_order(client: AsyncClient, user_token: str, sample_dish: int):
    """测试创建订单"""
    response = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [
                {"dish_id": sample_dish, "quantity": 2}
            ],
            "notes": "少放辣",
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert "order_no" in data
```

**Test patterns for guest module:**
- **Fixtures:** Create `sample_invitation` fixture that creates an invitation via authenticated endpoint, returns token
- **Auth'd tests:** Use `chef_token` / `user_token` for invitation creation endpoints
- **Public tests:** No auth headers — pass `token` as path parameter
- **Test cases:** Create invitation (chef), create invitation (user with chef_id), list dishes as guest, submit guest order, reject double submission, expired invitation rejection

**Test for guest user fixture (new):** Need a fixture to create the `__guest__` virtual user in test DB:
```python
@pytest.fixture
async def guest_user():
    """创建虚拟访客用户"""
    from app.models.user import User
    from app.utils.security import hash_password
    async with test_session_factory() as session:
        guest = User(
            username="__guest__",
            password_hash=hash_password("test-placeholder"),
            display_name="访客",
            role="user",
            is_active=False,
            force_pwd_change=False,
        )
        session.add(guest)
        await session.commit()
        return guest.id
```

---

### `backend/tests/conftest.py` (config, modify)

**Current setup_database imports** (conftest.py lines 42-54):
```python
    from app.database import Base
    
    # 导入所有模型
    from app.models.user import User
    from app.models.ingredient import Ingredient, IngredientAlias
    from app.models.category import Category
    from app.models.dish import Dish, DishIngredient, DishCategory
    from app.models.order import Order, OrderItem
    from app.models.favorite import Favorite
    from app.models.preference import TastePreference
    from app.models.schedule import ChefSchedule
    from app.models.log import SystemLog
```

**Modification needed:** Add after line 53:
```python
    from app.models.guest_invitation import GuestInvitation
```

**Current clean_all_tables** (conftest.py lines 60-81):
```python
async def clean_all_tables():
    """清理所有表数据"""
    async with test_engine.connect() as conn:
        await conn.execute(text("PRAGMA foreign_keys = OFF"))
        tables = [
            "order_items",
            "orders",
            "dish_categories",
            # ... other tables ...
            "users",
        ]
```

**Modification needed:** Add `"guest_invitations"` to tables list, before `"orders"` (since orders have FK to guest_invitations):
```python
        tables = [
            "order_items",
            "orders",
            "guest_invitations",   # Add here — before users, after orders
            # ...
        ]
```

---

## Shared Patterns

### Authentication — require_role
**Source:** `backend/app/routers/auth.py` lines 123-131
**Apply to:** `POST /api/guest/invitations` (invitation creation endpoint)
```python
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

### No Authentication — Token Path Parameter
**Source:** New pattern for this phase
**Apply to:** `GET /{token}/dishes`, `POST /{token}/orders`, `GET /{token}/summary`
```python
# 访客端点只使用 get_db 依赖，不使用 get_current_user_from_token
# 通过路径参数 token 验证身份
@router.get("/{token}/dishes")
async def guest_list_dishes(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    invitation = await guest_service.validate_invitation(db, token)
    # ... proceed with invitation.chef_id
```

### Error Handling — Service → Router
**Source:** All existing routers (orders.py, dishes.py)
**Apply to:** All guest router endpoints
```python
    try:
        result = await guest_service.some_method(db, ...)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
```

### Database Session — get_db with auto-commit/rollback
**Source:** `backend/app/database.py`
**Apply to:** All endpoints — `Depends(get_db)` handles commit on success, rollback on exception. No explicit `db.commit()` needed in router code (though some existing routers do call it explicitly — see orders.py line 110).

### Pagination
**Source:** `backend/app/utils/pagination.py` + dishes.py router
**Apply to:** `GET /{token}/dishes` endpoint
```python
    from app.utils.pagination import PaginationParams
    params = PaginationParams(page=page, page_size=page_size)
    # ... pass to service ...
    return PageResponse[DishListResponse](
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
```

### Service Static Method + Module Singleton
**Source:** All existing services (order_service.py, dish_service.py)
**Apply to:** `GuestService`
```python
class GuestService:
    """访客邀请服务"""
    
    @staticmethod
    async def method_name(db: AsyncSession, ...) -> ReturnType:
        ...

# 全局访客邀请服务实例
guest_service = GuestService()
```

### Feishu Notification — Try/Except with Silent Failure
**Source:** `backend/app/services/order_service.py` lines 225-226
**Apply to:** Guest order notification in GuestService
```python
        try:
            # ... build and send notification ...
        except Exception as e:
            print(f"⚠️ 飞书通知发送失败：{e}")
```

### Virtual Guest User Lookup
**Source:** `backend/app/initial_data.py` lines 38-57
**Apply to:** GuestService — every time guest user ID is needed
```python
    result = await db.execute(
        select(User).where(User.username == "__guest__")
    )
    guest_user = result.scalar_one_or_none()
    if not guest_user:
        raise ValueError("虚拟访客用户不存在，请联系管理员初始化系统")
```
**Do NOT hardcode the guest user ID** — it's an autoincrement value that varies by environment.

## No Analog Found

All files have strong analogs in the existing codebase. No files require external pattern references.

| File | Role | Data Flow | Note |
|------|------|-----------|------|
| — | — | — | All files have analogs |

## Metadata

**Analog search scope:** `backend/app/routers/`, `backend/app/services/`, `backend/app/schemas/`, `backend/app/models/`, `backend/app/integrations/`, `backend/tests/`, `backend/app/utils/`
**Files scanned:** 15
**Pattern extraction date:** 2026-05-24
