"""家味 · Family Chef - 愿望单路由"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user_from_token, require_role
from app.models.user import User
from app.services.wish_service import wish_service, WishPermissionError
from app.schemas.wish import (
    WishCreate,
    WishUpdate,
    WishAdvance,
    WishReject,
    WishResponse,
    WishListResponse,
    WishDetailResponse,
)
from app.schemas.common import PageResponse
from app.utils.pagination import PaginationParams
from app.utils.datetime_utils import naive_utc_now


def compute_has_unread(wish, current_user) -> bool:
    """计算愿望的未读红点状态（D-B01 未读公式 + D-A01/Pitfall 5 身份屏蔽）。

    仅对该愿望的提交者返回真实未读状态；其他观看者恒为 False。
    未读判定：last_status_change_at 非空，且
      （submitter_last_viewed_at 为空 或 last_status_change_at > submitter_last_viewed_at）。
    """
    if wish.user_id != current_user.id:
        return False
    if wish.last_status_change_at is None:
        return False
    if wish.submitter_last_viewed_at is None:
        return True
    return wish.last_status_change_at > wish.submitter_last_viewed_at


router = APIRouter()


# =============================================================================
# POST /api/wishes — 提交新愿望 (WISH-01)
# =============================================================================
@router.post("", status_code=status.HTTP_201_CREATED, response_model=WishResponse)
async def submit_wish(
    wish_data: WishCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """提交新愿望"""
    wish = await wish_service.submit_wish(db, current_user, wish_data)
    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


# =============================================================================
# GET /api/wishes — 愿望列表 (WISH-02, FLOW-01, FLOW-05, D-05)
# =============================================================================
@router.get("", response_model=PageResponse[WishListResponse])
async def list_wishes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="状态筛选"),
    claimed_by_chef_id: Optional[int] = Query(None, description="认领厨师筛选 (admin)"),
    mine: bool = Query(False, description="仅看我认领的 (FLOW-05)"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """愿望列表（角色可见性：admin 全量，chef 待处理+我的认领，user 仅自己）"""
    params = PaginationParams(page=page, page_size=page_size)
    wishes, total = await wish_service.list_wishes(
        db,
        params,
        current_user,
        status=status_filter,
        claimed_by_chef_id=claimed_by_chef_id,
        mine=mine,
    )

    items = []
    for w in wishes:
        item = WishListResponse.model_validate(w)
        item.submitter_name = w.submitter.display_name if w.submitter else None
        item.claimed_by_chef_name = w.claimer.display_name if w.claimer else None
        # NOTIF-03/04：仅提交者可见真实红点，其他观看者被 compute_has_unread 屏蔽为 False
        item.has_unread = compute_has_unread(w, current_user)
        items.append(item)

    return PageResponse[WishListResponse](
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


# =============================================================================
# GET /api/wishes/{wish_id} — 愿望详情 (PERM-01, D-03)
# =============================================================================
@router.get("/{wish_id}", response_model=WishDetailResponse)
async def get_wish(
    wish_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """获取愿望详情（D-03：未授权访问返回 404，不区分不存在与无权查看）"""
    wish = await wish_service.get_wish_by_id(db, wish_id, current_user)
    if not wish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="愿望不存在",
        )

    # NOTIF-04：仅当调用者恰好是该愿望的提交者时清除红点（Pitfall 4 精确身份校验）。
    # 厨师（即使已认领）与管理员的详情查看均不得写入 submitter_last_viewed_at。
    # 仅 flush 不 commit — commit 由 get_db() 在请求结束时统一完成（D-B03）。
    if wish.user_id == current_user.id:
        wish.submitter_last_viewed_at = naive_utc_now()
        await db.flush()
        # flush 后 onupdate=func.now() 使 updated_at 被数据库更新并过期，
        # 需重新加载该列以避免 Pydantic 序列化时触发 async 懒加载（MissingGreenlet）。
        # 仅刷新 updated_at 一列，不影响已 selectinload 的 submitter/claimer 关系。
        await db.refresh(wish, ["updated_at"])

    resp = WishDetailResponse.model_validate(wish)
    resp.submitter_name = wish.submitter.display_name if wish.submitter else None
    resp.claimed_by_chef_name = wish.claimer.display_name if wish.claimer else None
    # related_dish_name 暂不填充（前端可按需通过 related_dish_id 自行查询）
    return resp


# =============================================================================
# PUT /api/wishes/{wish_id} — 编辑愿望 (WISH-03, PERM-02, D-06)
# =============================================================================
@router.put("/{wish_id}", response_model=WishResponse)
async def update_wish(
    wish_id: int,
    update_data: WishUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """编辑愿望（仅提交者本人在待处理/准备中状态下可编辑）"""
    try:
        wish = await wish_service.update_wish(db, wish_id, current_user, update_data)
    except WishPermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not wish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="愿望不存在",
        )

    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


# =============================================================================
# DELETE /api/wishes/{wish_id} — 撤销愿望 (WISH-04, D-07)
# =============================================================================
@router.delete("/{wish_id}", response_model=WishResponse)
async def cancel_wish(
    wish_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """撤销愿望（软删除，status='已撤销'；仅提交者本人在待处理/准备中状态下可撤销）"""
    try:
        wish = await wish_service.cancel_wish(db, wish_id, current_user)
    except WishPermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not wish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="愿望不存在",
        )

    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


# =============================================================================
# POST /api/wishes/{wish_id}/claim — 认领愿望 (FLOW-02, D-01, D-02)
# =============================================================================
@router.post("/{wish_id}/claim", response_model=WishResponse)
async def claim_wish(
    wish_id: int,
    current_user: User = Depends(require_role("chef", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """认领愿望（独占认领，状态 -> 准备中）"""
    try:
        wish = await wish_service.claim_wish(db, wish_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not wish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="愿望不存在",
        )

    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


# =============================================================================
# POST /api/wishes/{wish_id}/advance — 推进愿望到已上架 (FLOW-03, D-09, D-10)
# =============================================================================
@router.post("/{wish_id}/advance", response_model=WishResponse)
async def advance_wish(
    wish_id: int,
    advance_data: WishAdvance,
    current_user: User = Depends(require_role("chef", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """推进愿望到已上架（需是认领厨师且菜品已发布）"""
    try:
        wish = await wish_service.advance_wish(db, wish_id, current_user, advance_data)
    except WishPermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not wish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="愿望不存在",
        )

    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)


# =============================================================================
# POST /api/wishes/{wish_id}/reject — 拒绝愿望 (FLOW-04)
# =============================================================================
@router.post("/{wish_id}/reject", response_model=WishResponse)
async def reject_wish(
    wish_id: int,
    reject_data: WishReject,
    current_user: User = Depends(require_role("chef", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """拒绝愿望（需提供拒绝原因；FLOW-04）"""
    try:
        wish = await wish_service.reject_wish(db, wish_id, current_user, reject_data)
    except WishPermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not wish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="愿望不存在",
        )

    await db.commit()
    await db.refresh(wish)
    return WishResponse.model_validate(wish)
