"""
家味 · Family Chef - 版本端点测试（TD-02）
"""

import pytest
from httpx import AsyncClient

from app.config import settings


@pytest.mark.asyncio
async def test_version_endpoint(client: AsyncClient):
    """测试版本端点返回 config.yaml 的版本与名称"""
    response = await client.get("/api/version")
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == settings.APP_VERSION
    assert data["name"] == settings.APP_NAME
