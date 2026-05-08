"""
家味 · Family Chef - 日志中间件
"""

from typing import Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session_factory
from app.services.admin_service import admin_service


async def log_action(
    user_id: Optional[int],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
):
    """记录系统操作日志"""
    async with async_session_factory() as session:
        try:
            await admin_service.log_action(
                session,
                user_id=user_id,
                action=action,
                target_type=target_type,
                target_id=target_id,
                detail=detail,
                ip_address=ip_address,
            )
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"日志记录失败：{e}")


def get_client_ip(request: Request) -> str:
    """获取客户端 IP 地址"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"