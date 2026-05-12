"""订单 Schema"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class OrderItemCreate(BaseModel):
    """订单项创建请求"""
    dish_id: int
    quantity: int = 1
    special_notes: Optional[str] = None

class OrderCreate(BaseModel):
    """创建订单请求"""
    items: List[OrderItemCreate]
    notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    """订单状态更新请求"""
    status: str

class OrderItemResponse(BaseModel):
    """订单项响应"""
    id: int
    dish_id: int
    dish_name: Optional[str] = None
    quantity: int
    special_notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class OrderListResponse(BaseModel):
    """订单列表项响应"""
    id: int
    order_no: str
    status: str
    items: List[OrderItemResponse] = []
    created_at: datetime
    
    class Config:
        from_attributes = True

class OrderDetailResponse(BaseModel):
    """订单详情响应"""
    id: int
    order_no: str
    user_id: int
    status: str
    chef_id: Optional[int] = None
    notes: Optional[str] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
