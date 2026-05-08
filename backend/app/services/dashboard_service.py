"""
家味 · Family Chef - 仪表盘服务
"""

from typing import Optional, List
from datetime import datetime, date, timedelta
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.dish import Dish
from app.models.order import Order
from app.models.log import SystemLog
from app.models.schedule import ChefSchedule


class DashboardService:
    """仪表盘服务"""

    @staticmethod
    async def get_dashboard_data(db: AsyncSession) -> dict:
        """聚合仪表盘数据"""
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

        # 订单统计
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        order_today = await db.execute(
            select(func.count(Order.id)).where(
                func.date(Order.created_at) == today
            )
        )
        order_week = await db.execute(
            select(func.count(Order.id)).where(
                func.date(Order.created_at) >= week_start
            )
        )
        order_month = await db.execute(
            select(func.count(Order.id)).where(
                func.date(Order.created_at) >= month_start
            )
        )

        # 按状态统计订单
        order_status = await db.execute(
            select(Order.status, func.count(Order.id))
            .group_by(Order.status)
        )
        status_counts = dict(order_status.all())

        # 最近订单列表
        recent_orders_result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
            .limit(5)
        )
        recent_orders = recent_orders_result.scalars().all()

        # 最近活动列表
        recent_logs_result = await db.execute(
            select(SystemLog)
            .order_by(SystemLog.created_at.desc())
            .limit(10)
        )
        recent_logs = recent_logs_result.scalars().all()

        # 厨师工作量排行
        chef_workload_result = await db.execute(
            select(
                Order.chef_id,
                func.count(Order.id).label("completed_count"),
            )
            .where(
                and_(
                    Order.status == "completed",
                    Order.chef_id.isnot(None),
                )
            )
            .group_by(Order.chef_id)
            .order_by(desc("completed_count"))
            .limit(5)
        )
        chef_workload = chef_workload_result.all()

        # 获取厨师名称
        chef_ids = [cw[0] for cw in chef_workload]
        chefs_result = await db.execute(
            select(User).where(User.id.in_(chef_ids))
        )
        chefs = {c.id: c for c in chefs_result.scalars().all()}

        chef_ranking = []
        for chef_id, count in chef_workload:
            chef = chefs.get(chef_id)
            if chef:
                chef_ranking.append({
                    "chef_id": chef_id,
                    "chef_name": chef.display_name,
                    "completed_orders": count,
                })

        return {
            "stats": {
                "users": {
                    "total": user_total.scalar() or 0,
                    "active": user_active.scalar() or 0,
                },
                "dishes": {
                    "total": dish_total.scalar() or 0,
                    "published": dish_published.scalar() or 0,
                },
                "orders": {
                    "today": order_today.scalar() or 0,
                    "week": order_week.scalar() or 0,
                    "month": order_month.scalar() or 0,
                    "by_status": status_counts,
                },
            },
            "recent_orders": [
                {
                    "id": o.id,
                    "order_no": o.order_no,
                    "status": o.status,
                    "created_at": o.created_at.isoformat(),
                    "items_count": len(o.items),
                }
                for o in recent_orders
            ],
            "recent_activities": [
                {
                    "id": log.id,
                    "action": log.action,
                    "target_type": log.target_type,
                    "target_id": log.target_id,
                    "detail": log.detail,
                    "created_at": log.created_at.isoformat(),
                }
                for log in recent_logs
            ],
            "chef_ranking": chef_ranking,
        }


# 全局仪表盘服务实例
dashboard_service = DashboardService()