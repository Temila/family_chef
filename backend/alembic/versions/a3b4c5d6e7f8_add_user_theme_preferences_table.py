"""add user theme preferences table

Revision ID: a3b4c5d6e7f8
Revises: 3bec850ed472
Create Date: 2026-08-07 05:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a3b4c5d6e7f8'
down_revision: str | Sequence[str] | None = '3bec850ed472'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema: 创建 user_theme_preferences 表 (Phase 19 D-A7)。

    表结构(1 行/用户,主键 = user_id):
      - user_id PK + FK users.id ON DELETE CASCADE NOT NULL
      - active_theme JSON NOT NULL — 当前活动主题对象
      - season_enabled BOOL NOT NULL DEFAULT 0 — 季节自动开关
      - hemisphere VARCHAR(8) NOT NULL DEFAULT 'north'
      - season_theme_map JSON NOT NULL — 四季→主题对象映射
      - updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP — LWW 时间戳

    索引:
      - ix_user_theme_preferences_updated_at — 按更新时间排序(未来分页/审计用)
    """
    op.create_table(
        "user_theme_preferences",
        sa.Column("user_id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("active_theme", sa.JSON(), nullable=False),
        sa.Column("season_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("hemisphere", sa.String(length=8), nullable=False, server_default="north"),
        sa.Column("season_theme_map", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("user_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_user_theme_preferences_updated_at",
        "user_theme_preferences",
        ["updated_at"],
    )


def downgrade() -> None:
    """Downgrade schema: 删除 user_theme_preferences 表 + 索引(逆序)。"""
    op.drop_index("ix_user_theme_preferences_updated_at", table_name="user_theme_preferences")
    op.drop_table("user_theme_preferences")
