"""食材管理路由"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token, require_role
from app.services.ingredient_service import ingredient_service
from app.schemas.ingredient import IngredientCreate, IngredientUpdate, IngredientResponse
from app.models.user import User

router = APIRouter()


@router.get("")
async def list_ingredients(
    category: Optional[str] = Query(None, description="食材分类"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db),
):
    """食材列表"""
    ingredients = await ingredient_service.list_ingredients(
        db,
        category=category,
        search=search,
    )
    
    items = []
    for ing in ingredients:
        aliases = [alias.alias for alias in ing.aliases]
        items.append({
            "id": ing.id,
            "name": ing.name,
            "category": ing.category,
            "description": ing.description,
            "image_url": ing.image_url,
            "is_active": ing.is_active,
            "aliases": aliases,
        })
    
    return {
        "total": len(items),
        "items": items,
    }


@router.post("", response_model=IngredientResponse, status_code=status.HTTP_201_CREATED)
async def create_ingredient(
    request: IngredientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "chef")),
):
    """新增食材"""
    try:
        ingredient = await ingredient_service.create_ingredient(
            db,
            name=request.name,
            category=request.category,
            description=request.description,
            image_url=request.image_url,
            aliases=request.aliases,
        )
        await db.commit()
        
        # 重新查询并预加载关系
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.ingredient import Ingredient
        
        result = await db.execute(
            select(Ingredient)
            .options(selectinload(Ingredient.aliases))
            .where(Ingredient.id == ingredient.id)
        )
        ingredient = result.scalar_one()
        
        # 构建响应
        aliases = [alias.alias for alias in ingredient.aliases]
        return {
            "id": ingredient.id,
            "name": ingredient.name,
            "category": ingredient.category,
            "description": ingredient.description,
            "image_url": ingredient.image_url,
            "is_active": ingredient.is_active,
            "aliases": aliases,
        }
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(
    ingredient_id: int,
    request: IngredientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "chef")),
):
    """更新食材"""
    try:
        ingredient = await ingredient_service.update_ingredient(
            db,
            ingredient_id,
            name=request.name,
            category=request.category,
            description=request.description,
            image_url=request.image_url,
            is_active=request.is_active,
            aliases=request.aliases,
        )
        if not ingredient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="食材不存在",
            )
        await db.commit()
        
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.ingredient import Ingredient
        
        result = await db.execute(
            select(Ingredient)
            .options(selectinload(Ingredient.aliases))
            .where(Ingredient.id == ingredient.id)
        )
        ingredient = result.scalar_one()
        
        aliases = [alias.alias for alias in ingredient.aliases]
        return {
            "id": ingredient.id,
            "name": ingredient.name,
            "category": ingredient.category,
            "description": ingredient.description,
            "image_url": ingredient.image_url,
            "is_active": ingredient.is_active,
            "aliases": aliases,
        }
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingredient(
    ingredient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """删除食材"""
    success = await ingredient_service.delete_ingredient(db, ingredient_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材不存在",
        )
    await db.commit()
