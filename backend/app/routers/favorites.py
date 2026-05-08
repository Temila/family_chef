"""
家味 · Family Chef - 收藏管理路由
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token
from app.schemas.favorite import FavoriteCreate, FavoriteResponse
from app.schemas.common import PageResponse
from app.services.favorite_service import favorite_service
from app.schemas.dish import DishListResponse
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    favorite_data: FavoriteCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """添加收藏"""
    try:
        favorite = await favorite_service.add_favorite(
            db,
            current_user.id,
            favorite_data.dish_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    await db.commit()
    return FavoriteResponse.model_validate(favorite)


@router.delete("/{dish_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    dish_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """取消收藏"""
    success = await favorite_service.remove_favorite(
        db,
        current_user.id,
        dish_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="收藏不存在",
        )

    await db.commit()


@router.get("/", response_model=PageResponse[DishListResponse])
async def list_favorites(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """收藏列表"""
    from app.utils.pagination import PaginationParams

    params = PaginationParams(page=page, page_size=page_size)

    dishes, total = await favorite_service.list_favorites(
        db,
        current_user.id,
        params,
    )

    items = [DishListResponse.model_validate(d) for d in dishes]

    return PageResponse[DishListResponse](
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
