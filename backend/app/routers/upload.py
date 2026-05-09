"""
家味 · Family Chef - 文件上传路由
"""

import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.config import settings
from app.routers.auth import get_current_user_from_token
from app.models.user import User

router = APIRouter()

# 允许的文件类型
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def generate_filename(original_filename: str) -> str:
    """生成唯一文件名"""
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"不支持的文件类型：{ext}")
    return f"{uuid.uuid4().hex}{ext}"


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_from_token),
):
    """上传图片"""
    # 验证文件类型
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型：{file.content_type}，允许的类型：{', '.join(ALLOWED_TYPES)}",
        )

    # 读取文件内容
    content = await file.read()

    # 验证文件大小
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件大小超过限制（{settings.MAX_UPLOAD_SIZE / 1024 / 1024:.0f}MB）",
        )

    # 生成文件名
    filename = generate_filename(file.filename or "image.jpg")

    # 保存文件
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # 返回文件 URL
    file_url = f"/uploads/{filename}"

    return {
        "filename": filename,
        "url": file_url,
        "size": len(content),
        "content_type": file.content_type,
    }