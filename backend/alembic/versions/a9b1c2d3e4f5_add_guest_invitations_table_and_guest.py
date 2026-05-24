"""add guest_invitations table and guest_invitation_id to orders

Revision ID: a9b1c2d3e4f5
Revises: d4e5f6a7b8c9
"""
from alembic import op
import sqlalchemy as sa
from app.utils.security import hash_password

revision = "a9b1c2d3e4f5"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "guest_invitations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token", sa.String(36), nullable=False),
        sa.Column("inviter_id", sa.Integer(), nullable=False),
        sa.Column("chef_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["inviter_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["chef_id"], ["users.id"]),
    )
    op.create_index("uq_guest_invitations_token", "guest_invitations", ["token"], unique=True)
    op.create_index("ix_guest_invitations_inviter_id", "guest_invitations", ["inviter_id"])
    op.create_index("ix_guest_invitations_expires_at", "guest_invitations", ["expires_at"])
    op.create_index("ix_guest_invitations_status_expires_at", "guest_invitations", ["status", "expires_at"])

    op.bulk_insert(
        sa.table(
            "users",
            sa.column("username", sa.String(50)),
            sa.column("password_hash", sa.String(255)),
            sa.column("display_name", sa.String(100)),
            sa.column("role", sa.String(20)),
            sa.column("is_active", sa.Boolean),
            sa.column("force_pwd_change", sa.Boolean),
        ),
        [
            {
                "username": "__guest__",
                "password_hash": hash_password("never-used-guest-account-placeholder-password-!@#$%"),
                "display_name": "访客",
                "role": "user",
                "is_active": False,
                "force_pwd_change": False,
            }
        ],
    )

    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(sa.Column("guest_invitation_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_orders_guest_invitation_id", "guest_invitations", ["guest_invitation_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_constraint("fk_orders_guest_invitation_id", type_="foreignkey")
        batch_op.drop_column("guest_invitation_id")

    op.execute(sa.text("DELETE FROM users WHERE username = '__guest__'"))

    op.drop_table("guest_invitations")
