"""
家味 · Family Chef - 系统管理模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_stats_success(client: AsyncClient, admin_token: str):
    """测试管理员获取系统统计"""
    response = await client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "dishes" in data
    assert "orders" in data
    assert "total" in data["users"]
    assert "active" in data["users"]
    assert "total" in data["dishes"]


@pytest.mark.asyncio
async def test_get_stats_forbidden(client: AsyncClient, user_token: str):
    """测试普通用户无法获取系统统计"""
    response = await client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_logs_empty(client: AsyncClient, admin_token: str):
    """测试空日志查询"""
    response = await client.get(
        "/api/admin/logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert "page" in data


@pytest.mark.asyncio
async def test_get_logs_with_filters(client: AsyncClient, admin_token: str):
    """测试带筛选条件的日志查询"""
    response = await client.get(
        "/api/admin/logs?action=login&page=1&page_size=10",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data


@pytest.mark.asyncio
async def test_get_logs_with_date_range(client: AsyncClient, admin_token: str):
    """测试带日期范围的日志查询"""
    from datetime import date
    today = date.today().isoformat()
    response = await client.get(
        f"/api/admin/logs?start_date={today}&end_date={today}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_logs_forbidden(client: AsyncClient, user_token: str):
    """测试普通用户无法查看日志"""
    response = await client.get(
        "/api/admin/logs",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_dashboard(client: AsyncClient, admin_token: str):
    """测试管理员获取仪表盘数据"""
    response = await client.get(
        "/api/admin/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "stats" in data
    assert "recent_orders" in data
    assert "recent_activities" in data


@pytest.mark.asyncio
async def test_get_dashboard_forbidden(client: AsyncClient, user_token: str):
    """测试普通用户无法获取仪表盘"""
    response = await client.get(
        "/api/admin/dashboard",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403
