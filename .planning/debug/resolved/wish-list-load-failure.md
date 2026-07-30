---
status: resolved
trigger: "加载愿望单失败 — opening /my-wishes persistently errors with 加载愿望失败 (failed to load wish list)"
created: 2026-07-23T14:35:00Z
updated: 2026-07-23T14:45:00Z
---

## Current Focus

hypothesis: The wishes table is missing `last_status_change_at` and `submitter_last_viewed_at` columns declared by the SQLAlchemy model. SQLAlchemy SELECT references the missing columns → 500 → frontend toast "加载愿望失败".
test: Verified via direct HTTP `GET /api/wishes` with a real user token (user1) — returns HTTP 500; verified via direct Python asyncio call to the same SQLAlchemy query — raises `sqlite3.OperationalError: no such column: wishes.last_status_change_at`.
expecting: Confirmed.
next_action: Investigation complete; recording findings.

## Symptoms

expected: User opens /my-wishes, sees their wish list cards (or an empty state if no wishes).
actual: Persistent toast "加载愿望失败" (failed to load wish list); HTTP 500 from backend.
errors: backend logs: `sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such column: wishes.last_status_change_at`.
reproduction: 1) Login as user1 (or any user with wishes); 2) Navigate to /my-wishes; 3) Observe error toast and HTTP 500 in network tab.
started: After Phase 6 (notification timestamps) was merged but its Alembic migration was never applied to the running SQLite database.

## Eliminated

- hypothesis: Router is not registered.
  evidence: `backend/app/main.py:294` includes `app.include_router(wishes.router, prefix="/api/wishes", tags=["愿望单"])`; OpenAPI lists `/api/wishes` GET endpoint; the endpoint does respond (500, not 404).
  timestamp: 2026-07-23T14:36:00Z

- hypothesis: Frontend hits the wrong path.
  evidence: `frontend/src/api/client.js:157-170` defines `getWishes` that calls `/wishes`, which `request()` prefixes with `this.baseURL = '/api'` → `/api/wishes` (matches backend).
  timestamp: 2026-07-23T14:36:00Z

- hypothesis: Auth token missing causes the error.
  evidence: With a valid `user1` Bearer token the response is still 500. Without a token it's 401 (different error).
  timestamp: 2026-07-23T14:42:00Z

- hypothesis: Pydantic schema field mismatch (`has_unread` or other).
  evidence: The error occurs during the SQL query BEFORE Pydantic validation — the failure is at the DB layer, not the response layer.
  timestamp: 2026-07-23T14:43:00Z

- hypothesis: User has no wishes → frontend should show empty state.
  evidence: Even user with zero wishes would still trigger the failing SELECT. But the root error is the missing column regardless of row count.
  timestamp: 2026-07-23T14:43:00Z

## Evidence

- timestamp: 2026-07-23T14:36:00Z
  checked: `backend/app/main.py:262-294` (router import + include_router block).
  found: `wishes` is imported and registered with prefix `/api/wishes`. No registration issue.
  implication: Backend routing is correct.

- timestamp: 2026-07-23T14:36:00Z
  checked: `frontend/src/api/client.js:157-170` (getWishes), `frontend/src/pages/UserWishesPage.jsx:85, 108`.
  found: Frontend calls `GET /api/wishes?page=1&page_size=20` with no status filter. URL composition is correct.
  implication: Frontend request is well-formed.

- timestamp: 2026-07-23T14:37:00Z
  checked: Live SQLite schema for `wishes` table.
  found: Columns present: id, user_id, dish_name, reference_url, note, status, claimed_by_chef_id, related_dish_id, reject_reason, created_at, updated_at. Columns MISSING: `last_status_change_at`, `submitter_last_viewed_at`.
  implication: DB is out of sync with model.

- timestamp: 2026-07-23T14:37:00Z
  checked: `backend/app/models/wish.py:33-34` (model column declarations).
  found: Model declares both missing columns:
    - `last_status_change_at = Column(DateTime, nullable=True, server_default=func.now())`
    - `submitter_last_viewed_at = Column(DateTime, nullable=True)`
  implication: SQLAlchemy will include both columns in every SELECT against `wishes`, regardless of whether the code reads them.

- timestamp: 2026-07-23T14:38:00Z
  checked: Alembic version table in DB.
  found: `SELECT * FROM alembic_version` returns `[('72b56533bb6d',)]`. Phase-5 wishes migration.
  implication: The DB has only applied up to the initial wishes-table creation.

- timestamp: 2026-07-23T14:38:00Z
  checked: `backend/alembic/versions/3a41e4977098_add_wish_notification_timestamps.py` (next migration in chain).
  found: `down_revision: '72b56533bb6d'` — this migration was supposed to add the two missing columns (via `batch_alter_table("wishes", recreate="always")`).
  implication: The migration exists in the repo but has not been applied to the running DB. Running `alembic upgrade head` will execute it.

- timestamp: 2026-07-23T14:42:00Z
  checked: Live HTTP `GET /api/wishes` with valid user1 token.
  found: Response: HTTP 500, body `Internal Server Error`.
  implication: Real reproduction of the bug.

- timestamp: 2026-07-23T14:44:00Z
  checked: Direct Python asyncio reproduction of the wish_service.list_wishes query.
  found: Raised `sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such column: wishes.last_status_change_at`. Generated SQL: `SELECT wishes.id, wishes.user_id, wishes.dish_name, wishes.reference_url, wishes.note, wishes.status, wishes.claimed_by_chef_id, wishes.related_dish_id, wishes.reject_reason, wishes.created_at, wishes.updated_at, wishes.last_status_change_at, wishes.submitter_last_viewed_at FROM wishes WHERE wishes.user_id = ?`
  implication: SQLAlchemy emits both missing columns in the SELECT, even though `compute_has_unread` is the only code that reads them — the model attribute causes them to be loaded.

## Resolution

root_cause: Alembic migration `3a41e4977098_add_wish_notification_timestamps.py` (Phase 6) was never applied to the running SQLite database. The `wishes` table is missing the `last_status_change_at` and `submitter_last_viewed_at` columns that the SQLAlchemy `Wish` model (`backend/app/models/wish.py:33-34`) declares. Every query against `wishes` therefore fails with `sqlite3.OperationalError: no such column: wishes.last_status_change_at`, which surfaces to the frontend as HTTP 500 and the user-facing toast "加载愿望失败".

fix: Run `alembic upgrade head` against the database at `backend/data/family_chef.db` to apply migration `3a41e4977098`. After the migration, the missing columns exist and `GET /api/wishes` returns 200 with the wish list.

verification: Manually re-run the HTTP request after applying the migration; expect HTTP 200 and a JSON body of shape `PageResponse<WishListResponse>`. For non-submitter viewers the `has_unread` field will be `false`; for the wish submitter it will be `true` if `last_status_change_at > submitter_last_viewed_at` (or if `submitter_last_viewed_at` is null and `last_status_change_at` is set).

files_changed: []
