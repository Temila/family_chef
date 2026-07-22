"""家味 · Family Chef - 愿望未读红点测试 (NOTIF-03/04)

测试红点生命周期与清除授权：
- 新建愿望对提交者显示 has_unread=True（NOTIF-03）
- 提交者查看详情后红点清除（NOTIF-04）
- 厨师（认领后）查看详情不清除提交者红点（Pitfall 4）
- 管理员查看详情不清除提交者红点（Pitfall 4 admin 分支）
- 管理员/厨师列表中对他人愿望的 has_unread 恒为 False（Pitfall 5 信息屏蔽）
"""

import pytest
from httpx import AsyncClient

# ========== 愿望未读红点 (NOTIF-03/04) ==========


# =============================================================================
# NOTIF-03: 新建愿望对提交者显示未读红点
# =============================================================================

@pytest.mark.asyncio
async def test_initial_unread_state(client: AsyncClient, user_token: str):
    """提交者新建愿望后，GET /api/wishes 返回 has_unread=True（submitter_last_viewed_at 为 NULL）"""
    # 提交者新建愿望
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "宫保鸡丁"},
    )
    assert r.status_code == 201

    # 提交者查看列表 → 第一条愿望 has_unread=True
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    assert items[0]["has_unread"] is True


# =============================================================================
# NOTIF-04: 提交者查看详情后红点清除
# =============================================================================

@pytest.mark.asyncio
async def test_submitter_detail_clears_badge(client: AsyncClient, user_token: str):
    """提交者 GET /api/wishes/{id} 后，后续列表中该愿望 has_unread=False"""
    # 提交者新建愿望
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "鱼香肉丝"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    # 提交者查看详情 → 触发清除副作用（D-B03）
    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200

    # 提交者再次查看列表 → has_unread=False
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    items = r.json()["items"]
    target = [it for it in items if it["id"] == wish_id]
    assert len(target) == 1
    assert target[0]["has_unread"] is False


# =============================================================================
# Pitfall 4（厨师分支）: 认领厨师查看详情不清除提交者红点
# =============================================================================

@pytest.mark.asyncio
async def test_chef_detail_does_not_clear_badge(
    client: AsyncClient, user_token: str, chef_token: str
):
    """厨师认领愿望后查看详情，不写入 submitter_last_viewed_at；提交者后续列表仍 has_unread=True"""
    # 提交者新建愿望
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "回锅肉"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    # 厨师先认领愿望（Phase 5 可见性前置条件：厨师仅在 claimed_by_chef_id == chef.id 时可见详情）
    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # 厨师查看详情（应返回 200，厨师已认领该愿望）
    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # 提交者（从未查看详情）查看列表 → has_unread 仍为 True
    # 注意：提交者在此测试中不得调用详情接口，否则红点会被自身调用清除
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    items = r.json()["items"]
    target = [it for it in items if it["id"] == wish_id]
    assert len(target) == 1
    assert target[0]["has_unread"] is True


# =============================================================================
# Pitfall 4（管理员分支）: 管理员查看详情不清除提交者红点
# =============================================================================

@pytest.mark.asyncio
async def test_admin_detail_does_not_clear_badge(
    client: AsyncClient, user_token: str, admin_token: str
):
    """管理员查看任意愿望详情，不写入 submitter_last_viewed_at；提交者后续列表仍 has_unread=True"""
    # 提交者新建愿望
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "麻婆豆腐"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    # 管理员查看详情（admin 可读任意愿望）
    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200

    # 提交者（从未查看详情）查看列表 → has_unread 仍为 True
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    items = r.json()["items"]
    target = [it for it in items if it["id"] == wish_id]
    assert len(target) == 1
    assert target[0]["has_unread"] is True


# =============================================================================
# Pitfall 5: 管理员列表对他人愿望的 has_unread 恒为 False
# =============================================================================

@pytest.mark.asyncio
async def test_admin_list_masks_unread(
    client: AsyncClient, user_token: str, admin_token: str
):
    """管理员 GET /api/wishes 对所有愿望的 has_unread 恒为 False（信息屏蔽）"""
    # 提交者新建两条愿望（不查看详情 → 对提交者而言均为未读）
    for dish in ["糖醋排骨", "可乐鸡翅"]:
        r = await client.post(
            "/api/wishes",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"dish_name": dish},
        )
        assert r.status_code == 201

    # 管理员查看列表 → 所有条目 has_unread=False
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 2
    for item in items:
        assert item["has_unread"] is False


# =============================================================================
# Pitfall 5: 厨师列表对非自身提交愿望的 has_unread 恒为 False
# =============================================================================

@pytest.mark.asyncio
async def test_chef_list_masks_unread(
    client: AsyncClient, user_token: str, chef_token: str
):
    """厨师 GET /api/wishes 对他人提交愿望的 has_unread 恒为 False（信息屏蔽）"""
    # 提交者新建愿望
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "水煮鱼"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    # 厨师认领愿望（使其出现在厨师列表中）
    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # 厨师查看列表 → 该愿望 has_unread=False（厨师非提交者）
    r = await client.get(
        "/api/wishes",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200
    items = r.json()["items"]
    target = [it for it in items if it["id"] == wish_id]
    assert len(target) == 1
    assert target[0]["has_unread"] is False
