"""菜品 Schema"""
from pydantic import BaseModel
from typing import Optional, List

class DishCreate(BaseModel):
    """创建菜品请求"""
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: bool = False
    category_ids: Optional[List[int]] = None
    ingredient_ids: Optional[List[int]] = None

class DishUpdate(BaseModel):
    """更新菜品请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: Optional[bool] = None

class DietaryWarning(BaseModel):
    """忌口提示"""
    type: str  # dislike | allergy
    ingredient: str

class DishListResponse(BaseModel):
    """菜品列表项响应"""
    id: int
    name: str
    pinyin: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    categories: List[dict] = []
    dietary_warnings: Optional[List[DietaryWarning]] = None
    
    class Config:
        from_attributes = True

class DishDetailResponse(BaseModel):
    """菜品详情响应"""
    id: int
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: bool
    categories: List[dict] = []
    ingredients: List[dict] = []
    dietary_warning: Optional[DietaryWarning] = None
    
    class Config:
        from_attributes = True
