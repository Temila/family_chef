"""主题服务 (Phase 17 SYNC-02)"""

from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.custom_theme import CustomTheme
from app.models.user import User
from app.schemas.theme import ThemeCreate, ThemeUpdate


class ThemePermissionError(ValueError):
    """主题权限错误 — router 转 403 (SYNC-04)"""



class CustomThemeService:
    """主题服务 — 所有方法 @staticmethod,以 db 为第一个参数。"""

    @staticmethod
    async def create_theme(
        db: AsyncSession,
        current_user: User,
        theme_data: ThemeCreate,
    ) -> CustomTheme:
        """创建自定义主题。已存在同名时抛 ValueError(路由转 400)。"""
        # 检查是否同名
        result = await db.execute(
            select(CustomTheme).where(
                and_(
                    CustomTheme.user_id == current_user.id,
                    CustomTheme.name == theme_data.name,
                )
            )
        )
        if result.scalar_one_or_none() is not None:
            raise ValueError(f"已存在同名主题: {theme_data.name}")

        theme = CustomTheme(
            user_id=current_user.id,
            name=theme_data.name,
            source_colors=theme_data.source_colors.model_dump(),
            variant=theme_data.variant,
        )
        db.add(theme)
        await db.flush()
        await db.refresh(theme, attribute_names=["updated_at"])
        return theme

    @staticmethod
    async def update_theme(
        db: AsyncSession,
        current_user: User,
        theme_id: int,
        theme_data: ThemeUpdate,
    ) -> CustomTheme:
        """更新主题(所有权检查,非所有者抛 ThemePermissionError → 403)。"""
        result = await db.execute(
            select(CustomTheme).where(
                and_(
                    CustomTheme.id == theme_id,
                    CustomTheme.user_id == current_user.id,
                )
            )
        )
        theme = result.scalar_one_or_none()
        if theme is None:
            raise ThemePermissionError("无权操作此主题")

        patch = theme_data.model_dump(exclude_unset=True)
        if "source_colors" in patch and patch["source_colors"] is not None:
            # 嵌套 SourceColors → dict
            patch["source_colors"] = theme_data.source_colors.model_dump()

        for field, value in patch.items():
            setattr(theme, field, value)

        await db.flush()
        await db.refresh(theme, attribute_names=["updated_at"])
        return theme

    @staticmethod
    async def delete_theme(
        db: AsyncSession,
        current_user: User,
        theme_id: int,
    ) -> bool:
        """删除主题(所有权检查)。成功返回 True,失败抛 ThemePermissionError → 403。"""
        result = await db.execute(
            delete(CustomTheme).where(
                and_(
                    CustomTheme.id == theme_id,
                    CustomTheme.user_id == current_user.id,
                )
            )
        )
        if result.rowcount == 0:
            raise ThemePermissionError("无权操作此主题")
        await db.flush()
        return True

    @staticmethod
    async def list_themes(
        db: AsyncSession,
        current_user: User,
    ) -> list[CustomTheme]:
        """列出当前用户的所有主题,按 updated_at DESC 排序。"""
        result = await db.execute(
            select(CustomTheme)
            .where(CustomTheme.user_id == current_user.id)
            .order_by(CustomTheme.updated_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_theme_by_id(
        db: AsyncSession,
        current_user: User,
        theme_id: int,
    ) -> CustomTheme:
        """获取单个主题(所有权检查,失败抛 ThemePermissionError → 403)。"""
        result = await db.execute(
            select(CustomTheme).where(
                and_(
                    CustomTheme.id == theme_id,
                    CustomTheme.user_id == current_user.id,
                )
            )
        )
        theme = result.scalar_one_or_none()
        if theme is None:
            raise ThemePermissionError("无权操作此主题")
        return theme


# 全局服务单例
custom_theme_service = CustomThemeService()