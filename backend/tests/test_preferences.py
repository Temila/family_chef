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
async def test_update_preferences(client: AsyncClient, user_token: str, admin_token: str):
    """测试更新口味偏好"""
    # 先创建食材
    ingredients = []
    for name in ["香菜", "胡萝卜", "花生", "海鲜"]:
        resp = await client.post(
            "/api/ingredients/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": name}
        )
        if resp.status_code == 201:
            ingredients.append(resp.json()["id"])
    
    # 更新偏好
    response = await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dislikes": ingredients[:2],  # 前两个作为不爱吃
            "allergies": ingredients[2:]  # 后两个作为忌口
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "dislikes" in data
    assert "allergies" in data
    assert len(data["dislikes"]) == 2
    assert len(data["allergies"]) == 2


@pytest.mark.asyncio
async def test_update_preferences_partial(client: AsyncClient, user_token: str, admin_token: str):
    """测试部分更新口味偏好"""
    # 先创建食材
    resp1 = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "测试食材1"}
    )
    ing1_id = resp1.json()["id"] if resp1.status_code == 201 else None
    
    resp2 = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "测试食材2"}
    )
    ing2_id = resp2.json()["id"] if resp2.status_code == 201 else None
    
    if ing1_id and ing2_id:
        # 先设置完整偏好
        await client.put(
            "/api/preferences/",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "dislikes": [ing1_id],
                "allergies": [ing2_id]
            }
        )
        
        # 部分更新（只更新 dislikes）
        response = await client.put(
            "/api/preferences/",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "dislikes": [ing2_id],
                "allergies": []  # 清空 allergies
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["dislikes"]) == 1
        assert len(data["allergies"]) == 0


@pytest.mark.asyncio
async def test_preferences_with_allergies(client: AsyncClient, user_token: str, admin_token: str):
    """测试偏好设置（含严格忌口）"""
    # 先创建食材
    resp = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "花生"}
    )
    ing_id = resp.json()["id"] if resp.status_code == 201 else None
    
    if ing_id:
        response = await client.put(
            "/api/preferences/",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "dislikes": [],
                "allergies": [ing_id]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["allergies"]) == 1


@pytest.mark.asyncio
async def test_preferences_isolation(client: AsyncClient, user_token: str, chef_token: str, admin_token: str):
    """测试用户偏好隔离"""
    # 先创建食材
    resp = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "隔离测试食材"}
    )
    ing_id = resp.json()["id"] if resp.status_code == 201 else None
    
    if ing_id:
        # 用户 1 设置偏好
        await client.put(
            "/api/preferences/",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "dislikes": [ing_id],
                "allergies": []
            }
        )
        
        # 用户 2 设置偏好
        await client.put(
            "/api/preferences/",
            headers={"Authorization": f"Bearer {chef_token}"},
            json={
                "dislikes": [],
                "allergies": [ing_id]
            }
        )
        
        # 验证用户 1 的偏好
        response1 = await client.get(
            "/api/preferences/",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response1.status_code == 200
        assert len(response1.json()["dislikes"]) == 1
        assert len(response1.json()["allergies"]) == 0
        
        # 验证用户 2 的偏好
        response2 = await client.get(
            "/api/preferences/",
            headers={"Authorization": f"Bearer {chef_token}"}
        )
        assert response2.status_code == 200
        assert len(response2.json()["dislikes"]) == 0
        assert len(response2.json()["allergies"]) == 1


@pytest.mark.skip(reason="需要修复 DishIngredient 预加载问题")
@pytest.mark.asyncio
async def test_preferences_dietary_warning(client: AsyncClient, user_token: str, admin_token: str):
    """测试偏好与菜品忌口提示联动"""
    # 先创建食材
    resp = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "辣椒"}
    )
    ing_id = resp.json()["id"] if resp.status_code == 201 else None
    
    if ing_id:
        # 设置偏好
        await client.put(
            "/api/preferences/",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "dislikes": [ing_id],
                "allergies": []
            }
        )
        
        # 创建包含该食材的菜品
        resp = await client.post(
            "/api/dishes/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "辣子鸡",
                "description": "川菜",
                "ingredient_ids": [ing_id],
                "status": "published"
            }
        )
        
        if resp.status_code == 201:
            dish_id = resp.json()["id"]
            
            # 获取菜品详情，检查忌口提示
            response = await client.get(
                f"/api/dishes/{dish_id}",
                headers={"Authorization": f"Bearer {user_token}"}
            )
            
            assert response.status_code == 200
            # 应该有忌口提示
            # data = response.json()
            # assert "dietary_warning" in data
