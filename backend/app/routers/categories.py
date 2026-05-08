"""分类管理路由"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def list_categories():
    return {"message": "分类列表 - Phase 3 实现"}

@router.post("/")
async def create_category():
    return {"message": "新增分类 - Phase 3 实现"}

@router.put("/{category_id}")
async def update_category(category_id: int):
    return {"message": "更新分类 - Phase 3 实现"}
