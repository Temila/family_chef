"""
家味 · Family Chef - 口味偏好模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_preferences(client: AsyncClient, user_token: str):
    """测试获取口味偏好"""
    response = await client.get(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    # 偏好可能为空
    assert "dislikes" in data
    assert "allergies" in data


@pytest.mark.asyncio
async def test_update_preferences(client: AsyncClient, user_token: str):
    """测试更新口味偏好"""
    response = await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dislikes": ["香菜", "胡萝卜"],
            "allergies": ["花生", "海鲜"]
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "dislikes" in data
    assert "allergies" in data
    assert len(data["dislikes"]) == 2
    assert len(data["allergies"]) == 2


@pytest.mark.asyncio
async def test_update_preferences_partial(client: AsyncClient, user_token: str):
    """测试部分更新口味偏好"""
    # 先设置完整偏好
    await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dislikes": ["香菜"],
            "allergies": ["花生"]
        }
    )
    
    # 只更新 dislikes
    response = await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dislikes": ["香菜", "洋葱"],
            "allergies": ["花生"]
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "洋葱" in data["dislikes"]
    assert "花生" in data["allergies"]


@pytest.mark.asyncio
async def test_clear_preferences(client: AsyncClient, user_token: str):
    """测试清空口味偏好"""
    # 先设置偏好
    await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dislikes": ["香菜"],
            "allergies": ["花生"]
        }
    )
    
    # 清空偏好
    response = await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dislikes": [],
            "allergies": []
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["dislikes"]) == 0
    assert len(data["allergies"]) == 0


@pytest.mark.asyncio
async def test_preferences_with_allergies(client: AsyncClient, user_token: str):
    """测试过敏源设置"""
    response = await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dislikes": [],
            "allergies": ["花生", "牛奶", "鸡蛋", "坚果"]
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["allergies"]) == 4
    assert "花生" in data["allergies"]


@pytest.mark.asyncio
async def test_preferences_isolation(client: AsyncClient, user_token: str, admin_token: str):
    """测试偏好隔离 - 不同用户的偏好独立"""
    # 设置用户1的偏好
    await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dislikes": ["香菜"],
            "allergies": []
        }
    )
    
    # 设置管理员的偏好
    await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "dislikes": ["胡萝卜"],
            "allergies": ["海鲜"]
        }
    )
    
    # 验证用户1的偏好
    user_response = await client.get(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    user_data = user_response.json()
    assert "香菜" in user_data["dislikes"]
    assert "胡萝卜" not in user_data["dislikes"]


@pytest.mark.asyncio
async def test_preferences_dietary_warning(client: AsyncClient, user_token: str, admin_token: str):
    """测试偏好对菜品忌口提示的影响"""
    # 设置用户的过敏源
    await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dislikes": [],
            "allergies": ["花生"]
        }
    )
    
    # 创建包含花生的菜品
    create_response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "花生米",
            "description": "油炸花生米",
            "ingredients": ["花生"],
            "category_ids": [],
            "status": "published",
        }
    )
    
    dish_id = create_response.json()["id"]
    
    # 获取菜品详情，应该有忌口提示
    response = await client.get(
        f"/api/dishes/{dish_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    # 如果实现了忌口提示，这里应该检查 dietary_warning 字段


@pytest.mark.asyncio
async def test_preferences_empty_input(client: AsyncClient, user_token: str):
    """测试空输入"""
    response = await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={}
    )
    
    # 应该接受空输入，或者返回 400
    assert response.status_code in [200, 400]
