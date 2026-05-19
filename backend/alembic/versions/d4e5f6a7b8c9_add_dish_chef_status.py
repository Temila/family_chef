"""add dish_chef status column

Revision ID: d4e5f6a7b8c9
"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('dish_chefs', sa.Column('status', sa.String(20), nullable=False, server_default='hidden'))


def downgrade() -> None:
    op.drop_column('dish_chefs', 'status')
