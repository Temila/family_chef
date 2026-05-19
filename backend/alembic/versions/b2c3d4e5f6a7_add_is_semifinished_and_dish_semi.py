"""add is_semifinished and dish_semifinished_ingredients

Revision ID: b2c3d4e5f6a7
"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "52a06862ef2d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dishes", sa.Column("is_semifinished", sa.Boolean(), nullable=False, server_default=sa.text("0")))
    op.create_table(
        "dish_semifinished_ingredients",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dish_id", sa.Integer(), nullable=False),
        sa.Column("semifinished_dish_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["dish_id"], ["dishes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["semifinished_dish_id"], ["dishes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("dish_semifinished_ingredients")
    op.drop_column("dishes", "is_semifinished")
