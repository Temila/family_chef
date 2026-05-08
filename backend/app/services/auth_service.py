"""
家味 · Family Chef - 认证服务
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


class AuthService:
    """认证服务"""

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        username: str,
        password: str,
    ) -> Optional[User]:
        """验证用户名和密码"""
        result = await db.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            return None

        return user

    @staticmethod
    async def create_user(
        db: AsyncSession,
        username: str,
        password: str,
        display_name: Optional[str] = None,
        email: Optional[str] = None,
        role: str = "user",
    ) -> User:
        """创建新用户（含密码哈希）"""
        # 检查用户名是否已存在
        result = await db.execute(
            select(User).where(User.username == username)
        )
        if result.scalar_one_or_none():
            raise ValueError(f"用户名 '{username}' 已存在")

        user = User(
            username=username,
            password_hash=hash_password(password),
            display_name=display_name or username,
            email=email,
            role=role,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    def create_tokens(user: User) -> dict:
        """生成 access_token 和 refresh_token"""
        access_data = {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role,
            "type": "access",
        }
        refresh_data = {
            "sub": str(user.id),
            "username": user.username,
            "type": "refresh",
        }

        access_token = create_access_token(
            access_data,
            expires_delta=timedelta(minutes=1440),  # 24小时
        )
        refresh_token = create_access_token(
            refresh_data,
            expires_delta=timedelta(days=7),  # 7天
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": 86400,
        }

    @staticmethod
    async def refresh_access_token(
        db: AsyncSession,
        refresh_token: str,
    ) -> Optional[dict]:
        """刷新 Token"""
        payload = decode_access_token(refresh_token)
        if not payload:
            return None

        if payload.get("type") != "refresh":
            return None

        user_id = int(payload.get("sub"))
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            return None

        return AuthService.create_tokens(user)

    @staticmethod
    async def get_current_user(
        db: AsyncSession,
        token: str,
    ) -> Optional[User]:
        """从 Token 获取当前用户"""
        payload = decode_access_token(token)
        if not payload:
            return None

        if payload.get("type") != "access":
            return None

        user_id = int(payload.get("sub"))
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            return None

        return user


# 全局认证服务实例
auth_service = AuthService()
