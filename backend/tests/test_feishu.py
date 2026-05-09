"""
家味 · Family Chef - 飞书集成模块测试
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_bind_feishu_account(client: AsyncClient, user_token: str):
    """测试绑定飞书账号"""
    response = await client.post(
        "/api/feishu/bind?feishu_open_id=test_open_id_123",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "成功" in data["message"]


@pytest.mark.asyncio
async def test_bind_feishu_unauthorized(client: AsyncClient):
    """测试未认证绑定飞书"""
    response = await client.post(
        "/api/feishu/bind?feishu_open_id=test_open_id",
    )
    assert response.status_code in [401, 403]


@pytest.mark.asyncio
async def test_send_notify_forbidden(client: AsyncClient, user_token: str):
    """测试普通用户无法发送飞书通知"""
    response = await client.post(
        "/api/feishu/notify?receive_id=test&order_no=ORD001&order_status=pending",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_send_notify_missing_params(client: AsyncClient, admin_token: str):
    """测试缺少参数发送通知"""
    response = await client.post(
        "/api/feishu/notify?receive_id=test",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_send_notify_success(client: AsyncClient, admin_token: str):
    """测试成功发送飞书通知（mock）"""
    with patch("app.routers.feishu.feishu_client") as mock_client:
        mock_client.send_order_notification = AsyncMock(return_value=True)
        
        response = await client.post(
            "/api/feishu/notify?receive_id=test_user&order_no=ORD202605090001&order_status=accepted&items=dish1",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert "成功" in response.json()["message"]


@pytest.mark.asyncio
async def test_send_notify_failure(client: AsyncClient, admin_token: str):
    """测试飞书通知发送失败"""
    with patch("app.routers.feishu.feishu_client") as mock_client:
        mock_client.send_order_notification = AsyncMock(return_value=False)
        
        response = await client.post(
            "/api/feishu/notify?receive_id=test_user&order_no=ORD202605090001&order_status=accepted",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 500
