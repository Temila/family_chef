"""add recipe column to dishes

Revision ID: a1b2c3d4e5f6
"""
from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = "8a258d50ee87"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dishes", sa.Column("recipe", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("dishes", "recipe")
