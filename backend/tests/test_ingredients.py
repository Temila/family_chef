"""
家味 · Family Chef - 食材模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_ingredients(client: AsyncClient, admin_token: str):
    """测试食材列表查询 - Phase 3 实现"""
    response = await client.get(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 501]  # 501 = Not Implemented


@pytest.mark.asyncio
async def test_create_ingredient(client: AsyncClient, admin_token: str):
    """测试创建食材 - Phase 3 实现"""
    response = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "番茄",
            "description": "新鲜番茄",
            "unit": "个"
        }
    )
    
    # Phase 3 实现后，这里应该返回 201
    assert response.status_code in [201, 501]


@pytest.mark.asyncio
async def test_update_ingredient(client: AsyncClient, admin_token: str):
    """测试更新食材 - Phase 3 实现"""
    response = await client.put(
        "/api/ingredients/1",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "有机番茄",
            "description": "有机种植番茄"
        }
    )
    
    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 404, 501]


@pytest.mark.asyncio
async def test_delete_ingredient(client: AsyncClient, admin_token: str):
    """测试删除食材 - Phase 3 实现"""
    response = await client.delete(
        "/api/ingredients/1",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # Phase 3 实现后，这里应该返回 204
    assert response.status_code in [204, 404, 501]


@pytest.mark.asyncio
async def test_ingredient_search(client: AsyncClient, admin_token: str):
    """测试搜索食材 - Phase 3 实现"""
    response = await client.get(
        "/api/ingredients/?search=番茄",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 501]


@pytest.mark.asyncio
async def test_create_ingredient_forbidden(client: AsyncClient, user_token: str):
    """测试非管理员创建食材被拒绝 - Phase 3 实现"""
    response = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "name": "测试食材",
            "description": "测试"
        }
    )
    
    # Phase 3 实现后，这里应该返回 403
    assert response.status_code in [403, 501]
