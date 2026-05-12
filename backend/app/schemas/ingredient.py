"""食材 Schema"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class IngredientCreate(BaseModel):
    """创建食材请求"""
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    aliases: Optional[List[str]] = None


class IngredientUpdate(BaseModel):
    """更新食材请求"""
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    aliases: Optional[List[str]] = None


class IngredientResponse(BaseModel):
    """食材响应"""
    id: int
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool
    aliases: List[str] = []
    
    class Config:
        from_attributes = True
