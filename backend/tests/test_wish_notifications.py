"""家味 · Family Chef - 愿望飞书通知 & 红点生命周期测试 (NOTIF-05/06/03)

Phase 6 通知集成测试，覆盖：
- Section A: Feishu 推送扇出 + 单接收人 + 失败隔离 (mock send_wish_notification)
- Section B: 服务层负载断言 (notify_new_wish / notify_claimed_wish_change 接收的 dict)
- Section C: 卡片渲染断言 (send_message 接收的 card dict)
- Section D: 红点生命周期 (claim/advance/reject/cancel 恢复未读 + 非法转换不改变时间戳)

所有飞书调用均通过 unittest.mock.AsyncMock 模拟（Pitfall 11）。
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from sqlalchemy import select


# =============================================================================
# 辅助函数：直接在测试 DB 中创建用户（不依赖 chektoken 等 fixture）
# =============================================================================


async def _create_chef(username: str, display_name: str, feishu_open_id: str) -> int:
    """在测试 DB 中创建一个带 feishu_open_id 的厨师用户，返回 id"""
    from app.models.user import User
    from app.utils.security import hash_password
    from tests.conftest import test_session_factory
    async with test_session_factory() as session:
        chef = User(
            username=username,
            password_hash=hash_password("test"),
            display_name=display_name,
            role="chef",
            is_active=True,
            feishu_open_id=feishu_open_id,
        )
        session.add(chef)
        await session.commit()
        return chef.id


async def _create_chef_unbound(username: str, display_name: str) -> int:
    """创建一个不带 feishu_open_id 的厨师用户"""
    from app.models.user import User
    from app.utils.security import hash_password
    from tests.conftest import test_session_factory
    async with test_session_factory() as session:
        chef = User(
            username=username,
            password_hash=hash_password("test"),
            display_name=display_name,
            role="chef",
            is_active=True,
            feishu_open_id=None,
        )
        session.add(chef)
        await session.commit()
        return chef.id


async def _bind_chef_feishu():
    """为默认 chef 用户（chef_token 对应的用户）绑定 feishu_open_id"""
    from app.models.user import User
    from tests.conftest import test_session_factory
    async with test_session_factory() as session:
        result = await session.execute(
            select(User).where(User.username == "chef")
        )
        chef = result.scalar_one_or_none()
        if chef:
            chef.feishu_open_id = "open_id_chef"
            await session.commit()


async def _create_admin_with_feishu():
    """为 admin 用户绑定 feishu_open_id"""
    from app.models.user import User
    from tests.conftest import test_session_factory
    async with test_session_factory() as session:
        result = await session.execute(
            select(User).where(User.username == "admin")
        )
        admin = result.scalar_one_or_none()
        if admin:
            admin.feishu_open_id = "open_id_admin"
            await session.commit()


async def _setup_two_bound_chefs():
    """创建两个绑定了飞书的厨师 chef_bound_a 和 chef_bound_b"""
    await _create_chef("chef_bound_a", "厨师A", "open_id_a")
    await _create_chef("chef_bound_b", "厨师B", "open_id_b")


async def _fetch_has_unread(client: AsyncClient, token: str, wish_id: int) -> bool:
    """从列表响应中获取指定愿望的 has_unread 值"""
    r = await client.get("/api/wishes", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    items = r.json()["items"]
    target = [it for it in items if it["id"] == wish_id]
    return target[0]["has_unread"] if target else False


@pytest.fixture
async def published_dish_for_chef(client: AsyncClient, admin_token: str, chef_token: str) -> int:
    """创建已发布的菜品供厨师使用（用于 advance_wish 测试 D-09）"""
    from app.models.dish import DishChef
    from app.models.user import User
    from tests.conftest import test_session_factory

    # 1. 管理员创建菜品
    response = await client.post(
        "/api/dishes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "红烧肉-通知测试",
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


# ========== 愿望飞书通知 (NOTIF-05/06) ==========


# =============================================================================
# Section A — Feishu 推送扇出 + 单接收人 + 失败隔离 (mock send_wish_notification)
# =============================================================================


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_submit_wish_fans_out_to_bound_chefs(
    mock_send, client: AsyncClient, user_token: str
):
    """通知只发给绑定了飞书的厨师，不发给管理员（D-F04 角色过滤）"""
    await _setup_two_bound_chefs()

    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "麻婆豆腐"},
    )
    assert response.status_code == 201
    assert mock_send.await_count == 2

    # 验证 payload 类型
    for call_args, _ in mock_send.call_args_list:
        payload = call_args[1]
        assert payload["notification_type"] == "new"


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_submit_wish_skips_unbound_chefs(
    mock_send, client: AsyncClient, user_token: str
):
    """未绑定飞书的厨师不发送通知"""
    await _setup_two_bound_chefs()         # 2 bound
    await _create_chef_unbound("chef_unbound", "未绑定厨师")  # 1 unbound

    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "宫保鸡丁"},
    )
    assert response.status_code == 201
    assert mock_send.await_count == 2  # 只有绑定的 2 位


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_submit_wish_admin_not_fanned_out(
    mock_send, client: AsyncClient, user_token: str
):
    """管理员即使绑定了飞书，也不会收到新愿望通知（D-F04 role=chef 过滤）"""
    await _setup_two_bound_chefs()
    await _create_admin_with_feishu()

    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "红烧肉"},
    )
    assert response.status_code == 201
    assert mock_send.await_count == 2  # chef_bound_a + chef_bound_b, 不含 admin


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_edit_unclaimed_no_notify(
    mock_send, client: AsyncClient, user_token: str
):
    """未认领的愿望编辑时不发送飞书通知（零通知预期）"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "鱼香肉丝"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.put(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"note": "new"},
    )
    assert r.status_code == 200
    assert mock_send.await_count == 0


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_edit_claimed_notifies_claimer(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """已认领愿望编辑时通知认领厨师"""
    await _setup_two_bound_chefs()
    await _bind_chef_feishu()  # 给认领厨师绑定飞书

    # 创建愿望（submit 会触发 2 次新愿望通知）
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "回锅肉", "note": "旧备注"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]
    mock_send.reset_mock()  # 清除 submit 的调用记录

    # 厨师认领（不触发飞书通知）
    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # 提交者编辑（应触发 1 次编辑通知）
    r = await client.put(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"note": "新备注"},
    )
    assert r.status_code == 200
    assert mock_send.await_count == 1

    call_args, _ = mock_send.call_args
    payload = call_args[1]
    assert payload["notification_type"] == "edit"
    assert payload["old_note"] == "旧备注"
    assert payload["new_note"] == "新备注"


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_cancel_unclaimed_no_notify(
    mock_send, client: AsyncClient, user_token: str
):
    """未认领的愿望撤销时不发送飞书通知"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "糖醋排骨"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.delete(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    assert mock_send.await_count == 0


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_cancel_claimed_notifies_claimer(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """已认领愿望撤销时通知认领厨师"""
    await _setup_two_bound_chefs()
    await _bind_chef_feishu()  # 给认领厨师绑定飞书

    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "可乐鸡翅"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]
    mock_send.reset_mock()  # 清除 submit 的调用记录

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    r = await client.delete(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    assert mock_send.await_count == 1

    call_args, _ = mock_send.call_args
    payload = call_args[1]
    assert payload["notification_type"] == "cancel"


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, side_effect=Exception("飞书API不可用"))
@pytest.mark.asyncio
async def test_feishu_failure_does_not_break_wish_request(
    mock_send, client: AsyncClient, user_token: str
):
    """飞书异常不破坏愿望 HTTP 请求（D-H03 失败隔离）"""
    await _setup_two_bound_chefs()

    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "水煮鱼"},
    )
    assert response.status_code == 201


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, side_effect=[Exception("第一个失败"), True])
@pytest.mark.asyncio
async def test_fan_out_continues_after_one_failure(
    mock_send, client: AsyncClient, user_token: str
):
    """扇出时一个接收人失败不影响其他接收人（Pitfall 6 隔离）"""
    await _setup_two_bound_chefs()

    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "回锅肉"},
    )
    assert response.status_code == 201
    assert mock_send.await_count == 2


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_claim_updates_status_change_timestamp(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """认领愿望后 last_status_change_at 不为 None（通过 DB 直接查询）"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "清蒸鲈鱼"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # last_status_change_at 不在 API 响应 schema 中，直接查 DB
    from app.models.wish import Wish
    from tests.conftest import test_session_factory
    async with test_session_factory() as session:
        result = await session.execute(select(Wish).where(Wish.id == wish_id))
        wish = result.scalar_one_or_none()
        assert wish is not None
        assert wish.last_status_change_at is not None


# =============================================================================
# Section B — 服务层负载断言 (mock send_wish_notification; 不检查 card 结构)
# =============================================================================


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_submit_wish_service_payload(
    mock_send, client: AsyncClient, user_token: str
):
    """验证服务层传递给 send_wish_notification 的 dict 结构（new 类型）"""
    await _setup_two_bound_chefs()

    response = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "dish_name": "四川火锅",
            "reference_url": "https://example.com/hotpot",
            "note": "多加辣椒",
        },
    )
    assert response.status_code == 201
    assert mock_send.await_count >= 1

    # 取第一次调用的参数
    call_args, _ = mock_send.call_args_list[0]
    payload = call_args[1]

    assert payload["notification_type"] == "new"
    assert isinstance(payload["wish_id"], int)
    assert payload["dish_name"] == "四川火锅"
    assert payload["submitter_name"] is not None
    assert payload["reference_url"] == "https://example.com/hotpot"
    assert payload["note"] == "多加辣椒"


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_edit_service_payload_includes_old_and_new_note(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """编辑愿望时服务层传递 old_note / new_note / note_changed"""
    await _setup_two_bound_chefs()
    await _bind_chef_feishu()  # 给认领厨师绑定飞书

    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "东坡肉", "note": "old"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]
    mock_send.reset_mock()  # 清除 submit 调用

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    r = await client.put(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"note": "new"},
    )
    assert r.status_code == 200
    assert mock_send.await_count == 1

    call_args, _ = mock_send.call_args
    payload = call_args[1]
    assert payload["notification_type"] == "edit"
    assert payload["old_note"] == "old"
    assert payload["new_note"] == "new"
    assert payload["note_changed"] is True
    assert "修改了" in payload["change_description"]


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_cancel_service_payload_omits_note_fields(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """撤销愿望时服务层传递 old_note=None / note_changed=False"""
    await _setup_two_bound_chefs()
    await _bind_chef_feishu()  # 给认领厨师绑定飞书

    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "白切鸡"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]
    mock_send.reset_mock()

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    r = await client.delete(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    assert mock_send.await_count == 1

    call_args, _ = mock_send.call_args
    payload = call_args[1]
    assert payload["notification_type"] == "cancel"
    assert payload.get("old_note") is None
    assert payload.get("note_changed") is False
    assert "撤回了" in payload["change_description"]


# =============================================================================
# Section C — 卡片渲染断言 (mock send_message; 不 mock send_wish_notification)
# =============================================================================


@patch("app.integrations.feishu.feishu_client.send_message",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_card_new_includes_dish_and_submitter_and_deep_link(
    mock_send_msg, client: AsyncClient, user_token: str
):
    """新愿望卡片包含菜品名、提交者和深链接"""
    from app.integrations.feishu import feishu_client

    await feishu_client.send_wish_notification("open_x", {
        "notification_type": "new",
        "wish_id": 7,
        "dish_name": "麻婆豆腐",
        "submitter_name": "测试",
        "reference_url": None,
        "note": None,
    })
    assert mock_send_msg.await_count == 1
    call_args, _ = mock_send_msg.call_args
    msg_type = call_args[1]
    content = call_args[2]

    assert msg_type == "interactive"
    assert content["header"]["title"]["content"] == "新愿望通知"
    assert content["header"]["template"] == "blue"

    elements = content["elements"]

    dish_elem = next(e for e in elements if "愿望菜品" in e["text"]["content"])
    assert dish_elem["text"]["tag"] == "plain_text"

    submitter_elem = next(e for e in elements if "提交者" in e["text"]["content"])
    assert submitter_elem["text"]["tag"] == "plain_text"

    link_elem = next(e for e in elements if "查看详情" in e["text"]["content"])
    assert link_elem["text"]["tag"] == "lark_md"
    import re
    assert re.search(r"\[查看详情\]\(https://family-chef\.app/wishes/7\)",
                     link_elem["text"]["content"])


@patch("app.integrations.feishu.feishu_client.send_message",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_card_new_omits_missing_optional_fields(
    mock_send_msg, client, user_token
):
    """新愿望卡片在 reference_url=None 且 note=None 时省略这两个字段"""
    from app.integrations.feishu import feishu_client

    await feishu_client.send_wish_notification("open_x", {
        "notification_type": "new",
        "wish_id": 8,
        "dish_name": "菜名",
        "submitter_name": "用户",
        "reference_url": None,
        "note": None,
    })
    _, _, content = mock_send_msg.call_args.args
    text_contents = " ".join(e["text"]["content"] for e in content["elements"])

    assert "参考链接" not in text_contents
    assert "备注" not in text_contents


@patch("app.integrations.feishu.feishu_client.send_message",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_card_new_renders_optional_fields_when_present(
    mock_send_msg, client, user_token
):
    """新愿望卡片在 reference_url 和 note 存在时渲染"""
    from app.integrations.feishu import feishu_client

    await feishu_client.send_wish_notification("open_x", {
        "notification_type": "new",
        "wish_id": 9,
        "dish_name": "菜名",
        "submitter_name": "用户",
        "reference_url": "https://x.example",
        "note": "辣一点",
    })
    _, _, content = mock_send_msg.call_args.args
    elements = content["elements"]

    ref_elems = [e for e in elements if "参考链接" in e["text"]["content"]]
    assert len(ref_elems) == 1
    assert ref_elems[0]["text"]["tag"] == "plain_text"
    assert "https://x.example" in ref_elems[0]["text"]["content"]

    note_elems = [e for e in elements if "备注" in e["text"]["content"]]
    assert len(note_elems) == 1
    assert note_elems[0]["text"]["tag"] == "plain_text"
    assert "辣一点" in note_elems[0]["text"]["content"]


@patch("app.integrations.feishu.feishu_client.send_message",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_card_edit_includes_change_type_and_notes(
    mock_send_msg, client, user_token
):
    """编辑/取消卡片包含通知类型、变更说明、原备注、新备注"""
    from app.integrations.feishu import feishu_client

    await feishu_client.send_wish_notification("open_x", {
        "notification_type": "edit",
        "wish_id": 3,
        "dish_name": "红烧肉",
        "change_description": "测试用户 修改了愿望: 红烧肉",
        "old_note": "原",
        "note_changed": True,
        "new_note": "新",
    })
    _, _, content = mock_send_msg.call_args.args
    assert content["header"]["title"]["content"] == "愿望变更通知"

    text_map = {e["text"]["content"]: e["text"]["tag"] for e in content["elements"]}
    assert "通知类型：edit" in text_map
    assert text_map["通知类型：edit"] == "plain_text"
    assert "变更说明：测试用户 修改了愿望: 红烧肉" in text_map
    assert "原备注：原" in text_map
    assert "新备注：新" in text_map


@patch("app.integrations.feishu.feishu_client.send_message",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_card_cancel_omits_note_sections_when_no_old_note(
    mock_send_msg, client, user_token
):
    """取消卡片在没有旧备注时省略原备注/新备注字段（D-F03 省略规则）"""
    from app.integrations.feishu import feishu_client

    await feishu_client.send_wish_notification("open_x", {
        "notification_type": "cancel",
        "wish_id": 4,
        "dish_name": "宫保鸡丁",
        "change_description": "测试用户 撤回了愿望: 宫保鸡丁",
        "old_note": None,
        "note_changed": False,
    })
    _, _, content = mock_send_msg.call_args.args
    assert content["header"]["title"]["content"] == "愿望变更通知"

    text_contents = " ".join(e["text"]["content"] for e in content["elements"])
    assert "通知类型：cancel" in text_contents
    assert "原备注" not in text_contents
    assert "新备注" not in text_contents


@patch("app.integrations.feishu.feishu_client.send_message",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_card_truncates_notes_longer_than_1000_chars(
    mock_send_msg, client, user_token
):
    """备注超过 1000 字符时被截断（Pitfall 9 A4 卡片容量防护）"""
    from app.integrations.feishu import feishu_client

    # 新愿望：长 note（备注： prefix is 3 chars + 1000 truncated + … 1 char = 1004）
    await feishu_client.send_wish_notification("open_x", {
        "notification_type": "new",
        "wish_id": 5,
        "dish_name": "d",
        "submitter_name": "s",
        "reference_url": None,
        "note": "x" * 1500,
    })
    _, _, content = mock_send_msg.call_args.args
    note_elem = next(e for e in content["elements"] if "备注" in e["text"]["content"])
    assert len(note_elem["text"]["content"]) <= 1005, "total length with label <= 1005"
    assert note_elem["text"]["content"].endswith("…")
    # 去掉 "备注：" 前缀后，文本部分应 <= 1001 (1000 + …)
    value_part = note_elem["text"]["content"].split("：", 1)[1]
    assert len(value_part) <= 1001
    mock_send_msg.reset_mock()

    # 编辑：长 old_note + long new_note
    await feishu_client.send_wish_notification("open_x", {
        "notification_type": "edit",
        "wish_id": 6,
        "dish_name": "d",
        "change_description": "x",
        "old_note": "y" * 1500,
        "note_changed": True,
        "new_note": "z" * 1500,
    })
    _, _, content = mock_send_msg.call_args.args
    for elem in content["elements"]:
        text = elem["text"]["content"]
        if "原备注：" in text or "新备注：" in text:
            value_part = text.split("：", 1)[1]
            if value_part:
                assert len(value_part) <= 1001, f"truncated note length {len(value_part)}"


@patch("app.integrations.feishu.feishu_client.send_message",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_card_user_values_always_plain_text(
    mock_send_msg, client, user_token
):
    """所有用户可控字段使用 plain_text；深链接是唯一的 lark_md"""
    from app.integrations.feishu import feishu_client

    await feishu_client.send_wish_notification("open_x", {
        "notification_type": "edit",
        "wish_id": 10,
        "dish_name": "水煮鱼",
        "change_description": "用户 修改了愿望: 水煮鱼",
        "old_note": "老味道",
        "note_changed": True,
        "new_note": "新口味",
    })
    _, _, content = mock_send_msg.call_args.args

    for elem in content["elements"]:
        text = elem["text"]
        if "查看详情" in text["content"]:
            assert text["tag"] == "lark_md"
        else:
            assert text["tag"] == "plain_text", \
                f"Expected plain_text, got {text['tag']} for {text['content']}"


@patch("app.integrations.feishu.feishu_client.send_message",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_card_deep_link_uses_settings_app_url(
    mock_send_msg, client, user_token
):
    """深链接使用 settings.APP_URL + /wishes/{wish_id} 格式"""
    from app.integrations.feishu import feishu_client

    await feishu_client.send_wish_notification("open_x", {
        "notification_type": "new",
        "wish_id": 42,
        "dish_name": "d",
        "submitter_name": "s",
        "reference_url": None,
        "note": None,
    })
    _, _, content = mock_send_msg.call_args.args
    link_elem = next(e for e in content["elements"] if "查看详情" in e["text"]["content"])
    link_text = link_elem["text"]["content"]

    assert "/wishes/42" in link_text
    assert link_text.startswith("[查看详情](https://family-chef.app/wishes/")


# =============================================================================
# Section D — 红点生命周期 (NOTIF-03) — 恢复后未读 + 非法转换不改变时间戳
# =============================================================================


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_claim_restores_unread_after_prior_clear(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """认领愿望后，提交者红点恢复（NOTIF-03 规则 1）"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "辣子鸡"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    # 提交者查看详情 → 红点清除
    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    assert await _fetch_has_unread(client, user_token, wish_id) is False

    # 厨师认领 → 红点恢复
    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200
    assert await _fetch_has_unread(client, user_token, wish_id) is True


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_advance_restores_unread_after_prior_clear(
    mock_send, client: AsyncClient, user_token: str, chef_token: str,
    published_dish_for_chef: int
):
    """推进愿望后，提交者红点恢复"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "红烧排骨"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    assert await _fetch_has_unread(client, user_token, wish_id) is False

    r = await client.post(
        f"/api/wishes/{wish_id}/advance",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"related_dish_id": published_dish_for_chef},
    )
    assert r.status_code == 200
    assert await _fetch_has_unread(client, user_token, wish_id) is True


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_reject_restores_unread_after_prior_clear(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """拒绝愿望后，提交者红点恢复"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "酸菜鱼"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    assert await _fetch_has_unread(client, user_token, wish_id) is False

    r = await client.post(
        f"/api/wishes/{wish_id}/reject",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"reject_reason": "食材不足"},
    )
    assert r.status_code == 200
    assert await _fetch_has_unread(client, user_token, wish_id) is True


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_cancel_restores_unread_after_prior_clear(
    mock_send, client: AsyncClient, user_token: str
):
    """撤销愿望后，提交者红点恢复"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "番茄炒蛋"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    assert await _fetch_has_unread(client, user_token, wish_id) is False

    r = await client.delete(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    assert await _fetch_has_unread(client, user_token, wish_id) is True


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_invalid_claim_does_not_change_timestamps(
    mock_send, client: AsyncClient, user_token: str, chef_token: str, chef2_token: str
):
    """第二个厨师并发认领失败（400）后 has_unread 保持不变（D-H01 规则 3）"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "干煸豆角"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    unread_before = await _fetch_has_unread(client, user_token, wish_id)

    # chef2 试图认领 → 400（已认领）
    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef2_token}"},
    )
    assert r.status_code == 400

    # 非法操作不应改变 unread 状态
    assert await _fetch_has_unread(client, user_token, wish_id) == unread_before


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_invalid_advance_does_not_change_timestamps(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """无效推进（不存在的 dish_id → 400）不改变时间戳（D-H01 规则 3）"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "梅菜扣肉"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    unread_before = await _fetch_has_unread(client, user_token, wish_id)

    r = await client.post(
        f"/api/wishes/{wish_id}/advance",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"related_dish_id": 999999},
    )
    assert r.status_code == 400

    assert await _fetch_has_unread(client, user_token, wish_id) == unread_before


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_invalid_reject_does_not_change_timestamps(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """无效拒绝（空白 reject_reason → 400）不改变时间戳（D-H01 规则 3）"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "粉蒸肉"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    unread_before = await _fetch_has_unread(client, user_token, wish_id)

    r = await client.post(
        f"/api/wishes/{wish_id}/reject",
        headers={"Authorization": f"Bearer {chef_token}"},
        json={"reject_reason": "   "},
    )
    assert r.status_code == 400

    assert await _fetch_has_unread(client, user_token, wish_id) == unread_before


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_invalid_cancel_does_not_change_timestamps(
    mock_send, client: AsyncClient, user_token: str
):
    """二次撤销（已撤销 → 400）不额外推进时间戳（D-H01 规则 3）"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "蒸蛋"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.get(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    unread_before = await _fetch_has_unread(client, user_token, wish_id)

    # 首次撤销（合法）— 会改变 unread
    r = await client.delete(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    assert await _fetch_has_unread(client, user_token, wish_id) is True

    # 再次撤销（非法 — 状态已是 已撤销）→ 400
    r = await client.delete(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 400

    # 非法撤销后 unread 应与首次撤销后一致（仍为 True）
    assert await _fetch_has_unread(client, user_token, wish_id) is True


@patch("app.integrations.feishu.feishu_client.send_wish_notification",
       new_callable=AsyncMock, return_value=True)
@pytest.mark.asyncio
async def test_content_edit_on_claimed_wish_does_not_advance_status_change_at(
    mock_send, client: AsyncClient, user_token: str, chef_token: str
):
    """内容编辑（update_wish）不写入 last_status_change_at（D-H01 规则 2 — 核心锁）"""
    r = await client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"dish_name": "青椒肉丝", "note": "旧备注"},
    )
    assert r.status_code == 201
    wish_id = r.json()["id"]

    r = await client.post(
        f"/api/wishes/{wish_id}/claim",
        headers={"Authorization": f"Bearer {chef_token}"},
    )
    assert r.status_code == 200

    # 从 DB 直接查询认领后的 last_status_change_at
    from app.models.wish import Wish
    from tests.conftest import test_session_factory
    async with test_session_factory() as session:
        result = await session.execute(select(Wish).where(Wish.id == wish_id))
        wish = result.scalar_one_or_none()
        original_status_change_at = wish.last_status_change_at
        assert original_status_change_at is not None

    # 提交者编辑备注（内容编辑，非状态变更）
    r = await client.put(
        f"/api/wishes/{wish_id}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"note": "新备注"},
    )
    assert r.status_code == 200

    # 从 DB 直接查询编辑后的 last_status_change_at
    async with test_session_factory() as session:
        result = await session.execute(select(Wish).where(Wish.id == wish_id))
        wish = result.scalar_one_or_none()
        new_status_change_at = wish.last_status_change_at

    # D-H01 规则 2: 内容编辑不能推进 last_status_change_at
    assert original_status_change_at == new_status_change_at, \
        f"内容编辑不应改变 last_status_change_at: {original_status_change_at} -> {new_status_change_at}"
