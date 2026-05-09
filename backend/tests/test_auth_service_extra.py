"""
家味 · Family Chef — 认证服务补充测试（冲刺 80% 覆盖率）
覆盖 AuthService 的未覆盖分支
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.auth_service import AuthService
from app.models.user import User
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.pagination import PaginationParams


async def _make_user(db: AsyncSession, **kwargs) -> User:
    defaults = {
        "username": "auth_test_user",
        "password_hash": hash_password("test123"),
        "display_name": "测试",
        "role": "user",
        "is_active": True,
        "force_pwd_change": False,
    }
    defaults.update(kwargs)
    user = User(**defaults)
    db.add(user)
    await db.flush()
    return user


@pytest.mark.asyncio
async def test_authenticate_user_not_found(db: AsyncSession):
    """用户名不存在 → None（覆盖行 34）"""
    result = await AuthService.authenticate_user(db, "不存在", "pass")
    assert result is None


@pytest.mark.asyncio
async def test_authenticate_user_wrong_password(db: AsyncSession):
    """密码错误 → None（覆盖行 37）"""
    await _make_user(db, username="wrong_pw_user")
    result = await AuthService.authenticate_user(db, "wrong_pw_user", "wrong")
    assert result is None


@pytest.mark.asyncio
async def test_authenticate_user_inactive(db: AsyncSession):
    """用户被禁用 → None（覆盖行 40）"""
    await _make_user(db, username="inactive_user", is_active=False)
    result = await AuthService.authenticate_user(db, "inactive_user", "test123")
    assert result is None


@pytest.mark.asyncio
async def test_authenticate_user_success(db: AsyncSession):
    """正常登录成功"""
    user = await _make_user(db, username="good_user")
    result = await AuthService.authenticate_user(db, "good_user", "test123")
    assert result is not None
    assert result.username == "good_user"


@pytest.mark.asyncio
async def test_create_user_success(db: AsyncSession):
    """创建用户成功（覆盖行 59）"""
    user = await AuthService.create_user(
        db,
        username="new_user",
        password="newpass123",
        display_name="新用户",
    )
    await db.flush()
    assert user.id is not None
    assert user.username == "new_user"
    assert verify_password("newpass123", user.password_hash)


@pytest.mark.asyncio
async def test_refresh_token_invalid_token(db: AsyncSession):
    """无效 refresh token → None（覆盖行 115）"""
    result = await AuthService.refresh_access_token(db, "invalid_token")
    assert result is None


@pytest.mark.asyncio
async def test_refresh_token_wrong_type(db: AsyncSession):
    """access token（非 refresh）→ None（覆盖行 115）"""
    user = await _make_user(db, username="refresh_type_user")
    await db.flush()
    # 创建 access token 而非 refresh
    access_token = create_access_token({"sub": str(user.id), "type": "access"})
    result = await AuthService.refresh_access_token(db, access_token)
    assert result is None


@pytest.mark.asyncio
async def test_refresh_token_user_not_found(db: AsyncSession):
    """refresh token 中用户不存在 → None（覆盖行 121-126）"""
    refresh_token = create_access_token({"sub": "99999", "type": "refresh"})
    result = await AuthService.refresh_access_token(db, refresh_token)
    assert result is None


@pytest.mark.asyncio
async def test_refresh_token_user_inactive(db: AsyncSession):
    """refresh token 中用户被禁用 → None（覆盖行 121-126）"""
    user = await _make_user(db, username="refresh_inactive", is_active=False)
    await db.flush()
    refresh_token = create_access_token({"sub": str(user.id), "type": "refresh"})
    result = await AuthService.refresh_access_token(db, refresh_token)
    assert result is None


@pytest.mark.asyncio
async def test_refresh_token_success(db: AsyncSession):
    """正常刷新 token（覆盖行 126）"""
    user = await _make_user(db, username="refresh_ok")
    await db.flush()
    refresh_token = create_access_token({"sub": str(user.id), "type": "refresh"})
    result = await AuthService.refresh_access_token(db, refresh_token)
    assert result is not None
    assert "access_token" in result


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(db: AsyncSession):
    """无效 token → None（覆盖行 136）"""
    result = await AuthService.get_current_user(db, "invalid")
    assert result is None


@pytest.mark.asyncio
async def test_get_current_user_wrong_type(db: AsyncSession):
    """refresh token 而非 access → None（覆盖行 139）"""
    user = await _make_user(db, username="current_type")
    await db.flush()
    refresh_token = create_access_token({"sub": str(user.id), "type": "refresh"})
    result = await AuthService.get_current_user(db, refresh_token)
    assert result is None


@pytest.mark.asyncio
async def test_get_current_user_not_found(db: AsyncSession):
    """用户不存在 → None（覆盖行 145-150）"""
    access_token = create_access_token({"sub": "99999", "type": "access"})
    result = await AuthService.get_current_user(db, access_token)
    assert result is None


@pytest.mark.asyncio
async def test_get_current_user_inactive(db: AsyncSession):
    """用户被禁用 → None（覆盖行 145-150）"""
    user = await _make_user(db, username="current_inactive", is_active=False)
    await db.flush()
    access_token = create_access_token({"sub": str(user.id), "type": "access"})
    result = await AuthService.get_current_user(db, access_token)
    assert result is None


@pytest.mark.asyncio
async def test_get_current_user_success(db: AsyncSession):
    """正常获取当前用户"""
    user = await _make_user(db, username="current_ok")
    await db.flush()
    access_token = create_access_token({"sub": str(user.id), "type": "access"})
    result = await AuthService.get_current_user(db, access_token)
    assert result is not None
    assert result.username == "current_ok"
