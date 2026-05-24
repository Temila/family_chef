# Codebase Concerns

**Analysis Date:** 2026-05-24

## Tech Debt

**CRITICAL — Hardcoded secrets committed to git:**
- Issue: `config.yaml` at repo root is tracked in git and contains real secrets:
  - `secret_key: "Vztzkcdw!1992"` (app secret)
  - `jwt.secret_key: "Vztzkcdw!1992"` (JWT signing key)
  - `feishu.app_id` and `feishu.app_secret` (production Feishu/Lark credentials)
- Files: `config.yaml` (line 11, 21, 28-29)
- Impact: Anyone with repo access has production JWT signing key, app secret, and third-party API credentials. Tokens can be forged. Feishu integration can be abused.
- Fix approach: Move `config.yaml` into `.gitignore`. Add `config.example.yaml` at root with placeholder values (like `docker/config.example.yaml` already does). Rotate all exposed credentials immediately.

**Deprecated FastAPI lifecycle events:**
- Issue: `@app.on_event("startup")` and `@app.on_event("shutdown")` are deprecated since FastAPI 0.100+. Should use `lifespan` context manager.
- Files: `backend/app/main.py` (lines 29, 50)
- Impact: Will break when FastAPI removes the deprecated API. Current FastAPI version constraint is `>=0.100.0`.
- Fix approach: Replace with `async def lifespan(app: FastAPI)` context manager pattern.

**Deprecated `datetime.utcnow()`:**
- Issue: `datetime.utcnow()` is deprecated in Python 3.12+. Should use `datetime.now(timezone.utc)`.
- Files: `backend/app/utils/security.py` (line 31)
- Impact: Deprecation warnings in Python 3.12+; silently wrong results in far-future Python versions.
- Fix approach: Replace `datetime.utcnow()` with `datetime.now(timezone.utc)`.

**Stub implementations — Feishu user binding:**
- Issue: `FeishuClient.bind_user()` is a stub that prints a message but does not actually update the database.
- Files: `backend/app/integrations/feishu.py` (line 196)
- Impact: Feishu account binding silently does nothing; users cannot link their Feishu account.
- Fix approach: Implement actual DB update using `user_service.update_user()` to set `feishu_open_id`.

**Stub implementations — User stats:**
- Issue: `UserService.get_user_stats()` returns hardcoded zeros instead of real data.
- Files: `backend/app/services/user_service.py` (line 160-167, TODO comment on line 162)
- Impact: User profile pages show incorrect zero stats for week orders, favorites count, and dislike count.
- Fix approach: Query orders, favorites, and preferences tables for the given user_id.

**Stub implementations — Admin config update:**
- Issue: `PUT /api/admin/config` endpoint is a placeholder that returns a static message.
- Files: `backend/app/routers/admin.py` (line 105, TODO comment)
- Impact: Admin panel cannot update system configuration through the API.
- Fix approach: Implement config write-back to `config.yaml` with validation, or use a database-backed config store.

**Duplicate import in dish_service.py:**
- Issue: `from app.models.category import Category` is imported twice (lines 11-12).
- Files: `backend/app/services/dish_service.py` (lines 11-12)
- Impact: Harmless but sloppy; indicates copy-paste development.
- Fix approach: Remove the duplicate import on line 12.

**`print()` statements used for logging throughout backend:**
- Issue: 17 `print()` calls used instead of Python `logging` module for operational output including error reporting.
- Files: `backend/app/main.py`, `backend/app/initial_data.py`, `backend/app/integrations/feishu.py`, `backend/app/services/order_service.py`, `backend/app/middleware/logging.py`
- Impact: No log levels, no structured output, no log rotation. Feishu error messages (including response bodies) printed to stdout may leak sensitive data.
- Fix approach: Replace all `print()` calls with `logger.info()` / `logger.warning()` / `logger.error()` using the standard `logging` module.

## Known Bugs

**Feishu notification `send_order_notification()` signature mismatch:**
- Symptoms: `OrderService.update_order_status()` calls `feishu_client.send_order_notification()` with 4 positional args `(open_id, order_no, status, items)` but the method signature expects `(self, receive_id: str, data: dict)` — a single dict parameter.
- Files: `backend/app/services/order_service.py` (lines 347-352), `backend/app/integrations/feishu.py` (line 82-88)
- Trigger: Any order status update that triggers a Feishu notification to a user (when `user.feishu_open_id` is set).
- Workaround: None — the notification will fail silently (caught by `except Exception`).

**Order number race condition:**
- Symptoms: Concurrent order creation may generate duplicate order numbers.
- Files: `backend/app/services/order_service.py` (lines 23-32)
- Trigger: Two orders created simultaneously — both count the same number of existing orders and generate the same sequence number.
- Workaround: SQLite's write locking provides limited protection, but under concurrent async requests the count-then-insert pattern is not atomic.
- Fix approach: Use a database sequence, or add a UNIQUE constraint with retry logic.

**`list_users` endpoint has no authentication:**
- Symptoms: `GET /api/users` requires no authentication — anyone can enumerate all users, their roles, Feishu open IDs, etc.
- Files: `backend/app/routers/users.py` (lines 46-78)
- Trigger: Unauthenticated GET request to `/api/users`.
- Workaround: None.
- Fix approach: Add `current_user: User = Depends(get_current_user_from_token)` or `require_role("admin")` dependency.

**`get_user` endpoint has no authentication:**
- Symptoms: `GET /api/users/{user_id}` requires no authentication — anyone can view user details including email.
- Files: `backend/app/routers/users.py` (lines 81-102)
- Trigger: Unauthenticated GET request to `/api/users/{user_id}`.
- Fix approach: Require authentication and restrict to admin or self-only access.

**Cancel order logs wrong action:**
- Symptoms: When cancelling an order, the log records `"create_order"` instead of `"cancel_order"`.
- Files: `backend/app/routers/orders.py` (line 253)
- Trigger: DELETE `/api/orders/{order_id}` (cancel order).
- Fix approach: Change `log_action(current_user.id, "create_order", ...)` to `log_action(current_user.id, "cancel_order", ...)`.

## Security Considerations

**Hardcoded production credentials in tracked `config.yaml`:**
- Risk: JWT secret key, app secret key, and Feishu credentials are committed to version control and visible in git history.
- Files: `config.yaml` (lines 11, 21, 28-29)
- Current mitigation: `docker/config.yaml` is in `.gitignore` (but has the same hardcoded secrets). Root `config.yaml` is NOT in `.gitignore`.
- Recommendations: (1) Add `config.yaml` to `.gitignore`, (2) rotate all exposed secrets, (3) use environment variable overrides for secrets in production.

**Default admin credentials `admin/admin`:**
- Risk: Default admin account with trivially guessable password. The `force_pwd_change` flag exists but is not enforced at the API level — login succeeds regardless.
- Files: `backend/app/initial_data.py` (line 28)
- Current mitigation: `force_pwd_change=True` flag is set, but there is no middleware or login-time enforcement to block access until password is changed.
- Recommendations: Enforce password change at login time — reject the login or return a flag that the frontend must handle by forcing a password change page. Currently `LoginPage.jsx` does redirect but the API still issues a valid token.

**CORS configured to allow all origins:**
- Risk: Any website can make authenticated API requests to the backend if a user has a valid token.
- Files: `config.yaml` (line 41: `origins: ["*"]`), `docker/config.yaml` (line 32)
- Current mitigation: None.
- Recommendations: Replace `"*"` with the actual frontend domain in production.

**No password strength validation:**
- Risk: Users can register with passwords like "1" or "a" — no minimum length or complexity requirement.
- Files: `backend/app/schemas/user.py` (UserCreate schema, no password validator)
- Current mitigation: None.
- Recommendations: Add a `@field_validator('password')` enforcing minimum length (e.g., 8 chars) and optionally complexity.

**Unauthenticated user list endpoints:**
- Risk: User enumeration — attacker can discover all usernames, display names, roles, and Feishu open IDs.
- Files: `backend/app/routers/users.py` (lines 46, 81)
- Current mitigation: None.
- Recommendations: Require authentication for all user endpoints. Restrict user list to admin role.

**SQL-like LIKE injection via search parameters:**
- Risk: Search parameters use `User.username.contains(search)` and `Dish.name.like(f"%{search}%")`. While SQLAlchemy parameterizes queries, the `%` and `_` wildcards in user input can cause unexpected LIKE behavior.
- Files: `backend/app/services/user_service.py` (line 43), `backend/app/services/dish_service.py` (line 115)
- Current mitigation: SQLAlchemy parameterizes the values, preventing actual SQL injection.
- Recommendations: Escape LIKE wildcards in user input (`%` → `\%`, `_` → `\_`).

**Upload path traversal not fully mitigated:**
- Risk: While `generate_filename()` validates extensions and uses UUID, `file.content_type` comes from the client and could be spoofed. No actual file content verification (magic bytes) is performed.
- Files: `backend/app/routers/upload.py` (lines 34-53)
- Current mitigation: Extension whitelist and content-type check. UUID-based filenames prevent path traversal.
- Recommendations: Add magic-byte validation (e.g., `python-magic` or `imghdr`) to verify actual file content matches the declared type.

## Performance Bottlenecks

**DishService.list_dishes is a 712-line service with heavily duplicated query construction:**
- Problem: The `list_dishes` method (lines 49-350) and its corresponding count query duplicate nearly identical WHERE clause construction (~200 lines of duplicated filter logic).
- Files: `backend/app/services/dish_service.py` (lines 49-350)
- Cause: No query abstraction — each filter condition is applied twice (once for data query, once for count query).
- Improvement path: Extract a `_build_filter_conditions()` helper that returns a list of WHERE clauses reusable by both queries. This would cut ~100 lines and eliminate divergence risk.

**N+1 query pattern in order list and detail:**
- Problem: For each order item, a separate query fetches the dish name. The order list endpoint with 20 orders × 3 items = 60+ individual queries per page load.
- Files: `backend/app/routers/orders.py` (lines 50-61, 145-155) — `db.execute(select(Dish).where(Dish.id == item.dish_id))` inside a loop.
- Cause: Dish not eager-loaded alongside order items.
- Improvement path: Use `selectinload(Order.items)` with joined dish data, or batch-fetch all dish IDs in a single query.

**N+1 query in preference_service.get_preferences:**
- Problem: For each preference, a separate query fetches the ingredient name.
- Files: `backend/app/services/preference_service.py` (lines 33-34) — `db.execute(select(Ingredient)...` inside a loop.
- Cause: Ingredient not joined/eager-loaded with the preference query.
- Improvement path: Join `Ingredient` in the initial query or use `selectinload`.

**N+1 query in dish_service.get_dietary_warnings:**
- Problem: For each preference found, a separate query fetches the ingredient name.
- Files: `backend/app/services/dish_service.py` (lines 567-569) — `db.execute(select(Ingredient)...` inside a loop.
- Cause: Ingredient not eager-loaded with the preference results.
- Improvement path: Batch-fetch ingredients by ID list (already done correctly in `get_dietary_warnings_batch`).

**Favorite count query fetches all IDs into Python:**
- Problem: `list_favorites` counts results by fetching all dish IDs into a Python list and calling `len()` instead of using SQL `COUNT()`.
- Files: `backend/app/services/favorite_service.py` (lines 94-99)
- Cause: Using `select(Favorite.dish_id)` + `len(result.scalars().all())` instead of `select(func.count(...))`.
- Improvement path: Use `select(func.count(Favorite.dish_id)).where(...)` for O(1) count.

**Smart ingredient extractor loads ALL ingredients into memory:**
- Problem: `_match_with_database()` fetches every `Ingredient` and `IngredientAlias` row into memory for matching.
- Files: `backend/app/services/smart_ingredient_extractor.py` (lines 96-98)
- Cause: No filtering — full table scan on every extraction call.
- Improvement path: Filter by candidate names using `Ingredient.name.in_(ingredient_names)` or use full-text search.

**Basic ingredient extractor also loads ALL ingredients:**
- Problem: `extract_ingredients()` fetches every ingredient and alias from the database on every call.
- Files: `backend/app/services/ingredient_extractor.py` (lines 22-27)
- Cause: Same as above — no filtering.
- Improvement path: Same — filter by candidate substrings or cache the ingredient list in memory with periodic refresh.

## Fragile Areas

**dish_service.py — largest and most complex service file (712 lines):**
- Files: `backend/app/services/dish_service.py`
- Why fragile: Duplicate query construction between data and count queries means any filter change must be made in two places. A missed update causes count/data mismatch.
- Safe modification: Extract shared filter logic into a helper. Always update both the data query and count query together.
- Test coverage: Backend tests exist in `backend/tests/test_dishes.py` but the complex multi-filter combinations may not be fully covered.

**Dish router response construction — heavily duplicated manual serialization:**
- Files: `backend/app/routers/dishes.py` (lines 163-212 for create, 244-294 for update)
- Why fragile: The same manual loop over `dish.ingredients`, `dish.categories`, `dish.semifinished_ingredients`, `dish.dish_chefs` is copy-pasted for create and update responses. Any schema change requires updating both blocks identically.
- Safe modification: Extract a `_build_dish_detail_response(dish)` helper function.
- Test coverage: Test files exist but may not validate all response fields.

**Order notification in order_service.py — Feishu API call with wrong signature:**
- Files: `backend/app/services/order_service.py` (lines 346-352)
- Why fragile: The call to `send_order_notification` passes positional args that don't match the method signature. This is a latent bug — it will fail at runtime whenever a user with a Feishu open_id has their order status updated.
- Safe modification: Fix the call to pass a single `data` dict matching the method's expected parameter.

**Config loading at module import time:**
- Files: `backend/app/config.py` (lines 94-100)
- Why fragile: `settings` and `smart_settings` are created at module import time. Tests importing `app.config` get the real config. Changing config at runtime (e.g., for testing) requires monkey-patching module-level objects.
- Safe modification: Consider using dependency injection or a config factory for testability.

## Scaling Limits

**SQLite as sole database:**
- Current capacity: Suitable for single-family use (~100 dishes, ~10 users).
- Limit: Single-writer lock — concurrent writes serialize. No network access (local file only).
- Scaling path: The SQLAlchemy async engine setup and Alembic migrations make migration to PostgreSQL relatively straightforward. Change `DATABASE_URL` and remove `connect_args={"check_same_thread": False}`.

**No pagination on ingredient list endpoint:**
- Current capacity: With ~140 preset ingredients, the unpaginated list is still small.
- Limit: If ingredients grow to thousands, `GET /api/ingredients` will return all of them in a single response.
- Scaling path: Add pagination parameters matching the pattern used by other list endpoints.

**Feishu tenant_access_token not cached with proper expiry:**
- Current capacity: Single token fetch per notification call.
- Limit: `_token_expires_at` is set but never checked — a new token is fetched on every `send_message()` call.
- Scaling path: Check `_token_expires_at` before fetching; cache the token until near expiry.

## Dependencies at Risk

**`python-jose` for JWT:**
- Risk: `python-jose` is minimally maintained. The PyPI page recommends `PyJWT` or `python-jose[cryptography]` (which is what's installed).
- Impact: Potential security vulnerabilities without timely patches.
- Migration plan: Migrate to `PyJWT` which is actively maintained. The API is similar — `jwt.encode()`/`jwt.decode()` with minimal changes.

**`passlib[bcrypt]` — dual bcrypt dependency:**
- Risk: `passlib` wraps `bcrypt`, but `backend/app/utils/security.py` imports `bcrypt` directly (not through `passlib`). This creates a confusing dual-dependency.
- Files: `backend/app/utils/security.py` (line 8: `import bcrypt`)
- Impact: If `passlib` is removed, the bcrypt import still works, but the relationship is unclear.
- Migration plan: Choose one approach — either use `passlib`'s `CryptContext` or use `bcrypt` directly. Remove the unused dependency.

**`pyyaml` implicitly required but not declared:**
- Risk: `backend/app/config.py` does `import yaml` but `pyyaml` is not listed in `pyproject.toml` dependencies.
- Files: `backend/app/config.py` (line 13), `backend/pyproject.toml`
- Impact: Fresh install will fail on startup if `pyyaml` is not a transitive dependency of another package.
- Migration plan: Add `pyyaml>=6.0` to the dependencies list in `pyproject.toml`.

## Missing Critical Features

**No rate limiting on authentication endpoints:**
- Problem: `POST /api/auth/login` and `POST /api/auth/register` have no rate limiting.
- Impact: Vulnerable to brute-force password attacks and automated account creation.
- Files: `backend/app/routers/auth.py`

**No automated token refresh in frontend:**
- Problem: When the access token expires, the frontend redirects to login instead of silently refreshing using the stored refresh token.
- Files: `frontend/src/api/client.js` (lines 30-37 — 401 handling)
- Impact: Users are logged out every 24 hours even with active sessions.

**No password reset functionality:**
- Problem: No way for users to reset a forgotten password. Only `PUT /api/users/{id}/password` exists, requiring the old password.
- Impact: Admin must manually intervene if a user forgets their password.

**No database migration enforcement at startup:**
- Problem: `init_db()` uses `Base.metadata.create_all()` which only creates missing tables — it does not run Alembic migrations. Schema evolution depends on manually running `alembic upgrade head`.
- Files: `backend/app/database.py` (line 52-56)
- Impact: Deploying new code with model changes without manually running migrations will cause runtime errors or silent data inconsistency.

## Test Coverage Gaps

**No frontend tests:**
- What's not tested: Zero frontend test files exist. No unit tests, no integration tests, no E2E tests.
- Files: `frontend/src/` — no `*.test.*` or `*.spec.*` files found.
- Risk: UI regressions go undetected. Refactoring is unsafe.
- Priority: High — the frontend handles auth state, API calls, role-based routing, and form validation, all untested.

**Backend services have test files but quality/coverage unknown:**
- What's not tested: 24 test files exist covering most routers and services, but the complex multi-filter query logic in `dish_service.py` (the most complex service) may not be fully covered.
- Files: `backend/tests/test_dishes.py`
- Risk: Filter combination bugs (e.g., count/data mismatch) may go undetected.
- Priority: Medium

**Smart ingredient extractor is untested:**
- What's not tested: `smart_ingredient_extractor.py` requires a loaded LLM model, making it difficult to unit test.
- Files: `backend/app/services/smart_ingredient_extractor.py`
- Risk: JSON parsing failures from LLM output may not be handled correctly for edge cases.
- Priority: Low (the feature is optional and has fallback)

---

*Concerns audit: 2026-05-24*
