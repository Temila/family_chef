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
