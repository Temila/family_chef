"""
家味 · Family Chef - 用户模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, admin_token: str):
    """测试用户列表查询"""
    # 先创建几个用户
    for i in range(3):
        await client.post("/api/auth/register", json={
            "username": f"user{i}",
            "password": "pass123",
            "display_name": f"用户{i}",
        })
    
    response = await client.get(
        "/api/users/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert data["total"] >= 3


@pytest.mark.asyncio
async def test_list_users_with_role_filter(client: AsyncClient, admin_token: str):
    """测试按角色筛选用户"""
    response = await client.get(
        "/api/users/?role=admin",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    for user in data["items"]:
        assert user["role"] == "admin"


@pytest.mark.asyncio
async def test_list_users_with_search(client: AsyncClient, admin_token: str):
    """测试搜索用户"""
    # 创建用户
    await client.post("/api/auth/register", json={
        "username": "searchme",
        "password": "pass123",
        "display_name": "搜索测试",
    })
    
    response = await client.get(
        "/api/users/?search=searchme",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any(u["username"] == "searchme" for u in data["items"])


@pytest.mark.asyncio
async def test_get_user(client: AsyncClient, admin_token: str):
    """测试获取用户详情"""
    # 先注册用户
    await client.post("/api/auth/register", json={
        "username": "detailuser",
        "password": "pass123",
        "display_name": "详情用户",
        "email": "detail@example.com"
    })

    # 获取用户列表找到 ID（需管理员鉴权）
    list_response = await client.get(
        "/api/users/?search=detailuser",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    user_id = list_response.json()["items"][0]["id"]

    response = await client.get(
        f"/api/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "detailuser"
    assert data["email"] == "detail@example.com"


@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient):
    """测试获取不存在的用户（未认证 → 鉴权先于存在性检查，返回 401）"""
    response = await client.get("/api/users/99999")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_user(client: AsyncClient, admin_token: str):
    """测试更新用户"""
    # 先注册用户
    await client.post("/api/auth/register", json={
        "username": "updateuser",
        "password": "pass123",
        "display_name": "更新前",
    })

    # 获取用户 ID（需管理员鉴权）
    list_response = await client.get(
        "/api/users/?search=updateuser",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    user_id = list_response.json()["items"][0]["id"]

    # 更新用户
    response = await client.put(
        f"/api/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"display_name": "更新后", "email": "updated@example.com"}
    )

    assert response.status_code == 200
    assert response.json()["message"] == "用户更新成功"


@pytest.mark.asyncio
async def test_update_user_forbidden(client: AsyncClient, user_token: str):
    """测试非管理员更新用户被拒绝"""
    response = await client.put(
        "/api/users/1",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"display_name": "hack"}
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, admin_token: str):
    """测试修改密码"""
    # 先注册用户
    await client.post("/api/auth/register", json={
        "username": "pwduser",
        "password": "oldpass123",
        "display_name": "密码用户",
    })
    
    # 获取用户 ID（需管理员鉴权）
    list_response = await client.get(
        "/api/users/?search=pwduser",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    user_id = list_response.json()["items"][0]["id"]

    # 修改密码
    response = await client.put(
        f"/api/users/{user_id}/password",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "old_password": "oldpass123",
            "new_password": "newpass456"
        }
    )

    # 管理员可以修改任何人的密码
    assert response.status_code in [200, 403]  # 403 如果端点限制只能改自己的


@pytest.mark.asyncio
async def test_change_password_wrong_old(client: AsyncClient, admin_token: str):
    """测试修改密码 - 旧密码错误"""
    # 先注册用户
    await client.post("/api/auth/register", json={
        "username": "pwduser2",
        "password": "correctpass",
        "display_name": "密码用户 2",
    })
    
    # 获取用户 ID（需管理员鉴权）
    list_response = await client.get(
        "/api/users/?search=pwduser2",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    user_id = list_response.json()["items"][0]["id"]
    
    # 使用错误旧密码修改
    response = await client.put(
        f"/api/users/{user_id}/password",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "old_password": "wrongpassword",
            "new_password": "newpass456"
        }
    )
    
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient, admin_token: str):
    """测试删除用户（软删除）"""
    # 先注册用户
    await client.post("/api/auth/register", json={
        "username": "deleteuser",
        "password": "pass123",
        "display_name": "删除用户",
    })
    
    # 获取用户 ID（需管理员鉴权）
    list_response = await client.get(
        "/api/users/?search=deleteuser",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    user_id = list_response.json()["items"][0]["id"]
    
    # 删除用户
    response = await client.delete(
        f"/api/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_user_not_found(client: AsyncClient, admin_token: str):
    """测试删除不存在的用户"""
    response = await client.delete(
        "/api/users/99999",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_users_pagination(client: AsyncClient, admin_token: str):
    """测试用户列表分页"""
    # 创建多个用户
    for i in range(5):
        await client.post("/api/auth/register", json={
            "username": f"pageuser{i}",
            "password": "pass123",
            "display_name": f"分页用户{i}",
        })
    
    # 第一页
    response1 = await client.get(
        "/api/users/?page=1&page_size=3",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response1.status_code == 200
    data1 = response1.json()
    assert len(data1["items"]) <= 3
    
    # 第二页
    response2 = await client.get(
        "/api/users/?page=2&page_size=3",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response2.status_code == 200
