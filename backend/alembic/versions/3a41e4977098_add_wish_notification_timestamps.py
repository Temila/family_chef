"""add wish notification timestamps

Revision ID: 3a41e4977098
Revises: 72b56533bb6d
Create Date: 2026-07-22 15:13:33.939658

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a41e4977098'
down_revision: Union[str, Sequence[str], None] = '72b56533bb6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: 为 wishes 表添加两个通知时间戳列。

    使用 batch_alter_table(recreate="always") 走 SQLite 移动复制路径，
    因为 SQLite 不支持 ADD COLUMN ... DEFAULT CURRENT_TIMESTAMP（非常量默认值）。
    """
    with op.batch_alter_table("wishes", recreate="always") as batch_op:
        batch_op.add_column(
            sa.Column(
                "last_status_change_at",
                sa.DateTime(),
                nullable=True,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            )
        )
        batch_op.add_column(
            sa.Column("submitter_last_viewed_at", sa.DateTime(), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema: 移除两个通知时间戳列（先 submitter 后 status）。"""
    with op.batch_alter_table("wishes", recreate="always") as batch_op:
        batch_op.drop_column("submitter_last_viewed_at")
        batch_op.drop_column("last_status_change_at")
