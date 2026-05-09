"""
家味 · Family Chef — 路由集成测试（补充覆盖率）
覆盖: auth, categories, dishes, orders, users, favorites, ingredients 的更多分支
"""

import pytest
from httpx import AsyncClient


# ─── 辅助函数 ─────────────────────────────────────────────

async def create_published_dish(client: AsyncClient, chef_token: str, name: str = "测试菜品") -> dict:
    """创建并发布一个菜品，返回 JSON"""
    headers = {"Authorization": f"Bearer {chef_token}"}
    resp = await client.post("/api/dishes/", json={"name": name}, headers=headers)
    assert resp.status_code == 201, f"创建菜品失败: {resp.text}"
    dish = resp.json()
    # 发布菜品
    resp = await client.put(f"/api/dishes/{dish['id']}/status", json={"status": "published"}, headers=headers)
    assert resp.status_code == 200, f"发布菜品失败: {resp.text}"
    return dish


# ─── Auth 路由 ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """登录失败：密码错误"""
    await client.post("/api/auth/register", json={
        "username": "logintest", "password": "correctpass", "display_name": "测试",
    })
    resp = await client.post("/api/auth/login", json={
        "username": "logintest", "password": "wrongpass",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    """注册失败：重复用户名"""
    await client.post("/api/auth/register", json={
        "username": "dupuser", "password": "pass123", "display_name": "用户1",
    })
    resp = await client.post("/api/auth/register", json={
        "username": "dupuser", "password": "pass456", "display_name": "用户2",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_and_login_success(client: AsyncClient):
    """注册 + 登录完整流程"""
    resp = await client.post("/api/auth/register", json={
        "username": "newuser01", "password": "pass123456",
        "display_name": "新用户", "email": "newuser@test.com",
    })
    assert resp.status_code == 201
    assert resp.json()["username"] == "newuser01"

    login = await client.post("/api/auth/login", json={
        "username": "newuser01", "password": "pass123456",
    })
    assert login.status_code == 200
    tokens = login.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["user"]["username"] == "newuser01"


@pytest.mark.asyncio
async def test_refresh_token_success(client: AsyncClient):
    """刷新 Token 成功"""
    await client.post("/api/auth/register", json={
        "username": "refresher", "password": "pass123", "display_name": "刷新测试",
    })
    login = await client.post("/api/auth/login", json={
        "username": "refresher", "password": "pass123",
    })
    rt = login.json()["refresh_token"]
    resp = await client.post("/api/auth/refresh", json={"refresh_token": rt})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_refresh_token_missing(client: AsyncClient):
    """刷新 Token 缺失"""
    resp = await client.post("/api/auth/refresh", json={})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_refresh_token_invalid(client: AsyncClient):
    """刷新 Token 无效"""
    resp = await client.post("/api/auth/refresh", json={"refresh_token": "invalid_token"})
    assert resp.status_code == 401


# ─── Categories 路由 ─────────────────────────────────────

@pytest.mark.asyncio
async def test_category_crud_full(client: AsyncClient, admin_token: str):
    """分类完整 CRUD + 树形结构"""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 创建分类
    resp = await client.post("/api/categories/", json={
        "name": "川菜", "type": "cuisine", "sort_order": 1,
    }, headers=headers)
    assert resp.status_code == 201
    cat_id = resp.json()["id"]

    # 创建子分类
    resp = await client.post("/api/categories/", json={
        "name": "麻辣川菜", "type": "cuisine", "parent_id": cat_id, "sort_order": 1,
    }, headers=headers)
    assert resp.status_code == 201

    # 列表查询
    resp = await client.get("/api/categories/", params={"type": "cuisine"})
    assert resp.status_code == 200
    assert resp.json()["total"] >= 2

    # 树形查询
    resp = await client.get("/api/categories/", params={"tree": "true", "type": "cuisine"})
    assert resp.status_code == 200
    assert "categories" in resp.json()

    # 更新分类
    resp = await client.put(f"/api/categories/{cat_id}", json={"name": "四川菜"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "四川菜"

    # 删除
    resp = await client.post("/api/categories/", json={
        "name": "待删除分类", "type": "region",
    }, headers=headers)
    del_id = resp.json()["id"]
    resp = await client.delete(f"/api/categories/{del_id}", headers=headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_category_update_not_found(client: AsyncClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.put("/api/categories/99999", json={"name": "不存在"}, headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_category_delete_not_found(client: AsyncClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.delete("/api/categories/99999", headers=headers)
    assert resp.status_code == 404


# ─── Dishes 路由 ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_dish_create_and_get(client: AsyncClient, chef_token: str):
    """厨师创建菜品 + 获取详情"""
    headers = {"Authorization": f"Bearer {chef_token}"}

    resp = await client.post("/api/dishes/", json={"name": "宫保鸡丁"}, headers=headers)
    assert resp.status_code == 201
    dish_id = resp.json()["id"]

    resp = await client.get(f"/api/dishes/{dish_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "宫保鸡丁"


@pytest.mark.asyncio
async def test_dish_create_forbidden_for_user(client: AsyncClient, user_token: str):
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = await client.post("/api/dishes/", json={"name": "测试菜品"}, headers=headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_dish_update_and_delete(client: AsyncClient, chef_token: str):
    """更新菜品 + 删除菜品"""
    headers = {"Authorization": f"Bearer {chef_token}"}

    resp = await client.post("/api/dishes/", json={"name": "鱼香肉丝"}, headers=headers)
    dish_id = resp.json()["id"]

    # 更新
    resp = await client.put(f"/api/dishes/{dish_id}", json={
        "name": "改良鱼香肉丝", "description": "改良版",
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "改良鱼香肉丝"

    # 删除
    resp = await client.delete(f"/api/dishes/{dish_id}", headers=headers)
    assert resp.status_code == 204

    # 再次获取 → 404
    resp = await client.get(f"/api/dishes/{dish_id}", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dish_update_not_found(client: AsyncClient, chef_token: str):
    headers = {"Authorization": f"Bearer {chef_token}"}
    resp = await client.put("/api/dishes/99999", json={"name": "不存在"}, headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dish_delete_not_found(client: AsyncClient, chef_token: str):
    headers = {"Authorization": f"Bearer {chef_token}"}
    resp = await client.delete("/api/dishes/99999", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dish_update_status(client: AsyncClient, chef_token: str):
    """更新菜品状态: published/hidden/draft"""
    headers = {"Authorization": f"Bearer {chef_token}"}

    resp = await client.post("/api/dishes/", json={"name": "状态测试菜"}, headers=headers)
    dish_id = resp.json()["id"]

    # draft → published
    resp = await client.put(f"/api/dishes/{dish_id}/status", json={"status": "published"}, headers=headers)
    assert resp.status_code == 200

    # published → hidden
    resp = await client.put(f"/api/dishes/{dish_id}/status", json={"status": "hidden"}, headers=headers)
    assert resp.status_code == 200

    # 缺少 status 字段
    resp = await client.put(f"/api/dishes/{dish_id}/status", json={}, headers=headers)
    assert resp.status_code == 400

    # 不存在的菜品
    resp = await client.put("/api/dishes/99999/status", json={"status": "published"}, headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dish_list_with_search(client: AsyncClient, chef_token: str):
    """菜品列表搜索"""
    headers = {"Authorization": f"Bearer {chef_token}"}

    await create_published_dish(client, chef_token, "红烧肉A")
    await create_published_dish(client, chef_token, "红烧鱼B")

    resp = await client.get("/api/dishes/", params={"search": "红烧"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 2

    resp = await client.get("/api/dishes/", params={"sort": "name"}, headers=headers)
    assert resp.status_code == 200


# ─── Orders 路由 ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_order_create_and_list(client: AsyncClient, user_token: str, chef_token: str):
    """创建订单 + 用户/厨师分别查列表"""
    user_h = {"Authorization": f"Bearer {user_token}"}
    chef_h = {"Authorization": f"Bearer {chef_token}"}

    dish = await create_published_dish(client, chef_token, "番茄炒蛋")

    resp = await client.post("/api/orders/", json={
        "items": [{"dish_id": dish["id"], "quantity": 2}],
    }, headers=user_h)
    assert resp.status_code == 201
    assert "items" in resp.json()

    # 用户查列表
    resp = await client.get("/api/orders/", headers=user_h)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    # 厨师查列表
    resp = await client.get("/api/orders/", headers=chef_h)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_order_get_detail(client: AsyncClient, user_token: str, chef_token: str):
    """订单详情"""
    user_h = {"Authorization": f"Bearer {user_token}"}
    chef_h = {"Authorization": f"Bearer {chef_token}"}

    dish = await create_published_dish(client, chef_token, "土豆丝")
    order = await client.post("/api/orders/", json={
        "items": [{"dish_id": dish["id"], "quantity": 1}],
    }, headers=user_h)
    order_id = order.json()["id"]

    # 查看自己的订单
    resp = await client.get(f"/api/orders/{order_id}", headers=user_h)
    assert resp.status_code == 200

    # 不存在的订单
    resp = await client.get("/api/orders/99999", headers=user_h)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_order_update_status_by_chef(client: AsyncClient, user_token: str, chef_token: str):
    """厨师更新订单状态"""
    user_h = {"Authorization": f"Bearer {user_token}"}
    chef_h = {"Authorization": f"Bearer {chef_token}"}

    dish = await create_published_dish(client, chef_token, "回锅肉")
    order = await client.post("/api/orders/", json={
        "items": [{"dish_id": dish["id"], "quantity": 1}],
    }, headers=user_h)
    order_id = order.json()["id"]

    # 厨师接单 → 烹饪中 → 完成（按状态机顺序）
    resp = await client.put(f"/api/orders/{order_id}/status", json={"status": "accepted"}, headers=chef_h)
    assert resp.status_code == 200

    resp = await client.put(f"/api/orders/{order_id}/status", json={"status": "cooking"}, headers=chef_h)
    assert resp.status_code == 200

    resp = await client.put(f"/api/orders/{order_id}/status", json={"status": "completed"}, headers=chef_h)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_order_update_status_forbidden(client: AsyncClient, user_token: str, chef_token: str):
    """普通用户不能更新订单状态"""
    user_h = {"Authorization": f"Bearer {user_token}"}
    chef_h = {"Authorization": f"Bearer {chef_token}"}

    dish = await create_published_dish(client, chef_token, "麻婆豆腐")
    order = await client.post("/api/orders/", json={
        "items": [{"dish_id": dish["id"], "quantity": 1}],
    }, headers=user_h)

    resp = await client.put(f"/api/orders/{order.json()['id']}/status",
        json={"status": "accepted"}, headers=user_h)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_order_cancel(client: AsyncClient, user_token: str, chef_token: str):
    """取消订单"""
    user_h = {"Authorization": f"Bearer {user_token}"}
    chef_h = {"Authorization": f"Bearer {chef_token}"}

    dish = await create_published_dish(client, chef_token, "白切鸡")
    order = await client.post("/api/orders/", json={
        "items": [{"dish_id": dish["id"], "quantity": 1}],
    }, headers=user_h)

    resp = await client.delete(f"/api/orders/{order.json()['id']}", headers=user_h)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_order_cancel_not_found(client: AsyncClient, user_token: str):
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = await client.delete("/api/orders/99999", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_order_empty_items(client: AsyncClient, user_token: str):
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = await client.post("/api/orders/", json={"items": []}, headers=headers)
    assert resp.status_code == 400


# ─── Users 路由 ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_user_get_not_found(client: AsyncClient):
    resp = await client.get("/api/users/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_user_list_with_search(client: AsyncClient):
    resp = await client.get("/api/users/", params={"search": "admin"})
    assert resp.status_code == 200
    assert "items" in resp.json()


@pytest.mark.asyncio
async def test_user_update_by_admin(client: AsyncClient, admin_token: str):
    """管理员更新用户信息"""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 注册一个用户供管理员更新
    await client.post("/api/auth/register", json={
        "username": "update_target", "password": "pass123", "display_name": "待更新",
    })

    users = (await client.get("/api/users/", headers=headers)).json()["items"]
    target = next((u for u in users if u["username"] == "update_target"), None)
    assert target is not None

    resp = await client.put(f"/api/users/{target['id']}", json={
        "display_name": "新名字",
    }, headers=headers)
    assert resp.status_code == 200

    # 更新不存在的用户
    resp = await client.put("/api/users/99999", json={"display_name": "不存在"}, headers=headers)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_user_password_change(client: AsyncClient, user_token: str):
    """修改密码"""
    headers = {"Authorization": f"Bearer {user_token}"}
    from app.services.user_service import user_service
    from tests.conftest import test_session_factory
    async with test_session_factory() as db:
        user = await user_service.get_user_by_username(db, "testuser")
        uid = user.id

    resp = await client.put(f"/api/users/{uid}/password", json={
        "old_password": "user123", "new_password": "newpass456",
    }, headers=headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_user_delete_by_admin(client: AsyncClient, admin_token: str):
    """管理员删除用户"""
    headers = {"Authorization": f"Bearer {admin_token}"}

    await client.post("/api/auth/register", json={
        "username": "to_delete", "password": "pass123", "display_name": "待删除",
    })
    users = (await client.get("/api/users/", headers=headers)).json()["items"]
    target = next((u for u in users if u["username"] == "to_delete"), None)
    assert target is not None

    resp = await client.delete(f"/api/users/{target['id']}", headers=headers)
    assert resp.status_code == 204

    # 删除不存在的用户
    resp = await client.delete("/api/users/99999", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_user_delete_self_forbidden(client: AsyncClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}
    users = (await client.get("/api/users/", headers=headers)).json()["items"]
    admin = next((u for u in users if u["username"] == "admin"), None)
    assert admin is not None

    resp = await client.delete(f"/api/users/{admin['id']}", headers=headers)
    assert resp.status_code == 400


# ─── Favorites 路由 ──────────────────────────────────────

@pytest.mark.asyncio
async def test_favorite_add_remove_list(client: AsyncClient, user_token: str, chef_token: str):
    """收藏完整流程"""
    user_h = {"Authorization": f"Bearer {user_token}"}
    chef_h = {"Authorization": f"Bearer {chef_token}"}

    dish = await create_published_dish(client, chef_token, "糖醋排骨")
    dish_id = dish["id"]

    # 添加收藏
    resp = await client.post("/api/favorites/", json={"dish_id": dish_id}, headers=user_h)
    assert resp.status_code == 201

    # 收藏列表
    resp = await client.get("/api/favorites/", headers=user_h)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    # 取消收藏
    resp = await client.delete(f"/api/favorites/{dish_id}", headers=user_h)
    assert resp.status_code == 204

    # 再取消 → 404
    resp = await client.delete(f"/api/favorites/{dish_id}", headers=user_h)
    assert resp.status_code == 404


# ─── Ingredients 路由 ────────────────────────────────────

@pytest.mark.asyncio
async def test_ingredient_crud_via_router(client: AsyncClient, admin_token: str):
    """食材完整 CRUD"""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 创建
    resp = await client.post("/api/ingredients/", json={
        "name": "测试食材A", "category": "vegetable",
    }, headers=headers)
    assert resp.status_code == 201
    ing_id = resp.json()["id"]

    # 更新
    resp = await client.put(f"/api/ingredients/{ing_id}", json={"name": "更新食材A"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "更新食材A"

    # 删除
    resp = await client.delete(f"/api/ingredients/{ing_id}", headers=headers)
    assert resp.status_code == 204

    # 删除（软删除，再次删除仍返回 True 因为记录还在）
    resp = await client.delete(f"/api/ingredients/{ing_id}", headers=headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_ingredient_update_not_found(client: AsyncClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.put("/api/ingredients/99999", json={"name": "不存在"}, headers=headers)
    assert resp.status_code == 404


# ─── Chefs 路由 ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_chef_list(client: AsyncClient, chef_token: str):
    """查看厨师列表（需认证）"""
    headers = {"Authorization": f"Bearer {chef_token}"}
    resp = await client.get("/api/chefs/", headers=headers)
    assert resp.status_code == 200
