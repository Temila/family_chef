"""访客邀请 Schema"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class GuestInvitationCreate(BaseModel):
    """创建访客邀请请求"""
    chef_id: Optional[int] = None


class GuestInvitationResponse(BaseModel):
    """访客邀请响应"""
    id: int
    token: str
    inviter_id: int
    chef_id: int
    status: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class GuestOrderItemCreate(BaseModel):
    """访客订单项创建请求"""
    dish_id: int
    quantity: int = 1
    special_notes: Optional[str] = None


class GuestOrderCreate(BaseModel):
    """访客订单创建请求"""
    items: List[GuestOrderItemCreate]
    notes: Optional[str] = None
    meal_date: Optional[date] = None
    meal_type: Optional[str] = None


class GuestOrderSummaryResponse(BaseModel):
    """访客订单摘要响应"""
    order_no: str
    status: str
    items: list = []
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
