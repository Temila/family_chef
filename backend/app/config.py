"""
家味 · Family Chef - 配置管理
"""

from pydantic_settings import BaseSettings
from typing import Optional


class SmartFeatureSettings(BaseSettings):
    """智能化功能开关配置

    每个智能化功能都有独立的开关，受总开关 SMART_ENABLED 控制。
    当 SMART_ENABLED=False 时，所有智能化功能都不生效。
    当 SMART_ENABLED=True 时，每个功能由各自的开关控制。
    """

    SMART_ENABLED: bool = False

    SMART_INGREDIENT_EXTRACTION: bool = False

    # LLM 模型配置
    LLM_MODEL_REPO: str = "unsloth/Qwen3.5-0.8B-GGUF"
    LLM_MODEL_FILENAME: str = "Qwen3.5-0.8B-Q4_K_M.gguf"
    LLM_N_CTX: int = 2048
    LLM_N_GPU_LAYERS: int = 0

    def is_feature_enabled(self, feature_name: str) -> bool:
        if not self.SMART_ENABLED:
            return False
        return getattr(self, feature_name, False)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用配置
    APP_NAME: str = "家味·Family Chef"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    
    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/family_chef.db"
    
    # JWT 配置
    JWT_SECRET_KEY: str = "dev-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24小时
    
    # 飞书配置
    FEISHU_APP_ID: Optional[str] = None
    FEISHU_APP_SECRET: Optional[str] = None
    FEISHU_APP_TOKEN: Optional[str] = None
    
    # 文件上传配置
    UPLOAD_DIR: str = "./data/uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    
    # CORS 配置
    CORS_ORIGINS: list[str] = ["*"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# 全局配置实例
settings = Settings()
smart_settings = SmartFeatureSettings()
