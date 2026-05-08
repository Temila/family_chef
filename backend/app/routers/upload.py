"""文件上传路由"""
from fastapi import APIRouter
router = APIRouter()

@router.post("/image")
async def upload_image():
    return {"message": "图片上传 - Phase 7 实现"}
