"""
家味 · Family Chef - 收藏服务
"""

from typing import Optional, List
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.favorite import Favorite
from app.models.dish import Dish
from app.utils.pagination import PaginationParams


class FavoriteService:
    """收藏服务"""

    @staticmethod
    async def add_favorite(
        db: AsyncSession,
        user_id: int,
        dish_id: int,
    ) -> Favorite:
        """添加收藏"""
        # 检查是否已收藏
        result = await db.execute(
            select(Favorite).where(
                and_(
                    Favorite.user_id == user_id,
                    Favorite.dish_id == dish_id,
                )
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        # 检查菜品是否存在
        dish_result = await db.execute(
            select(Dish).where(Dish.id == dish_id)
        )
        dish = dish_result.scalar_one_or_none()
        if not dish:
            raise ValueError(f"菜品不存在: {dish_id}")

        favorite = Favorite(
            user_id=user_id,
            dish_id=dish_id,
        )
        db.add(favorite)
        await db.flush()
        await db.refresh(favorite)
        return favorite

    @staticmethod
    async def remove_favorite(
        db: AsyncSession,
        user_id: int,
        dish_id: int,
    ) -> bool:
        """取消收藏"""
        result = await db.execute(
            delete(Favorite).where(
                and_(
                    Favorite.user_id == user_id,
                    Favorite.dish_id == dish_id,
                )
            )
        )
        await db.flush()
        return result.rowcount > 0

    @staticmethod
    async def list_favorites(
        db: AsyncSession,
        user_id: int,
        params: PaginationParams,
    ) -> tuple[List[Dish], int]:
        """获取收藏列表（分页）"""
        # 基础查询
        query = (
            select(Dish)
            .join(Favorite, Dish.id == Favorite.dish_id)
            .where(Favorite.user_id == user_id)
            .order_by(Favorite.created_at.desc())
        )

        # 获取总数
        count_query = (
            select(Favorite.dish_id)
            .where(Favorite.user_id == user_id)
        )
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # 分页
        query = query.offset(params.offset).limit(params.limit)
        result = await db.execute(query)
        dishes = result.scalars().all()

        return dishes, total

    @staticmethod
    async def is_favorited(
        db: AsyncSession,
        user_id: int,
        dish_id: int,
    ) -> bool:
        """检查是否已收藏"""
        result = await db.execute(
            select(Favorite).where(
                and_(
                    Favorite.user_id == user_id,
                    Favorite.dish_id == dish_id,
                )
            )
        )
        return result.scalar_one_or_none() is not None


# 全局收藏服务实例
favorite_service = FavoriteService()
