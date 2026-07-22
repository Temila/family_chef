# Phase 06 — Deferred Items

## Pre-existing migration bug: f94f55868e87 batch constraint on SQLite

**Discovered:** 2026-07-22 (Plan 06-01, Task 2 execution)
**Category:** pre-existing technical debt (NOT caused by Phase 6)
**Status:** out of scope — logged for future fix

Migration `f94f55868e87` (Phase 5: Add favorites, taste_preferences constraints, and chef_schedules table)
uses `op.batch_alter_table('taste_preferences', schema=None)` with default `recreate="auto"` to add a
unique constraint. On SQLite, the auto-detection fails to choose the table-copy strategy, raising:

```
NotImplementedError: No support for ALTER of constraints in SQLite dialect.
```

This means the full Alembic migration chain cannot be applied from scratch on a fresh SQLite DB.
In production this is masked because `init_db()` uses `Base.metadata.create_all()` (bypassing
migrations entirely), as confirmed by 06-RESEARCH.md Pitfall 14.

**Impact on Plan 06-01:** The migration round-trip test cannot use `command.upgrade(cfg, "72b56533bb6d")`
from base. Instead, the test creates the pre-Phase-6 wishes schema directly via SQL and uses
`command.stamp(cfg, "72b56533bb6d")` so that `upgrade head` applies only the new Phase 6 migration.

**Future fix:** Change `f94f55868e87` batch mode to `recreate="always"` (same pattern as the new
Phase 6 migration), or add `render_as_batch=True` to `alembic/env.py`'s `context.configure()` call.
