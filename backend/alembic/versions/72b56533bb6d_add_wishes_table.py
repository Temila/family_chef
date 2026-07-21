"""add wishes table

Revision ID: 72b56533bb6d
Revises: a9b1c2d3e4f5
Create Date: 2026-07-21 15:28:22.576549

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72b56533bb6d'
down_revision: Union[str, Sequence[str], None] = 'a9b1c2d3e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "wishes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("dish_name", sa.String(length=100), nullable=False),
        sa.Column("reference_url", sa.String(length=500), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="待处理"),
        sa.Column("claimed_by_chef_id", sa.Integer(), nullable=True),
        sa.Column("related_dish_id", sa.Integer(), nullable=True),
        sa.Column("reject_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["claimed_by_chef_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["related_dish_id"], ["dishes.id"]),
    )
    op.create_index("ix_wishes_user_id", "wishes", ["user_id"])
    op.create_index("ix_wishes_status", "wishes", ["status"])
    op.create_index("ix_wishes_claimed_by_chef_id", "wishes", ["claimed_by_chef_id"])
    op.create_index("ix_wishes_status_chef", "wishes", ["status", "claimed_by_chef_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_wishes_status_chef", table_name="wishes")
    op.drop_index("ix_wishes_claimed_by_chef_id", table_name="wishes")
    op.drop_index("ix_wishes_status", table_name="wishes")
    op.drop_index("ix_wishes_user_id", table_name="wishes")
    op.drop_table("wishes")
