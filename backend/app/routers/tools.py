"""工具路由"""
from fastapi import APIRouter
router = APIRouter()

@router.post("/extract-ingredients")
async def extract_ingredients():
    return {"message": "食材抽取 - Phase 7 实现"}
