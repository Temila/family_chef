"""认证路由"""
from fastapi import APIRouter
router = APIRouter()

@router.post("/login")
async def login():
    return {"message": "登录接口 - Phase 2 实现"}

@router.post("/register")
async def register():
    return {"message": "注册接口 - Phase 2 实现"}

@router.post("/refresh")
async def refresh():
    return {"message": "刷新Token接口 - Phase 2 实现"}
