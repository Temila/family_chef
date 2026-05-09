"""分类 Schema"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CategoryCreate(BaseModel):
    """创建分类请求"""
    name: str
    type: str  # region, cuisine, taste, season
    parent_id: Optional[int] = None
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    """更新分类请求"""
    name: Optional[str] = None
    type: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    """分类响应"""
    id: int
    name: str
    type: str
    parent_id: Optional[int] = None
    sort_order: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class CategoryTreeResponse(CategoryResponse):
    """分类树形响应"""
    children: List['CategoryTreeResponse'] = []
