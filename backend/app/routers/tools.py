"""
家味 · Family Chef - 工具路由
"""

import logging
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import smart_settings
from app.routers.auth import get_current_user_from_token
from app.services.ingredient_extractor import ingredient_extractor
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


class ExtractRequest(BaseModel):
    """食材抽取请求"""
    text: str


def _get_extractor():
    if smart_settings.is_feature_enabled("SMART_INGREDIENT_EXTRACTION"):
        try:
            from app.services.smart_ingredient_extractor import smart_ingredient_extractor
            return smart_ingredient_extractor, True
        except ImportError:
            logger.warning("Smart ingredient extraction enabled but dependencies not installed, falling back to basic extractor")
    return ingredient_extractor, False


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

    extractor, is_smart = _get_extractor()
    result = await extractor.extract_ingredients(db, request.text)

    if is_smart and "ingredients" not in result:
        result["ingredients"] = [m["ingredient_name"] for m in result.get("matched", [])]
    elif not is_smart and "ingredients" not in result:
        result["ingredients"] = [m["ingredient_name"] for m in result.get("matched", [])]

    return result