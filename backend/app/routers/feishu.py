"""
家味 · Family Chef - 飞书集成路由
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token
from app.integrations.feishu import feishu_client
from app.models.user import User

router = APIRouter()


@router.post("/bind")
async def bind_user(
    feishu_open_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """绑定飞书账号"""
    # 更新用户的 feishu_open_id
    current_user.feishu_open_id = feishu_open_id
    await db.commit()

    return {"message": "飞书账号绑定成功"}


@router.post("/notify")
async def send_notify(
    receive_id: str,
    order_no: Optional[str] = None,
    status: Optional[str] = None,
    items: Optional[list] = None,
    current_user: User = Depends(get_current_user_from_token),
):
    """发送飞书消息（内部调用）"""
    # 权限检查：仅管理员和厨师可发送通知
    if current_user.role not in ["admin", "chef"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，仅管理员和厨师可发送飞书通知",
        )

    if order_no and status:
        success = await feishu_client.send_order_notification(
            receive_id,
            order_no,
            status,
            items or [],
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="缺少必要参数",
        )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="飞书消息发送失败",
        )

    return {"message": "飞书消息发送成功"}