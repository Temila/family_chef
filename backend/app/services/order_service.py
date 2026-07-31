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


class OrderService:
    """订单服务"""

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

        await db.flush()
        await db.refresh(order)
        return order

    @staticmethod
    async def create_order_auto_split(
        db: AsyncSession,
        order_data: OrderCreate,
        user_id: int,
    ) -> List[Order]:
        """按厨师自动拆单创建订单"""
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

        chef_result = await db.execute(
            select(DishChef).where(DishChef.dish_id.in_(dish_ids))
        )
        dish_chef_map = {}
        for dc in chef_result.scalars().all():
            dish_chef_map[dc.dish_id] = dc.chef_id

        all_chefs_result = await db.execute(
            select(User).where(User.role == "chef", User.is_active == True)
        )
        all_chefs = {c.id: c for c in all_chefs_result.scalars().all()}

        item_groups = {}
        for item_data in order_data.items:
            chef_id = item_data.chef_id
            if chef_id is None:
                chef_id = dish_chef_map.get(item_data.dish_id)
            if chef_id is None:
                if all_chefs:
                    chef_id = next(iter(all_chefs.keys()))
            item_groups.setdefault(chef_id, []).append(item_data)

        created_orders = []
        for chef_id, items in item_groups.items():
            order_no = await OrderService.generate_order_no(db)
            order = Order(
                order_no=order_no,
                user_id=user_id,
                status="pending",
                notes=order_data.notes,
                meal_date=order_data.meal_date,
                meal_type=order_data.meal_type,
                chef_id=chef_id,
            )
            db.add(order)
            await db.flush()

            for item_data in items:
                db.add(OrderItem(
                    order_id=order.id,
                    dish_id=item_data.dish_id,
                    quantity=item_data.quantity,
                    special_notes=item_data.special_notes,
                ))

            await db.flush()
            await db.refresh(order)
            created_orders.append(order)

            await OrderService.notify_order(db, order, user_id)

        return created_orders

    @staticmethod
    async def notify_order(db, order, user_id):
        """发送飞书通知"""
        try:
            from app.integrations.feishu import feishu_client

            items_result = await db.execute(
                select(OrderItem).where(OrderItem.order_id == order.id)
            )
            order_items = items_result.scalars().all()

            user_result = await db.execute(select(User).where(User.id == user_id))
            order_user = user_result.scalar_one_or_none()
            user_name = order_user.display_name or order_user.username if order_user else "未知用户"

            prefs_result = await db.execute(
                select(TastePreference).where(TastePreference.user_id == user_id)
            )
            prefs = prefs_result.scalars().all()
            ing_ids = list(set(p.ingredient_id for p in prefs if p.ingredient_id))
            ing_map = {}
            if ing_ids:
                ing_result = await db.execute(select(Ingredient).where(Ingredient.id.in_(ing_ids)))
                ing_map = {i.id: i.name for i in ing_result.scalars().all()}
            dislikes = [ing_map.get(p.ingredient_id, '') for p in prefs if p.preference_type == "dislike" and p.ingredient_id in ing_map]
            allergies = [ing_map.get(p.ingredient_id, '') for p in prefs if p.preference_type == "allergy" and p.ingredient_id in ing_map]

            items_info = []
            all_ingredients = []
            for oi in order_items:
                dish_result = await db.execute(
                    select(Dish).options(
                        selectinload(Dish.ingredients).selectinload(DishIngredient.ingredient)
                    ).where(Dish.id == oi.dish_id)
                )
                dish = dish_result.scalar_one_or_none()
                if dish:
                    items_info.append({"name": dish.name, "quantity": oi.quantity})
                    for di in (dish.ingredients or []):
                        if di.ingredient:
                            all_ingredients.append({"name": di.ingredient.name, "quantity": 1, "unit": ""})

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

            chef_result = await db.execute(select(User).where(User.id == order.chef_id))
            chef = chef_result.scalar_one_or_none()
            if chef and chef.feishu_open_id:
                # D-08: verified call signature matches send_order_notification(receive_id, data)
                await feishu_client.send_order_notification(chef.feishu_open_id, notification_data)
        except Exception as e:
            print(f"⚠️ 飞书通知发送失败：{e}")

    @staticmethod
    async def get_order_by_id(
        db: AsyncSession,
        order_id: int,
    ) -> Optional[Order]:
        """根据 ID 获取订单详情"""
        result = await db.execute(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.chef),
            )
            .where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        return order

    @staticmethod
    async def list_orders(
        db: AsyncSession,
        params: PaginationParams,
        user_id: Optional[int] = None,
        chef_id: Optional[int] = None,
        status: Optional[str] = None,
    ) -> tuple[List[Order], int]:
        """查询订单列表"""
        query = select(Order).options(selectinload(Order.items))

        # 用户只能查看自己的订单
        if user_id:
            query = query.where(Order.user_id == user_id)

        # 厨师查看未分配的订单 + 分配给自己的订单
        if chef_id:
            query = query.where(
                or_(Order.chef_id == None, Order.chef_id == chef_id)
            )

        # 状态筛选
        if status:
            query = query.where(Order.status == status)

        # 排序：最新优先
        query = query.order_by(Order.created_at.desc())

        # 获取总数
        count_query = select(func.count(Order.id))
        if user_id:
            count_query = count_query.where(Order.user_id == user_id)
        if chef_id:
            count_query = count_query.where(
                or_(Order.chef_id == None, Order.chef_id == chef_id)
            )
        if status:
            count_query = count_query.where(Order.status == status)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # 分页
        query = query.offset(params.offset).limit(params.limit)
        result = await db.execute(query)
        orders = result.scalars().all()

        return orders, total

    @staticmethod
    async def update_order_status(
        db: AsyncSession,
        order_id: int,
        status: str,
    ) -> Optional[Order]:
        """更新订单状态"""
        valid_transitions = {
            "pending": ["accepted", "cooking", "cancelled"],
            "accepted": ["cooking", "cancelled"],
            "cooking": ["completed"],
            "completed": [],
            "cancelled": [],
        }

        result = await db.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            return None

        # 验证状态流转
        allowed = valid_transitions.get(order.status, [])
        if status not in allowed:
            raise ValueError(
                f"无效的状态转换: {order.status} -> {status}，"
                f"允许的状态: {', '.join(allowed) if allowed else '无'}"
            )

        order.status = status

        # 记录完成时间
        if status == "completed":
            order.completed_at = datetime.now()

        await db.flush()
        await db.refresh(order)

        # 触发飞书通知（异步）
        try:
            from app.integrations.feishu import feishu_client
            # 获取用户信息
            user_result = await db.execute(
                select(User).where(User.id == order.user_id)
            )
            user = user_result.scalar_one_or_none()
            
            # 获取菜品信息
            items_info = []
            for item in order.items:
                dish_result = await db.execute(
                    select(Dish).where(Dish.id == item.dish_id)
                )
                dish = dish_result.scalar_one_or_none()
                if dish:
                    items_info.append({
                        "name": dish.name,
                        "quantity": item.quantity,
                    })
            
            # 通知用户
            if user and user.feishu_open_id:
                notification_data = {
                    "order_no": order.order_no,
                    "status": order.status,
                    "user_name": user.display_name or user.username,
                    "items": items_info,
                }
                # D-08: verified call signature matches send_order_notification(receive_id, data)
                await feishu_client.send_order_notification(
                    user.feishu_open_id,
                    notification_data,
                )
        except Exception as e:
            print(f"⚠️ 飞书通知发送失败：{e}")

        return order

    @staticmethod
    async def cancel_order(
        db: AsyncSession,
        order_id: int,
        user_id: int,
    ) -> Optional[Order]:
        """取消订单（仅用户可取消 pending 状态）"""
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            return None

        # 权限检查：只能取消自己的订单
        if order.user_id != user_id:
            raise ValueError("无权取消此订单")

        # 状态检查：只能取消 pending 状态的订单
        if order.status != "pending":
            raise ValueError(f"无法取消状态为 '{order.status}' 的订单")

        order.status = "cancelled"
        await db.flush()
        await db.refresh(order)

        return order

    @staticmethod
    async def get_user_order_stats(
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """获取用户订单统计"""
        # 总订单数
        total_result = await db.execute(
            select(func.count(Order.id)).where(Order.user_id == user_id)
        )
        total = total_result.scalar() or 0

        # 按状态统计
        status_result = await db.execute(
            select(Order.status, func.count(Order.id))
            .where(Order.user_id == user_id)
            .group_by(Order.status)
        )
        status_counts = dict(status_result.all())

        # 已完成订单数
        completed = status_counts.get("completed", 0)

        return {
            "total": total,
            "pending": status_counts.get("pending", 0),
            "accepted": status_counts.get("accepted", 0),
            "cooking": status_counts.get("cooking", 0),
            "completed": completed,
            "cancelled": status_counts.get("cancelled", 0),
        }


# 全局订单服务实例
order_service = OrderService()
