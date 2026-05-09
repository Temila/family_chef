"""
家味 · Family Chef - 订单模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.fixture
async def sample_dish(client: AsyncClient, admin_token: str) -> int:
    """创建示例菜品"""
    response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "测试菜品",
            "description": "用于订单测试",
            "status": "published",
        }
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_create_order(client: AsyncClient, user_token: str, sample_dish: int):
    """测试创建订单"""
    response = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [
                {"dish_id": sample_dish, "quantity": 2}
            ],
            "notes": "少放辣",
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert "order_no" in data
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_create_order_empty_items(client: AsyncClient, user_token: str):
    """测试创建空订单失败"""
    response = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [],
        }
    )
    
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_orders(client: AsyncClient, user_token: str, sample_dish: int):
    """测试订单列表查询"""
    # 先创建订单
    await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [{"dish_id": sample_dish, "quantity": 1}],
        }
    )
    
    response = await client.get(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data


@pytest.mark.asyncio
async def test_list_orders_with_status_filter(client: AsyncClient, user_token: str, sample_dish: int):
    """测试按状态筛选订单"""
    # 先创建订单
    await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [{"dish_id": sample_dish, "quantity": 1}],
        }
    )
    
    response = await client.get(
        "/api/orders/?status=pending",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    for order in data["items"]:
        assert order["status"] == "pending"


@pytest.mark.asyncio
async def test_get_order(client: AsyncClient, user_token: str, sample_dish: int):
    """测试获取订单详情"""
    # 先创建订单
    create_response = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [{"dish_id": sample_dish, "quantity": 1}],
        }
    )
    
    order_id = create_response.json()["id"]
    
    response = await client.get(
        f"/api/orders/{order_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == order_id
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_get_order_not_found(client: AsyncClient, user_token: str):
    """测试获取不存在的订单"""
    response = await client.get(
        "/api/orders/99999",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_order_status_forbidden(client: AsyncClient, user_token: str, sample_dish: int):
    """测试普通用户更新订单状态被拒绝"""
    # 先创建订单
    create_response = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [{"dish_id": sample_dish, "quantity": 1}],
        }
    )
    
    order_id = create_response.json()["id"]
    
    # 普通用户尝试更新状态
    response = await client.put(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"status": "accepted"}
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_cancel_order(client: AsyncClient, user_token: str, sample_dish: int):
    """测试取消订单"""
    # 先创建订单
    create_response = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [{"dish_id": sample_dish, "quantity": 1}],
        }
    )
    
    order_id = create_response.json()["id"]
    
    # 取消订单
    response = await client.delete(
        f"/api/orders/{order_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "cancelled"


@pytest.mark.asyncio
async def test_list_orders_pagination(client: AsyncClient, user_token: str, sample_dish: int):
    """测试订单列表分页"""
    # 创建多个订单
    for _ in range(3):
        await client.post(
            "/api/orders/",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "items": [{"dish_id": sample_dish, "quantity": 1}],
            }
        )
    
    # 第一页
    response1 = await client.get(
        "/api/orders/?page=1&page_size=2",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response1.status_code == 200
    data1 = response1.json()
    assert len(data1["items"]) <= 2
    
    # 第二页
    response2 = await client.get(
        "/api/orders/?page=2&page_size=2",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response2.status_code == 200


@pytest.mark.asyncio
async def test_order_permission(client: AsyncClient, user_token: str, chef_token: str, sample_dish: int):
    """测试订单权限控制"""
    # 用户创建订单
    create_response = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [{"dish_id": sample_dish, "quantity": 1}],
        }
    )
    
    order_id = create_response.json()["id"]
    
    # 厨师可以查看任何订单
    response = await client.get(
        f"/api/orders/{order_id}",
        headers={"Authorization": f"Bearer {chef_token}"}
    )
    
    assert response.status_code == 200
