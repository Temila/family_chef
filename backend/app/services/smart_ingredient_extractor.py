"""
家味 · Family Chef - 智能食材抽取服务

基于本地 LLM 模型，从文本中智能识别食材名称、数量和单位。
"""

import json
import logging
import re
from typing import List, Dict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import smart_settings
from app.models.ingredient import Ingredient, IngredientAlias

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT_TEMPLATE = """你是一个专业的食谱结构化助手。请解析以下中文食谱或食材列表，识别其中每种食材的标准名称、数量和单位。如果遇到同一种食材的不同叫法（如"番茄"与"西红柿"），请将它们合并到同一个标准化名称下。
最终输出必须是一个纯净的 JSON 列表，不要包含任何其他解释、标记或文字。

示例格式: [{{"name": "番茄", "origin_text": "番茄 2个", "num": "2", "unit": "个"}}]

食材: {text}"""


def _parse_llm_json(content: str) -> List[Dict]:
    try:
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except (json.JSONDecodeError, AttributeError):
        pass
    logger.warning("Failed to parse LLM response as JSON: %s", content[:200])
    return []


class SmartIngredientExtractor:
    """基于 LLM 的智能食材抽取服务"""

    def __init__(self):
        self._llm = None

    def _ensure_model_loaded(self):
        if self._llm is not None:
            return

        try:
            from huggingface_hub import hf_hub_download
            from llama_cpp import Llama
        except ImportError as e:
            raise ImportError(
                "智能食材提取需要安装 llama-cpp-python 和 huggingface-hub，"
                "请运行: pip install llama-cpp-python huggingface-hub"
            ) from e

        model_path = hf_hub_download(
            repo_id=smart_settings.LLM_MODEL_REPO,
            filename=smart_settings.LLM_MODEL_FILENAME,
        )

        self._llm = Llama(
            model_path=model_path,
            n_ctx=smart_settings.LLM_N_CTX,
            n_gpu_layers=smart_settings.LLM_N_GPU_LAYERS,
        )
        logger.info("LLM model loaded: %s/%s", smart_settings.LLM_MODEL_REPO, smart_settings.LLM_MODEL_FILENAME)

    async def extract_ingredients(self, db: AsyncSession, text: str) -> dict:
        self._ensure_model_loaded()

        prompt = EXTRACTION_PROMPT_TEMPLATE.format(text=text)
        response = self._llm.create_chat_completion(
            messages=[
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}],
                }
            ]
        )

        content = response["choices"][0]["message"]["content"]
        llm_results = _parse_llm_json(content)
        ingredient_names = [item["name"] for item in llm_results if "name" in item]

        matched = await self._match_with_database(db, ingredient_names)

        return {
            "ingredients": ingredient_names,
            "matched": matched,
            "unmatched": [],
            "details": llm_results,
        }

    async def _match_with_database(self, db: AsyncSession, ingredient_names: List[str]) -> List[Dict]:
        result = await db.execute(select(Ingredient))
        db_ingredients = {ing.name.lower(): ing for ing in result.scalars().all()}

        alias_result = await db.execute(select(IngredientAlias))
        aliases = alias_result.scalars().all()
        alias_to_id = {alias.alias.lower(): alias.ingredient_id for alias in aliases}

        id_to_ing = {ing.id: ing for ing in db_ingredients.values()}

        matched = []
        matched_ids = set()

        for name in ingredient_names:
            name_lower = name.lower()
            if name_lower in db_ingredients:
                ing = db_ingredients[name_lower]
                if ing.id not in matched_ids:
                    matched_ids.add(ing.id)
                    matched.append({
                        "ingredient_id": ing.id,
                        "ingredient_name": ing.name,
                        "match_type": "exact",
                        "confidence": 1.0,
                    })
            elif name_lower in alias_to_id:
                ing_id = alias_to_id[name_lower]
                if ing_id not in matched_ids:
                    matched_ids.add(ing_id)
                    ing = id_to_ing.get(ing_id)
                    if ing:
                        matched.append({
                            "ingredient_id": ing_id,
                            "ingredient_name": ing.name,
                            "match_type": "alias",
                            "confidence": 0.8,
                        })

        return matched


smart_ingredient_extractor = SmartIngredientExtractor()
