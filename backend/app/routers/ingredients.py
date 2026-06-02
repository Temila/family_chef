"""食材管理路由"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.routers.auth import get_current_user_from_token, require_role
from app.services.ingredient_service import ingredient_service
from app.services.ingredient_extractor import ingredient_extractor
from app.config import smart_settings
from app.schemas.ingredient import IngredientCreate, IngredientUpdate, IngredientResponse
from app.models.ingredient import Ingredient, IngredientAlias
from app.models.dish import DishIngredient, Dish
from app.models.user import User
from sqlalchemy import func

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

    ing_ids = [ing.id for ing in ingredients]
    count_map = {}
    dishes_map = {}
    if ing_ids:
        count_result = await db.execute(
            select(DishIngredient.ingredient_id, func.count(DishIngredient.id))
            .where(DishIngredient.ingredient_id.in_(ing_ids))
            .group_by(DishIngredient.ingredient_id)
        )
        count_map = dict(count_result.all())

        link_result = await db.execute(
            select(DishIngredient.ingredient_id, Dish.id, Dish.name)
            .join(Dish, DishIngredient.dish_id == Dish.id)
            .where(DishIngredient.ingredient_id.in_(ing_ids))
            .order_by(Dish.name)
        )
        for row in link_result.all():
            dishes_map.setdefault(row[0], []).append({"id": row[1], "name": row[2]})

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
            "dish_count": count_map.get(ing.id, 0),
            "linked_dishes": dishes_map.get(ing.id, []),
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


class ParseTextRequest(BaseModel):
    text: str
    smart_mode: bool = True


@router.post("/parse")
async def parse_ingredients_from_text(
    request: ParseTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "chef")),
):
    if not request.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="文本不能为空")

    if request.smart_mode and smart_settings.is_feature_enabled("SMART_INGREDIENT_EXTRACTION"):
        try:
            from app.services.smart_ingredient_extractor import smart_ingredient_extractor
            extractor = smart_ingredient_extractor
        except ImportError:
            extractor = ingredient_extractor
    else:
        extractor = ingredient_extractor

    result = await extractor.extract_ingredients(db, request.text)

    all_ingredients_result = await db.execute(
        select(Ingredient).options(selectinload(Ingredient.aliases)).order_by(Ingredient.name)
    )
    all_ingredients = all_ingredients_result.scalars().all()
    ingredient_options = [
        {
            "id": ing.id,
            "name": ing.name,
            "aliases": [a.alias for a in ing.aliases],
        }
        for ing in all_ingredients
    ]

    matched = result.get("matched", [])
    matched_name_set = {m.get("matched_from", m["ingredient_name"]) for m in matched}

    raw_names = result.get("ingredients", [])
    if not raw_names:
        raw_names = [m["ingredient_name"] for m in matched] + result.get("unmatched", [])

    parsed = []
    seen = set()
    for name in raw_names:
        if name in seen:
            continue
        seen.add(name)
        match_info = next(
            (m for m in matched if m.get("matched_from") == name or m["ingredient_name"] == name),
            None,
        )
        parsed.append({
            "name": name,
            "matched_ingredient_id": match_info["ingredient_id"] if match_info else None,
            "matched_ingredient_name": match_info["ingredient_name"] if match_info else None,
            "match_type": match_info["match_type"] if match_info else None,
        })

    for name in result.get("unmatched", []):
        if name not in seen and name.strip():
            seen.add(name)
            parsed.append({
                "name": name,
                "matched_ingredient_id": None,
                "matched_ingredient_name": None,
                "match_type": None,
            })

    return {
        "parsed_ingredients": parsed,
        "all_ingredients": ingredient_options,
    }


class ImportItem(BaseModel):
    name: str
    action: str
    alias_for_id: Optional[int] = None
    category: Optional[str] = None


class BatchImportRequest(BaseModel):
    items: List[ImportItem]


@router.post("/batch-import")
async def batch_import_ingredients(
    request: BatchImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "chef")),
):
    """批量导入食材：新建食材或为已有食材添加别名"""
    results = []
    for item in request.items:
        try:
            if item.action == "new":
                ingredient = await ingredient_service.create_ingredient(
                    db, name=item.name, category=item.category,
                )
                results.append({"name": item.name, "status": "created", "id": ingredient.id})
            elif item.action == "alias":
                if not item.alias_for_id:
                    results.append({"name": item.name, "status": "error", "message": "未指定目标食材"})
                    continue
                target = await ingredient_service.get_ingredient_by_id(db, item.alias_for_id)
                if not target:
                    results.append({"name": item.name, "status": "error", "message": "目标食材不存在"})
                    continue

                existing_aliases_result = await db.execute(
                    select(IngredientAlias).where(
                        IngredientAlias.ingredient_id == item.alias_for_id
                    )
                )
                existing_aliases = [a.alias for a in existing_aliases_result.scalars().all()]
                if item.name not in existing_aliases and item.name != target.name:
                    new_alias = IngredientAlias(
                        ingredient_id=item.alias_for_id,
                        alias=item.name,
                    )
                    db.add(new_alias)
                results.append({"name": item.name, "status": "alias_added", "target": target.name})
            else:
                results.append({"name": item.name, "status": "skipped"})
        except ValueError as e:
            results.append({"name": item.name, "status": "error", "message": str(e)})

    await db.commit()
    return {"results": results}


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
    link_count = await db.scalar(
        select(func.count(DishIngredient.id)).where(DishIngredient.ingredient_id == ingredient_id)
    )
    if link_count and link_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该食材已被 {link_count} 个菜品关联，无法删除",
        )
    success = await ingredient_service.delete_ingredient(db, ingredient_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材不存在",
        )
    await db.commit()
