"""
家味 · Family Chef - 口味偏好服务
"""

from typing import Optional, List
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.preference import TastePreference
from app.models.ingredient import Ingredient


class PreferenceService:
    """口味偏好服务"""

    @staticmethod
    async def get_preferences(
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """获取用户口味偏好"""
        result = await db.execute(
            select(TastePreference).where(
                TastePreference.user_id == user_id
            )
        )
        preferences = result.scalars().all()

        dislikes = []
        allergies = []

        for pref in preferences:
            # 获取食材名称
            ing_result = await db.execute(
                select(Ingredient).where(Ingredient.id == pref.ingredient_id)
            )
            ingredient = ing_result.scalar_one_or_none()
            if ingredient:
                pref_data = {
                    "id": pref.id,
                    "ingredient_id": pref.ingredient_id,
                    "ingredient_name": ingredient.name,
                }
                if pref.preference_type == "dislike":
                    dislikes.append(pref_data)
                elif pref.preference_type == "allergy":
                    allergies.append(pref_data)

        return {
            "dislikes": dislikes,
            "allergies": allergies,
        }

    @staticmethod
    async def update_preferences(
        db: AsyncSession,
        user_id: int,
        dislikes: Optional[List[int]] = None,
        allergies: Optional[List[int]] = None,
    ) -> dict:
        """更新口味偏好（全量替换）"""
        # 删除用户所有现有偏好
        await db.execute(
            delete(TastePreference).where(
                TastePreference.user_id == user_id
            )
        )

        # 添加新的 dislike 偏好
        if dislikes:
            for ingredient_id in dislikes:
                pref = TastePreference(
                    user_id=user_id,
                    ingredient_id=ingredient_id,
                    preference_type="dislike",
                )
                db.add(pref)

        # 添加新的 allergy 偏好
        if allergies:
            for ingredient_id in allergies:
                pref = TastePreference(
                    user_id=user_id,
                    ingredient_id=ingredient_id,
                    preference_type="allergy",
                )
                db.add(pref)

        await db.flush()

        # 返回更新后的偏好
        return await PreferenceService.get_preferences(db, user_id)

    @staticmethod
    async def add_dislike(
        db: AsyncSession,
        user_id: int,
        ingredient_id: int,
    ) -> TastePreference:
        """添加不爱吃的食材"""
        return await PreferenceService._add_preference(
            db, user_id, ingredient_id, "dislike"
        )

    @staticmethod
    async def remove_dislike(
        db: AsyncSession,
        user_id: int,
        ingredient_id: int,
    ) -> bool:
        """移除不爱吃的食材"""
        return await PreferenceService._remove_preference(
            db, user_id, ingredient_id, "dislike"
        )

    @staticmethod
    async def add_allergy(
        db: AsyncSession,
        user_id: int,
        ingredient_id: int,
    ) -> TastePreference:
        """添加严格忌口食材"""
        return await PreferenceService._add_preference(
            db, user_id, ingredient_id, "allergy"
        )

    @staticmethod
    async def remove_allergy(
        db: AsyncSession,
        user_id: int,
        ingredient_id: int,
    ) -> bool:
        """移除严格忌口食材"""
        return await PreferenceService._remove_preference(
            db, user_id, ingredient_id, "allergy"
        )

    @staticmethod
    async def _add_preference(
        db: AsyncSession,
        user_id: int,
        ingredient_id: int,
        preference_type: str,
    ) -> TastePreference:
        """添加偏好（内部方法）"""
        # 检查是否已存在
        result = await db.execute(
            select(TastePreference).where(
                and_(
                    TastePreference.user_id == user_id,
                    TastePreference.ingredient_id == ingredient_id,
                    TastePreference.preference_type == preference_type,
                )
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        # 检查食材是否存在
        ing_result = await db.execute(
            select(Ingredient).where(Ingredient.id == ingredient_id)
        )
        ingredient = ing_result.scalar_one_or_none()
        if not ingredient:
            raise ValueError(f"食材不存在: {ingredient_id}")

        pref = TastePreference(
            user_id=user_id,
            ingredient_id=ingredient_id,
            preference_type=preference_type,
        )
        db.add(pref)
        await db.flush()
        await db.refresh(pref)
        return pref

    @staticmethod
    async def _remove_preference(
        db: AsyncSession,
        user_id: int,
        ingredient_id: int,
        preference_type: str,
    ) -> bool:
        """移除偏好（内部方法）"""
        result = await db.execute(
            delete(TastePreference).where(
                and_(
                    TastePreference.user_id == user_id,
                    TastePreference.ingredient_id == ingredient_id,
                    TastePreference.preference_type == preference_type,
                )
            )
        )
        await db.flush()
        return result.rowcount > 0


# 全局口味偏好服务实例
preference_service = PreferenceService()
