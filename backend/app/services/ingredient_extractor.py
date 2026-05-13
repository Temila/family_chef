"""
家味 · Family Chef - 食材抽取服务
"""

import re
from typing import List, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ingredient import Ingredient, IngredientAlias


class IngredientExtractor:
    """食材抽取服务"""

    @staticmethod
    async def extract_ingredients(
        db: AsyncSession,
        text: str,
    ) -> dict:
        """从文本中抽取食材"""
        # 获取所有食材和别名
        ingredients_result = await db.execute(select(Ingredient))
        ingredients = ingredients_result.scalars().all()

        # 获取所有别名
        aliases_result = await db.execute(select(IngredientAlias))
        aliases = aliases_result.scalars().all()

        # 构建别名映射
        alias_map = {}
        for alias in aliases:
            alias_map[alias.alias] = alias.ingredient_id

        # 构建食材映射
        ingredient_map = {ing.id: ing for ing in ingredients}

        # 精确匹配（食材名称）
        matched_ingredients = []
        remaining_text = text

        for ing in ingredients:
            if ing.name in text:
                matched_ingredients.append({
                    "ingredient_id": ing.id,
                    "ingredient_name": ing.name,
                    "match_type": "exact",
                    "confidence": 1.0,
                    "matched_from": ing.name,
                })
                remaining_text = remaining_text.replace(ing.name, "")

        for alias_str, ingredient_id in alias_map.items():
            if alias_str in text:
                if not any(m["ingredient_id"] == ingredient_id for m in matched_ingredients):
                    ing = ingredient_map.get(ingredient_id)
                    if ing:
                        matched_ingredients.append({
                            "ingredient_id": ingredient_id,
                            "ingredient_name": ing.name,
                            "match_type": "alias",
                            "confidence": 0.8,
                            "matched_from": alias_str,
                        })
                        remaining_text = remaining_text.replace(alias_str, "")

        # 未匹配的文本片段
        unmatched = [
            segment.strip()
            for segment in re.split(r'[，,、\s]+', remaining_text)
            if segment.strip() and len(segment.strip()) > 0
        ]

        return {
            "matched": matched_ingredients,
            "unmatched": unmatched,
        }


# 全局食材抽取服务实例
ingredient_extractor = IngredientExtractor()