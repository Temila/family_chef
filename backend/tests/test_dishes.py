"""
家味 · Family Chef - 菜品模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_dish(client: AsyncClient, admin_token: str):
    """测试创建菜品"""
    response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "麻婆豆腐",
            "description": "经典川菜",
            "ingredients": ["豆腐", "猪肉末", "辣椒"],
            "category_ids": [],  # 先不关联分类
            "image_url": "https://example.com/mapo.jpg",
            "status": "published",
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "麻婆豆腐"
    # 管理员创建菜品时路由强制 status="enabled"（dishes.py 第 144-145 行）
    assert data["status"] == "enabled"


@pytest.mark.asyncio
async def test_create_dish_forbidden(client: AsyncClient, user_token: str):
    """测试非管理员/厨师创建菜品被拒绝"""
    response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "name": "测试菜品",
            "description": "测试",
            "ingredients": [],
            "category_ids": [],
        }
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_dishes(client: AsyncClient, admin_token: str):
    """测试菜品列表查询"""
    # 先创建几个菜品
    for i in range(3):
        await client.post(
            "/api/dishes/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": f"菜品{i}",
                "description": f"菜品{i}描述",
                "ingredients": [],
                "category_ids": [],
                "status": "published",
            }
        )
    
    response = await client.get(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data


@pytest.mark.asyncio
async def test_get_dish(client: AsyncClient, admin_token: str):
    """测试获取菜品详情"""
    # 先创建菜品
    create_response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "红烧肉",
            "description": "经典鲁菜",
            "ingredients": ["猪肉", "酱油"],
            "category_ids": [],
            "status": "published",
        }
    )
    
    dish_id = create_response.json()["id"]
    
    response = await client.get(
        f"/api/dishes/{dish_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "红烧肉"


@pytest.mark.asyncio
async def test_get_dish_not_found(client: AsyncClient, admin_token: str):
    """测试获取不存在的菜品"""
    response = await client.get(
        "/api/dishes/99999",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_dish(client: AsyncClient, admin_token: str):
    """测试更新菜品"""
    # 先创建菜品
    create_response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "宫保鸡丁",
            "description": "经典川菜",
            "ingredients": ["鸡肉", "花生"],
            "category_ids": [],
            "status": "published",
        }
    )
    
    dish_id = create_response.json()["id"]
    
    # 更新菜品
    response = await client.put(
        f"/api/dishes/{dish_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "description": "更新后的描述",
        }
    )
    
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_delete_dish(client: AsyncClient, admin_token: str):
    """测试删除菜品"""
    # 先创建菜品
    create_response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "删除测试",
            "description": "待删除",
            "ingredients": [],
            "category_ids": [],
            "status": "published",
        }
    )
    
    dish_id = create_response.json()["id"]
    
    # 删除菜品
    response = await client.delete(
        f"/api/dishes/{dish_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_search_dishes(client: AsyncClient, admin_token: str):
    """测试搜索菜品"""
    # 创建菜品
    await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "番茄炒蛋",
            "description": "家常菜",
            "ingredients": ["番茄", "鸡蛋"],
            "category_ids": [],
            "status": "published",
        }
    )
    
    response = await client.get(
        "/api/dishes/?search=番茄&status=all",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_update_dish_status(client: AsyncClient, admin_token: str):
    """测试更新菜品状态"""
    # 先创建菜品
    create_response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "状态测试",
            "description": "测试状态变更",
            "ingredients": [],
            "category_ids": [],
            "status": "draft",
        }
    )
    
    dish_id = create_response.json()["id"]

    # 更新状态为 disabled（Dish.status 仅接受 enabled/disabled）
    response = await client.put(
        f"/api/dishes/{dish_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "disabled"}
    )

    assert response.status_code == 200
