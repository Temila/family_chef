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
    is_semifinished: bool = False
    category_ids: Optional[List[int]] = None
    ingredient_ids: Optional[List[int]] = None
    semifinished_dish_ids: Optional[List[int]] = None
    chef_ids: Optional[List[int]] = None
    status: Optional[str] = "enabled"


class DishUpdate(BaseModel):
    """更新菜品请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    recipe: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: Optional[bool] = None
    is_semifinished: Optional[bool] = None
    status: Optional[str] = None
    category_ids: Optional[List[int]] = None
    ingredient_ids: Optional[List[int]] = None
    semifinished_dish_ids: Optional[List[int]] = None
    chef_ids: Optional[List[int]] = None


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
    category: Optional[str] = None
    
    class Config:
        from_attributes = True

    @field_validator('category', mode='before')
    @classmethod
    def map_ingredient_category(cls, v):
        if v and hasattr(v, 'name'):
            return v.name
        return v or None


class SemifinishedDishInfo(BaseModel):
    """半成品菜品信息"""
    id: int
    name: str
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class ChefInfo(BaseModel):
    """厨师信息"""
    id: int
    username: str
    display_name: Optional[str] = None

    class Config:
        from_attributes = True


class ChefInfoWithStatus(BaseModel):
    """厨师信息（含上架状态）"""
    id: int
    username: str
    display_name: Optional[str] = None
    publish_status: str = "hidden"

    class Config:
        from_attributes = True


class DishListResponse(BaseModel):
    """菜品列表项响应"""
    id: int
    name: str
    pinyin: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    is_semifinished: bool = False
    categories: List[CategoryInfo] = []
    chefs: List[ChefInfoWithStatus] = []
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

    @field_validator('chefs', mode='before')
    @classmethod
    def map_chefs(cls, v):
        if v and hasattr(v[0], 'chef_id'):
            return [
                {'id': dc.chef.id, 'username': dc.chef.username, 'display_name': dc.chef.display_name, 'publish_status': dc.status}
                for dc in v if dc.chef is not None
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
    is_semifinished: bool = False
    status: str
    categories: List[CategoryInfo] = []
    ingredients: List[IngredientInfo] = []
    semifinished_ingredients: List[SemifinishedDishInfo] = []
    chefs: List[ChefInfoWithStatus] = []
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
                {'id': di.ingredient.id, 'name': di.ingredient.name, 'category': di.ingredient.category}
                for di in v if di.ingredient is not None
            ]
        return v

    @field_validator('semifinished_ingredients', mode='before')
    @classmethod
    def map_semifinished_ingredients(cls, v):
        if v and hasattr(v[0], 'semifinished_dish_id'):
            return [
                {'id': di.semifinished_dish.id, 'name': di.semifinished_dish.name, 'image_url': di.semifinished_dish.image_url}
                for di in v if di.semifinished_dish is not None
            ]
        return v

    @field_validator('chefs', mode='before')
    @classmethod
    def map_chefs(cls, v):
        if v and hasattr(v[0], 'chef_id'):
            return [
                {'id': dc.chef.id, 'username': dc.chef.username, 'display_name': dc.chef.display_name, 'publish_status': dc.status}
                for dc in v if dc.chef is not None
            ]
        return v
