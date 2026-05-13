"""菜品 Schema"""
from pydantic import BaseModel, field_validator
from typing import Optional, List


class DishCreate(BaseModel):
    """创建菜品请求"""
    name: str
    description: Optional[str] = None
    recipe: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: bool = False
    category_ids: Optional[List[int]] = None
    ingredient_ids: Optional[List[int]] = None
    status: Optional[str] = "draft"


class DishUpdate(BaseModel):
    """更新菜品请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    recipe: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: Optional[bool] = None
    status: Optional[str] = None
    category_ids: Optional[List[int]] = None
    ingredient_ids: Optional[List[int]] = None


class DietaryWarning(BaseModel):
    """忌口提示"""
    type: str  # dislike | allergy
    ingredient: str


class CategoryInfo(BaseModel):
    """分类信息"""
    id: int
    name: str
    type: str
    
    class Config:
        from_attributes = True


class IngredientInfo(BaseModel):
    """食材信息"""
    id: int
    name: str
    
    class Config:
        from_attributes = True


class DishListResponse(BaseModel):
    """菜品列表项响应"""
    id: int
    name: str
    pinyin: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    categories: List[CategoryInfo] = []
    dietary_warnings: Optional[List[DietaryWarning]] = None
    
    class Config:
        from_attributes = True

    @field_validator('categories', mode='before')
    @classmethod
    def map_dish_categories(cls, v):
        if v and hasattr(v[0], 'category_id'):
            return [
                {'id': dc.category.id, 'name': dc.category.name, 'type': dc.category.type}
                for dc in v if dc.category is not None
            ]
        return v


class DishDetailResponse(BaseModel):
    """菜品详情响应"""
    id: int
    name: str
    description: Optional[str] = None
    recipe: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: bool
    status: str
    categories: List[CategoryInfo] = []
    ingredients: List[IngredientInfo] = []
    dietary_warning: Optional[DietaryWarning] = None
    
    class Config:
        from_attributes = True

    @field_validator('categories', mode='before')
    @classmethod
    def map_categories(cls, v):
        if v and hasattr(v[0], 'category_id'):
            return [
                {'id': dc.category.id, 'name': dc.category.name, 'type': dc.category.type}
                for dc in v if dc.category is not None
            ]
        return v

    @field_validator('ingredients', mode='before')
    @classmethod
    def map_ingredients(cls, v):
        if v and hasattr(v[0], 'ingredient_id'):
            return [
                {'id': di.ingredient.id, 'name': di.ingredient.name}
                for di in v if di.ingredient is not None
            ]
        return v
