"""
家味 · Family Chef - 配置管理

从项目根目录 config.yaml 读取配置，所有已有的
``from app.config import settings, smart_settings`` 无需修改。
"""

import logging
import os
from pathlib import Path
from typing import Optional

import yaml

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CONFIG_PATH = Path(os.environ.get("CONFIG_PATH", str(_PROJECT_ROOT / "config.yaml")))


def _load_yaml(path: Path) -> dict:
    if not path.exists():
        logger.warning("配置文件不存在: %s，使用默认值", path)
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


class Settings:
    """应用基础配置"""

    def __init__(self, data: dict):
        app = data.get("app", {})
        self.APP_NAME: str = app.get("name", "家味·Family Chef")
        self.APP_VERSION: str = app.get("version", "0.1.0")
        self.DEBUG: bool = app.get("debug", True)
        self.SECRET_KEY: str = app.get("secret_key", "dev-secret-key-change-in-production")

        db = data.get("database", {})
        self.DATABASE_URL: str = db.get("url", "sqlite+aiosqlite:///./data/family_chef.db")

        jwt = data.get("jwt", {})
        self.JWT_SECRET_KEY: str = jwt.get("secret_key", "dev-jwt-secret-key-change-in-production")
        self.JWT_ALGORITHM: str = jwt.get("algorithm", "HS256")
        self.JWT_EXPIRE_MINUTES: int = jwt.get("expire_minutes", 1440)

        feishu = data.get("feishu", {})
        self.FEISHU_APP_ID: Optional[str] = feishu.get("app_id")
        self.FEISHU_APP_SECRET: Optional[str] = feishu.get("app_secret")
        self.FEISHU_APP_TOKEN: Optional[str] = feishu.get("app_token")

        upload = data.get("upload", {})
        self.UPLOAD_DIR: str = upload.get("dir", "./data/uploads")
        self.MAX_UPLOAD_SIZE: int = upload.get("max_size", 5 * 1024 * 1024)

        cors = data.get("cors", {})
        self.CORS_ORIGINS: list[str] = cors.get("origins", ["*"])


class SmartFeatureSettings:
    """智能化功能开关配置

    每个智能化功能都有独立的开关，受总开关 smart.enabled 控制。
    当 enabled=False 时，所有智能化功能都不生效。
    当 enabled=True 时，每个功能由各自的开关控制。
    """

    def __init__(self, data: dict):
        smart = data.get("smart", {})
        self.SMART_ENABLED: bool = smart.get("enabled", False)

        features = smart.get("features", {})
        self.SMART_INGREDIENT_EXTRACTION: bool = features.get("ingredient_extraction", False)

        llm = smart.get("llm", {})
        self.LLM_MODEL_REPO: str = llm.get("model_repo", "unsloth/Qwen3.5-0.8B-GGUF")
        self.LLM_MODEL_FILENAME: str = llm.get("model_filename", "Qwen3.5-0.8B-Q4_K_M.gguf")
        self.LLM_MODEL_DIR: str = llm.get("model_dir", "./data/models")
        self.LLM_N_CTX: int = llm.get("n_ctx", 2048)
        self.LLM_N_GPU_LAYERS: int = llm.get("n_gpu_layers", 0)
        self.HF_MIRROR: Optional[str] = llm.get("hf_mirror") or None

    def is_feature_enabled(self, feature_name: str) -> bool:
        if not self.SMART_ENABLED:
            return False
        return getattr(self, feature_name, False)

    def needs_model(self) -> bool:
        """是否有需要加载 LLM 模型的功能被开启"""
        if not self.SMART_ENABLED:
            return False
        return self.SMART_INGREDIENT_EXTRACTION


_raw = _load_yaml(_CONFIG_PATH)
settings = Settings(_raw)
smart_settings = SmartFeatureSettings(_raw)

if smart_settings.HF_MIRROR:
    import os
    os.environ["HF_ENDPOINT"] = smart_settings.HF_MIRROR
