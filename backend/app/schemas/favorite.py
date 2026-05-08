"""收藏 Schema"""
from pydantic import BaseModel

class FavoriteCreate(BaseModel):
    """添加收藏请求"""
    dish_id: int

class FavoriteResponse(BaseModel):
    """收藏响应"""
    id: int
    user_id: int
    dish_id: int
    
    class Config:
        from_attributes = True
