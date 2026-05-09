"""食材 Schema"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class IngredientCreate(BaseModel):
    """创建食材请求"""
    name: str
    pinyin: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    unit: Optional[str] = None  # 单位：个、斤、克等
    aliases: Optional[List[str]] = None


class IngredientUpdate(BaseModel):
    """更新食材请求"""
    name: Optional[str] = None
    pinyin: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    unit: Optional[str] = None
    aliases: Optional[List[str]] = None


class IngredientResponse(BaseModel):
    """食材响应"""
    id: int
    name: str
    pinyin: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool
    unit: Optional[str] = None
    aliases: List[str] = []
    
    class Config:
        from_attributes = True
