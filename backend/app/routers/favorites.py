"""收藏管理路由"""
from fastapi import APIRouter
router = APIRouter()

@router.post("/")
async def add_favorite():
    return {"message": "添加收藏 - Phase 5 实现"}

@router.delete("/{dish_id}")
async def remove_favorite(dish_id: int):
    return {"message": "取消收藏 - Phase 5 实现"}

@router.get("/")
async def list_favorites():
    return {"message": "收藏列表 - Phase 5 实现"}
