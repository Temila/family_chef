"""家味 · Family Chef - 愿望单服务"""
from typing import Optional, List
from sqlalchemy import select, or_, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.wish import Wish
from app.models.dish import DishChef
from app.models.user import User
from app.schemas.wish import WishCreate, WishUpdate, WishAdvance, WishReject
from app.utils.pagination import PaginationParams
from app.utils.datetime_utils import naive_utc_now


class WishPermissionError(ValueError):
    """愿望权限错误 — router 转 403 (D-04). Subclasses ValueError so generic
    `except ValueError` fallback still works."""
    pass


class WishService:
    """愿望单服务"""

    valid_transitions = {
        "待处理": ["准备中", "已撤销"],
        "准备中": ["已上架", "已拒绝", "已撤销"],
        "已上架": [],
        "已拒绝": [],
        "已撤销": [],
    }

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

        # NOTIF-05: 新愿望推送给所有绑定了飞书的厨师（D-H02）
        from app.services.notification_service import wish_notification_service
        await wish_notification_service.notify_new_wish(db, wish, current_user)

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

        # D-H01: 在变更前捕获旧状态和认领信息（Pitfall 7 — capture pre-mutation）
        old_note = wish.note
        was_claimed = wish.status == "准备中" and wish.claimed_by_chef_id is not None
        claimed_by_chef_id = wish.claimed_by_chef_id

        for field, value in patch.items():
            setattr(wish, field, value)

        await db.flush()
        await db.refresh(wish)

        # NOTIF-06: 已认领愿望内容变更时通知认领厨师（D-H01 规则 2 — 不写 last_status_change_at）
        if was_claimed:
            from app.services.notification_service import wish_notification_service
            await wish_notification_service.notify_claimed_wish_change(
                db=db, wish=wish, submitter=current_user,
                notification_type="edit",
                claimed_by_chef_id=claimed_by_chef_id,
                old_note=old_note,
            )

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

        # D-H01: 在变更前捕获旧状态和认领信息（Pitfall 7）
        old_note = wish.note
        was_claimed = wish.claimed_by_chef_id is not None
        claimed_by_chef_id = wish.claimed_by_chef_id

        # 软删除
        wish.status = "已撤销"

        await db.flush()
        await db.refresh(wish)

        # D-B01: 成功撤销写入 last_status_change_at（D-H01 规则 1）
        wish.last_status_change_at = naive_utc_now()
        await db.flush()
        await db.refresh(wish, ["updated_at"])

        # NOTIF-06: 已认领愿望被撤销时通知认领厨师
        if was_claimed:
            from app.services.notification_service import wish_notification_service
            await wish_notification_service.notify_claimed_wish_change(
                db=db, wish=wish, submitter=current_user,
                notification_type="cancel",
                claimed_by_chef_id=claimed_by_chef_id,
                old_note=old_note,
            )

        return wish

    @staticmethod
    async def claim_wish(
        db: AsyncSession,
        wish_id: int,
        current_user: User,
    ) -> Optional[Wish]:
        """厨师认领愿望 (FLOW-02, D-01 原子并发安全).

        路由通过 require_role("chef", "admin") 做角色门控.
        返回:
          Wish 实例 — 认领成功.
          None — 愿望不存在（路由 -> 404 per D-03）.
        抛出:
          ValueError — 已被他人认领或状态已变更（路由 -> 400 per D-02）.
        """
        # 原子条件 UPDATE — 单条语句，无 SELECT-then-UPDATE (D-01)
        result = await db.execute(
            update(Wish)
            .where(Wish.id == wish_id, Wish.status == "待处理")
            .values(status="准备中", claimed_by_chef_id=current_user.id, last_status_change_at=naive_utc_now())
        )
        if result.rowcount == 0:
            # 区分：不存在（-> 404）vs 已被认领（-> 400）
            existing = await db.execute(select(Wish.id).where(Wish.id == wish_id))
            if existing.scalar_one_or_none() is None:
                return None  # 路由: 404 (D-03)
            raise ValueError("该愿望已被认领或状态已变更")  # 路由: 400 (D-02)

        # D-B01: last_status_change_at 已写入原子 .values() 中（D-H01 规则 1 / 原子并发边界）
        # 不发送飞书通知 — 提交者仅通过红点获知（NOTIF-03）

        # Re-fetch with relationships loaded for response serialization
        result = await db.execute(
            select(Wish)
            .options(selectinload(Wish.submitter), selectinload(Wish.claimer))
            .where(Wish.id == wish_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def advance_wish(
        db: AsyncSession,
        wish_id: int,
        current_user: User,
        advance_data: WishAdvance,
    ) -> Optional[Wish]:
        """推进愿望到已上架 (FLOW-03 + D-09 + D-10 + D-12).

        需满足:
          - 当前用户是 admin 或是该愿望的认领厨师 (PERM-03/04)
          - 愿望状态为 准备中 (D-12 状态机)
          - 目标菜品在 DishChef 中处于 published 状态 (D-09)
        """
        result = await db.execute(
            select(Wish)
            .options(selectinload(Wish.submitter), selectinload(Wish.claimer))
            .where(Wish.id == wish_id)
        )
        wish = result.scalar_one_or_none()
        if not wish:
            return None

        # PERM-03 + D-04：非 admin 非认领厨师不可推进
        if current_user.role != "admin" and wish.claimed_by_chef_id != current_user.id:
            claimer_name = wish.claimer.display_name if wish.claimer else "其他厨师"
            raise WishPermissionError(f"该愿望已被厨师 {claimer_name} 认领")

        # D-12 状态机检查
        allowed = WishService.valid_transitions.get(wish.status, [])
        if "已上架" not in allowed:
            raise ValueError(f"无法从状态 '{wish.status}' 推进到 '已上架'")

        # D-09 DishChef 验证：认领厨师必须已发布该菜品
        chef_for_validation = wish.claimed_by_chef_id or current_user.id
        dc_result = await db.execute(
            select(DishChef).where(
                DishChef.dish_id == advance_data.related_dish_id,
                DishChef.chef_id == chef_for_validation,
                DishChef.status == "published",
            )
        )
        if dc_result.scalar_one_or_none() is None:
            raise ValueError("你未发布此菜品或菜品不可用")

        # 应用状态转换（D-B01: 写入 last_status_change_at，D-H01 规则 1）
        wish.status = "已上架"
        wish.related_dish_id = advance_data.related_dish_id
        wish.last_status_change_at = naive_utc_now()

        await db.flush()
        await db.refresh(wish, ["updated_at"])

        return wish

    @staticmethod
    async def reject_wish(
        db: AsyncSession,
        wish_id: int,
        current_user: User,
        reject_data: WishReject,
    ) -> Optional[Wish]:
        """拒绝愿望 (FLOW-04 + D-04 + D-12).

        需满足:
          - 当前用户是 admin 或是该愿望的认领厨师 (PERM-03/04)
          - 愿望状态允许转换到 已拒绝 (D-12)
          - 必须提供拒绝原因
        """
        result = await db.execute(
            select(Wish)
            .options(selectinload(Wish.submitter), selectinload(Wish.claimer))
            .where(Wish.id == wish_id)
        )
        wish = result.scalar_one_or_none()
        if not wish:
            return None

        # PERM-03 + D-04：非 admin 非认领厨师不可拒绝
        if current_user.role != "admin" and wish.claimed_by_chef_id != current_user.id:
            claimer_name = wish.claimer.display_name if wish.claimer else "其他厨师"
            raise WishPermissionError(f"该愿望已被厨师 {claimer_name} 认领")

        # D-12 状态机检查
        allowed = WishService.valid_transitions.get(wish.status, [])
        if "已拒绝" not in allowed:
            raise ValueError(f"无法从状态 '{wish.status}' 拒绝")

        # 防御性：拒绝原因不能为空（Schema 已有约束，服务层做最后防线）
        reason = reject_data.reject_reason
        if not reason or not reason.strip():
            raise ValueError("拒绝原因不能为空")

        # 应用状态转换（D-B01: 写入 last_status_change_at，D-H01 规则 1）
        wish.status = "已拒绝"
        wish.reject_reason = reason.strip()
        wish.last_status_change_at = naive_utc_now()

        await db.flush()
        await db.refresh(wish, ["updated_at"])

        return wish


# 全局单例
wish_service = WishService()
