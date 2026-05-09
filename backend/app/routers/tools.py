"""
家味 · Family Chef - 工具路由
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token
from app.services.ingredient_extractor import ingredient_extractor
from app.models.user import User

router = APIRouter()


class ExtractRequest(BaseModel):
    """食材抽取请求"""
    text: str


@router.post("/extract-ingredients")
async def extract_ingredients(
    request: ExtractRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """文本食材抽取"""
    if not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文本不能为空",
        )

    result = await ingredient_extractor.extract_ingredients(db, request.text)

    return result