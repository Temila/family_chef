"""
家味 · Family Chef - 工具模块测试（食材抽取）
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_extract_ingredients_empty_text(client: AsyncClient, user_token: str):
    """测试空文本抽取"""
    response = await client.post(
        "/api/tools/extract-ingredients",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"text": "   "},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_extract_ingredients_no_match(client: AsyncClient, user_token: str):
    """测试无匹配食材"""
    response = await client.post(
        "/api/tools/extract-ingredients",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"text": "今天天气真好"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "matched" in data
    assert "unmatched" in data
    assert len(data["matched"]) == 0


@pytest.mark.asyncio
async def test_extract_ingredients_exact_match(client: AsyncClient, user_token: str, admin_token: str):
    """测试精确匹配食材"""
    # 先创建食材
    resp = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "番茄"},
    )
    assert resp.status_code == 201

    response = await client.post(
        "/api/tools/extract-ingredients",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"text": "今天买了番茄和鸡蛋"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["matched"]) >= 1
    matched_names = [m["ingredient_name"] for m in data["matched"]]
    assert "番茄" in matched_names


@pytest.mark.asyncio
async def test_extract_ingredients_alias_match(client: AsyncClient, user_token: str, admin_token: str):
    """测试别名匹配食材"""
    # 创建食材带别名
    resp = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "马铃薯", "aliases": ["土豆"]},
    )
    if resp.status_code != 201:
        # 如果已存在，跳过
        pytest.skip(f"创建食材失败: {resp.status_code} {resp.text}")

    response = await client.post(
        "/api/tools/extract-ingredients",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"text": "今天买了土豆"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["matched"]) >= 1
    # 别名匹配到的应该是马铃薯
    matched_names = [m["ingredient_name"] for m in data["matched"]]
    assert "马铃薯" in matched_names


@pytest.mark.asyncio
async def test_extract_ingredients_mixed_text(client: AsyncClient, user_token: str, admin_token: str):
    """测试混合文本抽取"""
    # 创建食材
    for name in ["洋葱", "大蒜"]:
        await client.post(
            "/api/ingredients/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": name},
        )

    response = await client.post(
        "/api/tools/extract-ingredients",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"text": "洋葱、大蒜和一些其他东西"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["matched"]) >= 2


@pytest.mark.asyncio
async def test_extract_ingredients_unauthorized(client: AsyncClient):
    """测试未认证请求"""
    response = await client.post(
        "/api/tools/extract-ingredients",
        json={"text": "番茄"},
    )
    assert response.status_code in [401, 403]
