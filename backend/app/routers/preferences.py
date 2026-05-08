"""口味偏好路由"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def get_preferences():
    return {"message": "获取口味偏好 - Phase 5 实现"}

@router.put("/")
async def update_preferences():
    return {"message": "更新口味偏好 - Phase 5 实现"}
