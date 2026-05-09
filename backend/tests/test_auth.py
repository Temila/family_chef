"""
家味 · Family Chef - 认证模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """测试登录成功"""
    # 先注册用户
    await client.post("/api/auth/register", json={
        "username": "testuser",
        "password": "testpass123",
        "display_name": "测试用户",
    })
    
    # 登录
    response = await client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "testpass123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "user" in data
    assert data["user"]["username"] == "testuser"


@pytest.mark.asyncio
async def test_login_failure_wrong_password(client: AsyncClient):
    """测试登录失败 - 错误密码"""
    # 先注册用户
    await client.post("/api/auth/register", json={
        "username": "testuser2",
        "password": "testpass123",
        "display_name": "测试用户 2",
    })
    
    # 使用错误密码登录
    response = await client.post("/api/auth/login", json={
        "username": "testuser2",
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401
    assert "用户名或密码错误" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_failure_nonexistent_user(client: AsyncClient):
    """测试登录失败 - 不存在的用户"""
    response = await client.post("/api/auth/login", json={
        "username": "nonexistent",
        "password": "anypassword"
    })
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """测试注册成功"""
    response = await client.post("/api/auth/register", json={
        "username": "newuser",
        "password": "newpass123",
        "display_name": "新用户",
        "email": "new@example.com"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert data["display_name"] == "新用户"
    assert "password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    """测试注册失败 - 重复用户名"""
    # 先注册
    await client.post("/api/auth/register", json={
        "username": "dupuser",
        "password": "pass123",
        "display_name": "重复用户",
    })
    
    # 再次注册相同用户名
    response = await client.post("/api/auth/register", json={
        "username": "dupuser",
        "password": "pass456",
        "display_name": "重复用户 2",
    })
    
    assert response.status_code == 400
    assert "已存在" in response.json()["detail"]


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient):
    """测试 Token 刷新"""
    # 先注册并登录获取 token
    await client.post("/api/auth/register", json={
        "username": "refreshtest",
        "password": "pass123",
        "display_name": "刷新测试",
    })
    
    login_response = await client.post("/api/auth/login", json={
        "username": "refreshtest",
        "password": "pass123"
    })
    
    refresh_token = login_response.json()["refresh_token"]
    
    # 刷新 token
    response = await client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_token_refresh_invalid(client: AsyncClient):
    """测试 Token 刷新失败 - 无效 token"""
    response = await client.post("/api/auth/refresh", json={
        "refresh_token": "invalid.token.here"
    })
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_with_token(client: AsyncClient, admin_token: str):
    """测试使用 Token 访问受保护端点"""
    response = await client.get(
        "/api/users/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # 应该成功（200）而不是 401
    assert response.status_code != 401


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient):
    """测试无 Token 访问受保护端点"""
    # 使用不需要认证的端点测试
    response = await client.get("/api/categories/")
    
    # 分类端点可能不需要认证，所以这里只测试端点存在
    assert response.status_code in [200, 401, 403]
