"""
家味 · Family Chef - 菜品管理路由
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.routers.auth import get_current_user_from_token
from app.schemas.dish import (
    DishCreate,
    DishUpdate,
    DishListResponse,
    DishDetailResponse,
    DietaryWarning,
)
from app.schemas.common import PageResponse
from app.services.dish_service import dish_service
from app.models.dish import Dish, DishIngredient, DishCategory
from app.models.user import User

router = APIRouter()


@router.get("", response_model=PageResponse[DishListResponse])
async def list_dishes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    regions: Optional[str] = Query(None, description="地区分类 ID 列表，逗号分隔"),
    cuisines: Optional[str] = Query(None, description="菜系分类 ID 列表，逗号分隔"),
    tastes: Optional[str] = Query(None, description="口味分类 ID 列表，逗号分隔"),
    seasons: Optional[str] = Query(None, description="季节分类 ID 列表，逗号分隔"),
    favorites_only: bool = Query(False),
    sort: str = Query("name", description="排序方式：name, created, popular"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """菜品列表（支持搜索和筛选）"""
    from app.utils.pagination import PaginationParams

    params = PaginationParams(page=page, page_size=page_size)

    # 解析分类 ID 列表
    region_ids = [int(x) for x in regions.split(",") if x] if regions else None
    cuisine_ids = [int(x) for x in cuisines.split(",") if x] if cuisines else None
    taste_ids = [int(x) for x in tastes.split(",") if x] if tastes else None
    season_ids = [int(x) for x in seasons.split(",") if x] if seasons else None

    dishes, total = await dish_service.list_dishes(
        db,
        params,
        search=search,
        regions=region_ids,
        cuisines=cuisine_ids,
        tastes=taste_ids,
        seasons=season_ids,
        favorites_only=favorites_only,
        sort=sort,
        user_id=current_user.id,
    )

    items = [DishListResponse.model_validate(d) for d in dishes]

    return PageResponse[DishListResponse](
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/{dish_id}", response_model=DishDetailResponse)
async def get_dish(
    dish_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """菜品详情"""
    dish = await dish_service.get_dish_by_id(db, dish_id, current_user.id)
    if not dish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜品不存在",
        )

    # 获取忌口提示
    warnings = await dish_service.get_dietary_warnings(db, dish_id, current_user.id)

    response = DishDetailResponse.model_validate(dish)
    if warnings:
        response.dietary_warning = warnings[0]  # 只显示最新的一条

    return response


@router.post("", response_model=DishDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_dish(
    dish_data: DishCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """新增菜品"""
    # 权限检查：仅管理员和厨师可创建
    if current_user.role not in ["admin", "chef"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，仅管理员和厨师可创建菜品",
        )

    dish = await dish_service.create_dish(db, dish_data, current_user.id)
    await db.commit()
    
    # 重新查询并预加载关系
    result = await db.execute(
        select(Dish)
        .options(
            selectinload(Dish.ingredients).selectinload(DishIngredient.ingredient),
            selectinload(Dish.categories).selectinload(DishCategory.category),
        )
        .where(Dish.id == dish.id)
    )
    dish = result.scalar_one()
    
    # 手动构建响应
    ingredients = []
    for dish_ing in dish.ingredients:
        if dish_ing.ingredient:
            ingredients.append({
                'id': dish_ing.ingredient.id,
                'name': dish_ing.ingredient.name,
            })
    
    categories = []
    for dish_cat in dish.categories:
        if dish_cat.category:
            categories.append({
                'id': dish_cat.category.id,
                'name': dish_cat.category.name,
                'type': dish_cat.category.type,
            })
    
    return DishDetailResponse(
        id=dish.id,
        name=dish.name,
        description=dish.description,
        recipe=dish.recipe,
        image_url=dish.image_url,
        is_popular=dish.is_popular,
        status=dish.status,
        categories=categories,
        ingredients=ingredients,
    )


@router.put("/{dish_id}", response_model=DishDetailResponse)
async def update_dish(
    dish_id: int,
    dish_data: DishUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """更新菜品"""
    dish = await dish_service.update_dish(db, dish_id, dish_data)
    if not dish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜品不存在",
        )
    await db.commit()
    
    # 重新查询并预加载关系
    result = await db.execute(
        select(Dish)
        .options(
            selectinload(Dish.ingredients).selectinload(DishIngredient.ingredient),
            selectinload(Dish.categories).selectinload(DishCategory.category),
        )
        .where(Dish.id == dish.id)
    )
    dish = result.scalar_one()
    
    # 手动构建响应
    ingredients = []
    for dish_ing in dish.ingredients:
        if dish_ing.ingredient:
            ingredients.append({
                'id': dish_ing.ingredient.id,
                'name': dish_ing.ingredient.name,
            })
    
    categories = []
    for dish_cat in dish.categories:
        if dish_cat.category:
            categories.append({
                'id': dish_cat.category.id,
                'name': dish_cat.category.name,
                'type': dish_cat.category.type,
            })
    
    return DishDetailResponse(
        id=dish.id,
        name=dish.name,
        description=dish.description,
        recipe=dish.recipe,
        image_url=dish.image_url,
        is_popular=dish.is_popular,
        status=dish.status,
        categories=categories,
        ingredients=ingredients,
    )


@router.delete("/{dish_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dish(
    dish_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """删除菜品"""
    success = await dish_service.delete_dish(db, dish_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜品不存在",
        )
    await db.commit()


@router.put("/{dish_id}/status")
async def update_dish_status(
    dish_id: int,
    status_data: dict,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """更新菜品状态"""
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="缺少 status 字段",
        )
    
    success = await dish_service.update_dish_status(db, dish_id, new_status)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜品不存在",
        )
    await db.commit()
    
    return {"message": "菜品状态更新成功"}
