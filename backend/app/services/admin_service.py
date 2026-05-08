"""
家味 · Family Chef - 系统管理服务
"""

from typing import Optional, List
from datetime import datetime, date, timedelta
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.log import SystemLog
from app.models.user import User
from app.models.dish import Dish
from app.models.order import Order
from app.utils.pagination import PaginationParams


class AdminService:
    """系统管理服务"""

    @staticmethod
    async def list_logs(
        db: AsyncSession,
        params: PaginationParams,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        target_type: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> tuple[List[SystemLog], int]:
        """查询系统日志（支持筛选、分页）"""
        query = select(SystemLog).order_by(SystemLog.created_at.desc())

        # 筛选条件
        conditions = []
        if user_id:
            conditions.append(SystemLog.user_id == user_id)
        if action:
            conditions.append(SystemLog.action == action)
        if target_type:
            conditions.append(SystemLog.target_type == target_type)
        if start_date:
            conditions.append(SystemLog.created_at >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            conditions.append(SystemLog.created_at <= datetime.combine(end_date, datetime.max.time()))

        if conditions:
            query = query.where(and_(*conditions))

        # 获取总数
        count_query = select(func.count(SystemLog.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # 分页
        query = query.offset(params.offset).limit(params.limit)
        result = await db.execute(query)
        logs = result.scalars().all()

        return logs, total

    @staticmethod
    async def get_stats(db: AsyncSession) -> dict:
        """获取系统统计数据"""
        # 用户统计
        user_total = await db.execute(select(func.count(User.id)))
        user_active = await db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )

        # 菜品统计
        dish_total = await db.execute(select(func.count(Dish.id)))
        dish_published = await db.execute(
            select(func.count(Dish.id)).where(Dish.status == "published")
        )
        dish_draft = await db.execute(
            select(func.count(Dish.id)).where(Dish.status == "draft")
        )

        # 订单统计
        order_total = await db.execute(select(func.count(Order.id)))

        # 今日订单
        today = date.today()
        order_today = await db.execute(
            select(func.count(Order.id)).where(
                func.date(Order.created_at) == today
            )
        )

        # 本周订单
        week_start = today - timedelta(days=today.weekday())
        order_week = await db.execute(
            select(func.count(Order.id)).where(
                func.date(Order.created_at) >= week_start
            )
        )

        # 本月订单
        month_start = today.replace(day=1)
        order_month = await db.execute(
            select(func.count(Order.id)).where(
                func.date(Order.created_at) >= month_start
            )
        )

        return {
            "users": {
                "total": user_total.scalar() or 0,
                "active": user_active.scalar() or 0,
            },
            "dishes": {
                "total": dish_total.scalar() or 0,
                "published": dish_published.scalar() or 0,
                "draft": dish_draft.scalar() or 0,
            },
            "orders": {
                "total": order_total.scalar() or 0,
                "today": order_today.scalar() or 0,
                "week": order_week.scalar() or 0,
                "month": order_month.scalar() or 0,
            },
        }

    @staticmethod
    async def log_action(
        db: AsyncSession,
        user_id: Optional[int],
        action: str,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        detail: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> SystemLog:
        """记录系统操作日志"""
        log = SystemLog(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
            ip_address=ip_address,
        )
        db.add(log)
        await db.flush()
        await db.refresh(log)
        return log


# 全局管理服务实例
admin_service = AdminService()