"""用户主题偏好 Schema (Phase 19 D-A7)

Pydantic V2 schemas for /api/users/me/theme-preferences:
  - ActiveThemePayload — 活动主题对象 {id,name,sourceColors,variant,kind}
  - SeasonThemeMapPayload — 四季→活动主题映射 (root model)
  - UserThemePreferencesUpdate — PUT body (服务端 LWW 整体替换, D-A1)
  - UserThemePreferencesResponse — GET/PUT 响应
"""
from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    RootModel,
    field_validator,
    model_validator,
)

_VALID_HEMISPHERES = frozenset({"north", "south"})
_VALID_SEASONS = frozenset({"spring", "summer", "autumn", "winter"})
_REQUIRED_SOURCE_COLOR_KEYS = ("primary", "secondary", "tertiary")


class ActiveThemePayload(BaseModel):
    """活动主题对象 — 与前端 fc_active_theme 同结构。

    sourceColors 必须包含 primary/secondary/tertiary 三个非空字符串;
    id/name/variant/kind 为可选元数据,用于前端还原完整主题对象。
    """

    id: Optional[str] = None
    name: Optional[str] = None
    sourceColors: dict
    variant: Optional[str] = None
    kind: Optional[str] = None

    @model_validator(mode="after")
    def _check_source_colors(self) -> "ActiveThemePayload":
        sc = self.sourceColors or {}
        missing = [k for k in _REQUIRED_SOURCE_COLOR_KEYS if not sc.get(k)]
        if missing:
            raise ValueError(
                f"主题对象必须包含 sourceColors.primary/secondary/tertiary (缺失: {', '.join(missing)})"
            )
        for k in _REQUIRED_SOURCE_COLOR_KEYS:
            if not isinstance(sc[k], str) or not sc[k].strip():
                raise ValueError(f"sourceColors.{k} 必须为非空字符串")
        return self


class SeasonThemeMapPayload(RootModel[dict[str, ActiveThemePayload]]):
    """四季→活动主题映射。键必须是 spring/summer/autumn/winter 且四键齐全。"""

    @model_validator(mode="after")
    def _check_season_keys(self) -> "SeasonThemeMapPayload":
        keys = set(self.root.keys())
        invalid = keys - _VALID_SEASONS
        if invalid:
            raise ValueError(f"不支持的季节名: {', '.join(sorted(invalid))}")
        missing = _VALID_SEASONS - keys
        if missing:
            raise ValueError(f"season_theme_map 必须包含全部四季: {', '.join(sorted(missing))} 缺失")
        return self


class UserThemePreferencesUpdate(BaseModel):
    """PUT /api/users/me/theme-preferences body。

    服务端 LWW (D-A1): 整体替换,不做字段级合并。
    season_theme_map 可省略,model_validator 会用黑色默认值填满四季。
    """

    active_theme: ActiveThemePayload
    season_enabled: bool = False
    hemisphere: str = "north"
    season_theme_map: Optional[SeasonThemeMapPayload] = None

    @field_validator("hemisphere")
    @classmethod
    def _check_hemisphere(cls, v: str) -> str:
        if v not in _VALID_HEMISPHERES:
            raise ValueError(f"hemisphere 必须为 north 或 south, 收到: {v}")
        return v

    @model_validator(mode="after")
    def _fill_season_map(self) -> "UserThemePreferencesUpdate":
        if self.season_theme_map is None:
            default_theme = ActiveThemePayload(
                sourceColors={
                    "primary": "#000000",
                    "secondary": "#000000",
                    "tertiary": "#000000",
                }
            )
            self.season_theme_map = SeasonThemeMapPayload(
                root={season: default_theme for season in _VALID_SEASONS}
            )
        return self


class UserThemePreferencesResponse(BaseModel):
    """GET/PUT 响应 — 直接从 SQLAlchemy row 构造 (from_attributes=True)。"""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    active_theme: ActiveThemePayload
    season_enabled: bool
    hemisphere: str
    season_theme_map: SeasonThemeMapPayload
    updated_at: datetime
