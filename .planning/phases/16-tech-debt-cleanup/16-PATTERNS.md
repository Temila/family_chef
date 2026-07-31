# Phase 16: Tech Debt Cleanup — Pattern Map

**Mapped:** 2026-07-31
**Files analyzed:** 10 (TD items)
**Analogs found:** 10 / 10

> **Method note:** No CONTEXT.md / RESEARCH.md exists for Phase 16. Item scopes were taken from `REQUIREMENTS.md` (TD-01..TD-10), `STATE.md` (deferred items), and direct codebase inspection. Test (TD-09) and lint (TD-10) baselines were executed live to capture root-cause patterns.

## File Classification

| TD Item | Primary Files | Role | Data Flow | Closest Analog | Match Quality |
|---------|---------------|------|-----------|----------------|---------------|
| TD-01 `::before` sign-off | `.planning/archived/v1.3/14-ui-bugfix-filter-popup/14-VERIFICATION.md` | docs (override frontmatter) | — | same file's frontmatter `overrides` block (lines 19-28) | exact |
| TD-02 version from config.yaml | `frontend/vite.config.js`, `frontend/src/components/composites/Sidebar.jsx`, `backend/app/config.py`, `backend/app/main.py` | config / utility | request-response | `backend/app/main.py:260-263` (`/api/health`) + `backend/app/config.py:35` (`APP_VERSION`) | role-match |
| TD-03 CORS verify | `backend/app/config.py`, `config.yaml`, `backend/app/main.py` | config | — | `backend/app/main.py:218-224` CORSMiddleware block | exact |
| TD-04 `app.url` in config.yaml | `config.yaml`, `backend/app/config.py`, `backend/app/integrations/feishu.py` | config | — | `backend/app/config.py:38` (`APP_URL` getter) + `config.yaml:8-12` app section | exact |
| TD-05 alembic render_as_batch | `backend/alembic/env.py`, `backend/alembic/versions/*.py` | config | batch | `f94f55868e87` (inline `batch_alter_table`) + `3a41e4977098` (`recreate="always"`) | exact |
| TD-06 auto migration on startup | `backend/app/main.py`, `backend/app/database.py` | middleware/startup | — | `backend/app/main.py:227-235` `@app.on_event("startup")` + `database.py:52-56` `init_db()` | exact |
| TD-07 encodeURIComponent | `frontend/src/App.jsx`, `frontend/src/pages/UserWishesPage.jsx`, `frontend/src/pages/ChefWishesPage.jsx` | component | request-response | `frontend/src/App.jsx:88-99` WishDeepLinkRedirect | exact |
| TD-08 actingId residue | `frontend/src/pages/ChefWishesPage.jsx`, `frontend/src/components/WishCard.jsx` | component | request-response | `ChefWishesPage.jsx:219-272` (handleClaim/handleAdvance/handleReject) | exact |
| TD-09 backend test drift (108 fail) | `backend/tests/*.py` (13 files), `backend/app/routers/*.py`, `backend/app/models/*.py` | test | CRUD | `backend/tests/conftest.py:124-148` client fixture + router `""` path convention | exact |
| TD-10 frontend lint baseline (101 err) | `frontend/src/pages/*.jsx` (9 files), `frontend/eslint.config.js`, `frontend/tests/fixtures/*.jsx` | test/config | — | `frontend/src/pages/ChefWishesPage.jsx:115-157` (lint-clean page) | exact |

---

## Pattern Assignments

### TD-01: `::before` override sign-off (docs, no code)

**Analog:** `14-VERIFICATION.md` frontmatter (same file)

The override record already exists; `accepted_by` / `accepted_at` are empty and the phase shipped anyway. Sign-off is a metadata edit, not code.

**Current state (lines 19-28):**
```yaml
overrides:
  # 建议（尚未被 operator 接受）：SC2 字面 "::before 占位符" 由 th:first-child padding-left 替代
  - must_have: "表格表头（th）与表体内容列对齐，th 有 ::before 占位符"
    reason: >-
      PENDING OPERATOR DECISION. 14-05 将原 universal th:first-child 48px hack 拆分为 baseline (12px) +
      .pc-data-table--with-leading (56px) 修饰类，4 个带头像页面挂修饰类、3 个无头像页面保持基线。
      功能性对齐（SC2 前半句 + operator 实际反馈"表头错位依然没有解决"）已跨全部 7 页面达成；
      仅 SC2 后半句字面"th 有 ::before 占位符"由 th:first-child padding-left 替代。
    accepted_by: ""
    accepted_at: ""
```

**Ground-truth evidence (for the sign-off wording):**
- `frontend/src/css/styles.css:348-360` — baseline `.pc-data-table th:first-child, td:first-child { padding-left: var(--md-spacing-3) }` + `.pc-data-table--with-leading` modifier `padding-left: calc(var(--md-spacing-3) + 36px + var(--md-spacing-2))`; old universal 48px rule deleted (grep `pc-data-table th::before` = 0 hits).
- 4 avatar pages carry the modifier class (AdminDishesPage / ChefDishesPage / AdminUsersPage / AdminChefsPage, count=1 each); 3 non-avatar pages keep baseline (AdminIngredientsPage / AdminCategoriesPage / AdminLogsPage, count=0).

**Gotchas:**
- If operator accepts, fill `accepted_by` + `accepted_at` in 14-VERIFICATION.md frontmatter only. Do NOT re-add `::before` — 14-05 already deleted it deliberately.
- If operator rejects, the alternative is restoring an actual `th::before` rule in `styles.css` — but that reverses 14-05's verified fix; confirm with human before doing so.

---

### TD-02: Version from config.yaml (config + request-response)

**Analog:** `backend/app/main.py:260-263` health endpoint + `backend/app/config.py:35` version getter

**Current version chain (all three touchpoints):**
1. `frontend/package.json:4` — `"version": "0.0.0"` (never updated; stale)
2. `frontend/vite.config.js:8` — `'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version)` (build-time injection from the stale package.json; also a TD-10 `no-undef` error — `process` not defined, see TD-10)
3. `frontend/src/components/composites/Sidebar.jsx:22` — `const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';`

**Backend already has the single source of truth:**
- `backend/app/config.py:35` — `self.APP_VERSION: str = app.get("version", "0.1.0")` (reads `app.version` from config.yaml)
- `config.yaml:10` — `version: "0.1.0"` ← authoritative
- `backend/app/main.py:212-216` — FastAPI app already consumes it (`version=settings.APP_VERSION`)

**Pattern to follow:** expose version over HTTP, consume at runtime (kills the build-time injection chain).

Health endpoint to extend (`backend/app/main.py:260-263`):
```python
@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}
```
Add `"version": settings.APP_VERSION` (and optionally `"app_url": settings.APP_URL` — free TD-04 win).

Frontend fetch pattern — `frontend/src/api/client.js` (lines 6-60): single `ApiClient` class, `this.baseURL = '/api'`, method naming `camelCase` with entity prefix (e.g., add `getAppInfo()`/`getHealth()`). Then Sidebar.jsx:22 swaps:
```jsx
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';
```
for a fetch-on-mount (useEffect + useState; see the effect ordering pattern in TD-10's analog `ChefWishesPage.jsx:139-157` for the lint-clean shape).

**Gotchas:**
- Keep the `|| '0.0.0'`-style fallback so the sidebar renders before/without the API call.
- If you remove the `define` block from `vite.config.js`, nothing else in the repo consumes `VITE_APP_VERSION` (grep confirms Sidebar.jsx is the only consumer) — safe to remove.
- Do not change `package.json` version as the fix; it is npm metadata, not app version.

---

### TD-03: CORS verify tightened (config, verification-only)

**Analog:** `backend/app/main.py:218-224` CORSMiddleware block (exact)

**Ground truth (already verified):**
- `config.yaml:36-39` — origins already narrowed:
  ```yaml
  cors:
    origins:
      - "http://localhost:5173"
      - "http://localhost:3000"
  ```
- `backend/app/main.py:218-224` — middleware reads `settings.CORS_ORIGINS`, no hardcoded `["*"]`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.CORS_ORIGINS,
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- `backend/app/config.py:57-58` — `self.CORS_ORIGINS: list[str] = cors.get("origins", ["*"])`

**Remaining risk (the only gap):** the `["*"]` default in `config.py:58` activates whenever config.yaml lacks a `cors` section (e.g., fresh deployment with missing config). `config.yaml` exists in-repo with the tightened list, so runtime is safe; the debt item is the insecure fallback default.

**Gotcha:** `allow_credentials=True` + `allow_origins=["*"]` would be an invalid CORS combination in Starlette (it asserts) — so if the default is ever hit, startup may crash rather than be insecure. Tightening the default to `["http://localhost:5173"]` (matching config.yaml) removes both the risk and the assertion hazard. Verify-only task: no code change strictly required.

---

### TD-04: `app.url` explicit in config.yaml (config)

**Analog:** `backend/app/config.py:38` getter + `backend/app/integrations/feishu.py:224` consumer

**Backend code already complete:**
- `backend/app/config.py:38` — `self.APP_URL: str = app.get("url", "https://family-chef.app")`
- `backend/app/integrations/feishu.py:224` — deep link builder:
  ```python
  detail_url = f"{settings.APP_URL.rstrip('/')}/wishes/{wish_id}"
  ```
- Tests already pin the behavior — `backend/tests/test_datetime_utils.py:42-55` (Pitfall 8):
  ```python
  def test_app_url_uses_yaml_value_when_present():
      s = Settings({"app": {"url": "https://x.example"}})
      assert s.APP_URL == "https://x.example"

  def test_app_url_defaults_to_placeholder():
      s = Settings({})
      assert s.APP_URL == "https://family-chef.app"
  ```

**Missing piece:** `config.yaml:8-12` app section has no `url` key — Feishu deep links fall back to the placeholder `https://family-chef.app`.

**Pattern to follow** — add to the existing app block (`config.yaml:8-12`), same style as neighbors:
```yaml
app:
  name: "家味·Family Chef"
  version: "0.1.0"
  url: "https://family-chef.app"   # ← 新增：飞书深链基址（部署时改为实际公网地址）
  debug: true
  secret_key: "Vztzkcdw!1992"
```

**Gotchas:**
- Check `config.example.yaml` exists and keep it in sync (config.yaml header says `cp config.example.yaml config.yaml`). Grep for the example file before planning.
- `rstrip('/')` in feishu.py means a trailing slash in the YAML value is tolerated; no consumer-side change needed.
- This is a 1-line YAML add; do not change `config.py` (already correct).

---

### TD-05: Alembic `render_as_batch=True` (config, batch)

**Analog:** `f94f55868e87` migration (inline `batch_alter_table`) + `3a41e4977098` (`recreate="always"`)

**The defect:** `backend/alembic/env.py:38-42` `do_run_migrations` configures without `render_as_batch`:
```python
def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()
```

Yet 4 migrations use bare `op.drop_column` / `op.drop_constraint`, which SQLite cannot do natively — `alembic upgrade head` from base fails on them without batch mode:
- `backend/alembic/versions/a1b2c3d4e5f6_add_recipe_to_dishes.py:19` — `op.drop_column("dishes", "recipe")`
- `backend/alembic/versions/52a06862ef2d_add_meal_date_and_meal_type_to_orders.py:32-33` — `op.drop_column('orders', ...)` ×2
- `backend/alembic/versions/b2c3d4e5f6a7_add_is_semifinished_and_dish_semi.py:30` — `op.drop_column("dishes", "is_semifinished")`
- `backend/alembic/versions/d4e5f6a7b8c9_add_dish_chef_status.py:19` — `op.drop_column('dish_chefs', 'status')`

(Newer migrations already hand-roll batch mode: `f94f55868e87:49` `with op.batch_alter_table('taste_preferences', schema=None) as batch_op:` and `3a41e4977098:27` `with op.batch_alter_table("wishes", recreate="always") as batch_op:` — these are the precedent the env.py flag would make automatic.)

**Fix pattern** (both configure sites — offline `env.py:27-32` and online `env.py:38-42`):
```python
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,          # SQLite batch 模式：自动把 alter 包装为表重建
    )

    with context.begin_transaction():
        context.run_migrations()
```

**Gotchas:**
- `render_as_batch` only affects **online** mode (`do_run_migrations`); the offline branch (`env.py:27-32`) also needs it if offline SQL generation is used — check `alembic.ini`/docs for offline usage before deciding.
- Verify with a from-scratch run: `cd backend && rm data/family_chef.db && uv run alembic upgrade head` (the exact failure path STATE.md cites: "alembic upgrade head from base 依赖 env.py 增 render_as_batch=True").
- Existing hand-rolled `batch_alter_table` calls are unaffected (explicit batch inside a batch context is a no-op in Alembic).
- Do NOT regenerate the old migrations; env.py change makes them runnable as-is.

---

### TD-06: Auto `alembic upgrade head` on startup (startup)

**Analog:** `backend/app/main.py:227-235` startup handler + `backend/app/database.py:52-56` `init_db()`

**Current startup** (`backend/app/main.py:227-235`):
```python
@app.on_event("startup")
async def startup():
    """应用启动事件"""
    _print_startup_info()

    # NOTE(07-04): No automatic `alembic upgrade head` runs at startup.
    # New migrations must be applied manually via `cd backend && uv run alembic upgrade head`.
    # See .planning/phases/07-wish-list-frontend/07-04-PLAN.md for context.
    await init_db()
    ...
```

The NOTE block is the deliberate no-auto-migration decision (dated 07-04, Phase 7) — replace it, don't just append. Ordering matters: `alembic upgrade head` MUST run before `await init_db()` (which does `Base.metadata.create_all`).

**Pattern to follow** — the startup handler is already async; run alembic via subprocess (blocking call inside async needs `asyncio.to_thread` — the repo already uses `loop.run_in_executor` for blocking work, `main.py:208-209`):
```python
import asyncio
import subprocess

async def _run_alembic_upgrade():
    """启动时自动应用数据库迁移（SQLite batch 见 TD-05）"""
    result = await asyncio.to_thread(
        subprocess.run,
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=os.path.join(os.path.dirname(__file__), ".."),  # backend/
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        _log(f"  ⚠ 迁移失败: {result.stderr}")   # 或 raise — 决策点
```

**Guarding options (choose in plan):**
1. **Fail-fast** — raise on non-zero (consistent with `scripts/run.sh` `set -e`); risk: broken migration bricks startup.
2. **Warn-and-continue** — log via existing `_log()` and fall back to `init_db()` (consistent with `main.py:204-206` model-download failure handling `_log(f"  ⚠ ...")` + continue).
3. **Env-gated** — `AUTO_MIGRATE` env var (STATE.md suggests "AUTO_MIGRATE env candidate"); default-on for production, off for tests.

**Gotchas:**
- `backend/tests/conftest.py:40-59` builds tables via `Base.metadata.create_all` directly — startup migration must NOT run during tests, or it will hit the test's `:memory:`/file DB. Test startup runs through `app.main` import → the `@app.on_event("startup")` handler fires in `ASGITransport` calls. Gate on `os.environ.get("PYTEST_CURRENT_TEST")` / an env flag, or the 108-failure count will grow.
- The old `@app.on_event` API is deprecated (DeprecationWarning in every test run; see TD-09 warnings) — FastAPI suggests lifespan handlers. Touching this function is the natural place to migrate to `lifespan` if desired, but that's scope creep — flag it, don't do it silently.
- `alembic.ini` default URL is `sqlite+aiosqlite:///./data/family_chef.db` — relative to CWD, so `cwd=backend/` matters (as `run.sh` does `cd /app/backend` before uvicorn).
- In Docker (`docker/docker-compose.yaml`), DB lives at `/app/backend/data`; migration runs before uvicorn start in the same container — fine.

---

### TD-07: `encodeURIComponent(id)` in WishDeepLinkRedirect (component, request-response)

**Analog:** `frontend/src/App.jsx:88-99` (the component itself)

**Current code:**
```jsx
// Phase-6 飞书通知中的 /wishes/:id 深链兼容入口：按当前用户角色重定向到对应的愿望页，
// 保留 ?wish=:id 高亮指令（由各愿望页消费）。
function WishDeepLinkRedirect() {
  const { user } = useAuth();
  const { id } = useParams();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  let base;
  if (user.role === 'admin') base = '/admin/wishes';
  else if (user.role === 'chef') base = '/chef/wishes';
  else base = '/my-wishes';
  return <Navigate to={base + '?wish=' + id} replace />;   // ← TD-07: id 未编码
}
```

**Consumers of the `wish` param** (decode via `URLSearchParams.get`, so encoded values are transparently fine):
- `frontend/src/pages/ChefWishesPage.jsx:48` — `const highlightId = searchParams.get('wish');`
- `frontend/src/pages/UserWishesPage.jsx:29` — same
- Highlight effect uses the raw string in a selector: `ChefWishesPage.jsx:198` / `UserWishesPage.jsx:176` — `document.querySelector('[data-wish-id="' + highlightId + '"]')` (note: `String(w.id)` in `data-wish-id` attr, `WishCard.jsx:199`)

**Fix pattern (single line):**
```jsx
return <Navigate to={base + '?wish=' + encodeURIComponent(id)} replace />;
```

**Gotchas:**
- Wish ids are DB integers today (URL-safe), so this is defensive — the danger is a future id format (uuid/slug) silently breaking the redirect. No consumer changes needed (`searchParams.get` auto-decodes).
- Do NOT encode in the consumers' `querySelector` — `highlightId` there is already decoded.
- Backend twin: `backend/app/integrations/feishu.py:224` builds `/wishes/{wish_id}` — same single-source concern; leave unless id format changes.

---

### TD-08: `actingId` cross-card residue (component, request-response)

**Analog:** `frontend/src/pages/ChefWishesPage.jsx:219-272` (the three lifecycle handlers) + `frontend/src/components/WishCard.jsx` (button matrix)

**Current pattern (all three handlers share the shape):**
```jsx
const handleClaim = useCallback(
  async (wish) => {
    if (viewAsAdmin || actingId) return;
    setActingId(wish.id);
    try {
      await api.claimWish(wish.id);
      showToast('已认领');
    } catch (err) {
      showToast(err.message || '认领失败', 'error');
    } finally {
      await loadWishes({ page: 1, background: true });   // ← 残留风险点
      setActingId(null);
    }
  },
  [actingId, loadWishes, showToast, viewAsAdmin]
);
```
(Same shape: `handleAdvance` line 237-253, `handleReject` line 256-272.)

**Root cause of the residue:** `setActingId(null)` sits AFTER `await loadWishes(...)` in the `finally` block. If `loadWishes` rejects (network error, 401 redirect) the `finally` aborts before `setActingId(null)` → `actingId` stays stuck on the last card id → the guard `if (viewAsAdmin || actingId) return;` (lines 221/239/258) silently blocks ALL card actions across every card (hence "跨卡片残留"). Second contributing factor: `actingId` is never passed to `WishCard`, so buttons give no per-card disabled/loading feedback during the in-flight window.

**Fix pattern options (choose in plan):**
1. **Minimal** — reorder the finally: `setActingId(null)` FIRST, then `await loadWishes(...)` (use nested try/finally if the reload must not be skipped).
2. **Complete** — also pass `acting={actingId === w.id}` to `WishCard` (render site `ChefWishesPage.jsx:345-358`) and add a `disabled={acting}` / `loading={acting}` on the action `Button`s (`WishCard.jsx:84-116` — the D-07 button matrix); `Button` primitive already has a `loading` prop (used in `AdminDishesPage.jsx:940` and `ChefDishesPage.jsx:955` with `extracting` state — same boolean-in-flight pattern, `AdminDishesPage.jsx:59/388-396`).

**Analog for the boolean-in-flight state** (already lint-clean and working): `AdminDishesPage.jsx` `extracting` pattern — `setExtracting(true)` before await, `setExtracting(false)` in finally, consumed as `loading={extracting}` on a Button. Copy that shape for per-card UX.

**Gotchas:**
- `catch (err)` binds are unused here (the `err` in these handlers is only for `err.message` — used, fine). But TD-10 will flag `catch (err)` with unused err elsewhere — do not mechanically rewrite these.
- `loadWishes` in finally is deliberate (refresh list after mutation) — keep it, just reorder.
- Same pattern exists only in ChefWishesPage (AdminWishesPage reuses it via `viewAsAdmin` prop); UserWishesPage has no actingId — single-file fix.

---

### TD-09: Backend test-suite drift (test, CRUD) — 108 fail / 235 pass

**Analog:** `backend/tests/conftest.py:124-148` (client fixture) + routers' `""` path convention

**Executed baseline** (2026-07-31): `108 failed, 235 passed, 4 skipped, 8 errors`. Five distinct root-cause patterns:

**Pattern 1 — Trailing-slash drift (405 / JSONDecodeError) — the largest cluster.**
Tests call `/api/ingredients/`, `/api/orders/`, `/api/dishes/` (trailing slash) but every router registers `""` paths (grep: 16 `@router.get("")`/`@router.post("")` across ingredients:22/77, preferences:16/26, dishes:28/130, chefs:18, users:46, categories:14/32, favorites:19/64, wishes:47/63, orders:91/121). The SPA catch-all `@app.get("/{full_path:path}")` (`main.py:306-315`) matches any GET path → GET-with-slash returns 200 HTML (index.html) → `response.json()` throws `json.decoder.JSONDecodeError`; POST-with-slash gets 405 (verified live: `POST /api/ingredients/` → 405, `POST /api/ingredients` → 401). `ASGITransport` (conftest.py:142-145) never follows redirects, so Starlette's `redirect_slashes` cannot rescue.

Affected tests (trailing-slash callers): `test_ingredients.py` (all), `test_orders.py` (fixture `sample_dish` at :21), `test_users.py` (all), `test_routes_extra.py`, `test_routes_final.py`, `test_favorites.py`, `test_preferences.py`, `test_categories.py`, `test_tools.py:40/62/89`.

**Fix direction:** change the TESTS to the no-slash canonical form (`/api/ingredients`), matching the router convention — do NOT add `/` routes back (the `""` convention was a deliberate refactor, commit `13864e6`). Grep for `"/api/.../"` string literals in `backend/tests/` to enumerate.

**Pattern 2 — Model field drift (`pinyin` removed) — TypeError / AttributeError.**
`Ingredient` model (`backend/app/models/ingredient.py:7-19`) and `Dish` have no `pinyin` column (removed in `13864e6`), but tests still construct with `pinyin=`:
- `tests/test_misc_extra.py:102, 137-138`
- `tests/test_services_extra.py:41, 60, 95, 432`
- `tests/test_services.py:78` (`type object 'Ingredient' has no attribute 'pinyin'`)

**Fix direction:** delete the `pinyin=` kwargs from fixtures. `backend/app/utils/pinyin.py` still exists (`get_pinyin_initial`/`get_pinyin_full`, used by `test_utils.py:55-83` which PASSES) — only the model column is gone; if tests assert `dish.pinyin is not None` (test_services_extra.py:95), the assertion itself is dead and must be removed.

**Pattern 3 — Optional dependency ImportError (`test_tools.py`, 3 fails).**
`tools.py:26-33` `_get_extractor()` picks `smart_ingredient_extractor` when `smart.enabled` + `smart.ingredient_extraction` are true (config.yaml:43-45 both true), and `smart_ingredient_extractor.py:93` raises ImportError when `llama-cpp-python` is absent (plain `uv sync` drops it — `run.sh:50` uses plain sync; only `run-dev.sh:43` uses `uv sync --extra smart`).

**Fix options:** (a) run tests with `uv sync --extra smart`, (b) skip smart-dependent tests via fixture when the import fails, (c) make `_get_extractor` fall back (it already catches ImportError on the import line — the raise comes from model LOAD inside `.extract_ingredients`, so the fallback never triggers; extend the guard to the load path).

**Pattern 4 — Response-shape drift — KeyError 'id'.**
Tests index `data["id"]` but the endpoint returns a different envelope: `test_favorites.py::test_favorites_filter_dishes`, `test_routes_extra.py::test_dish_update_and_delete` (+`_update_status`), `test_routes_final.py` (5 tests: dish update w/ relations, status missing field, order get-others, order cancel, category delete/update, favorite list). Fix by aligning assertions with the actual response (compare with `backend/app/schemas/*.py` response models).

**Pattern 5 — Behavior drift — AssertionError / wrong status (small cluster).**
- `test_feishu.py` 4 fails: 422 (validation) vs expected 400/403/200/500 — request schema now rejects missing params earlier.
- `test_routes_extra.py`: `test_dish_list_with_search` (search semantics), `test_order_create_and_list` / `_get_detail` / `_update_status_by_chef` / `_forbidden` / `_cancel` (cascade from the 405 sample_dish fixture — fix Pattern 1 first, many collapse), `test_user_get_not_found` (401 vs 404 — auth runs before existence check).
- `test_services_extra.py` `test_dish_list_with_filters` (assert 0 >= 2 — seed-data dependency), `test_dish_sort_by_safety`, `test_order_*` (ValueError message drift — Chinese messages changed, e.g. "以下菜品…").

**Conftest patterns to preserve (do not rewrite):** `client` fixture with `app.dependency_overrides[get_db]` (conftest.py:124-148), `clean_db` autouse fixture + `auth_limiter._requests.clear()` (conftest.py:107-113), session-scoped `setup_database` (conftest.py:39-59), token fixtures (admin/user/chef/chef2/user2, lines 151-279).

**Gotchas:**
- Re-run `uv run pytest -q` after each fix cluster — 405-fix alone should collapse ~40-50 fails (fixture cascades in test_orders/test_routes_*).
- The 4 skipped tests and 21 warnings (PydanticDeprecatedSince20 class-based config in schemas; on_event deprecation) are not in TD-09 scope — do not fix unless trivial.
- Tests that legitimately test old behavior should be UPDATED, not the app regressed — the app is the source of truth (shipped through 15 phases).

---

### TD-10: Frontend lint baseline (test/config + components) — 101 errors / 22 warnings

**Analog (lint-clean reference page):** `frontend/src/pages/ChefWishesPage.jsx` — passes all current rules.

**Executed baseline** (2026-07-31): `123 problems (101 errors, 22 warnings)`, only `0 errors and 1 warning potentially fixable with --fix`. Distribution:

| Rule | Count | Pattern |
|------|-------|---------|
| `no-unused-vars` | 59 err | `catch (err)` with unused err; unused imports/state (`navigate`, `user`, `Input`, `EmptyState`, `useMemo`, `statusOptions`, `handleDelete`, `pageNum`, `addingTo`/`setAddingTo`, `getTypeMeta`, `loadOrders`/`loadDish`/... as assigned-but-unused) |
| `react-hooks/immutability` | 24 err | "Cannot access variable before it is declared" — `useEffect` calls `loadX()` declared LATER as `const loadX = async () => {...}` |
| `react-hooks/exhaustive-deps` | 22 warn | useEffect missing deps (`loadOrders`, `loadDish`, `loadStats`, `loadFavorites`, `loadPreferences`, `loadCart`, `loadMoreDishes`) |
| `react-refresh/only-export-components` | 7 err | `frontend/tests/fixtures/{list-item,phase12-bugfix,snackbar}.jsx` |
| `no-undef` | 4 err | `process` not defined: `frontend/vite.config.js:8`, `frontend/tests/phase15-navigation.spec.js:23-25` |

**The lint-clean pattern to copy** — `ChefWishesPage.jsx` (the model to replicate in the 9 failing pages):
1. **Declare the loader with `useCallback` BEFORE the effect that calls it** (lines 115-135 before 139-157) — kills both `react-hooks/immutability` and `exhaustive-deps`:
   ```jsx
   const loadWishes = useCallback(
     async ({ page: p, background = false, tab = activeTab } = {}) => { ... },
     [activeTab, loadRelatedDishNames, showToast]      // deps complete → no exhaustive-deps warning
   );
   ```
2. **Or inline the fetch inside the effect** with `queueMicrotask` for synchronous setState (lines 139-157 — comment: "内联 fetch 以规避 set-state-in-effect"; the repo's other pages already use this for sequential-race protection, cf. `requestSeqRef`).
3. **`catch { ... }` without the `err` binding** when the error isn't read (line 127) — kills `no-unused-vars`.
4. **Refs for cross-callback state** (`requestSeqRef`, `pageRef`, `loadMoreInFlightRef`, lines 62-65) instead of stale closures.

**Per-file fixes:**
- `react-hooks/immutability` (24 err, 9 pages): UserOrdersPage:32, ChefOrdersPage:29, DishDetailPage:38, OrderDetailPage:28, OrderPage:73/77/81, PreferencesPage:25, UserFavoritesPage:21, UserProfilePage:32, + UserOrdersPage:32/35. Move the `useEffect` below the loader declaration (pattern 1) — for the 5 legacy pages (UserOrders/ChefOrders/OrderDetail/UserProfile/Preferences/UserFavorites) the loaders are plain `const` fns; converting to `useCallback` + complete deps + effects-after-declaration is the canonical fix.
- `no-unused-vars` (59 err): drop `catch (err)` → `catch {` where `err` unused (majority); delete unused imports/state. Note `OrderPage.jsx:98` `loadDishes(pageNum)` — `pageNum` param unused → drop param.
- `no-undef` (4 err): `eslint.config.js:17` sets only `globals.browser`. Add `globals.node` for node-context files:
  ```js
  { files: ['vite.config.js', 'tests/**/*.spec.js'], languageOptions: { globals: globals.node } }
  ```
  Or add a `process.env` alternative in vite.config.js (which TD-02 may remove anyway — do TD-02 and TD-10 together to avoid touching vite.config.js twice).
- `react-refresh/only-export-components` (7 err): the 3 fixture files are test fixtures — move to a test-only eslint override block (`files: ['tests/**']`, disable `react-refresh/only-export-components`) or add eslint-disable comments.

**Gotchas:**
- ESLint 10 removed the compact formatter — verification command is plain `npx eslint .`; `npm run lint` script (`package.json:14`) already calls `eslint .`.
- `react-hooks/immutability` is new in `eslint-plugin-react-hooks` v7 (package.json:34 `^7.1.1`) — the pages predate the rule; the rule's error message ("Cannot access variable before it is declared... prevents the earlier access from updating") is the signal that the effect reads a binding that changes identity each render — `useCallback` hoisting is the sanctioned fix, NOT moving effects below plain function declarations (those still change identity per render and would keep exhaustive-deps warnings).
- Order of operations: fix TD-02's vite.config.js `process` usage first (removes 1 no-undef), then run `npx eslint .` again — the baseline may drop a few.
- `npm run lint` does not include CSS (`lint:css` is separate) — out of scope.

---

## Shared Patterns

### Backend route path convention: `""` (no trailing slash)
**Source:** all routers (`backend/app/routers/*.py`, 16 route decorators) — `@router.get("")`, `@router.post("")` + prefix in `main.py:284-298`
**Apply to:** TD-09 test fixes — tests must call canonical no-slash paths.
**Why:** SPA catch-all `main.py:306-315` shadows any `/api/.../` GET (returns HTML → JSONDecodeError in tests), and non-GET trailing-slash requests 405. `ASGITransport` doesn't follow redirects, so `redirect_slashes` can't save tests.

### Startup blocking-work-in-async pattern
**Source:** `backend/app/main.py:208-209` — `loop.run_in_executor(None, _download)`; also `asyncio.to_thread` equivalent
**Apply to:** TD-06 (alembic upgrade in async startup).
**Guard:** must not run during pytest (conftest builds its own schema; `ASGITransport` fires startup on every client fixture) — env-gate (`AUTO_MIGRATE` / `PYTEST_CURRENT_TEST`).

### Frontend in-flight action state pattern
**Source:** `frontend/src/pages/AdminDishesPage.jsx:59, 388-396, 940` — `extracting` boolean + `loading={extracting}` on Button
**Apply to:** TD-08 (per-card acting feedback in WishCard buttons).

### Lint-clean loader-in-effect pattern
**Source:** `frontend/src/pages/ChefWishesPage.jsx:115-157` (useCallback-before-effect + queueMicrotask inline fetch + `catch {`)
**Apply to:** TD-10 (all 9 failing pages).

### Config single-source-of-truth pattern
**Source:** `backend/app/config.py:29-58` `Settings` reads `config.yaml` via `app.get(key, default)`; `main.py` consumes `settings.*`
**Apply to:** TD-02 (version), TD-04 (`app.url` — add to config.yaml, code already done).

## No Analog Found

| Item | Reason |
|------|--------|
| (none) | All 10 items map to existing files; TD-01 maps to its own verification artifact, TD-09/TD-10 map to the failing suites themselves plus their clean reference pages |

## Metadata

**Analog search scope:** `backend/app/` (routers, models, services, config, main, database, alembic), `backend/tests/` (conftest + 29 test modules), `frontend/src/` (App, pages, components, api, contexts), `frontend/eslint.config.js`, `scripts/`, `docker/`, `.planning/` (STATE.md, ROADMAP.md, REQUIREMENTS.md, archived Phase 14 verification)
**Files scanned:** ~55 (incl. live pytest run over 29 test files and eslint over the frontend)
**Pattern extraction date:** 2026-07-31
**Baselines captured:** `pytest`: 108 failed / 235 passed / 4 skipped / 8 errors; `eslint .`: 123 problems (101 errors / 22 warnings)
