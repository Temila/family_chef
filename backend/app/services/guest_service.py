"""
家味 · Family Chef - 访客邀请服务
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.guest_invitation import GuestInvitation
from app.models.user import User


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


# 全局访客邀请服务实例
guest_service = GuestService()
