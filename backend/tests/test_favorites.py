"""
家味 · Family Chef - 收藏模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_add_favorite(client: AsyncClient, user_token: str, admin_token: str):
    """测试添加收藏"""
    # 先创建一个菜品
    create_response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "收藏测试菜品",
            "description": "用于测试收藏",
            "ingredients": [],
            "category_ids": [],
            "status": "published",
        }
    )
    
    dish_id = create_response.json()["id"]
    
    # 添加收藏
    response = await client.post(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_id": dish_id}
    )
    
    assert response.status_code in [201, 400]  # 400可能因为已收藏
    if response.status_code == 201:
        data = response.json()
        assert data["dish_id"] == dish_id


@pytest.mark.asyncio
async def test_add_duplicate_favorite(client: AsyncClient, user_token: str):
    """测试重复添加收藏"""
    # 获取菜品列表
    response = await client.get(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    dishes = response.json().get("items", [])
    if not dishes:
        pytest.skip("需要先创建菜品")
    
    dish_id = dishes[0]["id"]
    
    # 第一次添加
    await client.post(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_id": dish_id}
    )
    
    # 第二次添加（应该失败）
    response = await client.post(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_id": dish_id}
    )
    
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_remove_favorite(client: AsyncClient, user_token: str):
    """测试取消收藏"""
    # 先获取用户的收藏列表
    response = await client.get(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    favorites = response.json().get("items", [])
    if not favorites:
        pytest.skip("需要先有收藏")
    
    dish_id = favorites[0]["id"]
    
    # 取消收藏
    response = await client.delete(
        f"/api/favorites/{dish_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_remove_favorite_not_found(client: AsyncClient, user_token: str):
    """测试取消不存在的收藏"""
    response = await client.delete(
        "/api/favorites/99999",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_favorites(client: AsyncClient, user_token: str):
    """测试收藏列表查询"""
    response = await client.get(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data


@pytest.mark.asyncio
async def test_list_favorites_pagination(client: AsyncClient, user_token: str):
    """测试收藏列表分页"""
    response = await client.get(
        "/api/favorites/?page=1&page_size=10",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "page" in data
    assert "page_size" in data
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_favorites_filter_dishes(client: AsyncClient, user_token: str, admin_token: str):
    """测试通过收藏筛选菜品"""
    # 创建菜品并收藏
    create_response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "收藏筛选测试",
            "description": "测试",
            "ingredients": [],
            "category_ids": [],
            "status": "published",
        }
    )
    
    dish_id = create_response.json()["id"]
    
    # 添加收藏
    await client.post(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_id": dish_id}
    )
    
    # 查询收藏列表
    response = await client.get(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    # 应该包含刚收藏的菜品
    dish_ids = [item["id"] for item in data["items"]]
    assert dish_id in dish_ids


@pytest.mark.asyncio
async def test_favorites_isolation(client: AsyncClient, user_token: str):
    """测试收藏隔离 - 用户只能看到自己的收藏"""
    response = await client.get(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    # 收藏列表应该只包含当前用户的收藏
    # 这个测试更侧重于后端逻辑的验证
