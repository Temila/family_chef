"""自定义主题模型 (Phase 17 SYNC-01)"""
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.sql import text as sa_text

from app.database import Base


class CustomTheme(Base):
    """用户自定义主题模型

    每条记录对应一个用户保存的自定义配色方案,字段:
      id — 主键
      user_id — 创建者用户 ID(FK users.id ON DELETE CASCADE)
      name — 主题名称(同一用户下唯一)
      source_colors — 源配色 JSON(primary/secondary/tertiary 三个 #RRGGBB 字符串)
      variant — MCU variant(默认 TonalSpot,Phase 18 可选其余 8 种)
      created_at / updated_at — 时间戳
    """
    __tablename__ = "custom_themes"
    __table_args__ = (
        Index("ix_custom_themes_user_id", "user_id"),
        Index("uq_custom_themes_user_name", "user_id", "name", unique=True),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    source_colors = Column(JSON, nullable=False)
    variant = Column(String(20), nullable=False, server_default="TonalSpot")
    created_at = Column(DateTime, nullable=False, server_default=sa_text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=sa_text("CURRENT_TIMESTAMP"),
        onupdate=sa_text("CURRENT_TIMESTAMP"),
    )