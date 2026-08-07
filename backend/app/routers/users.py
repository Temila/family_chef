"""
家味 · Family Chef - 用户管理路由
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, field_validator
from app.database import get_db
from app.routers.auth import get_current_user_from_token, require_role, get_current_user_allow_force_pwd_change
from app.services.user_service import user_service
from app.services.user_theme_preferences_service import user_theme_preferences_service
from app.middleware.logging import log_action
from app.models.user import User
from app.schemas.user import _sanitize, _check_unsafe
from app.schemas.user_theme_preferences import (
    UserThemePreferencesResponse,
    UserThemePreferencesUpdate,
)

router = APIRouter()


class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    feishu_open_id: Optional[str] = None
    password: Optional[str] = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if v is not None and len(v) < 6:
            raise ValueError('密码至少 6 位')
        return v

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v):
        v = _sanitize(v)
        _check_unsafe(v, '显示名')
        return v

    @field_validator('email')
    @classmethod
    def validate_email_safe(cls, v):
        v = _sanitize(v)
        _check_unsafe(v, '邮箱')
        return v


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """用户列表"""
    result = await user_service.list_users(
        db,
        page=page,
        page_size=page_size,
        role=role,
        search=search,
    )
    return {
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "items": [
            {
                "id": u.id,
                "username": u.username,
                "display_name": u.display_name,
                "role": u.role,
                "is_active": u.is_active,
                "feishu_open_id": u.feishu_open_id,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in result["items"]
        ],
    }


@router.get("/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """用户详情"""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "force_pwd_change": user.force_pwd_change,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """更新用户（仅管理员）"""
    try:
        user = await user_service.update_user(
            db,
            user_id,
            display_name=request.display_name,
            email=request.email,
            role=request.role,
            is_active=request.is_active,
            feishu_open_id=request.feishu_open_id,
            password=request.password,
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在",
            )
        await db.commit()
        await log_action(current_user.id, "update_user", "user", user_id, f"更新用户 #{user_id}")
        return {"message": "用户更新成功"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/{user_id}/password")
async def update_password(
    user_id: int,
    request: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_allow_force_pwd_change),
):
    """修改密码"""
    # 用户只能修改自己的密码，管理员可以修改任何人的
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权修改其他用户的密码",
        )

    try:
        success = await user_service.update_user_password(
            db,
            user_id,
            request.old_password,
            request.new_password,
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在",
            )
        await db.commit()
        return {"message": "密码修改成功"}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """删除用户（软删除，仅管理员）"""
    # 不能删除自己
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己",
        )

    try:
        success = await user_service.delete_user(db, user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在",
            )
        await db.commit()
        await log_action(current_user.id, "delete_user", "user", user_id, f"删除用户 #{user_id}")
        return None
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/me/theme-preferences", response_model=UserThemePreferencesResponse)
async def get_my_theme_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """读取当前登录用户的主题偏好 (Phase 19 D-A7)。

    不存在时返回 404, 客户端据此触发首次迁移上传 (D-A5)。
    """
    try:
        row = await user_theme_preferences_service.get_or_404(db, current_user.id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未设置主题偏好",
        )
    return UserThemePreferencesResponse.model_validate(row)


@router.put("/me/theme-preferences", response_model=UserThemePreferencesResponse)
async def put_my_theme_preferences(
    payload: UserThemePreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """整体替换当前登录用户的主题偏好 (Phase 19 D-A1/D-A7)。

    服务端 LWW: upsert 语义, 不存在则创建, 存在则整体覆盖。
    """
    row = await user_theme_preferences_service.upsert(db, current_user.id, payload)
    await db.commit()
    await db.refresh(row)
    return UserThemePreferencesResponse.model_validate(row)
