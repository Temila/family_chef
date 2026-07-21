"""家味 · Family Chef - 愿望单服务"""
from typing import Optional, List
from sqlalchemy import select, or_, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.wish import Wish
from app.models.user import User
from app.schemas.wish import WishCreate, WishUpdate, WishAdvance, WishReject
from app.utils.pagination import PaginationParams


class WishPermissionError(ValueError):
    """愿望权限错误 — router 转 403 (D-04). Subclasses ValueError so generic
    `except ValueError` fallback still works."""
    pass


class WishService:
    """愿望单服务"""

    @staticmethod
    async def submit_wish(
        db: AsyncSession,
        current_user: User,
        wish_data: WishCreate,
    ) -> Wish:
        """提交新愿望 (WISH-01).

        创建一条 status='待处理' 的愿望记录.
        """
        wish = Wish(
            user_id=current_user.id,
            dish_name=wish_data.dish_name,
            reference_url=wish_data.reference_url,
            note=wish_data.note,
            status="待处理",
        )
        db.add(wish)
        await db.flush()
        await db.refresh(wish)
        return wish

    @staticmethod
    async def get_wish_by_id(
        db: AsyncSession,
        wish_id: int,
        current_user: User,
    ) -> Optional[Wish]:
        """根据 ID 获取愿望详情 (PERM-01 + D-03).

        对所有不可见情况返回 None，路由统一转 404（防止 ID 枚举）.
        """
        result = await db.execute(
            select(Wish)
            .options(selectinload(Wish.submitter), selectinload(Wish.claimer))
            .where(Wish.id == wish_id)
        )
        wish = result.scalar_one_or_none()
        if not wish:
            return None

        # D-03 可见性门控：返回 None（404）而非抛 403
        if current_user.role == "admin":
            return wish
        if wish.user_id == current_user.id:
            return wish
        if wish.claimed_by_chef_id == current_user.id:
            return wish
        return None

    @staticmethod
    async def list_wishes(
        db: AsyncSession,
        params: PaginationParams,
        current_user: User,
        status: Optional[str] = None,
        claimed_by_chef_id: Optional[int] = None,
        mine: bool = False,
    ) -> tuple[List[Wish], int]:
        """查询愿望列表 (WISH-02 + FLOW-01 + FLOW-05 + PERM-01 / D-05).

        按角色返回不同可见范围：
        - admin：所有愿望
        - chef：待处理队列 + 自己认领的
        - user：仅自己的
        """
        def _apply_filters(q, user, st, chef_id, is_mine):
            # D-05 可见性分支
            if user.role == "admin":
                pass  # 可见全部
            elif user.role == "chef":
                if is_mine:
                    q = q.where(Wish.claimed_by_chef_id == user.id)
                else:
                    q = q.where(
                        or_(
                            Wish.status == "待处理",
                            Wish.claimed_by_chef_id == user.id,
                        )
                    )
            else:
                q = q.where(Wish.user_id == user.id)
            # 可选筛选
            if st:
                q = q.where(Wish.status == st)
            if chef_id is not None:
                q = q.where(Wish.claimed_by_chef_id == chef_id)
            return q

        # 主查询
        query = select(Wish).options(
            selectinload(Wish.submitter),
            selectinload(Wish.claimer),
        )
        query = _apply_filters(query, current_user, status, claimed_by_chef_id, mine)
        query = query.order_by(Wish.created_at.desc())

        # 总数查询（必须应用相同的过滤条件 — 避免计数与列表不一致）
        count_query = select(func.count(Wish.id))
        count_query = _apply_filters(count_query, current_user, status, claimed_by_chef_id, mine)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # 分页
        query = query.offset(params.offset).limit(params.limit)
        result = await db.execute(query)
        wishes = result.scalars().all()

        return wishes, total

    @staticmethod
    async def update_wish(
        db: AsyncSession,
        wish_id: int,
        current_user: User,
        update_data: WishUpdate,
    ) -> Optional[Wish]:
        """编辑愿望 (WISH-03 + PERM-02 + D-06).

        仅提交者本人可在 待处理/准备中 状态下编辑.
        """
        result = await db.execute(
            select(Wish)
            .options(selectinload(Wish.submitter), selectinload(Wish.claimer))
            .where(Wish.id == wish_id)
        )
        wish = result.scalar_one_or_none()
        if not wish:
            return None

        # PERM-02 所有权检查
        if wish.user_id != current_user.id:
            raise WishPermissionError("无权编辑此愿望")

        # D-06 状态检查
        if wish.status not in ("待处理", "准备中"):
            raise ValueError(f"无法编辑状态为 '{wish.status}' 的愿望")

        # 仅应用明确提供的字段（mass-assignment 防护）
        patch = update_data.model_dump(exclude_unset=True)
        for field, value in patch.items():
            setattr(wish, field, value)

        await db.flush()
        await db.refresh(wish)

        # Phase 6 hook: notify claiming chef

        return wish

    @staticmethod
    async def cancel_wish(
        db: AsyncSession,
        wish_id: int,
        current_user: User,
    ) -> Optional[Wish]:
        """撤销愿望 (WISH-04 + D-07).

        软删除：status='已撤销'。仅提交者本人在待处理/准备中状态下可撤销.
        """
        result = await db.execute(
            select(Wish)
            .options(selectinload(Wish.submitter), selectinload(Wish.claimer))
            .where(Wish.id == wish_id)
        )
        wish = result.scalar_one_or_none()
        if not wish:
            return None

        # PERM-02 所有权检查
        if wish.user_id != current_user.id:
            raise WishPermissionError("无权撤销此愿望")

        # D-07 状态检查
        if wish.status not in ("待处理", "准备中"):
            raise ValueError(f"无法撤销状态为 '{wish.status}' 的愿望")

        # 软删除
        wish.status = "已撤销"

        await db.flush()
        await db.refresh(wish)

        # Phase 6 hook: notify claiming chef

        return wish


# 全局单例
wish_service = WishService()
