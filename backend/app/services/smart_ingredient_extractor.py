"""
家味 · Family Chef - 智能食材抽取服务

基于本地 LLM 模型，从文本中智能识别食材名称、数量和单位。
"""

import asyncio
import json
import logging
import os
import re
from pathlib import Path
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

    def _resolve_model_path(self) -> str:
        model_dir = Path(smart_settings.LLM_MODEL_DIR)
        filename = smart_settings.LLM_MODEL_FILENAME

        local_path = model_dir / filename
        if local_path.exists():
            logger.info("从本地加载模型: %s", local_path)
            return str(local_path.resolve())

        model_dir.mkdir(parents=True, exist_ok=True)

        from huggingface_hub import hf_hub_download
        logger.info("本地未找到模型，从 Hub 下载: %s/%s", smart_settings.LLM_MODEL_REPO, filename)
        download_kwargs = {
            "repo_id": smart_settings.LLM_MODEL_REPO,
            "filename": filename,
            "local_dir": str(model_dir.resolve()),
        }
        if smart_settings.HF_MIRROR:
            download_kwargs["endpoint"] = smart_settings.HF_MIRROR
        hf_hub_download(**download_kwargs)
        return str(local_path.resolve())

    def _load_model(self):
        if self._llm is not None:
            return

        from llama_cpp import Llama

        model_path = self._resolve_model_path()

        self._llm = Llama(
            model_path=model_path,
            n_ctx=smart_settings.LLM_N_CTX,
            n_gpu_layers=smart_settings.LLM_N_GPU_LAYERS,
        )
        logger.info("LLM model loaded: %s", model_path)

    async def _ensure_model_loaded(self):
        if self._llm is not None:
            return

        try:
            await asyncio.to_thread(self._load_model)
        except ImportError as e:
            raise ImportError(
                "智能食材提取需要安装 llama-cpp-python 和 huggingface-hub，"
                "请运行: pip install llama-cpp-python huggingface-hub"
            ) from e

    async def extract_ingredients(self, db: AsyncSession, text: str) -> dict:
        try:
            await self._ensure_model_loaded()
        except ImportError:
            # TD-09: llama-cpp-python 未安装时优雅降级到基础抽取器（智能功能可选哲学）
            logger.warning("llama-cpp-python 未安装，降级到基础食材抽取器")
            from app.services.ingredient_extractor import ingredient_extractor
            return await ingredient_extractor.extract_ingredients(db, text)

        prompt = EXTRACTION_PROMPT_TEMPLATE.format(text=text)
        response = await asyncio.to_thread(
            self._llm.create_chat_completion,
            messages=[
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}],
                }
            ],
        )

        content = response["choices"][0]["message"]["content"]
        llm_results = _parse_llm_json(content)
        ingredient_names = [item["name"] for item in llm_results if "name" in item]

        llm_matched = await self._match_with_database(db, ingredient_names)

        from app.services.ingredient_extractor import ingredient_extractor
        text_match_result = await ingredient_extractor.extract_ingredients(db, text)
        text_matched = text_match_result.get("matched", [])

        all_matched = {}
        for m in llm_matched + text_matched:
            if m["ingredient_id"] not in all_matched:
                all_matched[m["ingredient_id"]] = m

        all_names_set = set(ingredient_names)
        for m in text_matched:
            matched_from = m.get("matched_from", "")
            if matched_from and matched_from not in all_names_set:
                ingredient_names.append(matched_from)
                all_names_set.add(matched_from)
                llm_results.append({
                    "name": matched_from,
                    "origin_text": matched_from,
                    "num": "",
                    "unit": "",
                })

        return {
            "ingredients": ingredient_names,
            "matched": list(all_matched.values()),
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
                        "matched_from": name,
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
                            "matched_from": name,
                        })

        return matched


smart_ingredient_extractor = SmartIngredientExtractor()
