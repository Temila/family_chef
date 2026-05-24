---
phase: 01-data-foundation
plan: 01
status: complete
started: "2026-05-24"
completed: "2026-05-24"
requirements: [DATA-01, DATA-02, DATA-03, DATA-05, INV-03]
---

# Plan 01-01: GuestInvitation Model + Order FK + Alembic Migration

## Objective

创建 GuestInvitation SQLAlchemy 模型、修改 Order 模型添加 guest_invitation_id FK、注册新模型、创建 Alembic 迁移（含虚拟 guest 用户插入）、更新 initial_data.py 种子脚本。

## What Was Built

### GuestInvitation Model (`backend/app/models/guest_invitation.py`)
- New SQLAlchemy model with `__tablename__ = "guest_invitations"`
- Columns: id (PK), token (String(36) UNIQUE), inviter_id (FK users.id), chef_id (FK users.id), status (String(20), default "active"), expires_at (DateTime), created_at, updated_at
- No `guest_name` column (per D-03)
- Relationships: inviter → User, chef → User, orders → Order
- 4 indexes: token UNIQUE, inviter_id, expires_at, (status, expires_at) composite

### Order Model Update (`backend/app/models/order.py`)
- Added `guest_invitation_id` column (Integer, ForeignKey, nullable=True)
- Added `guest_invitation` relationship with back_populates to GuestInvitation

### Model Registration
- `__init__.py`: Added GuestInvitation to imports and `__all__` list
- `alembic/env.py`: Added `guest_invitation` to model imports

### Alembic Migration (`a9b1c2d3e4f5`)
- down_revision: d4e5f6a7b8c9 (merged to correct head)
- upgrade(): creates guest_invitations table + 4 indexes, inserts __guest__ user, adds orders.guest_invitation_id FK
- downgrade(): reverses all changes in correct order
- Uses `batch_alter_table` for SQLite FK compatibility
- Round-trip verified: upgrade → downgrade → upgrade

### Virtual Guest User Seed (`backend/app/initial_data.py`)
- Creates `__guest__` user (is_active=False, role="user", display_name="访客") after admin creation
- Password hash generated via `hash_password()` with long random placeholder
- Idempotent: checks for existence before creating

## Key Decisions

- Used `batch_alter_table` in migration because SQLite doesn't support ALTER CONSTRAINT natively
- Set `down_revision = "d4e5f6a7b8c9"` to merge with existing migration chain head (previously had two divergent heads)

## Verification Results

- Python import verification: all model assertions passed
- Alembic round-trip: upgrade → downgrade → upgrade all successful
- DB inspection: guest_invitations table has 8 columns + 4 indexes
- DB inspection: orders table has guest_invitation_id column (nullable)
- DB inspection: __guest__ user exists with is_active=0

## Files Modified

| File | Change |
|------|--------|
| `backend/app/models/guest_invitation.py` | Created — GuestInvitation model |
| `backend/app/models/order.py` | Added guest_invitation_id FK + relationship |
| `backend/app/models/__init__.py` | Added GuestInvitation export |
| `backend/alembic/env.py` | Added guest_invitation import |
| `backend/alembic/versions/a9b1c2d3e4f5_*.py` | Created — migration |
| `backend/app/initial_data.py` | Added __guest__ user seed |

## Self-Check: PASSED
