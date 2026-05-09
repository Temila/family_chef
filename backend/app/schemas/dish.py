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
    status: Optional[str] = "draft"


class DishUpdate(BaseModel):
    """更新菜品请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: Optional[bool] = None
    status: Optional[str] = None


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


class DishDetailResponse(BaseModel):
    """菜品详情响应"""
    id: int
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: bool
    status: str
    categories: List[CategoryInfo] = []
    ingredients: List[IngredientInfo] = []
    dietary_warning: Optional[DietaryWarning] = None
    
    class Config:
        from_attributes = True
    
    @classmethod
    def model_validate(cls, obj, **kwargs):
        """自定义验证逻辑，处理 DishIngredient 和 DishCategory 对象"""
        # 转换 ingredients
        if hasattr(obj, 'ingredients') and obj.ingredients:
            ingredients = []
            for dish_ing in obj.ingredients:
                if hasattr(dish_ing, 'ingredient') and dish_ing.ingredient:
                    ingredients.append({
                        'id': dish_ing.ingredient.id,
                        'name': dish_ing.ingredient.name,
                    })
                elif hasattr(dish_ing, 'id'):
                    # 直接是 Ingredient 对象
                    ingredients.append({
                        'id': dish_ing.id,
                        'name': dish_ing.name,
                    })
            obj._ingredients_data = ingredients
        
        # 转换 categories
        if hasattr(obj, 'categories') and obj.categories:
            categories = []
            for dish_cat in obj.categories:
                if hasattr(dish_cat, 'category') and dish_cat.category:
                    categories.append({
                        'id': dish_cat.category.id,
                        'name': dish_cat.category.name,
                        'type': dish_cat.category.type,
                    })
                elif hasattr(dish_cat, 'id'):
                    # 直接是 Category 对象
                    categories.append({
                        'id': dish_cat.id,
                        'name': dish_cat.name,
                        'type': dish_cat.type,
                    })
            obj._categories_data = categories
        
        return super().model_validate(obj, **kwargs)
