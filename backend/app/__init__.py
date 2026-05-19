"""
家味 · Family Chef - 后端应用包

在包被导入时检测智能化功能开关，如需使用模型则提前下载。
"""

import logging

from app.config import smart_settings

logger = logging.getLogger(__name__)


def _preload_model_if_needed():
    if not smart_settings.needs_model():
        logger.info("智能化功能未开启，跳过模型预加载")
        return

    logger.info(
        "检测到智能化功能已开启 (SMART_ENABLED=%s, SMART_INGREDIENT_EXTRACTION=%s)，开始预加载模型...",
        smart_settings.SMART_ENABLED,
        smart_settings.SMART_INGREDIENT_EXTRACTION,
    )

    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        logger.error(
            "智能化功能已开启但缺少依赖 huggingface-hub，"
            "请运行: pip install huggingface-hub"
        )
        return

    try:
        model_path = hf_hub_download(
            repo_id=smart_settings.LLM_MODEL_REPO,
            filename=smart_settings.LLM_MODEL_FILENAME,
        )
        logger.info("模型下载完成: %s", model_path)
    except Exception:
        logger.exception("模型下载失败，首次使用智能功能时将重试")


_preload_model_if_needed()
