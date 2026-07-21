"""家味 · Family Chef - 愿望单模块测试"""

import asyncio
import pytest
from httpx import AsyncClient


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
async def user_wish(client: AsyncClient, user_token: str) -> int:
    """创建一条普通用户提交的愿望并返回其 ID"""
    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "宫保鸡丁", "note": "微辣"},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.fixture
async def published_dish_for_chef(client: AsyncClient, admin_token: str, chef_token: str) -> int:
    """创建已发布的菜品供厨师使用（用于 advance_wish 测试 D-09）"""
    from app.models.dish import DishChef
    from app.models.user import User
    from sqlalchemy import select
    from tests.conftest import test_session_factory

    # 1. 管理员创建菜品
    response = await client.post(
        "/api/dishes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "红烧肉",
            "description": "经典家常菜",
            "status": "enabled",
        },
    )
    assert response.status_code == 201
    dish_id = response.json()["id"]

    # 2. 获取厨师用户 ID
    async with test_session_factory() as session:
        result = await session.execute(select(User).where(User.username == "chef"))
        chef = result.scalar_one_or_none()
        assert chef is not None

        # 3. 创建 DishChef 记录（published）
        dish_chef = DishChef(
            dish_id=dish_id,
            chef_id=chef.id,
            status="published",
        )
        session.add(dish_chef)
        await session.commit()

    return dish_id


# =============================================================================
# 提交愿望 (WISH-01)
# =============================================================================

@pytest.mark.asyncio
async def test_submit_wish(client: AsyncClient, user_token: str):
    """测试提交愿望返回 201 + status='待处理'"""
    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dish_name": "麻婆豆腐",
            "reference_url": "https://example.com/recipe",
            "note": "麻辣口味",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "待处理"
    assert data["dish_name"] == "麻婆豆腐"
    assert data["reference_url"] == "https://example.com/recipe"
    assert data["claimed_by_chef_id"] is None
    assert "id" in data


@pytest.mark.asyncio
async def test_submit_wish_validates_dish_name(client: AsyncClient, user_token: str):
    """测试 dish_name 为空时返回 422（Pydantic 验证）"""
    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": ""},
    )
    assert response.status_code == 422


# =============================================================================
# 愿望列表 (WISH-02, FLOW-01, FLOW-05, D-05)
# =============================================================================

@pytest.mark.asyncio
async def test_list_own_wishes(client: AsyncClient, user_token: str, admin_token: str):
    """普通用户只看到自己的愿望；管理员看到所有"""
    # 用户提交 2 条
    for dish in ["鱼香肉丝", "回锅肉"]:
        r = await client.post(
            "/api/wishes",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"dish_name": dish},
        )
        assert r.status_code == 201

    # 管理员提交 1 条
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"dish_name": "佛跳墙"},
    )
    assert r.status_code == 201

    # 用户 GET：只看到自己的 2 条
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    for item in data["items"]:
        assert item["dish_name"] in ["鱼香肉丝", "回锅肉"]

    # 管理员 GET：看到全部 3 条
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    assert r.json()["total"] == 3


@pytest.mark.asyncio
async def test_list_chef_visibility(client: AsyncClient, user_token: str, chef_token: str, chef2_token: str):
    """厨师看到：待处理愿望 + 自己认领的；看不到其他厨师已认领的（D-05）"""
    # 用户提交 W1 和 W2
    r1 = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "W1-待处理"},
    )
    assert r1.status_code == 201
    w1_id = r1.json()["id"]

    r2 = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "W2-待处理"},
    )
    assert r2.status_code == 201
    w2_id = r2.json()["id"]

    # chef1 认领 W1
    r = await client.post(
        f"/api/wishes/{w1_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # chef1 列表：应该看到 W1（自己的）+ W2（待处理）；看不到 W2 已被 chef2 认领后的情况
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    dish_names = [item["dish_name"] for item in data["items"]]
    assert "W1-待处理" in dish_names
    assert "W2-待处理" in dish_names

    # chef2 认领 W2
    r = await client.post(
        f"/api/wishes/{w2_id}/claim",
        headers={"Authorization": f"Bearer {chef2_token}"},
    )
    assert r.status_code == 200

    # chef1 再次 GET：W2 现在已被 chef2 认领，chef1 看不到
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    dish_names = [item["dish_name"] for item in data["items"]]
    assert "W1-待处理" in dish_names
    assert "W2-待处理" not in dish_names  # 已不再处于待处理状态


@pytest.mark.asyncio
async def test_list_mine_filter(client: AsyncClient, user_token: str, chef_token: str):
    """chef GET /api/wishes?mine=true 只返回自己认领的愿望（FLOW-05）"""
    # 用户提交两条
    for dish in ["可乐鸡翅", "糖醋排骨"]:
        r = await client.post(
            "/api/wishes",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"dish_name": dish},
        )
        assert r.status_code == 201

    # chef 认领第一条
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    first_wish_id = r.json()["items"][0]["id"]

    r = await client.post(
        f"/api/wishes/{first_wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # mine=true：只返回 chef 自己的认领
    r = await client.get(
        "/api/wishes?mine=true",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert data["items"][0]["dish_name"] == "可乐鸡翅"


# =============================================================================
# 愿望详情 (PERM-01, D-03)
# =============================================================================

@pytest.mark.asyncio
async def test_get_wish_detail(client: AsyncClient, user_token: str):
    """提交者 GET 自己的愿望详情：包含 submitter_name 扁平字段"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "宫保鸡丁", "note": "不要太辣"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["dish_name"] == "宫保鸡丁"
    assert data["submitter_name"] is not None  # 扁平化的提交者名称


# =============================================================================
# 编辑愿望 (WISH-03, PERM-02, D-06)
# =============================================================================

@pytest.mark.asyncio
async def test_update_wish(client: AsyncClient, user_token: str, user_wish: int):
    """提交者编辑自己的愿望（待处理状态）"""
    r = await client.put(
        f"/api/wishes/{user_wish}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "宫保鸡丁改", "note": "更辣"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["dish_name"] == "宫保鸡丁改"
    assert data["note"] == "更辣"


@pytest.mark.asyncio
async def test_update_wish_during_preparing(client: AsyncClient, user_token: str, chef_token: str, user_wish: int):
    """准备中状态：提交者仍可编辑（D-06）"""
    # chef 认领愿望（状态 -> 准备中）
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # 用户编辑愿望（应该成功）
    r = await client.put(
        f"/api/wishes/{user_wish}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"note": "改了备注"},
    )
    assert r.status_code == 200
    assert r.json()["note"] == "改了备注"


@pytest.mark.asyncio
async def test_update_wish_blocked_when_published(
    client: AsyncClient, user_token: str, chef_token: str, user_wish: int, published_dish_for_chef: int
):
    """已上架状态：提交者不可编辑（D-06 lock）"""
    # chef 认领
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # chef 推进到已上架
    r = await client.post(
        f"/api/wishes/{user_wish}/advance",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"related_dish_id": published_dish_for_chef},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "已上架"

    # 用户尝试编辑（应被拒绝）
    r = await client.put(
        f"/api/wishes/{user_wish}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"note": "试试改"},
    )
    assert r.status_code == 400


# =============================================================================
# 撤销愿望 (WISH-04, D-07)
# =============================================================================

@pytest.mark.asyncio
async def test_cancel_wish_soft_delete(client: AsyncClient, user_token: str, user_wish: int):
    """DELETE 软删除：status='已撤销'（D-07）"""
    r = await client.delete(
        f"/api/wishes/{user_wish}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "已撤销"


# =============================================================================
# 认领愿望 (FLOW-02, D-01, D-02)
# =============================================================================

@pytest.mark.asyncio
async def test_claim_wish(client: AsyncClient, user_token: str, chef_token: str, user_wish: int):
    """厨师认领愿望：status -> 准备中"""
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "准备中"
    assert data["claimed_by_chef_id"] is not None


# =============================================================================
# 推进愿望 (FLOW-03, D-09, D-10)
# =============================================================================

@pytest.mark.asyncio
async def test_advance_wish(
    client: AsyncClient, user_token: str, chef_token: str, user_wish: int, published_dish_for_chef: int
):
    """认领厨师推进愿望到已上架：关联菜品写入 related_dish_id（D-10）"""
    # chef 认领
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # chef 推进
    r = await client.post(
        f"/api/wishes/{user_wish}/advance",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"related_dish_id": published_dish_for_chef},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "已上架"
    assert data["related_dish_id"] == published_dish_for_chef


# =============================================================================
# 拒绝愿望 (FLOW-04)
# =============================================================================

@pytest.mark.asyncio
async def test_reject_wish(client: AsyncClient, user_token: str, chef_token: str, user_wish: int):
    """认领厨师拒绝愿望：status='已拒绝' + reject_reason 写入"""
    # chef 认领
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # chef 拒绝
    r = await client.post(
        f"/api/wishes/{user_wish}/reject",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"reject_reason": "食材季节不对"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "已拒绝"
    assert data["reject_reason"] == "食材季节不对"


@pytest.mark.asyncio
async def test_reject_wish_requires_reason(client: AsyncClient, user_token: str, chef_token: str, user_wish: int):
    """拒绝愿望时 reject_reason 必填：空 body 和空字符串均返回 422（FLOW-04）"""
    # chef 认领
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # 空 body -> 422（Pydantic 验证）
    r = await client.post(
        f"/api/wishes/{user_wish}/reject",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={},
    )
    assert r.status_code == 422

    # 空字符串 -> 422（min_length=1）
    r = await client.post(
        f"/api/wishes/{user_wish}/reject",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"reject_reason": ""},
    )
    assert r.status_code == 422


# =============================================================================
# Security Tests — 8 STRIDE-mapped cases from 05-RESEARCH.md § Security Domain
# =============================================================================

# -----------------------------------------------------------------------------
# STRIDE Elevation of Privilege: Regular user cannot call claim/advance/reject
# T-5-14
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_regular_user_cannot_claim(client: AsyncClient, user_token: str, user_wish: int):
    """普通用户调用 POST /api/wishes/{id}/claim → 403（require_role 拦截）"""
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_regular_user_cannot_advance(client: AsyncClient, user_token: str, user_wish: int):
    """普通用户调用 POST /api/wishes/{id}/advance → 403"""
    r = await client.post(
        f"/api/wishes/{user_wish}/advance",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"related_dish_id": 999},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_regular_user_cannot_reject(client: AsyncClient, user_token: str, user_wish: int):
    """普通用户调用 POST /api/wishes/{id}/reject → 403"""
    r = await client.post(
        f"/api/wishes/{user_wish}/reject",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"reject_reason": "理由"},
    )
    assert r.status_code == 403


# -----------------------------------------------------------------------------
# STRIDE Information Disclosure: ID enumeration prevention
# T-5-16 / D-03
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unauthorized_read_returns_404_not_403(client: AsyncClient, user_token: str, user2_token: str):
    """用户 A 的愿望 ID 对用户 B 不可读 → 404 而非 403（D-03 ID 枚举防护）"""
    # 用户 A 提交愿望
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "secret dish"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    # 用户 B 尝试读取（应返回 404，不返回 403）
    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user2_token}"},
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "愿望不存在"


# -----------------------------------------------------------------------------
# STRIDE Elevation of Privilege: Horizontal — chef cannot mutate other chef's claim
# T-5-15 / D-04
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_chef_cannot_advance_other_chef_claim(
    client: AsyncClient, user_token: str, chef_token: str, chef2_token: str, user_wish: int
):
    """厨师 A 认领的愿望，厨师 B 无法推进 → 403 + 包含认领厨师姓名的错误（D-04）"""
    # chef_token 认领愿望
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # chef2_token 尝试推进（应被拒绝）
    r = await client.post(
        f"/api/wishes/{user_wish}/advance",
        headers={"Authorization": f"Bearer {chef2_token}"},
        json={"related_dish_id": 999},  # dish_id 不重要，权限检查先执行
    )
    assert r.status_code == 403
    detail = r.json()["detail"]
    assert "厨师" in detail  # 认领厨师姓名出现在错误消息中（D-04 合同）


@pytest.mark.asyncio
async def test_chef_cannot_reject_other_chef_claim(
    client: AsyncClient, user_token: str, chef_token: str, chef2_token: str, user_wish: int
):
    """厨师 A 认领的愿望，厨师 B 无法拒绝 → 403"""
    # chef_token 认领愿望
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # chef2_token 尝试拒绝
    r = await client.post(
        f"/api/wishes/{user_wish}/reject",
        headers={"Authorization": f"Bearer {chef2_token}"},
        json={"reject_reason": "随便拒绝"},
    )
    assert r.status_code == 403


# -----------------------------------------------------------------------------
# STRIDE Tampering: Concurrent claim race — atomic UPDATE guarantees exactly one wins
# T-5-17 / D-01 / D-02
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_concurrent_claim_only_one_wins(
    client: AsyncClient, user_token: str, chef_token: str, chef2_token: str, user_wish: int
):
    """两个厨师并发认领同一愿望：恰好一个成功（200），一个失败（400）（D-01/D-02）"""
    # chef_token 和 chef2_token 并发认领
    responses = await asyncio.gather(
        client.post(
            f"/api/wishes/{user_wish}/claim",
            headers={"Authorization": f"Bearer {chef_token}"},
        ),
        client.post(
            f"/api/wishes/{user_wish}/claim",
            headers={"Authorization": f"Bearer {chef2_token}"},
        ),
    )

    # 恰好一个 200，一个 400
    status_codes = sorted([r.status_code for r in responses])
    assert status_codes == [200, 400], f"Expected [200, 400], got {status_codes}"

    # 失败的响应包含中文错误消息（D-02）
    failure = next(r for r in responses if r.status_code == 400)
    assert "认领" in failure.json()["detail"]


# -----------------------------------------------------------------------------
# STRIDE Tampering: Advance with unpublished dish — business rule bypass
# T-5-18 / D-09
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_advance_rejects_unpublished_dish(
    client: AsyncClient, user_token: str, chef_token: str, user_wish: int
):
    """推进愿望时关联未发布菜品 → 400 + exact Chinese message（D-09）"""
    # chef 认领愿望
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # 尝试用不存在的 dish_id 推进
    r = await client.post(
        f"/api/wishes/{user_wish}/advance",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"related_dish_id": 999999},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "你未发布此菜品或菜品不可用"


# -----------------------------------------------------------------------------
# STRIDE Repudiation: Reject without reason
# T-5-19 / FLOW-04
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reject_without_reason_returns_422(client: AsyncClient, user_token: str, chef_token: str, user_wish: int):
    """拒绝愿望时无 reject_reason → 422（Pydantic schema 验证）"""
    # chef 认领
    r = await client.post(
        f"/api/wishes/{user_wish}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # 空 body {} → 422（Pydantic 验证失败：reject_reason 缺失）
    r = await client.post(
        f"/api/wishes/{user_wish}/reject",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={},
    )
    assert r.status_code == 422

    # 空字符串 "" → 422（Pydantic min_length=1）
    r = await client.post(
        f"/api/wishes/{user_wish}/reject",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"reject_reason": ""},
    )
    assert r.status_code == 422

    # 纯空白字符串 "   " → 400（服务层防御：strip 后为空，服务 raise ValueError → 400）
    r = await client.post(
        f"/api/wishes/{user_wish}/reject",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"reject_reason": "   "},
    )
    assert r.status_code == 400


# -----------------------------------------------------------------------------
# V5 Input Validation: Submit with empty dish_name
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_submit_empty_dish_name_returns_422(client: AsyncClient, user_token: str):
    """dish_name 为空时 Pydantic 验证失败 → 422"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": ""},
    )
    assert r.status_code == 422


# -----------------------------------------------------------------------------
# STRIDE Tampering: Mass-assignment protection
# T-5-20 / D-20
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mass_assignment_status_ignored(client: AsyncClient, user_token: str):
    """POST 时传入 WishCreate 不存在的字段（status, claimed_by_chef_id）被静默丢弃"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dish_name": "鱼香肉丝",
            "status": "已上架",           # WishCreate 中不存在此字段
            "claimed_by_chef_id": 999,   # WishCreate 中不存在此字段
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "待处理"  # 字段被丢弃，默认为"待处理"
    assert data["claimed_by_chef_id"] is None  # 不可赋值

