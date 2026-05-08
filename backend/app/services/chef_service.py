"""
家味 · Family Chef - 厨师服务
"""

from typing import Optional, List
from datetime import date, datetime
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.schedule import ChefSchedule
from app.models.order import Order
from app.utils.pagination import PaginationParams


class ChefService:
    """厨师服务"""

    @staticmethod
    async def list_chefs(db: AsyncSession) -> List[User]:
        """获取厨师列表（role=chef 的用户）"""
        result = await db.execute(
            select(User).where(
                and_(
                    User.role == "chef",
                    User.is_active == True,
                )
            ).order_by(User.display_name)
        )
        chefs = result.scalars().all()
        return chefs

    @staticmethod
    async def get_schedules(
        db: AsyncSession,
        schedule_date: Optional[date] = None,
        chef_id: Optional[int] = None,
    ) -> List[ChefSchedule]:
        """查询排班（支持日期、厨师筛选）"""
        query = select(ChefSchedule).order_by(
            ChefSchedule.schedule_date,
            ChefSchedule.meal_type,
        )

        if schedule_date:
            query = query.where(
                ChefSchedule.schedule_date == schedule_date
            )

        if chef_id:
            query = query.where(
                ChefSchedule.chef_id == chef_id
            )

        result = await db.execute(query)
        schedules = result.scalars().all()
        return schedules

    @staticmethod
    async def update_schedule(
        db: AsyncSession,
        chef_id: int,
        schedule_date: date,
        meal_type: str,
        status: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> ChefSchedule:
        """更新排班"""
        valid_meal_types = {"breakfast", "lunch", "dinner"}
        if meal_type not in valid_meal_types:
            raise ValueError(f"无效的餐次类型: {meal_type}，有效值: {', '.join(valid_meal_types)}")

        # 查找现有排班
        result = await db.execute(
            select(ChefSchedule).where(
                and_(
                    ChefSchedule.chef_id == chef_id,
                    ChefSchedule.schedule_date == schedule_date,
                    ChefSchedule.meal_type == meal_type,
                )
            )
        )
        schedule = result.scalar_one_or_none()

        if schedule:
            # 更新现有排班
            if status:
                schedule.status = status
            if notes is not None:
                schedule.notes = notes
            schedule.updated_at = datetime.now()
        else:
            # 创建新排班
            schedule = ChefSchedule(
                chef_id=chef_id,
                schedule_date=schedule_date,
                meal_type=meal_type,
                status=status or "scheduled",
                notes=notes,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            db.add(schedule)

        await db.flush()
        await db.refresh(schedule)
        return schedule

    @staticmethod
    async def get_chef_workload(
        db: AsyncSession,
        chef_id: int,
        target_date: Optional[date] = None,
    ) -> dict:
        """获取厨师工作量统计（今日完成订单数）"""
        if not target_date:
            target_date = date.today()

        # 查询今日已完成的订单数
        result = await db.execute(
            select(func.count(Order.id)).where(
                and_(
                    Order.chef_id == chef_id,
                    Order.status == "completed",
                    func.date(Order.completed_at) == target_date,
                )
            )
        )
        completed_orders = result.scalar() or 0

        # 查询今日待处理的订单数
        pending_result = await db.execute(
            select(func.count(Order.id)).where(
                and_(
                    Order.chef_id == chef_id,
                    Order.status.in_(["accepted", "cooking"]),
                )
            )
        )
        pending_orders = pending_result.scalar() or 0

        return {
            "chef_id": chef_id,
            "date": target_date.isoformat(),
            "completed_orders": completed_orders,
            "pending_orders": pending_orders,
        }


# 全局厨师服务实例
chef_service = ChefService()
