"""厨师管理路由"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def list_chefs():
    return {"message": "厨师列表 - Phase 5 实现"}

@router.get("/schedules")
async def get_schedules():
    return {"message": "排班查询 - Phase 5 实现"}

@router.put("/schedules")
async def update_schedule():
    return {"message": "更新排班 - Phase 5 实现"}
