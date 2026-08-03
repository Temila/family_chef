"""主题 CRUD 测试 (Phase 17 SYNC-02/SYNC-04)"""
import pytest
from httpx import AsyncClient

VALID_PAYLOAD = {
    "name": "我的春",
    "source_colors": {
        "primary": "#34834E",
        "secondary": "#506446",
        "tertiary": "#F5B43C",
    },
    "variant": "TonalSpot",
}


@pytest.mark.asyncio
async def test_create_theme(client: AsyncClient, user_token: str):
    """测试创建主题 — 201 + 字段正确 + hex lowercase"""
    response = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=VALID_PAYLOAD,
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["name"] == "我的春"
    # hex 校验器应 lower 大写字母
    assert data["source_colors"] == {
        "primary": "#34834e",
        "secondary": "#506446",
        "tertiary": "#f5b43c",
    }
    assert data["variant"] == "TonalSpot"
    assert "user_id" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_theme_invalid_hex(client: AsyncClient, user_token: str):
    """非法 hex 颜色应返回 400 + 提示"""
    payload = {
        **VALID_PAYLOAD,
        "source_colors": {
            "primary": "not-hex",
            "secondary": "#506446",
            "tertiary": "#F5B43C",
        },
    }
    response = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=payload,
    )
    assert response.status_code == 422  # pydantic raises ValidationError before service


@pytest.mark.asyncio
async def test_create_theme_invalid_variant(client: AsyncClient, user_token: str):
    """不支持的 variant 应返回 422 (pydantic 校验)"""
    payload = {**VALID_PAYLOAD, "variant": "Imaginary"}
    response = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=payload,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_theme_empty_name(client: AsyncClient, user_token: str):
    """空白 name 应返回 422"""
    payload = {**VALID_PAYLOAD, "name": "   "}
    response = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=payload,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_themes(client: AsyncClient, user_token: str):
    """创建后应能列出"""
    await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=VALID_PAYLOAD,
    )
    response = await client.get(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1


@pytest.mark.asyncio
async def test_list_themes_isolation(
    client: AsyncClient, user_token: str, user2_token: str
):
    """每个用户只应看到自己的主题"""
    # user1 创建
    await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={**VALID_PAYLOAD, "name": "user1_theme"},
    )
    # user2 创建
    await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user2_token}"},
        json={**VALID_PAYLOAD, "name": "user2_theme"},
    )

    # user1 只能看到自己的
    r1 = await client.get(
        "/api/themes", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert r1.status_code == 200
    data1 = r1.json()
    assert len(data1) == 1
    assert data1[0]["name"] == "user1_theme"

    # user2 只能看到自己的
    r2 = await client.get(
        "/api/themes", headers={"Authorization": f"Bearer {user2_token}"}
    )
    assert r2.status_code == 200
    data2 = r2.json()
    assert len(data2) == 1
    assert data2[0]["name"] == "user2_theme"


@pytest.mark.asyncio
async def test_update_theme(client: AsyncClient, user_token: str):
    """更新主题 — 200 + 字段更新 + updated_at 变化"""
    create_resp = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=VALID_PAYLOAD,
    )
    theme_id = create_resp.json()["id"]
    created_at = create_resp.json()["created_at"]
    updated_at = create_resp.json()["updated_at"]

    # 等 1 秒确保 updated_at 时间戳能变化
    import asyncio

    await asyncio.sleep(1.1)

    update_payload = {
        "name": "我的夏",
        "source_colors": {
            "primary": "#FF0000",
            "secondary": "#00FF00",
            "tertiary": "#0000FF",
        },
    }
    response = await client.put(
        f"/api/themes/{theme_id}",
        headers={"Authorization": f"Bearer {user_token}"},
        json=update_payload,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "我的夏"
    assert data["source_colors"]["primary"] == "#ff0000"
    # updated_at 应当晚于 created_at
    assert data["updated_at"] != updated_at
    assert data["created_at"] == created_at


@pytest.mark.asyncio
async def test_update_theme_not_owner(
    client: AsyncClient, user_token: str, user2_token: str
):
    """非所有者 PUT 应返回 403"""
    create_resp = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=VALID_PAYLOAD,
    )
    theme_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/themes/{theme_id}",
        headers={"Authorization": f"Bearer {user2_token}"},
        json={"name": "hacked"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_theme(client: AsyncClient, user_token: str):
    """删除主题 — 204 + 后续 GET 看不到"""
    create_resp = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=VALID_PAYLOAD,
    )
    theme_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/themes/{theme_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 204

    list_resp = await client.get(
        "/api/themes", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 0


@pytest.mark.asyncio
async def test_delete_theme_not_owner(
    client: AsyncClient, user_token: str, user2_token: str
):
    """非所有者 DELETE 应返回 403,且原主题仍存在"""
    create_resp = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=VALID_PAYLOAD,
    )
    theme_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/themes/{theme_id}",
        headers={"Authorization": f"Bearer {user2_token}"},
    )
    assert response.status_code == 403

    # 验证原主题仍存在
    list_resp = await client.get(
        "/api/themes", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1


@pytest.mark.asyncio
async def test_create_theme_duplicate_name(client: AsyncClient, user_token: str):
    """同名主题应返回 400(唯一约束)"""
    payload = {**VALID_PAYLOAD, "name": "重名"}
    r1 = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=payload,
    )
    assert r1.status_code == 201

    r2 = await client.post(
        "/api/themes",
        headers={"Authorization": f"Bearer {user_token}"},
        json=payload,
    )
    assert r2.status_code == 400
    assert "已存在同名主题" in r2.json()["detail"]


@pytest.mark.asyncio
async def test_unauthenticated_create(client: AsyncClient):
    """无 Authorization 头的 POST 应返回 401"""
    response = await client.post("/api/themes", json=VALID_PAYLOAD)
    assert response.status_code == 401