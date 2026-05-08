"""
家味 · Family Chef - 口味偏好路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token
from app.schemas.preference import PreferenceUpdate, PreferenceResponse
from app.services.preference_service import preference_service
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=PreferenceResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户口味偏好"""
    preferences = await preference_service.get_preferences(db, current_user.id)
    return PreferenceResponse(**preferences)


@router.put("/", response_model=PreferenceResponse)
async def update_preferences(
    preference_data: PreferenceUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """更新口味偏好（全量替换）"""
    try:
        preferences = await preference_service.update_preferences(
            db,
            current_user.id,
            dislikes=preference_data.dislikes,
            allergies=preference_data.allergies,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    await db.commit()
    return PreferenceResponse(**preferences)
