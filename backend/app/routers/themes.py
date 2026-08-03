"""主题路由 (Phase 17 SYNC-02)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user_from_token
from app.schemas.theme import ThemeCreate, ThemeResponse, ThemeUpdate
from app.services.custom_theme_service import (
    ThemePermissionError,
    custom_theme_service,
)

router = APIRouter()


@router.get("", response_model=list[ThemeResponse])
async def list_themes(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """列出当前用户的所有自定义主题。"""
    themes = await custom_theme_service.list_themes(db, current_user)
    return [ThemeResponse.model_validate(t) for t in themes]


@router.post("", response_model=ThemeResponse, status_code=status.HTTP_201_CREATED)
async def create_theme(
    theme_data: ThemeCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """创建自定义主题。"""
    try:
        theme = await custom_theme_service.create_theme(db, current_user, theme_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await db.commit()
    await db.refresh(theme)
    return ThemeResponse.model_validate(theme)


@router.put("/{theme_id}", response_model=ThemeResponse)
async def update_theme(
    theme_id: int,
    theme_data: ThemeUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """更新主题(仅所有者)。"""
    try:
        theme = await custom_theme_service.update_theme(
            db, current_user, theme_id, theme_data
        )
    except ThemePermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await db.commit()
    await db.refresh(theme)
    return ThemeResponse.model_validate(theme)


@router.delete("/{theme_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_theme(
    theme_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """删除主题(仅所有者)。"""
    try:
        await custom_theme_service.delete_theme(db, current_user, theme_id)
    except ThemePermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    await db.commit()
