"""食材管理路由"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def list_ingredients():
    return {"message": "食材列表 - Phase 3 实现"}

@router.post("/")
async def create_ingredient():
    return {"message": "新增食材 - Phase 3 实现"}

@router.put("/{ingredient_id}")
async def update_ingredient(ingredient_id: int):
    return {"message": "更新食材 - Phase 3 实现"}

@router.delete("/{ingredient_id}")
async def delete_ingredient(ingredient_id: int):
    return {"message": "删除食材 - Phase 3 实现"}
