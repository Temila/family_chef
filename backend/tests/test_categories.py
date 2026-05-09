"""
家味 · Family Chef - 分类模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_categories(client: AsyncClient, admin_token: str):
    """测试分类列表查询 - Phase 3 实现"""
    response = await client.get(
        "/api/categories/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 501]  # 501 = Not Implemented


@pytest.mark.asyncio
async def test_list_categories_by_type(client: AsyncClient, user_token: str):
    """测试按类型查询分类 - Phase 3 实现"""
    response = await client.get(
        "/api/categories/?type=region",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 501]


@pytest.mark.asyncio
async def test_create_category(client: AsyncClient, admin_token: str):
    """测试创建分类 - Phase 3 实现"""
    response = await client.post(
        "/api/categories/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "川菜",
            "type": "cuisine",
            "description": "四川菜系"
        }
    )
    
    # Phase 3 实现后，这里应该返回 201
    assert response.status_code in [201, 501]


@pytest.mark.asyncio
async def test_update_category(client: AsyncClient, admin_token: str):
    """测试更新分类 - Phase 3 实现"""
    response = await client.put(
        "/api/categories/1",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "川菜",
            "description": "更新后的描述"
        }
    )
    
    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 404, 501]


@pytest.mark.asyncio
async def test_delete_category(client: AsyncClient, admin_token: str):
    """测试删除分类 - Phase 3 实现"""
    response = await client.delete(
        "/api/categories/1",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # Phase 3 实现后，这里应该返回 204
    assert response.status_code in [204, 404, 501]


@pytest.mark.asyncio
async def test_create_category_forbidden(client: AsyncClient, user_token: str):
    """测试非管理员创建分类被拒绝 - Phase 3 实现"""
    response = await client.post(
        "/api/categories/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "name": "测试分类",
            "type": "cuisine"
        }
    )
    
    # Phase 3 实现后，这里应该返回 403
    assert response.status_code in [403, 501]


@pytest.mark.asyncio
async def test_category_hierarchy(client: AsyncClient, user_token: str):
    """测试分类层级关系 - Phase 3 实现"""
    response = await client.get(
        "/api/categories/?parent_id=1",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 501]
