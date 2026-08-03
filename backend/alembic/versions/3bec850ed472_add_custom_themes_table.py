"""add custom themes table

Revision ID: 3bec850ed472
Revises: 3a41e4977098
Create Date: 2026-08-03 09:43:27.984010

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '3bec850ed472'
down_revision: str | Sequence[str] | None = '3a41e4977098'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema: 创建 custom_themes 表 + 2 索引 (Phase 17 SYNC-01, D-12/D-13)。

    表结构:
      - id PK autoincrement
      - user_id FK users.id ON DELETE CASCADE NOT NULL
      - name VARCHAR(100) NOT NULL
      - source_colors JSON NOT NULL
      - variant VARCHAR(20) NOT NULL DEFAULT 'TonalSpot'
      - created_at / updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

    索引:
      - ix_custom_themes_user_id — 按用户查询加速
      - uq_custom_themes_user_name — (user_id, name) 唯一,防止同用户重名
    """
    op.create_table(
        "custom_themes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("source_colors", sa.JSON(), nullable=False),
        sa.Column("variant", sa.String(length=20), nullable=False, server_default="TonalSpot"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_custom_themes_user_id", "custom_themes", ["user_id"])
    op.create_index("uq_custom_themes_user_name", "custom_themes", ["user_id", "name"], unique=True)


def downgrade() -> None:
    """Downgrade schema: 删除 custom_themes 表 + 索引(逆序)。"""
    op.drop_index("uq_custom_themes_user_name", table_name="custom_themes")
    op.drop_index("ix_custom_themes_user_id", table_name="custom_themes")
    op.drop_table("custom_themes")
