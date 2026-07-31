"""
家味 · Family Chef - 综合测试（补充覆盖率）
覆盖：菜品高级查询、订单更新、食材别名、偏好更新等
"""

import pytest
from httpx import AsyncClient


# ========== 菜品高级查询 ==========

@pytest.mark.asyncio
async def test_dish_with_ingredients(client: AsyncClient, admin_token: str, user_token: str):
    """测试创建带食材的菜品"""
    # 创建食材
    ing_resp = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "鸡蛋覆盖率"},
    )
    assert ing_resp.status_code == 201
    
    # 创建菜品
    dish_resp = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "番茄炒蛋覆盖",
            "description": "经典家常菜",
            "ingredients": [{"ingredient_id": ing_resp.json()["id"], "quantity": "2个"}],
        },
    )
    assert dish_resp.status_code == 201
    dish = dish_resp.json()
    assert dish["name"] == "番茄炒蛋覆盖"


@pytest.mark.asyncio
async def test_dish_update_with_ingredients(client: AsyncClient, admin_token: str):
    """测试更新菜品食材"""
    # 创建食材
    ing = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "牛肉覆盖"},
    )
    assert ing.status_code == 201
    
    # 创建菜品
    dish = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "红烧牛肉面覆盖"},
    )
    assert dish.status_code == 201
    dish_id = dish.json()["id"]
    
    # 更新菜品
    resp = await client.put(
        f"/api/dishes/{dish_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"description": "浓郁红烧牛肉面", "ingredients": [{"ingredient_id": ing.json()["id"], "quantity": "200g"}]},
    )
    assert resp.status_code == 200
    assert resp.json()["description"] == "浓郁红烧牛肉面"


@pytest.mark.asyncio
async def test_dish_publish_unpublish(client: AsyncClient, admin_token: str):
    """测试菜品上架/下架（/chef-publish 控制 DishChef.status）"""
    dish = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "测试菜品上下架覆盖"},
    )
    assert dish.status_code == 201
    dish_id = dish.json()["id"]

    # 上架（/status 仅接受 enabled/disabled，上架走 /chef-publish）
    resp = await client.put(
        f"/api/dishes/{dish_id}/chef-publish",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"publish": True},
    )
    assert resp.status_code == 200

    # 下架
    resp = await client.put(
        f"/api/dishes/{dish_id}/chef-publish",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"publish": False},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_dish_delete(client: AsyncClient, admin_token: str):
    """测试删除菜品"""
    dish = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "待删除菜品覆盖"},
    )
    dish_id = dish.json()["id"]
    
    resp = await client.delete(
        f"/api/dishes/{dish_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204


# ========== 订单更新 ==========

@pytest.mark.asyncio
async def test_update_order_status_by_chef(client: AsyncClient, admin_token: str):
    """测试厨师更新订单状态"""
    # 管理员创建菜品（路由强制 status=enabled，可直接下单）
    dish = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "厨师订单测试菜覆盖"},
    )
    dish_id = dish.json()["id"]

    # 创建订单（自动拆单返回列表）
    order = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"items": [{"dish_id": dish_id, "quantity": 1}]},
    )
    assert order.status_code == 201
    order_id = order.json()[0]["id"]

    # 接受订单
    resp = await client.put(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "accepted"},
    )
    assert resp.status_code == 200

    # 制作中
    resp = await client.put(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "cooking"},
    )
    assert resp.status_code == 200

    # 完成
    resp = await client.put(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "completed"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_order_with_notes(client: AsyncClient, admin_token: str):
    """测试带备注的订单"""
    dish = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "备注测试菜覆盖"},
    )
    dish_id = dish.json()["id"]

    order = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "items": [{"dish_id": dish_id, "quantity": 2}],
            "notes": "不要辣，多加葱",
        },
    )
    assert order.status_code == 201
    # 创建订单（自动拆单）返回列表
    created = order.json()
    assert (created[0] if isinstance(created, list) else created)["notes"] == "不要辣，多加葱"


@pytest.mark.asyncio
async def test_cancel_order(client: AsyncClient, admin_token: str):
    """测试取消订单"""
    dish = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "取消订单测试菜覆盖"},
    )
    dish_id = dish.json()["id"]

    order = await client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"items": [{"dish_id": dish_id, "quantity": 1}]},
    )
    order_id = order.json()[0]["id"]

    # 取消订单
    resp = await client.delete(
        f"/api/orders/{order_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200


# ========== 食材 ==========

@pytest.mark.asyncio
async def test_ingredient_with_category(client: AsyncClient, admin_token: str):
    """测试创建带分类的食材"""
    resp = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "胡萝卜覆盖", "category": "vegetable"},
    )
    assert resp.status_code == 201
    assert resp.json()["category"] == "vegetable"


@pytest.mark.asyncio
async def test_ingredient_update_desc(client: AsyncClient, admin_token: str):
    """测试更新食材描述"""
    ing = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "大蒜覆盖描述"},
    )
    assert ing.status_code == 201
    ing_id = ing.json()["id"]
    
    resp = await client.put(
        f"/api/ingredients/{ing_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"description": "调味用蒜", "category": "spice"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_ingredient_delete(client: AsyncClient, admin_token: str):
    """测试删除食材"""
    ing = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "待删除食材覆盖"},
    )
    ing_id = ing.json()["id"]
    
    resp = await client.delete(
        f"/api/ingredients/{ing_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204


# ========== 偏好 ==========

@pytest.mark.asyncio
async def test_preferences_get_and_update(client: AsyncClient, user_token: str, admin_token: str):
    """测试获取和更新偏好"""
    # 获取
    resp = await client.get(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    
    # 先创建一些食材
    ing1 = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "偏好食材1"},
    )
    ing2 = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "偏好食材2"},
    )
    
    ing1_id = ing1.json()["id"]
    ing2_id = ing2.json()["id"]
    
    # 更新偏好 - 使用正确的字段
    resp = await client.put(
        "/api/preferences/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dislikes": [ing1_id], "allergies": [ing2_id]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data.get("dislikes", [])) >= 1
    assert len(data.get("allergies", [])) >= 1


# ========== 分类 ==========

@pytest.mark.asyncio
async def test_category_update_and_delete(client: AsyncClient, admin_token: str):
    """测试更新和删除分类"""
    # 创建
    resp = await client.post(
        "/api/categories/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "分类覆盖测试", "type": "season", "description": "测试"},
    )
    assert resp.status_code == 201
    cat_id = resp.json()["id"]
    
    # 更新
    resp = await client.put(
        f"/api/categories/{cat_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "更新分类名", "description": "更新描述"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "更新分类名"
    
    # 删除
    resp = await client.delete(
        f"/api/categories/{cat_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204


# ========== 收藏 ==========

@pytest.mark.asyncio
async def test_favorite_add_and_remove(client: AsyncClient, admin_token: str, user_token: str):
    """测试添加和移除收藏"""
    # 创建菜品
    dish = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "收藏测试菜覆盖"},
    )
    dish_id = dish.json()["id"]
    
    # 添加收藏 (POST /api/favorites/ with dish_id in body)
    resp = await client.post(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_id": dish_id},
    )
    assert resp.status_code in [200, 201, 204]
    
    # 查看收藏列表
    resp = await client.get(
        "/api/favorites/",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    
    # 移除收藏
    resp = await client.delete(
        f"/api/favorites/{dish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 204


# ========== 日志 ==========

@pytest.mark.asyncio
async def test_admin_logs_with_action(client: AsyncClient, admin_token: str):
    """测试按操作类型筛选日志"""
    resp = await client.get(
        "/api/admin/logs?action=login",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_logs_with_user(client: AsyncClient, admin_token: str):
    """测试按用户筛选日志"""
    resp = await client.get(
        "/api/admin/logs?user_id=1",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200


# ========== Admin Config ==========

@pytest.mark.asyncio
async def test_admin_config_update(client: AsyncClient, admin_token: str):
    """测试管理员配置更新"""
    resp = await client.put(
        "/api/admin/config",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"key": "test_key", "value": "test_value"},
    )
    assert resp.status_code == 200


# ========== Health ==========

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """测试健康检查"""
    resp = await client.get("/api/health")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """测试根路径"""
    resp = await client.get("/")
    assert resp.status_code == 200
