"""用户主题偏好服务 (Phase 19 D-A7)

@staticmethod 服务 + 模块级单例,镜像 custom_theme_service 模式。
get_or_404 — 读取(不存在抛 ValueError('NOT_FOUND') → 路由转 404)
upsert     — 插入或就地更新(LWW, D-A1)
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_theme_preferences import UserThemePreferences
from app.schemas.user_theme_preferences import UserThemePreferencesUpdate


class UserThemePreferencesService:
    """用户主题偏好服务 — 所有方法 @staticmethod, 以 db 为第一个参数。"""

    @staticmethod
    async def get_or_404(db: AsyncSession, user_id: int) -> UserThemePreferences:
        """读取当前用户的主题偏好。不存在时抛 ValueError('NOT_FOUND')。"""
        result = await db.execute(
            select(UserThemePreferences).where(
                UserThemePreferences.user_id == user_id
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise ValueError("NOT_FOUND")
        return row

    @staticmethod
    async def upsert(
        db: AsyncSession,
        user_id: int,
        payload: UserThemePreferencesUpdate,
    ) -> UserThemePreferences:
        """插入或就地更新当前用户的主题偏好 (1 行/用户, D-A7)。

        LWW 语义 (D-A1): 整体替换 active_theme / season_enabled / hemisphere /
        season_theme_map 四个字段; 不做字段级合并。
        """
        result = await db.execute(
            select(UserThemePreferences).where(
                UserThemePreferences.user_id == user_id
            )
        )
        row = result.scalar_one_or_none()

        # model_dump(mode='json') 确保嵌套 pydantic 模型序列化为 JSON 兼容 dict
        active_theme_json = payload.active_theme.model_dump(mode="json", exclude_none=False)
        # SeasonThemeMapPayload 是 RootModel — model_dump 返回 dict
        season_map_json = payload.season_theme_map.model_dump(mode="json")

        if row is None:
            row = UserThemePreferences(
                user_id=user_id,
                active_theme=active_theme_json,
                season_enabled=payload.season_enabled,
                hemisphere=payload.hemisphere,
                season_theme_map=season_map_json,
            )
            db.add(row)
        else:
            row.active_theme = active_theme_json
            row.season_enabled = payload.season_enabled
            row.hemisphere = payload.hemisphere
            row.season_theme_map = season_map_json

        await db.flush()
        await db.refresh(row, attribute_names=["updated_at"])
        return row


# 全局服务单例
user_theme_preferences_service = UserThemePreferencesService()
