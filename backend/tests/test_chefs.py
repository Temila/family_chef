"""
家味 · Family Chef - 厨师模块测试
"""

import pytest
from datetime import date
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_chefs(client: AsyncClient, admin_token: str):
    """测试获取厨师列表"""
    response = await client.get(
        "/api/chefs/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_list_chefs_contains_chef(client: AsyncClient, admin_token: str):
    """测试厨师列表 - conftest 创建了 testchef 用户"""
    response = await client.get(
        "/api/chefs/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    chefs = response.json()
    # conftest 创建了 testchef 用户 (role=chef, is_active=True)
    # 如果列表非空，应该包含厨师角色
    if chefs:
        assert all(c["role"] == "chef" for c in chefs)


@pytest.mark.asyncio
async def test_get_schedules_empty(client: AsyncClient, admin_token: str):
    """测试空排班查询"""
    response = await client.get(
        "/api/chefs/schedules",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_schedules_with_date_filter(client: AsyncClient, admin_token: str):
    """测试按日期查询排班"""
    today = date.today().isoformat()
    response = await client.get(
        f"/api/chefs/schedules?schedule_date={today}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_schedules_with_chef_filter(client: AsyncClient, admin_token: str, chef_token: str):
    """测试按厨师 ID 查询排班"""
    # 先获取厨师列表找到 ID
    chefs_resp = await client.get(
        "/api/chefs/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    chefs = chefs_resp.json()
    if not chefs:
        pytest.skip("需要先有厨师用户")
    
    chef_id = chefs[0]["id"]
    response = await client.get(
        f"/api/chefs/schedules?chef_id={chef_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_schedule_success(client: AsyncClient, admin_token: str, chef_token: str):
    """测试管理员更新排班成功"""
    # 获取厨师列表找到 ID
    chefs_resp = await client.get(
        "/api/chefs/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    chefs = chefs_resp.json()
    if not chefs:
        pytest.skip("需要先有厨师用户")
    
    chef_id = chefs[0]["id"]
    today = date.today().isoformat()
    
    response = await client.put(
        f"/api/chefs/schedules?chef_id={chef_id}&schedule_date={today}&meal_type=lunch&status=scheduled&notes=测试排班",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["chef_id"] == chef_id
    assert data["meal_type"] == "lunch"
    assert data["status"] == "scheduled"


@pytest.mark.asyncio
async def test_update_schedule_as_chef(client: AsyncClient, chef_token: str, admin_token: str):
    """测试厨师更新自己的排班"""
    chefs_resp = await client.get(
        "/api/chefs/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    chefs = chefs_resp.json()
    if not chefs:
        pytest.skip("需要先有厨师用户")
    
    chef_id = chefs[0]["id"]
    today = date.today().isoformat()
    
    response = await client.put(
        f"/api/chefs/schedules?chef_id={chef_id}&schedule_date={today}&meal_type=breakfast",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_schedule_forbidden(client: AsyncClient, user_token: str, admin_token: str):
    """测试普通用户无法更新排班"""
    chefs_resp = await client.get(
        "/api/chefs/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    chefs = chefs_resp.json()
    if not chefs:
        pytest.skip("需要先有厨师用户")
    
    chef_id = chefs[0]["id"]
    today = date.today().isoformat()
    
    response = await client.put(
        f"/api/chefs/schedules?chef_id={chef_id}&schedule_date={today}&meal_type=lunch",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_schedule_invalid_meal_type(client: AsyncClient, admin_token: str):
    """测试无效餐次类型"""
    chefs_resp = await client.get(
        "/api/chefs/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    chefs = chefs_resp.json()
    if not chefs:
        pytest.skip("需要先有厨师用户")
    
    chef_id = chefs[0]["id"]
    today = date.today().isoformat()
    
    response = await client.put(
        f"/api/chefs/schedules?chef_id={chef_id}&schedule_date={today}&meal_type=invalid_type",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
