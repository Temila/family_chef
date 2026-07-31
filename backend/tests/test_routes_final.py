"""
家味 · Family Chef — 路由补充测试（冲刺 80% 覆盖率）
重点覆盖：dishes(更新带关联), orders(更多分支), categories(CRUD完整),
users(详情/密码/删除分支), favorites(列表响应), auth(更多分支)
"""

import pytest
from httpx import AsyncClient


# ─── Dishes：更新带关联 + 删除成功 + status 缺字段 ────

@pytest.mark.asyncio
async def test_dish_update_with_relations(client: AsyncClient, chef_token: str):
    """更新菜品（覆盖 166-211 行的重新查询+构建响应）"""
    h = {"Authorization": f"Bearer {chef_token}"}

    # 创建带分类的菜品
    r = await client.post("/api/categories/", json={"name": "更新测试分类", "type": "cuisine"}, headers=h)
    cat_id = r.json()["id"]

    r = await client.post("/api/dishes/", json={
        "name": "更新测试菜", "category_ids": [cat_id],
    }, headers=h)
    assert r.status_code == 201
    dish_id = r.json()["id"]

    # 更新名称（覆盖 166-211 行）
    r = await client.put(f"/api/dishes/{dish_id}", json={"name": "更新后菜名"}, headers=h)
    assert r.status_code == 200
    assert r.json()["name"] == "更新后菜名"

    # 删除成功路径（覆盖 214-228 行）
    r = await client.delete(f"/api/dishes/{dish_id}", headers=h)
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_dish_status_missing_field(client: AsyncClient, chef_token: str):
    """status_data 缺少 status 字段 → 400"""
    h = {"Authorization": f"Bearer {chef_token}"}
    r = await client.post("/api/dishes/", json={"name": "状态测试"}, headers=h)
    did = r.json()["id"]

    r = await client.put(f"/api/dishes/{did}/status", json={}, headers=h)
    assert r.status_code == 400
    assert "status" in r.json()["detail"]


# ─── Orders：更多分支 ─────────────────────────────────

@pytest.mark.asyncio
async def test_order_get_others_forbidden(client: AsyncClient, user_token: str, chef_token: str):
    """普通用户不能查看别人的订单详情"""
    uh = {"Authorization": f"Bearer {user_token}"}
    ch = {"Authorization": f"Bearer {chef_token}"}

    # 创建上架菜品（/status 仅接受 enabled/disabled，上架走 /chef-publish）
    r = await client.post("/api/dishes/", json={"name": "权限菜"}, headers=ch)
    did = r.json()["id"]
    await client.put(f"/api/dishes/{did}/chef-publish", json={"publish": True}, headers=ch)

    # 用户下单
    r = await client.post("/api/orders/", json={
        "items": [{"dish_id": did, "quantity": 1}],
    }, headers=uh)
    oid = r.json()[0]["id"]

    # 注册另一个用户，尝试查看
    await client.post("/api/auth/register", json={
        "username": "other_viewer", "password": "pass123", "display_name": "其他用户",
    })
    r = await client.post("/api/auth/login", json={"username": "other_viewer", "password": "pass123"})
    other_h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = await client.get(f"/api/orders/{oid}", headers=other_h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_order_not_found(client: AsyncClient, user_token: str):
    """订单不存在 → 404"""
    h = {"Authorization": f"Bearer {user_token}"}
    r = await client.get("/api/orders/99999", headers=h)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_order_cancel_success(client: AsyncClient, user_token: str, chef_token: str):
    """用户取消自己的 pending 订单（覆盖 161-183 行）"""
    uh = {"Authorization": f"Bearer {user_token}"}
    ch = {"Authorization": f"Bearer {chef_token}"}

    r = await client.post("/api/dishes/", json={"name": "取消菜"}, headers=ch)
    did = r.json()["id"]
    await client.put(f"/api/dishes/{did}/chef-publish", json={"publish": True}, headers=ch)

    r = await client.post("/api/orders/", json={
        "items": [{"dish_id": did, "quantity": 1}],
    }, headers=uh)
    oid = r.json()[0]["id"]

    r = await client.delete(f"/api/orders/{oid}", headers=uh)
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"


# ─── Categories：删除 + 更新完整路径 ──────────────────

@pytest.mark.asyncio
async def test_category_delete_success(client: AsyncClient, admin_token: str):
    """删除分类成功（覆盖 90-110 行）"""
    h = {"Authorization": f"Bearer {admin_token}"}
    r = await client.post("/api/categories/", json={"name": "待删分类", "type": "taste"}, headers=h)
    cat_id = r.json()["id"]

    r = await client.delete(f"/api/categories/{cat_id}", headers=h)
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_category_update_success(client: AsyncClient, admin_token: str):
    """更新分类成功（覆盖 58-87 行）"""
    h = {"Authorization": f"Bearer {admin_token}"}
    r = await client.post("/api/categories/", json={"name": "更新前分类", "type": "season"}, headers=h)
    cat_id = r.json()["id"]

    r = await client.put(f"/api/categories/{cat_id}", json={"name": "更新后分类"}, headers=h)
    assert r.status_code == 200
    assert r.json()["name"] == "更新后分类"


@pytest.mark.asyncio
async def test_category_delete_not_found(client: AsyncClient, admin_token: str):
    h = {"Authorization": f"Bearer {admin_token}"}
    r = await client.delete("/api/categories/99999", headers=h)
    assert r.status_code == 404


# ─── Users：更多分支 ──────────────────────────────────

@pytest.mark.asyncio
async def test_user_get_found(client: AsyncClient, admin_token: str):
    """用户详情成功路径（覆盖 75-84 行的响应构建）"""
    h = {"Authorization": f"Bearer {admin_token}"}
    r = await client.get("/api/users/1", headers=h)
    assert r.status_code == 200
    assert "username" in r.json()


@pytest.mark.asyncio
async def test_user_password_other_user_forbidden(client: AsyncClient, user_token: str):
    """普通用户不能改别人的密码（覆盖 128-132 行）"""
    # 注册另一个用户
    await client.post("/api/auth/register", json={
        "username": "pwd_target", "password": "pass123", "display_name": "密码目标",
    })
    r = await client.post("/api/auth/login", json={"username": "pwd_target", "password": "pass123"})
    target_id = r.json()["user"]["id"]

    h = {"Authorization": f"Bearer {user_token}"}
    r = await client.put(f"/api/users/{target_id}/password", json={
        "old_password": "pass123", "new_password": "hacked",
    }, headers=h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_user_delete_success(client: AsyncClient, admin_token: str):
    """删除用户成功（覆盖 170-178 行）"""
    h = {"Authorization": f"Bearer {admin_token}"}
    # 注册一个用户
    await client.post("/api/auth/register", json={
        "username": "delete_target", "password": "pass123", "display_name": "待删",
    })
    users = (await client.get("/api/users/", headers=h)).json()["items"]
    target = next(u for u in users if u["username"] == "delete_target")

    r = await client.delete(f"/api/users/{target['id']}", headers=h)
    assert r.status_code == 204


# ─── Favorites：列表响应构建 ──────────────────────────

@pytest.mark.asyncio
async def test_favorite_list_with_dishes(client: AsyncClient, user_token: str, chef_token: str):
    """收藏列表返回带菜品数据（覆盖 84-109 行的响应构建）"""
    uh = {"Authorization": f"Bearer {user_token}"}
    ch = {"Authorization": f"Bearer {chef_token}"}

    # 创建上架菜品（上架走 /chef-publish）
    r = await client.post("/api/dishes/", json={"name": "收藏菜"}, headers=ch)
    did = r.json()["id"]
    await client.put(f"/api/dishes/{did}/chef-publish", json={"publish": True}, headers=ch)

    # 收藏
    await client.post("/api/favorites/", json={"dish_id": did}, headers=uh)

    # 列表
    r = await client.get("/api/favorites/", headers=uh)
    assert r.status_code == 200
    assert r.json()["total"] >= 1


# ─── Auth：更多分支 ──────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """注册成功路径（覆盖更多行）"""
    r = await client.post("/api/auth/register", json={
        "username": "reg_test", "password": "pass123", "display_name": "注册测试",
    })
    assert r.status_code == 201

    # 确认能登录
    r = await client.post("/api/auth/login", json={"username": "reg_test", "password": "pass123"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_login_success_response_fields(client: AsyncClient, admin_token: str):
    """登录响应包含所有字段（覆盖 30-49 行）"""
    r = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "user" in data
    assert data["user"]["username"] == "admin"
