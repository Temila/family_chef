"""
家味 · Family Chef - 订单服务
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.order import Order, OrderItem
from app.models.dish import Dish
from app.models.user import User
from app.schemas.order import OrderCreate, OrderItemCreate
from app.utils.pagination import PaginationParams


class OrderService:
    """订单服务"""

    @staticmethod
    async def generate_order_no(db: AsyncSession) -> str:
        """生成订单号（ORD + 日期 + 序号）"""
        today = datetime.now().strftime("%Y%m%d")
        # 查询今天已有订单数
        result = await db.execute(
            select(func.count(Order.id)).where(Order.order_no.like(f"ORD{today}%"))
        )
        count = result.scalar() or 0
        seq = str(count + 1).zfill(4)
        return f"ORD{today}{seq}"

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
                    Dish.status == "published",
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

        # 触发飞书通知（异步）
        try:
            from app.integrations.feishu import feishu_client
            # 获取厨师列表
            chefs_result = await db.execute(
                select(User).where(User.role == "chef", User.is_active == True)
            )
            chefs = chefs_result.scalars().all()
            
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
            
            # 通知所有厨师
            for chef in chefs:
                if chef.feishu_open_id:
                    await feishu_client.send_order_notification(
                        chef.feishu_open_id,
                        order.order_no,
                        order.status,
                        items_info,
                    )
        except Exception as e:
            print(f"⚠️ 飞书通知发送失败：{e}")

        return order

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

        # 厨师查看所有分配给自己的订单
        if chef_id:
            query = query.where(Order.chef_id == chef_id)

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
            count_query = count_query.where(Order.chef_id == chef_id)
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
            "pending": ["accepted", "cancelled"],
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
                await feishu_client.send_order_notification(
                    user.feishu_open_id,
                    order.order_no,
                    order.status,
                    items_info,
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
