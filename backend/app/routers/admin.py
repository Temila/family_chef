"""
家味 · Family Chef - 系统管理路由
"""

from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token
from app.services.admin_service import admin_service
from app.services.dashboard_service import dashboard_service
from app.schemas.common import PageResponse
from app.models.user import User

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user_from_token)):
    """管理员权限检查"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，仅管理员可访问",
        )
    return current_user


@router.get("/logs")
async def list_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(None, description="用户 ID 筛选"),
    action: Optional[str] = Query(None, description="操作类型筛选"),
    target_type: Optional[str] = Query(None, description="目标类型筛选"),
    start_date: Optional[date] = Query(None, description="开始日期 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="结束日期 (YYYY-MM-DD)"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """系统日志查询"""
    from app.utils.pagination import PaginationParams

    params = PaginationParams(page=page, page_size=page_size)

    logs, total = await admin_service.list_logs(
        db,
        params,
        user_id=user_id,
        action=action,
        target_type=target_type,
        start_date=start_date,
        end_date=end_date,
    )

    items = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "detail": log.detail,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]

    return PageResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """系统统计数据"""
    stats = await admin_service.get_stats(db)
    return stats


@router.get("/dashboard")
async def get_dashboard(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """管理后台仪表盘数据"""
    dashboard_data = await dashboard_service.get_dashboard_data(db)
    return dashboard_data


@router.put("/config")
async def update_config(
    config_data: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """系统配置更新（占位，Phase 7+ 实现）"""
    # TODO: 实现系统配置更新
    return {"message": "系统配置更新 - 占位"}
