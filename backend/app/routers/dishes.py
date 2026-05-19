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
from app.middleware.logging import log_action
from app.schemas.dish import (
    DishCreate,
    DishUpdate,
    DishListResponse,
    DishDetailResponse,
    DietaryWarning,
)
from app.schemas.common import PageResponse
from app.services.dish_service import dish_service
from app.models.dish import Dish, DishIngredient, DishCategory, DishSemifinishedIngredient, DishChef
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
    status: Optional[str] = Query(None, description="筛选状态: published, hidden, draft, all"),
    chef_filter: Optional[str] = Query(None, description="厨师筛选: all, my-published, not-yet-published"),
    is_semifinished: Optional[bool] = Query(None, description="是否半成品"),
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
        status_filter=status,
        chef_filter=chef_filter,
        is_semifinished=is_semifinished,
    )

    warnings_map = await dish_service.get_dietary_warnings_batch(db, dishes, current_user.id)

    items = []
    for d in dishes:
        resp = DishListResponse.model_validate(d)
        if d.id in warnings_map:
            resp.dietary_warnings = warnings_map[d.id]
        items.append(resp)

    return PageResponse[DishListResponse](
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/semifinished/list")
async def list_semifinished_dishes(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """获取所有半成品菜品（用于作为食材选择）"""
    dishes = await dish_service.list_semifinished_dishes(db)
    return [
        {
            "id": d.id,
            "name": d.name,
            "image_url": d.image_url,
        }
        for d in dishes
    ]


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

    if current_user.role == "admin":
        dish_data.status = "enabled"

    dish = await dish_service.create_dish(db, dish_data, current_user.id)
    await db.commit()
    
    result = await db.execute(
        select(Dish)
        .options(
            selectinload(Dish.ingredients).selectinload(DishIngredient.ingredient),
            selectinload(Dish.categories).selectinload(DishCategory.category),
            selectinload(Dish.semifinished_ingredients).selectinload(DishSemifinishedIngredient.semifinished_dish),
            selectinload(Dish.dish_chefs).selectinload(DishChef.chef),
        )
        .where(Dish.id == dish.id)
    )
    dish = result.scalar_one()
    await log_action(current_user.id, "create_dish", "dish", dish.id, f"创建菜品: {dish.name}")
    
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
    
    semifinished_ingredients = []
    for sf_ing in dish.semifinished_ingredients:
        if sf_ing.semifinished_dish:
            semifinished_ingredients.append({
                'id': sf_ing.semifinished_dish.id,
                'name': sf_ing.semifinished_dish.name,
                'image_url': sf_ing.semifinished_dish.image_url,
            })
    
    chefs = []
    for dc in dish.dish_chefs:
        if dc.chef:
            chefs.append({
                'id': dc.chef.id,
                'username': dc.chef.username,
                'display_name': dc.chef.display_name,
                'publish_status': dc.status,
            })
    
    return DishDetailResponse(
        id=dish.id,
        name=dish.name,
        description=dish.description,
        recipe=dish.recipe,
        image_url=dish.image_url,
        is_popular=dish.is_popular,
        is_semifinished=dish.is_semifinished,
        status=dish.status,
        categories=categories,
        ingredients=ingredients,
        semifinished_ingredients=semifinished_ingredients,
        chefs=chefs,
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
            selectinload(Dish.semifinished_ingredients).selectinload(DishSemifinishedIngredient.semifinished_dish),
            selectinload(Dish.dish_chefs).selectinload(DishChef.chef),
        )
        .where(Dish.id == dish.id)
    )
    dish = result.scalar_one()
    await log_action(current_user.id, "update_dish", "dish", dish.id, f"更新菜品: {dish.name}")
    
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
    
    semifinished_ingredients = []
    for sf_ing in dish.semifinished_ingredients:
        if sf_ing.semifinished_dish:
            semifinished_ingredients.append({
                'id': sf_ing.semifinished_dish.id,
                'name': sf_ing.semifinished_dish.name,
                'image_url': sf_ing.semifinished_dish.image_url,
            })
    
    chefs = []
    for dc in dish.dish_chefs:
        if dc.chef:
            chefs.append({
                'id': dc.chef.id,
                'username': dc.chef.username,
                'display_name': dc.chef.display_name,
                'publish_status': dc.status,
            })
    
    return DishDetailResponse(
        id=dish.id,
        name=dish.name,
        description=dish.description,
        recipe=dish.recipe,
        image_url=dish.image_url,
        is_popular=dish.is_popular,
        is_semifinished=dish.is_semifinished,
        status=dish.status,
        categories=categories,
        ingredients=ingredients,
        semifinished_ingredients=semifinished_ingredients,
        chefs=chefs,
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
    await log_action(current_user.id, "delete_dish", "dish", dish_id, f"删除菜品 #{dish_id}")


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


@router.put("/{dish_id}/chef-publish")
async def toggle_chef_publish(
    dish_id: int,
    publish_data: dict,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """厨师上架/下架菜品"""
    if current_user.role not in ["chef", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="仅厨师可操作",
        )

    publish = publish_data.get("publish", True)
    dc = await dish_service.toggle_chef_publish(db, dish_id, current_user.id, publish)
    await db.commit()
    
    return {"message": "上架成功" if publish else "下架成功", "publish_status": dc.status}
