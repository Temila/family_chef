---
phase: 05-data-foundation-wish-lifecycle-api
plan: "01"
subsystem: database
tags: [sqlalchemy, alembic, pydantic, fastapi, sqlite]

# Dependency graph
requires: []
provides:
  - Wish SQLAlchemy model (11 columns, 3 relationships, 4 indexes, status default "待处理")
  - 8 Pydantic v2 schemas (WishBase, WishCreate, WishUpdate, WishAdvance, WishReject, WishResponse, WishListResponse, WishDetailResponse)
  - Alembic migration 72b56533bb6d_add_wishes_table.py chained from a9b1c2d3e4f5
  - Wish export registered in models/__init__.py
  - REQUIREMENTS.md aligned with D-05/D-07
affects: [05-02, 05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SQLAlchemy 2.0 async declarative model with dual FK disambiguation via foreign_keys=[...]
    - Pydantic v2 ConfigDict(from_attributes=True) — not v1 class Config
    - Alembic additive migration (op.create_table + op.create_index, no batch_alter_table)
    - Soft-delete status via String(20) column, no DB-level CHECK constraint

key-files:
  created:
    - backend/app/models/wish.py
    - backend/app/schemas/wish.py
    - backend/alembic/versions/72b56533bb6d_add_wishes_table.py
  modified:
    - backend/app/models/__init__.py
    - .planning/REQUIREMENTS.md

key-decisions:
  - "D-11: Wish.status stored as String(20) with default='待处理', no Python Enum, no SQLAlchemy Enum type, no DB CHECK constraint"
  - "D-10: related_dish_id FK has no ondelete clause — preserves lazy expiry per PROJECT.md"
  - "D-05/D-07: REQUIREMENTS.md PERM-01/FLOW-01/WISH-04 wording updated to reflect chef visibility rules and soft-delete semantics"
  - "Pydantic v2 ConfigDict(from_attributes=True) used in all response schemas (not v1 class Config)"
  - "WishCreate deliberately omits status/claimed_by_chef_id/related_dish_id fields to prevent mass-assignment (T-5-03)"

patterns-established:
  - "Status-as-String: Column(String(20), nullable=False, default='待处理') mirrors Order.status pattern"
  - "Dual FK disambiguation: relationship('User', foreign_keys=[user_id]) on both submitter and claimer relationships"
  - "Composite index for chef queue: Index('ix_wishes_status_chef', 'status', 'claimed_by_chef_id')"

requirements-completed: [DATA-06, DATA-07]

# Metrics
duration: 12min
completed: 2026-07-21
---

# Phase 05, Plan 01: Data Foundation — Wish Model, Schemas & Migration

**Wish SQLAlchemy model with 11 columns + 3 relationships + 4 indexes; 8 Pydantic v2 schemas for lifecycle; Alembic migration 72b56533bb6d chained from a9b1c2d3e4f5**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-21T15:25:00Z
- **Completed:** 2026-07-21T15:37:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- Wish model (`backend/app/models/wish.py`) with all 11 columns, 3 relationships, 4 indexes — D-11 compliant (no Enum/CHECK), D-10 compliant (no ondelete on related_dish_id)
- 8 Pydantic v2 schemas in `backend/app/schemas/wish.py` — mass-assignment hardened WishCreate, field constraints enforced (V5 Input Validation)
- Alembic migration `72b56533bb6d_add_wishes_table.py` — chains from a9b1c2d3e4f5, upgrade/downgrade verified clean
- Wish export registered in `backend/app/models/__init__.py`
- REQUIREMENTS.md PERM-01/FLOW-01/WISH-04 aligned with D-05/D-07 downstream obligations

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wish model + export + align REQUIREMENTS.md** - `2865828` (feat)
2. **Task 2: Create Pydantic v2 schemas for wish lifecycle** - `7b0a683` (feat)
3. **Task 3: Create Alembic migration chained from a9b1c2d3e4f5** - `5a2b8a8` (feat)

## Files Created/Modified

- `backend/app/models/wish.py` — Wish SQLAlchemy model (11 columns, submitter/claimer/related_dish relationships, 4 indexes)
- `backend/app/models/__init__.py` — Added `from app.models.wish import Wish` export + `"Wish"` in `__all__`
- `backend/app/schemas/wish.py` — 8 Pydantic v2 schemas: WishBase, WishCreate, WishUpdate, WishAdvance, WishReject, WishResponse, WishListResponse, WishDetailResponse
- `backend/alembic/versions/72b56533bb6d_add_wishes_table.py` — Additive migration: creates wishes table with 11 cols, 3 FKs, 4 indexes; downgrade drops indexes then table
- `.planning/REQUIREMENTS.md` — PERM-01 (D-05 visibility), FLOW-01 (D-05 chef scope), WISH-04 (D-07 soft-delete wording) updated

## Decisions Made

- **D-11 status implementation:** `Column(String(20), nullable=False, default="待处理")` — mirrors `Order.status` pattern exactly; no Python Enum, no SQLAlchemy Enum type, no DB CHECK constraint
- **D-10 related_dish_id:** Plain `ForeignKey("dishes.id")` with no `ondelete` clause — preserves lazy expiry if Dish is later deleted
- **Schema architecture:** `WishCreate` extends `WishBase` but body is `pass` — deliberately omits status/claimed_by_chef_id/related_dish_id to block mass-assignment vectors (T-5-03 mitigation)
- **D-05/D-07 REQUIREMENTS.md alignment:** PERM-01 now reads "认领该愿望的厨师 + 待处理状态下的所有厨师" (chef visibility refinement); WISH-04 now reads "软删除, status='已撤销'" (soft-delete clarification)
- **Migration head:** Verified `alembic heads` returns `a9b1c2d3e4f5` (not `d4e5f6a7b8c9` as incorrectly stated in CONTEXT.md) — RESEARCH.md Pitfall 1 correction applied

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Dev DB not managed by Alembic:** The development SQLite DB (`data/family_chef.db`) was initialized via `init_db()` (Base.metadata.create_all) rather than `alembic upgrade head`, so the alembic version tracking table was empty. Running `alembic upgrade head` directly tried to replay all migrations from scratch, causing "table already exists" errors. Resolved by running `alembic stamp a9b1c2d3e4f5` to record the current head, then `alembic upgrade head` applied only the new wishes migration. This is a dev-environment setup issue, not a migration design issue — the migration itself is purely additive and correct.
- **PRAGMA table_info() row structure:** SQLite's `PRAGMA table_info` returns `(cid, name, type, notnull, dflt_value, pk)` — the default value for VARCHAR columns is stored as a string including quotes (e.g., `'待处理'`), which is correct SQLite representation. No issue with the schema.

## Verification

All acceptance criteria met:
- `cd backend && uv run python -c "from app.models import Wish"` exits 0
- `cd backend && uv run python -c "from app.schemas.wish import WishCreate, WishResponse"` exits 0
- `cd backend && uv run alembic heads` prints exactly `72b56533bb6d (head)`
- `cd backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head` all succeed
- `backend/app/models/wish.py` contains no `Enum(` or `CheckConstraint(`
- `backend/app/models/wish.py` `related_dish_id` column has no `ondelete`
- `backend/app/models/wish.py` has exactly 3 `relationship(` calls each with `foreign_keys=[...]`
- `backend/app/schemas/wish.py` has exactly 3 `model_config = ConfigDict(from_attributes=True)` and 0 `class Config:`
- `.planning/REQUIREMENTS.md` PERM-01 contains `认领该愿望的厨师 + 待处理状态下的所有厨师`
- `.planning/REQUIREMENTS.md` WISH-04 contains `软删除, status='已撤销'`

## Next Phase Readiness

- Plan 02 (wish_service.py) can begin immediately — model and schemas are in place
- Plan 03 (wishes router) can begin immediately — schemas ready, service interface defined
- Alembic head is `72b56533bb6d` — Plan 02/03 migrations (if any) should chain from here
- No blockers

---
*Phase: 05-data-foundation-wish-lifecycle-api / Plan 01*
*Completed: 2026-07-21*
