"""用户主题偏好模型 (Phase 19 D-A7)"""
from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.sql import text as sa_text

from app.database import Base


class UserThemePreferences(Base):
    """用户主题偏好模型 — 每用户一行(D-A7)。

    字段(对应 localStorage 的 fc_active_theme / fc_season_enabled / fc_hemisphere / fc_season_theme_map):
      user_id — 主键 + FK users.id ON DELETE CASCADE(1 行/用户)
      active_theme — 当前活动主题 JSON({id,name,sourceColors,variant,kind})
      season_enabled — 季节自动开关(BOOL,默认 0)
      hemisphere — 半球 'north'/'south'(默认 'north')
      season_theme_map — 四季→完整主题对象映射 JSON
      updated_at — last-write-wins 时间戳(D-A1)
    """
    __tablename__ = "user_theme_preferences"
    __table_args__ = (
        Index("ix_user_theme_preferences_updated_at", "updated_at"),
    )

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, autoincrement=False)
    active_theme = Column(JSON, nullable=False)
    season_enabled = Column(Boolean, nullable=False, server_default=sa_text("0"))
    hemisphere = Column(String(8), nullable=False, server_default="north")
    season_theme_map = Column(JSON, nullable=False)
    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=sa_text("CURRENT_TIMESTAMP"),
        onupdate=sa_text("CURRENT_TIMESTAMP"),
    )
