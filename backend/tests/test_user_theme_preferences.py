"""用户主题偏好 API 测试 (Phase 19 D-A7)"""
import asyncio

import pytest
from httpx import AsyncClient
from sqlalchemy import text

from tests.conftest import test_session_factory

VALID_PAYLOAD = {
    "active_theme": {
        "sourceColors": {"primary": "#34834e", "secondary": "#506446", "tertiary": "#f5b43c"},
        "variant": "TonalSpot",
        "kind": "preset",
        "id": "default",
        "name": "默认",
    },
    "season_enabled": False,
    "hemisphere": "north",
}


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_unauthenticated_get_returns_401(client: AsyncClient):
    """无 Authorization 头的 GET 应返回 401"""
    response = await client.get("/api/users/me/theme-preferences")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_unauthenticated_put_returns_401(client: AsyncClient):
    """无 Authorization 头的 PUT 应返回 401"""
    response = await client.put(
        "/api/users/me/theme-preferences",
        json=VALID_PAYLOAD,
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_returns_404_when_none(client: AsyncClient, user_token: str):
    """新用户首次 GET 应返回 404 + 中文提示"""
    response = await client.get(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "未设置主题偏好"


@pytest.mark.asyncio
async def test_put_then_get_roundtrip(client: AsyncClient, user_token: str):
    """PUT 创建行 → GET 读回, 字段一致"""
    put_resp = await client.put(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
        json=VALID_PAYLOAD,
    )
    assert put_resp.status_code == 200
    data = put_resp.json()
    assert data["user_id"] > 0
    assert data["active_theme"]["sourceColors"]["primary"] == "#34834e"
    assert data["season_enabled"] is False
    assert data["hemisphere"] == "north"
    assert set(data["season_theme_map"].keys()) == {"spring", "summer", "autumn", "winter"}
    assert "updated_at" in data

    # GET 读回
    get_resp = await client.get(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
    )
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["active_theme"]["sourceColors"]["primary"] == "#34834e"
    assert get_data["hemisphere"] == "north"


@pytest.mark.asyncio
async def test_put_active_theme_with_integer_id_roundtrip(client: AsyncClient, user_token: str):
    """自定义主题的 id 是 DB 自增整数(非预设字符串), PUT 应接受并如实往返。

    回归测试: Phase 19 UAT 测试 3 发现 active_theme.id=1 (int) 被 422 拒绝,
    因为 ActiveThemePayload.id 原定义为 Optional[str]。修复后 id 同时接受 str/int。
    """
    custom_theme_payload = {
        **VALID_PAYLOAD,
        "active_theme": {
            "sourceColors": {"primary": "#aa1122", "secondary": "#bb2233", "tertiary": "#cc3344"},
            "variant": "TonalSpot",
            "kind": "custom",
            "id": 1,  # 自定义主题 DB 主键是整数
            "name": "测试主题1",
        },
    }
    put_resp = await client.put(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
        json=custom_theme_payload,
    )
    assert put_resp.status_code == 200, put_resp.text
    data = put_resp.json()
    assert data["active_theme"]["id"] == 1  # 整数如实往返
    assert data["active_theme"]["kind"] == "custom"

    # GET 读回仍是整数
    get_resp = await client.get(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["active_theme"]["id"] == 1


@pytest.mark.asyncio
async def test_put_upsert_no_duplicate_row(client: AsyncClient, user_token: str):
    """连续两次 PUT 不应创建新行(upsert), updated_at 推进"""
    await client.put(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
        json=VALID_PAYLOAD,
    )

    await asyncio.sleep(1.1)  # 确保 updated_at 能变化

    second_payload = {**VALID_PAYLOAD, "hemisphere": "south", "season_enabled": True}
    second_resp = await client.put(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
        json=second_payload,
    )
    assert second_resp.status_code == 200
    second_data = second_resp.json()
    assert second_data["hemisphere"] == "south"
    assert second_data["season_enabled"] is True

    # 直接查 DB, 确认该用户只有 1 行
    async with test_session_factory() as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM user_theme_preferences")
        )
        assert result.scalar() == 1


@pytest.mark.asyncio
async def test_put_invalid_hemisphere(client: AsyncClient, user_token: str):
    """非法 hemisphere 应返回 422"""
    payload = {**VALID_PAYLOAD, "hemisphere": "east"}
    response = await client.put(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
        json=payload,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_put_invalid_active_theme(client: AsyncClient, user_token: str):
    """active_theme 缺少 secondary/tertiary 应返回 422"""
    payload = {
        **VALID_PAYLOAD,
        "active_theme": {"sourceColors": {"primary": "#111"}},
    }
    response = await client.put(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
        json=payload,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_user_isolation(client: AsyncClient, user_token: str, user2_token: str):
    """User A 的偏好对 User B 不可见 (按 user_id 隔离)"""
    # user1 PUT
    put_resp = await client.put(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
        json=VALID_PAYLOAD,
    )
    assert put_resp.status_code == 200

    # user2 GET → 404 (看不到 user1 的行)
    get_resp = await client.get(
        "/api/users/me/theme-preferences",
        headers=_auth(user2_token),
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_cascade_delete_on_user_delete(client: AsyncClient, user_token: str):
    """删除用户后, user_theme_preferences 行应被 FK CASCADE 删除"""
    # 先 PUT 创建偏好行
    put_resp = await client.put(
        "/api/users/me/theme-preferences",
        headers=_auth(user_token),
        json=VALID_PAYLOAD,
    )
    assert put_resp.status_code == 200
    user_id = put_resp.json()["user_id"]

    # 直接 DB 确认行存在
    async with test_session_factory() as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM user_theme_preferences WHERE user_id=:uid"),
            {"uid": user_id},
        )
        assert result.scalar() == 1

        # HARD DELETE 用户, 触发 FK ON DELETE CASCADE
        await session.execute(text("DELETE FROM users WHERE id=:uid"), {"uid": user_id})
        await session.commit()

        # 验证级联: user_theme_preferences 行已消失
        result = await session.execute(
            text("SELECT COUNT(*) FROM user_theme_preferences WHERE user_id=:uid"),
            {"uid": user_id},
        )
        assert result.scalar() == 0
