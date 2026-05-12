"""
家味 · Family Chef - 用户服务
"""

from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.utils.security import hash_password


class UserService:
    """用户服务"""

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """根据 ID 获取用户"""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """根据用户名获取用户"""
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_users(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        role: Optional[str] = None,
        search: Optional[str] = None,
    ) -> dict:
        """分页查询用户列表"""
        query = select(User)

        if role:
            query = query.where(User.role == role)

        if search:
            query = query.where(
                User.username.contains(search) | User.display_name.contains(search)
            )

        count_query = select(func.count(User.id))
        if role:
            count_query = count_query.where(User.role == role)
        if search:
            count_query = count_query.where(
                User.username.contains(search) | User.display_name.contains(search)
            )
        total = (await db.execute(count_query)).scalar()

        # 分页
        query = query.order_by(User.id.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        users = result.scalars().all()

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": users,
        }

    @staticmethod
    async def create_user(
        db: AsyncSession,
        username: str,
        password: str,
        display_name: Optional[str] = None,
        email: Optional[str] = None,
        role: str = "user",
    ) -> User:
        """创建用户"""
        # 检查用户名是否已存在
        existing = await UserService.get_user_by_username(db, username)
        if existing:
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
    async def update_user(
        db: AsyncSession,
        user_id: int,
        display_name: Optional[str] = None,
        email: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        feishu_open_id: Optional[str] = None,
    ) -> Optional[User]:
        """更新用户信息"""
        user = await UserService.get_user_by_id(db, user_id)
        if not user:
            return None

        if display_name is not None:
            user.display_name = display_name
        if email is not None:
            user.email = email
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        if feishu_open_id is not None:
            user.feishu_open_id = feishu_open_id

        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_user_password(
        db: AsyncSession,
        user_id: int,
        old_password: str,
        new_password: str,
    ) -> bool:
        """修改密码"""
        from app.utils.security import verify_password

        user = await UserService.get_user_by_id(db, user_id)
        if not user:
            return False

        if not verify_password(old_password, user.password_hash):
            raise ValueError("原密码错误")

        user.password_hash = hash_password(new_password)
        user.force_pwd_change = False
        await db.flush()
        return True

    @staticmethod
    async def delete_user(db: AsyncSession, user_id: int) -> bool:
        """软删除用户"""
        user = await UserService.get_user_by_id(db, user_id)
        if not user:
            return False

        user.is_active = False
        await db.flush()
        return True

    @staticmethod
    async def get_user_stats(db: AsyncSession, user_id: int) -> dict:
        """获取用户统计数据"""
        # TODO: 关联订单、收藏、口味偏好表
        return {
            "week_orders": 0,
            "favorites_count": 0,
            "dislike_count": 0,
        }


# 全局用户服务实例
user_service = UserService()
