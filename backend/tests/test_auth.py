"""
家味 · Family Chef - 认证模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """测试登录成功"""
    response = await client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin"
    })
    # Phase 2 实现后取消注释
    # assert response.status_code == 200
    # data = response.json()
    # assert "access_token" in data


@pytest.mark.asyncio
async def test_login_failure(client: AsyncClient):
    """测试登录失败"""
    response = await client.post("/api/auth/login", json={
        "username": "admin",
        "password": "wrong"
    })
    # Phase 2 实现后取消注释
    # assert response.status_code == 401


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient):
    """测试 Token 刷新"""
    # Phase 2 实现后取消注释
    pass


@pytest.mark.asyncio
async def test_default_admin_login(client: AsyncClient):
    """测试默认管理员账号登录"""
    # Phase 2 实现后取消注释
    pass


@pytest.mark.asyncio
async def test_force_pwd_change(client: AsyncClient):
    """测试 force_pwd_change 标志"""
    # Phase 2 实现后取消注释
    pass
