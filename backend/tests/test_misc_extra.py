"""
家味 · Family Chef — 中间件/工具函数补充测试
覆盖 logging middleware 和 admin_service 的更多分支
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


def test_get_client_ip_forwarded():
    """X-Forwarded-For 头（覆盖行 40-42）"""
    from app.middleware.logging import get_client_ip

    request = MagicMock(spec=Request)
    request.headers = {"X-Forwarded-For": "1.2.3.4, 5.6.7.8"}
    request.client = None
    assert get_client_ip(request) == "1.2.3.4"


def test_get_client_ip_direct():
    """直接连接（覆盖行 43）"""
    from app.middleware.logging import get_client_ip

    request = MagicMock(spec=Request)
    request.headers = {}
    request.client = MagicMock()
    request.client.host = "9.8.7.6"
    assert get_client_ip(request) == "9.8.7.6"


def test_get_client_ip_no_client():
    """无 client 信息（覆盖行 43 的 else）"""
    from app.middleware.logging import get_client_ip

    request = MagicMock(spec=Request)
    request.headers = {}
    request.client = None
    assert get_client_ip(request) == "unknown"


@pytest.mark.asyncio
async def test_admin_log_and_list(db: AsyncSession):
    """记录操作日志 + 列表（覆盖 admin_service 的 68-108 行）"""
    from app.services.admin_service import AdminService
    from app.utils.pagination import PaginationParams
    from app.models.user import User
    from app.utils.security import hash_password

    # 先创建用户以避免 FK 约束
    user = User(
        username="log_user", password_hash=hash_password("t"),
        display_name="日志用户", role="admin", is_active=True, force_pwd_change=False,
    )
    db.add(user)
    await db.flush()

    log = await AdminService.log_action(
        db,
        user_id=user.id,
        action="test_action",
        target_type="dish",
        target_id=1,
        detail="测试日志",
        ip_address="127.0.0.1",
    )
    await db.flush()
    assert log is not None
    assert log.action == "test_action"

    # 列表查询
    params = PaginationParams(page=1, page_size=10)
    logs, total = await AdminService.list_logs(db, params)
    assert total >= 1


@pytest.mark.asyncio
async def test_admin_log_minimal(db: AsyncSession):
    """最小参数记录日志（覆盖 admin_service 更多行）"""
    from app.services.admin_service import AdminService

    log = await AdminService.log_action(
        db,
        user_id=None,
        action="anonymous_action",
    )
    await db.flush()
    assert log is not None


@pytest.mark.asyncio
async def test_preference_allergy_and_remove(db: AsyncSession):
    """过敏 + 移除偏好（覆盖 preference_service 的 80-86, 115-123 行）"""
    from app.services.preference_service import PreferenceService
    from app.models.user import User
    from app.models.ingredient import Ingredient
    from app.utils.security import hash_password

    user = User(username="allergy_user", password_hash=hash_password("t"), display_name="T", role="user", is_active=True, force_pwd_change=False)
    db.add(user)
    ing = Ingredient(name="花生", pinyin="huasheng", category="nut", is_active=True)
    db.add(ing)
    await db.flush()

    svc = PreferenceService()

    # 添加过敏
    pref = await svc.add_allergy(db, user.id, ing.id)
    await db.flush()
    assert pref is not None

    # 获取偏好
    prefs = await svc.get_preferences(db, user.id)
    assert isinstance(prefs, dict)

    # 移除过敏
    result = await svc.remove_allergy(db, user.id, ing.id)
    await db.flush()
    assert result is True

    # 移除不存在的
    result = await svc.remove_allergy(db, user.id, ing.id)
    assert result is False


@pytest.mark.asyncio
async def test_preference_update_preferences(db: AsyncSession):
    """批量更新偏好（覆盖 preference_service 的 160-175 行）"""
    from app.services.preference_service import PreferenceService
    from app.models.user import User
    from app.models.ingredient import Ingredient
    from app.utils.security import hash_password

    user = User(username="batch_user", password_hash=hash_password("t"), display_name="T", role="user", is_active=True, force_pwd_change=False)
    db.add(user)
    ing1 = Ingredient(name="牛奶", pinyin="niunai", category="dairy", is_active=True)
    ing2 = Ingredient(name="鸡蛋", pinyin="jidan", category="egg", is_active=True)
    db.add_all([ing1, ing2])
    await db.flush()

    svc = PreferenceService()
    result = await svc.update_preferences(
        db, user.id,
        dislikes=[ing1.id],
        allergies=[ing2.id],
    )
    await db.flush()
    assert isinstance(result, dict)
