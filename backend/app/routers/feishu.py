"""飞书集成路由"""
from fastapi import APIRouter
router = APIRouter()

@router.post("/bind")
async def bind_user():
    return {"message": "绑定飞书账号 - Phase 7 实现"}

@router.post("/notify")
async def send_notify():
    return {"message": "发送飞书消息 - Phase 7 实现"}
