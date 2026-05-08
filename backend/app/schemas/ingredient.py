"""食材 Schema"""
from pydantic import BaseModel
from typing import Optional, List

class IngredientCreate(BaseModel):
    """创建食材请求"""
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    aliases: Optional[List[str]] = None

class IngredientUpdate(BaseModel):
    """更新食材请求"""
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

class IngredientResponse(BaseModel):
    """食材响应"""
    id: int
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    
    class Config:
        from_attributes = True

class IngredientAliasCreate(BaseModel):
    """创建别名请求"""
    alias: str
