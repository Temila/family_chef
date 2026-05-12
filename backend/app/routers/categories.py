"""分类管理路由"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token, require_role
from app.services.category_service import category_service
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.models.user import User

router = APIRouter()


@router.get("")
async def list_categories(
    type: Optional[str] = Query(None, description="分类类型"),
    tree: bool = Query(False, description="是否返回树形结构"),
    db: AsyncSession = Depends(get_db),
):
    """分类列表"""
    if tree:
        categories = await category_service.get_category_tree(db, type)
        return {"categories": categories}
    else:
        categories = await category_service.list_categories(db, type)
        return {
            "total": len(categories),
            "items": [CategoryResponse.model_validate(c) for c in categories],
        }


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    request: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "chef")),
):
    """新增分类"""
    try:
        category = await category_service.create_category(
            db,
            name=request.name,
            category_type=request.type,
            parent_id=request.parent_id,
            sort_order=request.sort_order,
        )
        await db.commit()
        return CategoryResponse.model_validate(category)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    request: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "chef")),
):
    """更新分类"""
    try:
        category = await category_service.update_category(
            db,
            category_id,
            name=request.name,
            category_type=request.type,
            parent_id=request.parent_id,
            sort_order=request.sort_order,
            is_active=request.is_active,
        )
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="分类不存在",
            )
        await db.commit()
        return CategoryResponse.model_validate(category)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """删除分类"""
    try:
        success = await category_service.delete_category(db, category_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="分类不存在",
            )
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
