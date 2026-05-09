"""食材服务"""
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ingredient import Ingredient, IngredientAlias
from app.utils.security import hash_password  # 复用 pinyin 生成逻辑


class IngredientService:
    """食材服务"""
    
    @staticmethod
    async def get_ingredient_by_id(db: AsyncSession, ingredient_id: int) -> Optional[Ingredient]:
        """根据 ID 获取食材"""
        result = await db.execute(
            select(Ingredient).where(Ingredient.id == ingredient_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def list_ingredients(
        db: AsyncSession,
        category: Optional[str] = None,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[Ingredient]:
        """查询食材列表"""
        query = select(Ingredient)
        
        if category:
            query = query.where(Ingredient.category == category)
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                Ingredient.name.like(search_pattern) |
                Ingredient.pinyin.like(search_pattern)
            )
        if is_active is not None:
            query = query.where(Ingredient.is_active == is_active)
        
        query = query.order_by(Ingredient.name)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def create_ingredient(
        db: AsyncSession,
        name: str,
        pinyin: Optional[str] = None,
        category: Optional[str] = None,
        description: Optional[str] = None,
        image_url: Optional[str] = None,
        unit: Optional[str] = None,
        aliases: Optional[List[str]] = None,
    ) -> Ingredient:
        """创建食材"""
        # 检查名称是否已存在
        result = await db.execute(
            select(Ingredient).where(Ingredient.name == name)
        )
        if result.scalar_one_or_none():
            raise ValueError(f"食材 '{name}' 已存在")
        
        ingredient = Ingredient(
            name=name,
            pinyin=pinyin,
            category=category,
            description=description,
            image_url=image_url,
        )
        db.add(ingredient)
        await db.flush()
        
        # 添加别名
        if aliases:
            for alias in aliases:
                ingredient_alias = IngredientAlias(
                    ingredient_id=ingredient.id,
                    alias=alias,
                )
                db.add(ingredient_alias)
        
        await db.flush()
        await db.refresh(ingredient)
        return ingredient
    
    @staticmethod
    async def update_ingredient(
        db: AsyncSession,
        ingredient_id: int,
        name: Optional[str] = None,
        pinyin: Optional[str] = None,
        category: Optional[str] = None,
        description: Optional[str] = None,
        image_url: Optional[str] = None,
        is_active: Optional[bool] = None,
        aliases: Optional[List[str]] = None,
    ) -> Optional[Ingredient]:
        """更新食材"""
        ingredient = await IngredientService.get_ingredient_by_id(db, ingredient_id)
        if not ingredient:
            return None
        
        if name is not None:
            # 检查新名称是否已被其他食材使用
            result = await db.execute(
                select(Ingredient).where(
                    Ingredient.name == name,
                    Ingredient.id != ingredient_id,
                )
            )
            if result.scalar_one_or_none():
                raise ValueError(f"食材 '{name}' 已存在")
            ingredient.name = name
        if pinyin is not None:
            ingredient.pinyin = pinyin
        if category is not None:
            ingredient.category = category
        if description is not None:
            ingredient.description = description
        if image_url is not None:
            ingredient.image_url = image_url
        if is_active is not None:
            ingredient.is_active = is_active
        
        # 更新别名
        if aliases is not None:
            # 删除旧别名
            result = await db.execute(
                select(IngredientAlias).where(
                    IngredientAlias.ingredient_id == ingredient_id
                )
            )
            old_aliases = result.scalars().all()
            for alias in old_aliases:
                await db.delete(alias)
            
            # 添加新别名
            for alias in aliases:
                ingredient_alias = IngredientAlias(
                    ingredient_id=ingredient_id,
                    alias=alias,
                )
                db.add(ingredient_alias)
        
        await db.flush()
        await db.refresh(ingredient)
        return ingredient
    
    @staticmethod
    async def delete_ingredient(db: AsyncSession, ingredient_id: int) -> bool:
        """删除食材（软删除）"""
        ingredient = await IngredientService.get_ingredient_by_id(db, ingredient_id)
        if not ingredient:
            return False
        
        ingredient.is_active = False
        await db.flush()
        return True


# 全局食材服务实例
ingredient_service = IngredientService()
