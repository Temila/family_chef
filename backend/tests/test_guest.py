"""
家味 · Family Chef - 访客邀请模块测试
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.fixture
async def sample_invitation(client: AsyncClient, chef_token: str) -> dict:
    """创建示例邀请（厨师角色）"""
    response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
async def sample_dish_for_chef(client: AsyncClient, admin_token: str) -> int:
    """创建示例菜品并上架给厨师"""
    from app.models.dish import DishChef
    from tests.conftest import test_session_factory

    # 创建菜品（管理员）
    response = await client.post(
        "/api/dishes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "测试菜品-访客可见",
            "description": "用于访客测试",
            "status": "enabled",
        },
    )
    assert response.status_code == 201
    dish_id = response.json()["id"]

    # 查询厨师用户 ID
    from app.models.user import User
    from sqlalchemy import select
    async with test_session_factory() as session:
        result = await session.execute(
            select(User).where(User.username == "chef")
        )
        chef = result.scalar_one_or_none()
        assert chef is not None, "厨师用户不存在"

        # 创建 DishChef 记录（上架）
        dish_chef = DishChef(
            dish_id=dish_id,
            chef_id=chef.id,
            status="published",
        )
        session.add(dish_chef)
        await session.commit()

    return dish_id


@pytest.mark.asyncio
async def test_create_invitation_chef(client: AsyncClient, chef_token: str):
    """测试厨师创建邀请链接"""
    response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {chef_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert data["status"] == "active"
    assert "expires_at" in data
    assert "chef_id" in data
    assert data["token"]  # token 不为空


@pytest.mark.asyncio
async def test_create_invitation_user_with_chef_id(client: AsyncClient, user_token: str, chef_token: str):
    """测试普通用户创建邀请链接（指定厨师）"""
    # 先获取厨师用户 ID
    from app.models.user import User
    from sqlalchemy import select
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        result = await session.execute(
            select(User).where(User.username == "chef")
        )
        chef = result.scalar_one_or_none()
        assert chef is not None
        chef_id = chef.id

    response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"chef_id": chef_id},
    )

    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert data["chef_id"] == chef_id
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_create_invitation_user_without_chef_id(client: AsyncClient, user_token: str):
    """测试普通用户创建邀请链接不指定厨师失败"""
    response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_invitation_unauthenticated(client: AsyncClient):
    """测试未认证用户创建邀请失败"""
    response = await client.post(
        "/api/guest/invitations",
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_guest_list_dishes(client: AsyncClient, chef_token: str, sample_dish_for_chef: int):
    """测试访客通过邀请链接浏览菜品"""
    # 创建邀请
    inv_response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert inv_response.status_code == 201
    token = inv_response.json()["token"]

    # 访客浏览菜品（无需认证）
    response = await client.get(f"/api/guest/{token}/dishes")

    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert data["total"] >= 1
    # 验证返回的菜品中包含我们创建的菜品
    dish_ids = [item["id"] for item in data["items"]]
    assert sample_dish_for_chef in dish_ids


@pytest.mark.asyncio
async def test_guest_list_dishes_expired(client: AsyncClient, chef_token: str):
    """测试过期邀请浏览菜品失败"""
    from app.models.guest_invitation import GuestInvitation
    from tests.conftest import test_session_factory

    # 创建邀请
    inv_response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert inv_response.status_code == 201
    token = inv_response.json()["token"]

    # 手动设置邀请为过期
    async with test_session_factory() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(GuestInvitation).where(GuestInvitation.token == token)
        )
        invitation = result.scalar_one_or_none()
        assert invitation is not None
        invitation.expires_at = datetime.now() - timedelta(hours=1)
        await session.commit()

    # 访客使用过期邀请
    response = await client.get(f"/api/guest/{token}/dishes")

    assert response.status_code == 400
    assert "已过期" in response.json()["detail"]


@pytest.mark.asyncio
async def test_guest_list_dishes_invalid_token(client: AsyncClient):
    """测试无效 token 浏览菜品失败"""
    response = await client.get("/api/guest/invalid-token-value/dishes")

    assert response.status_code == 400
    assert "无效" in response.json()["detail"]


# ========== 访客订单提交测试 ==========


@pytest.fixture
async def guest_order_setup(client: AsyncClient, chef_token: str, admin_token: str, guest_user) -> dict:
    """创建访客订单所需的完整测试数据"""
    from app.models.dish import DishChef
    from app.models.user import User
    from tests.conftest import test_session_factory
    from sqlalchemy import select

    # 创建菜品（管理员）
    response = await client.post(
        "/api/dishes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "测试菜品-订单提交",
            "description": "用于访客订单测试",
            "status": "enabled",
        },
    )
    assert response.status_code == 201
    dish_id = response.json()["id"]

    # 获取厨师 ID 并创建 DishChef 上架记录
    async with test_session_factory() as session:
        result = await session.execute(
            select(User).where(User.username == "chef")
        )
        chef = result.scalar_one_or_none()
        assert chef is not None

        dish_chef = DishChef(
            dish_id=dish_id,
            chef_id=chef.id,
            status="published",
        )
        session.add(dish_chef)
        await session.commit()
        chef_id = chef.id

    # 创建邀请
    inv_response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert inv_response.status_code == 201
    token = inv_response.json()["token"]

    return {
        "token": token,
        "dish_id": dish_id,
        "chef_id": chef_id,
    }


@pytest.mark.asyncio
async def test_guest_submit_order(client: AsyncClient, guest_order_setup: dict):
    """测试访客提交订单"""
    token = guest_order_setup["token"]
    dish_id = guest_order_setup["dish_id"]

    response = await client.post(
        f"/api/guest/{token}/orders",
        json={
            "items": [{"dish_id": dish_id, "quantity": 2}],
            "notes": "访客测试订单",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert "order_no" in data
    assert data["status"] == "pending"
    assert data["notes"] == "访客测试订单"

    # 验证邀请状态变为 used
    summary_response = await client.get(f"/api/guest/{token}/summary")
    assert summary_response.status_code == 200


@pytest.mark.asyncio
async def test_guest_submit_order_double(client: AsyncClient, guest_order_setup: dict):
    """测试重复提交同一邀请 token 被拒绝"""
    token = guest_order_setup["token"]
    dish_id = guest_order_setup["dish_id"]

    # 第一次提交成功
    response1 = await client.post(
        f"/api/guest/{token}/orders",
        json={
            "items": [{"dish_id": dish_id, "quantity": 1}],
        },
    )
    assert response1.status_code == 201

    # 第二次提交应被拒绝
    response2 = await client.post(
        f"/api/guest/{token}/orders",
        json={
            "items": [{"dish_id": dish_id, "quantity": 1}],
        },
    )
    assert response2.status_code == 400
    assert "已被使用" in response2.json()["detail"]


@pytest.mark.asyncio
async def test_guest_submit_order_expired(client: AsyncClient, chef_token: str, admin_token: str, guest_user):
    """测试过期邀请提交订单失败"""
    from app.models.guest_invitation import GuestInvitation
    from tests.conftest import test_session_factory
    from sqlalchemy import select

    # 创建邀请
    inv_response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert inv_response.status_code == 201
    token = inv_response.json()["token"]

    # 手动设置邀请为过期
    async with test_session_factory() as session:
        result = await session.execute(
            select(GuestInvitation).where(GuestInvitation.token == token)
        )
        invitation = result.scalar_one_or_none()
        assert invitation is not None
        invitation.expires_at = datetime.now() - timedelta(hours=1)
        await session.commit()

    response = await client.post(
        f"/api/guest/{token}/orders",
        json={"items": [{"dish_id": 999, "quantity": 1}]},
    )
    assert response.status_code == 400
    assert "已过期" in response.json()["detail"]


@pytest.mark.asyncio
async def test_guest_submit_order_invalid_dish(client: AsyncClient, chef_token: str, admin_token: str, guest_user):
    """测试访客提交不属于绑定厨师的菜品"""
    from app.models.dish import DishChef
    from app.models.user import User
    from tests.conftest import test_session_factory
    from sqlalchemy import select

    # 创建属于另一个厨师的菜品
    # 先创建另一个厨师
    async with test_session_factory() as session:
        other_chef = User(
            username="other_chef",
            password_hash="$2b$12$placeholder_hash_for_testing",
            display_name="其他厨师",
            role="chef",
            is_active=True,
            force_pwd_change=False,
        )
        session.add(other_chef)
        await session.commit()
        await session.refresh(other_chef)
        other_chef_id = other_chef.id

    # 创建菜品并上架给另一个厨师
    dish_response = await client.post(
        "/api/dishes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "其他厨师的菜品",
            "description": "不属于目标厨师",
            "status": "enabled",
        },
    )
    assert dish_response.status_code == 201
    other_dish_id = dish_response.json()["id"]

    async with test_session_factory() as session:
        dish_chef = DishChef(
            dish_id=other_dish_id,
            chef_id=other_chef_id,
            status="published",
        )
        session.add(dish_chef)
        await session.commit()

    # 创建邀请（绑定到原厨师）
    inv_response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert inv_response.status_code == 201
    token = inv_response.json()["token"]

    # 尝试提交不属于自己的菜品
    response = await client.post(
        f"/api/guest/{token}/orders",
        json={"items": [{"dish_id": other_dish_id, "quantity": 1}]},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_guest_view_summary(client: AsyncClient, guest_order_setup: dict):
    """测试已使用链接查看订单摘要"""
    token = guest_order_setup["token"]
    dish_id = guest_order_setup["dish_id"]

    # 先提交订单
    submit_response = await client.post(
        f"/api/guest/{token}/orders",
        json={
            "items": [{"dish_id": dish_id, "quantity": 2}],
            "notes": "摘要测试",
        },
    )
    assert submit_response.status_code == 201
    order_no = submit_response.json()["order_no"]

    # 查看摘要
    response = await client.get(f"/api/guest/{token}/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["order_no"] == order_no
    assert data["status"] == "pending"
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_guest_view_summary_not_used(client: AsyncClient, chef_token: str):
    """测试未使用的邀请链接查看摘要失败"""
    # 创建邀请但不提交订单
    inv_response = await client.post(
        "/api/guest/invitations",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert inv_response.status_code == 201
    token = inv_response.json()["token"]

    # 尝试查看摘要
    response = await client.get(f"/api/guest/{token}/summary")
    assert response.status_code == 400
    assert "尚未使用" in response.json()["detail"]
