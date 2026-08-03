"""主题 Schema (Phase 17 SYNC-02)"""
import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

_HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

# MCU 9 种 variant(Phase 17 v1.5 仅实际使用 TonalSpot,其余保留供 Phase 18 EDIT-02)
_VALID_VARIANTS = frozenset({
    "TonalSpot",
    "Vibrant",
    "Expressive",
    "Content",
    "Mono",
    "Neutral",
    "Fidelity",
    "Rainbow",
    "FruitSalad",
})


class SourceColors(BaseModel):
    """主题源配色(primary/secondary/tertiary 三个 #RRGGBB 字符串)"""

    primary: str
    secondary: str
    tertiary: str

    @field_validator("primary", "secondary", "tertiary")
    @classmethod
    def check_hex(cls, v: str) -> str:
        if not _HEX_RE.match(v):
            raise ValueError(f"颜色值必须是 #RRGGBB 形式: {v}")
        return v.lower()


class ThemeCreate(BaseModel):
    """创建主题请求"""

    name: str = Field(..., min_length=1, max_length=100)
    source_colors: SourceColors
    variant: str = "TonalSpot"

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("主题名称不能为空")
        return v

    @field_validator("variant")
    @classmethod
    def check_variant(cls, v: str) -> str:
        if v not in _VALID_VARIANTS:
            raise ValueError(f"不支持的 variant: {v}")
        return v


class ThemeUpdate(BaseModel):
    """更新主题请求(所有字段可选)"""

    name: str | None = Field(None, min_length=1, max_length=100)
    source_colors: SourceColors | None = None
    variant: str | None = None

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("主题名称不能为空")
        return v

    @field_validator("variant")
    @classmethod
    def check_variant(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in _VALID_VARIANTS:
            raise ValueError(f"不支持的 variant: {v}")
        return v


class ThemeResponse(BaseModel):
    """主题响应(嵌套 source_colors)"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    source_colors: SourceColors
    variant: str
    created_at: datetime
    updated_at: datetime