"""菜品管理路由"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def list_dishes():
    return {"message": "菜品列表 - Phase 4 实现"}

@router.get("/{dish_id}")
async def get_dish(dish_id: int):
    return {"message": "菜品详情 - Phase 4 实现"}

@router.post("/")
async def create_dish():
    return {"message": "新增菜品 - Phase 4 实现"}

@router.put("/{dish_id}")
async def update_dish(dish_id: int):
    return {"message": "更新菜品 - Phase 4 实现"}

@router.delete("/{dish_id}")
async def delete_dish(dish_id: int):
    return {"message": "删除菜品 - Phase 4 实现"}

@router.put("/{dish_id}/status")
async def update_status(dish_id: int):
    return {"message": "更新菜品状态 - Phase 4 实现"}
