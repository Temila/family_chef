"""
家味 · Family Chef - 访客邀请服务
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.guest_invitation import GuestInvitation
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.dish import Dish, DishChef


class GuestService:
    """访客邀请服务"""

    @staticmethod
    async def create_invitation(
        db: AsyncSession,
        current_user: User,
        chef_id: Optional[int] = None,
    ) -> GuestInvitation:
        """创建访客邀请链接"""
        if current_user.role == "chef":
            # 厨师角色自动绑定自己
            chef_id = current_user.id
        elif current_user.role == "user":
            # 普通用户必须指定厨师
            if not chef_id:
                raise ValueError("请选择一位厨师")
            # 验证 chef_id 是否有效
            result = await db.execute(
                select(User).where(
                    and_(
                        User.id == chef_id,
                        User.role == "chef",
                        User.is_active == True,
                    )
                )
            )
            chef = result.scalar_one_or_none()
            if not chef:
                raise ValueError("请选择一位有效的厨师")
        else:
            raise ValueError("权限不足")

        # 生成 token
        token = str(uuid.uuid4())

        # 设置过期时间（2 小时后）
        expires_at = datetime.now() + timedelta(hours=2)

        # 创建邀请记录
        invitation = GuestInvitation(
            token=token,
            inviter_id=current_user.id,
            chef_id=chef_id,
            status="active",
            expires_at=expires_at,
        )
        db.add(invitation)
        await db.flush()
        await db.refresh(invitation)

        return invitation

    @staticmethod
    async def validate_invitation(
        db: AsyncSession,
        token: str,
    ) -> GuestInvitation:
        """验证访客邀请链接"""
        result = await db.execute(
            select(GuestInvitation).where(GuestInvitation.token == token)
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError("无效的邀请链接")

        if invitation.status == "used":
            raise ValueError("邀请链接已被使用")

        if invitation.status == "revoked":
            raise ValueError("邀请链接已撤销")

        # 惰性过期检查
        if invitation.status == "expired" or invitation.expires_at < datetime.now():
            invitation.status = "expired"
            await db.flush()
            raise ValueError("邀请链接已过期")

        return invitation

    @staticmethod
    async def get_guest_dishes(
        db: AsyncSession,
        invitation: GuestInvitation,
        params,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
    ) -> tuple[list, int]:
        """获取访客可见的菜品列表（绑定厨师的上架菜品）"""
        from app.services.dish_service import dish_service

        dishes, total = await dish_service.list_dishes(
            db,
            params,
            search=search,
            target_chef_id=invitation.chef_id,
        )
        return dishes, total

    @staticmethod
    async def _get_guest_user_id(db: AsyncSession) -> int:
        """获取虚拟访客用户 ID（Pitfall 5: 不硬编码，通过 username 查询）"""
        result = await db.execute(
            select(User).where(User.username == "__guest__")
        )
        guest_user = result.scalar_one_or_none()
        if not guest_user:
            raise ValueError("虚拟访客用户不存在，请联系管理员初始化系统")
        return guest_user.id

    @staticmethod
    async def submit_guest_order(db: AsyncSession, token: str, order_data) -> Order:
        """访客提交一次性订单（原子性：状态检查 + 订单创建 + 状态更新在同一事务中）"""
        from app.services.order_service import OrderService

        # Step 1: 查询邀请
        result = await db.execute(
            select(GuestInvitation).where(GuestInvitation.token == token)
        )
        invitation = result.scalar_one_or_none()
        if not invitation:
            raise ValueError("无效的邀请链接")

        # Step 2: 检查状态
        if invitation.status == "used":
            raise ValueError("邀请链接已被使用")
        if invitation.status == "revoked":
            raise ValueError("邀请链接已撤销")
        if invitation.status == "expired" or invitation.expires_at < datetime.now():
            invitation.status = "expired"
            await db.flush()
            raise ValueError("邀请链接已过期")
        if invitation.status != "active":
            raise ValueError(f"邀请链接状态异常: {invitation.status}")

        # Step 3: 状态为 active，继续
        # Step 4: 获取虚拟访客用户 ID
        guest_user_id = await GuestService._get_guest_user_id(db)

        # Step 5: 验证菜品 — 每个菜品必须是 enabled 且绑定的厨师已上架
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

        # 验证每个菜品都有绑定厨师的上架记录
        result = await db.execute(
            select(DishChef).where(
                and_(
                    DishChef.dish_id.in_(dish_ids),
                    DishChef.chef_id == invitation.chef_id,
                    DishChef.status == "published",
                )
            )
        )
        published_dish_ids = {dc.dish_id for dc in result.scalars().all()}

        invalid_ids = set(dish_ids) - published_dish_ids
        if invalid_ids:
            raise ValueError(f"以下菜品不存在或未上架: {', '.join(map(str, invalid_ids))}")

        # Step 6: 生成订单号
        order_no = await OrderService.generate_order_no(db)

        # Step 7: 创建订单
        order = Order(
            order_no=order_no,
            user_id=guest_user_id,
            chef_id=invitation.chef_id,
            guest_invitation_id=invitation.id,
            status="pending",
            notes=order_data.notes,
            meal_date=order_data.meal_date,
            meal_type=order_data.meal_type,
        )
        db.add(order)

        # Step 8: 创建订单项
        await db.flush()
        for item_data in order_data.items:
            order_item = OrderItem(
                order_id=order.id,
                dish_id=item_data.dish_id,
                quantity=item_data.quantity,
                special_notes=item_data.special_notes,
            )
            db.add(order_item)

        # Step 9: 标记邀请为 used
        invitation.status = "used"
        await db.flush()

        # Step 10: 刷新订单
        await db.refresh(order)

        # Step 11: 发送访客通知（异步，失败不影响订单）
        await GuestService._send_guest_notification(db, order, invitation)

        return order

    @staticmethod
    async def _send_guest_notification(db: AsyncSession, order: Order, invitation: GuestInvitation):
        """发送访客订单飞书通知（D-09/D-10: try/except 包裹，失败忽略）"""
        try:
            from app.integrations.feishu import feishu_client

            # 获取订单项和菜品信息
            items_result = await db.execute(
                select(OrderItem).where(OrderItem.order_id == order.id)
            )
            order_items = items_result.scalars().all()

            items_info = []
            for oi in order_items:
                dish_result = await db.execute(
                    select(Dish).where(Dish.id == oi.dish_id)
                )
                dish = dish_result.scalar_one_or_none()
                if dish:
                    items_info.append({"name": dish.name, "quantity": oi.quantity})

            notification_data = {
                "order_no": order.order_no,
                "status": order.status,
                "user_name": "访客",
                "is_guest": True,
                "items": items_info,
                "ingredients": [],
                "meal_date": str(order.meal_date) if order.meal_date else "",
                "meal_type": order.meal_type or "",
                "dislikes": [],
                "allergies": [],
            }

            # 查询厨师并发送通知
            chef_result = await db.execute(select(User).where(User.id == invitation.chef_id))
            chef = chef_result.scalar_one_or_none()
            if chef and chef.feishu_open_id:
                await feishu_client.send_order_notification(chef.feishu_open_id, notification_data)
        except Exception as e:
            print(f"⚠️ 访客订单飞书通知发送失败：{e}")

    @staticmethod
    async def get_used_invitation_summary(db: AsyncSession, token: str) -> dict:
        """获取已使用邀请链接的订单摘要"""
        # 查询邀请
        result = await db.execute(
            select(GuestInvitation).where(GuestInvitation.token == token)
        )
        invitation = result.scalar_one_or_none()
        if not invitation:
            raise ValueError("无效的邀请链接")
        if invitation.status != "used":
            raise ValueError("邀请链接尚未使用")

        # 查询关联订单
        result = await db.execute(
            select(Order).where(Order.guest_invitation_id == invitation.id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise ValueError("未找到关联订单")

        # 获取订单项
        items_result = await db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        order_items = items_result.scalars().all()

        # 构建摘要数据
        items_info = []
        for oi in order_items:
            dish_result = await db.execute(
                select(Dish).where(Dish.id == oi.dish_id)
            )
            dish = dish_result.scalar_one_or_none()
            if dish:
                items_info.append({
                    "dish_name": dish.name,
                    "quantity": oi.quantity,
                    "special_notes": oi.special_notes,
                })

        return {
            "order_no": order.order_no,
            "status": order.status,
            "notes": order.notes,
            "created_at": order.created_at,
            "items": items_info,
        }


    @staticmethod
    async def list_invitations(
        db: AsyncSession,
        inviter_id: int,
        params,
    ) -> tuple[list[GuestInvitation], int]:
        """获取指定用户的邀请列表（分页）"""
        from app.utils.pagination import PaginationParams

        # 计数查询
        count_result = await db.execute(
            select(func.count()).select_from(GuestInvitation).where(
                GuestInvitation.inviter_id == inviter_id
            )
        )
        total = count_result.scalar()

        # 数据查询（预加载厨师信息）
        result = await db.execute(
            select(GuestInvitation)
            .where(GuestInvitation.inviter_id == inviter_id)
            .options(selectinload(GuestInvitation.chef))
            .order_by(GuestInvitation.created_at.desc())
            .offset(params.offset)
            .limit(params.limit)
        )
        invitations = list(result.scalars().all())

        return invitations, total

    @staticmethod
    async def revoke_invitation(
        db: AsyncSession,
        invitation_id: int,
        current_user_id: int,
    ) -> GuestInvitation:
        """撤销邀请（验证所有权和状态）"""
        result = await db.execute(
            select(GuestInvitation)
            .where(GuestInvitation.id == invitation_id)
            .options(selectinload(GuestInvitation.chef))
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError("邀请不存在")

        if invitation.inviter_id != current_user_id:
            raise ValueError("无权撤销此邀请")

        if invitation.status != "active":
            raise ValueError("仅活跃状态的邀请可撤销")

        # 惰性过期检查
        if invitation.expires_at < datetime.now():
            invitation.status = "expired"
            await db.flush()
            raise ValueError("邀请已过期，无法撤销")

        invitation.status = "revoked"
        await db.flush()
        await db.refresh(invitation)

        return invitation


# 全局访客邀请服务实例
guest_service = GuestService()
