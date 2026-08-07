---
phase: 19-account-bound-theme-preferences
reviewed: 2026-08-07T13:55:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - backend/app/models/user_theme_preferences.py
  - backend/app/models/__init__.py
  - backend/app/schemas/user_theme_preferences.py
  - backend/app/services/user_theme_preferences_service.py
  - backend/app/routers/users.py
  - backend/alembic/versions/a3b4c5d6e7f8_add_user_theme_preferences_table.py
  - backend/tests/conftest.py
  - backend/tests/test_user_theme_preferences.py
  - frontend/src/api/client.js
  - frontend/src/theme/theme-context.jsx
  - frontend/src/components/composites/Header.jsx
findings:
  critical: 2
  warning: 1
  info: 3
  total: 6
status: issues-found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-08-07T13:55:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues-found

## Summary

Phase 19 adds account-bound theme preference persistence: a backend `user_theme_preferences` table + JWT-protected GET/PUT endpoints, plus a frontend dual-write (localStorage + debounced server PUT) with login-fetch hydration, 404-triggered first-login migration, and logout cleanup.

The backend layer (model, schema, service, migration, router) is largely clean: per-user isolation is structurally enforced (key = `user_id` from JWT, never from path/query), the upsert service mirrors the established `custom_theme_service` pattern, the migration is reversible, and Pydantic V2 validators correctly reject bad hemispheres/seasons/sourceColors. The 9 backend tests pass.

However, the review uncovered **2 critical defects** and **1 warning** that must be addressed before this code ships:

1. **SQLite foreign keys are disabled in production** (`PRAGMA foreign_keys = 0`). The migration declares `ON DELETE CASCADE` but it silently never fires — deleting a user orphans the `user_theme_preferences` row. The cascade-delete test is a **false positive**: it passes only because `conftest.clean_all_tables` accidentally leaves the pragma ON on the shared `:memory:` connection. This directly violates the phase's must-have truth: *"on user delete, the row is cascade-deleted (FK ON DELETE CASCADE)"*.

2. **`skipNextPutRef` is incorrectly set on the 404 first-login-migration path**, suppressing the debounced PUT for the user's next legitimate interaction (and breaking the documented "subsequent PUT will retry" claim if the migration upload itself fails).

3. The logout branch removes `fc_active_theme` synchronously, but the deferred `setActiveThemeState(DEFAULT_PRESET)` re-triggers the `injectThemeCss` effect which writes `fc_active_theme` back to localStorage — partially defeating D-A6's explicit `removeItem` requirement (manual UAT will catch this).

Security posture is otherwise sound: both endpoints require `Depends(get_current_user_from_token)` (verified 401 on missing credentials), `user_id` is sourced exclusively from the JWT (`current_user.id`), no user-controlled path/query reaches the row key, and JSON columns are populated via `model_dump(mode="json")` (no injection surface).

## Critical Issues

### CR-01: SQLite foreign keys disabled in production — `ON DELETE CASCADE` never fires; cascade test is a false positive

**File:** `backend/app/database.py:12-16` (missing event listener); `backend/alembic/versions/a3b4c5d6e7f8_add_user_theme_preferences_table.py:44` (declares CASCADE); `backend/tests/test_user_theme_preferences.py:159-188` (false-positive test); `backend/tests/conftest.py:69,108` (accidental masking)

**Issue:**
The phase's must-have truth states: *"on user delete, the row is cascade-deleted (FK ON DELETE CASCADE)"*. The migration correctly declares `sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE")`, and the model mirrors it. **But SQLite does not enforce foreign keys unless `PRAGMA foreign_keys = ON` is set per connection**, and neither the production engine (`backend/app/database.py`) nor the test engine (`backend/tests/conftest.py`) enables it.

Verified empirically:
```
prod_engine PRAGMA foreign_keys = 0
test_engine PRAGMA foreign_keys = 0
```
Isolated reproduction (fresh `:memory:` engine, no test harness):
```
FK pragma on fresh session: 0
orphaned preferences count after user delete: 1   ← cascade FAILED, row orphaned
```

**Production impact:** Deleting a user leaves an orphaned `user_theme_preferences` row forever (and the same defect affects every other `ondelete="CASCADE"` FK in the schema — `custom_themes`, `orders`, etc.). The phase's data-integrity guarantee is silently broken.

**Test impact:** `test_cascade_delete_on_user_delete` asserts `result.scalar() == 0` after a hard `DELETE FROM users`. It passes — but ONLY because `conftest.clean_all_tables` toggles `PRAGMA foreign_keys = OFF` then back `ON` (lines 69, 108) on the shared `:memory:` connection. The pragma persists into the test's own session, enabling cascade there while production remains unprotected. The test therefore validates the test harness, not production behavior.

**Fix:** Add a SQLAlchemy `connect` event listener that enables FK enforcement on every new SQLite connection, for BOTH engines. Remove the conftest pragma toggle (it becomes redundant and is the source of the masking).

```python
# backend/app/database.py — add after engine creation (around line 16)
from sqlalchemy import event

@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_conn, _connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()
```

```python
# backend/tests/conftest.py — add after test_engine creation (around line 22)
from sqlalchemy import event

@event.listens_for(test_engine.sync_engine, "connect")
def _enable_sqlite_fk_test(dbapi_conn, _):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON")
    cur.close()

# Then REMOVE the pragma toggles in clean_all_tables (lines 69 and 108);
# with FK always-on, ordered DELETE is still safe (children before parents).
```

After the fix, re-run the test on a fresh engine (without the conftest side effect) to confirm the cascade genuinely works.

---

### CR-02: `skipNextPutRef.current = true` on the 404 first-login migration path suppresses the next user interaction's PUT (data loss + broken retry claim)

**File:** `frontend/src/theme/theme-context.jsx:395`

**Issue:**
In `refreshThemePreferences`, the 404 branch sets `skipNextPutRef.current = true` immediately before awaiting the migration upload PUT:

```js
if (err?.status === 404) {
  const localTheme = readActiveThemeFromStorage();
  // ...read 3 more localStorage keys...
  skipNextPutRef.current = true;          // ← BUG
  try {
    await api.updateThemePreferences({ ... });
  } catch {
    /* 上传失败静默；后续 debounced PUT 会重试 */   // ← FALSE: skip flag suppresses the retry
  }
}
preferencesLoadedRef.current = true;
```

The `skipNextPutRef` flag exists to prevent an **echo-back PUT** after server→state hydration on the 200 path (where 4 `setState` calls would trigger the debounced PUT effect, re-uploading values that just came down). On the **404 path there are zero `setState` calls** (verified: the branch only reads localStorage and fires the upload PUT) — so there is nothing to skip. The flag is set but never consumed by the 404 flow itself.

**Consequence 1 — first interaction lost:** The unconsumed `skipNextPutRef` is then consumed by the debounced-PUT effect on the user's NEXT legitimate state change (e.g. toggling season, picking a new theme). That effect sees `skipNextPutRef=true`, sets it to `false`, and returns early — so the user's first theme change after first-login migration is **not persisted to the server** until they make a second change (whose PUT happens to carry the full state).

**Consequence 2 — broken retry:** If the initial migration upload fails, the inline comment claims *"后续 debounced PUT 会重试"* (subsequent debounced PUT will retry). This is false: the skip flag suppresses the very next debounced PUT, so no retry occurs until the user makes two more interactions.

**Fix:** Remove the `skipNextPutRef.current = true` line from the 404 branch. It is only meaningful on the 200 path (where state mutation would otherwise echo back). On 404, no state mutates, so no suppression is needed.

```js
if (err?.status === 404) {
  const localTheme = readActiveThemeFromStorage();
  const localEnabled = readSeasonEnabledFromStorage();
  const localHemi = readHemisphereFromStorage();
  const localMap = readSeasonThemeMapFromStorage();
  // Do NOT set skipNextPutRef here — the upload PUT does not change theme-context state,
  // so there is no echo-back to suppress. Setting it here would drop the user's next PUT.
  try {
    await api.updateThemePreferences({
      active_theme: serializeActiveTheme(localTheme),
      season_enabled: localEnabled,
      hemisphere: localHemi,
      season_theme_map: serializeSeasonThemeMap(localMap),
    });
  } catch {
    /* 上传失败静默；后续用户交互触发的 debounced PUT 会重试 */
  }
}
preferencesLoadedRef.current = true;
```

## Warnings

### WR-01: Logout re-populates `fc_active_theme` via the `injectThemeCss` effect, partially violating D-A6's `removeItem` requirement

**File:** `frontend/src/theme/theme-context.jsx:417-420` (removeItem) interacting with `294-303` (injectThemeCss effect)

**Issue:**
The logout branch of the user-keyed `useEffect` does the right thing synchronously:
```js
localStorage.removeItem(ACTIVE_THEME_KEY);   // fc_active_theme gone
// ...3 more removeItem calls...
```
But it then defers the state reset via `queueMicrotask`:
```js
queueMicrotask(() => {
  setActiveThemeState(DEFAULT_PRESET);   // ← triggers injectThemeCss effect
  // ...
});
```
The `injectThemeCss` effect (lines 294-303, which the plan explicitly forbade touching) **unconditionally** calls `writeActiveThemeToStorage(activeTheme)` on every `activeTheme` change:
```js
useEffect(() => {
  try {
    const cssText = buildCssSync(activeTheme.sourceColors, activeTheme.variant);
    injectThemeCss(cssText);
    writeActiveThemeToStorage(activeTheme);   // ← re-creates fc_active_theme
  } catch { ... }
}, [activeTheme, showToast]);
```
So whenever the logging-out user had a non-default active theme (different object reference than `DEFAULT_PRESET`), the state reset triggers this effect, which writes `fc_active_theme = DEFAULT_PRESET` back to localStorage — **the key is re-created within a microtask of being removed**.

This partially violates D-A6: *"登出时清理主题偏好 localStorage: fc_active_theme ... 全部 localStorage.removeItem"*. The phase-02 success criterion explicitly checks `fc_active_theme removedItem` in manual UAT — that check will fail (the key will contain `DEFAULT_PRESET`, not be absent).

Functional impact is minimal (FOUC bootstrap reads `DEFAULT_PRESET` for both `null` and the default-theme JSON, so the visual result is identical), but the spec deviation is real and UAT-detectable. The other 3 keys (`fc_season_enabled`, `fc_hemisphere`, `fc_season_theme_map`) are NOT affected — their writers (`setSeasonEnabled`/`setHemisphere`/`setSeasonTheme`) are not invoked on logout (the logout branch calls the raw `setXxxState` setters directly), so their `removeItem` sticks.

**Fix (minimal, respects the plan's "do not touch injectThemeCss" constraint):** Gate the storage write in the existing effect on the user being present, so logout's state reset does not re-write the key:

```js
useEffect(() => {
  try {
    const cssText = buildCssSync(activeTheme.sourceColors, activeTheme.variant);
    injectThemeCss(cssText);
    if (user?.id) writeActiveThemeToStorage(activeTheme);   // ← only persist when logged in
  } catch {
    showToast('主题应用失败，已恢复默认', 'error');
    queueMicrotask(() => { setActiveThemeState(DEFAULT_PRESET); });
  }
}, [activeTheme, showToast, user?.id]);
```

(If touching this effect is truly off-limits per plan, the alternative is to drop `setActiveThemeState(DEFAULT_PRESET)` from the logout branch and accept that the CSS for the previous user's theme persists in the DOM until the next login — but that has worse UX than the fix above.)

## Info

### IN-01: Application-level upsert (SELECT-then-INSERT/UPDATE) is racy under concurrent same-user PUTs

**File:** `backend/app/services/user_theme_preferences_service.py:41-66`

**Issue:** `upsert` does `SELECT ... WHERE user_id = ?` then branches on `scalar_one_or_none()` to decide INSERT vs UPDATE. Two concurrent PUTs from the same user (e.g. two browser tabs both racing on the first-ever preference write) can both observe `None` and both issue `INSERT` — the second hits the `user_id` PK constraint and raises `IntegrityError`, which the router does not catch, surfacing as a 500. The PK constraint correctly prevents duplicate rows (good), but the failure mode is a hard 500 rather than a clean retry.

**Fix suggestion (optional):** Either catch `IntegrityError` and retry as UPDATE, or use SQLite's native upsert: `INSERT INTO user_theme_preferences (...) VALUES (...) ON CONFLICT(user_id) DO UPDATE SET ...`. Low priority — the window requires same-user simultaneous first-write, and the failure is a clean 500 the client can retry.

### IN-02: `test_put_upsert_no_duplicate_row` sleeps 1.1s for an `updated_at` change that is never asserted

**File:** `backend/tests/test_user_theme_preferences.py:92`

**Issue:** `await asyncio.sleep(1.1)` with the comment `# 确保 updated_at 能变化` — but the test never asserts `updated_at` advanced; it only asserts `hemisphere == 'south'`, `season_enabled is True`, and the DB row count is 1. The 1.1s sleep (needed because SQLite `CURRENT_TIMESTAMP` has 1-second resolution) wastes ~20% of the file's total test time for no asserted benefit.

**Fix:** Either drop the sleep, or add `assert second_data["updated_at"] != first_data["updated_at"]` (capturing `first_data` from the first PUT) to justify it.

### IN-03: Debounced-PUT effect deps use the `user` object instead of `user?.id`

**File:** `frontend/src/theme/theme-context.jsx:334`

**Issue:** The dependency array is `[user, activeTheme, seasonEnabled, hemisphere, seasonThemeMap]`. The sibling user-keyed effect at line 440 correctly uses `[user?.id, ...]`. Using the whole `user` object means any reference-only change to `user` (e.g. `updateUser()` in `AuthContext` re-creating the object with the same `id`) re-fires the debounced-PUT effect. The effect's first guard (`if (!user || !preferencesLoadedRef.current) return`) makes this harmless — it just re-schedules a no-op PUT of the current state — but it is inconsistent with the rest of the file and wasteful.

**Fix:** Change line 334 to `[user?.id, activeTheme, seasonEnabled, hemisphere, seasonThemeMap]` for consistency with line 440.

---

_Reviewed: 2026-08-07T13:55:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
