"""
家味 · Family Chef - 认证路由
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import UserLogin, UserCreate, UserResponse, TokenResponse
from app.services.auth_service import auth_service
from app.utils.security import decode_access_token
from app.middleware.logging import log_action
from app.middleware.rate_limit import rate_limit_auth

router = APIRouter()
security = HTTPBearer()


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLogin, db: AsyncSession = Depends(get_db), _=Depends(rate_limit_auth)):
    """用户登录"""
    user = await auth_service.authenticate_user(db, request.username, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    tokens = auth_service.create_tokens(user)
    await log_action(user.id, "login", detail=f"用户 {user.username} 登录")
    tokens["user"] = UserResponse.model_validate(user)

    return TokenResponse(**tokens)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: UserCreate, db: AsyncSession = Depends(get_db), _=Depends(rate_limit_auth)):
    """用户注册"""
    try:
        user = await auth_service.create_user(
            db,
            username=request.username,
            password=request.password,
            display_name=request.display_name,
            email=request.email,
        )
        await db.commit()
        return UserResponse.model_validate(user)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: dict,
    db: AsyncSession = Depends(get_db),
):
    """刷新 Token"""
    refresh_token = request.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="缺少 refresh_token",
        )

    result = await auth_service.refresh_access_token(db, refresh_token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的 refresh_token",
        )

    # 获取用户信息
    from app.utils.security import decode_access_token
    payload = decode_access_token(result["access_token"])
    user_id = int(payload.get("sub"))
    from sqlalchemy import select
    from app.models.user import User
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    result["user"] = UserResponse.model_validate(user)
    return TokenResponse(**result)


async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
    _allow_force_pwd_change: bool = False,
):
    """从 Token 获取当前用户（依赖注入）"""
    token = credentials.credentials
    user = await auth_service.get_current_user(db, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的 Token",
        )

    if not _allow_force_pwd_change and user.force_pwd_change:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="首次登录请修改密码",
        )

    return user


async def get_current_user_allow_force_pwd_change(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """允许 force_pwd_change 用户通过（用于修改密码接口）"""
    return await get_current_user_from_token(credentials, db, _allow_force_pwd_change=True)


def require_role(*roles: str):
    """角色权限检查装饰器"""
    async def role_checker(current_user=Depends(get_current_user_from_token)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要以下角色之一: {', '.join(roles)}",
            )
        return current_user
    return role_checker
