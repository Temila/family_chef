"""
家味 · Family Chef - 厨师管理路由
"""

from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token
from app.services.chef_service import chef_service
from app.schemas.user import UserResponse
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
async def list_chefs(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """厨师列表"""
    chefs = await chef_service.list_chefs(db)
    return [UserResponse.model_validate(c) for c in chefs]


@router.get("/schedules")
async def get_schedules(
    schedule_date: Optional[date] = Query(None, description="查询日期 (YYYY-MM-DD)"),
    chef_id: Optional[int] = Query(None, description="厨师 ID"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """排班查询"""
    schedules = await chef_service.get_schedules(
        db,
        schedule_date=schedule_date,
        chef_id=chef_id,
    )
    return [
        {
            "id": s.id,
            "chef_id": s.chef_id,
            "schedule_date": s.schedule_date.isoformat(),
            "meal_type": s.meal_type,
            "status": s.status,
            "notes": s.notes,
        }
        for s in schedules
    ]


@router.put("/schedules")
async def update_schedule(
    chef_id: int = Query(..., description="厨师 ID"),
    schedule_date: date = Query(..., description="排班日期 (YYYY-MM-DD)"),
    meal_type: str = Query(..., description="餐次类型：breakfast, lunch, dinner"),
    status: Optional[str] = Query(None, description="排班状态"),
    notes: Optional[str] = Query(None, description="备注"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """更新排班"""
    # 权限检查：仅管理员和厨师可更新排班
    if current_user.role not in ["admin", "chef"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，仅管理员和厨师可更新排班",
        )

    try:
        schedule = await chef_service.update_schedule(
            db,
            chef_id,
            schedule_date,
            meal_type,
            status=status,
            notes=notes,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    await db.commit()
    return {
        "id": schedule.id,
        "chef_id": schedule.chef_id,
        "schedule_date": schedule.schedule_date.isoformat(),
        "meal_type": schedule.meal_type,
        "status": schedule.status,
        "notes": schedule.notes,
    }
