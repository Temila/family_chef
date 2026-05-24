"""
家味 · Family Chef - 访客邀请路由
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import require_role
from app.models.user import User
from app.services.guest_service import guest_service
from app.services.dish_service import dish_service
from app.schemas.guest import (
    GuestInvitationCreate,
    GuestInvitationResponse,
    GuestOrderCreate,
    GuestOrderSummaryResponse,
)
from app.schemas.dish import DishListResponse
from app.schemas.common import PageResponse
from app.utils.pagination import PaginationParams

router = APIRouter()


@router.post("/invitations", status_code=status.HTTP_201_CREATED)
async def create_invitation(
    invitation_data: Optional[GuestInvitationCreate] = None,
    current_user: User = Depends(require_role("chef", "user")),
    db: AsyncSession = Depends(get_db),
):
    """创建访客邀请链接"""
    chef_id = invitation_data.chef_id if invitation_data else None
    try:
        invitation = await guest_service.create_invitation(db, current_user, chef_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return GuestInvitationResponse.model_validate(invitation)


@router.get("/{token}/dishes", response_model=PageResponse[DishListResponse])
async def guest_list_dishes(
    token: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """访客浏览指定厨师的上架菜品"""
    try:
        invitation = await guest_service.validate_invitation(db, token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    params = PaginationParams(page=page, page_size=page_size)
    dishes, total = await guest_service.get_guest_dishes(
        db, invitation, params, search=search, category_id=category_id
    )

    items = []
    for d in dishes:
        resp = DishListResponse.model_validate(d)
        items.append(resp)

    return PageResponse[DishListResponse](
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.post("/{token}/orders", status_code=status.HTTP_201_CREATED)
async def guest_submit_order(
    token: str,
    order_data: GuestOrderCreate,
    db: AsyncSession = Depends(get_db),
):
    """访客提交一次性订单（无需认证）"""
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="订单不能为空",
        )

    try:
        order = await guest_service.submit_guest_order(db, token, order_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return {
        "order_no": order.order_no,
        "status": order.status,
        "notes": order.notes,
        "created_at": order.created_at,
        "items": [
            {"dish_id": item.dish_id, "quantity": item.quantity}
            for item in order_data.items
        ],
    }


@router.get("/{token}/summary")
async def guest_view_summary(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """已使用链接查看订单摘要（无需认证）"""
    try:
        summary = await guest_service.get_used_invitation_summary(db, token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return summary
