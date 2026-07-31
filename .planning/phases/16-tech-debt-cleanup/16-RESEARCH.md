# Phase 16: Tech Debt Cleanup — Research

**Researched:** 2026-07-31
**Domain:** Multi-domain tech debt remediation (config, migration, frontend bugfix, test suite, lint baseline)
**Confidence:** HIGH (all 10 items investigated; TD-05/TD-09/TD-10 root causes reproduced and fixes verified by execution)

## Summary

Phase 16 closes 10 accumulated tech-debt items spanning config hygiene (TD-02/03/04), migration infrastructure (TD-05/06), frontend bugs (TD-07/08), a verification sign-off (TD-01), and two large baseline-cleanup efforts (TD-09: 108 backend test failures; TD-10: 101 frontend lint errors).

**Critical discovery — TD-05 is mis-diagnosed in REQUIREMENTS.md:** the documented fix (`render_as_batch=True` in `alembic/env.py`) was empirically tested and does **NOT** fix the fresh-DB `alembic upgrade head` failure. The real blocker is migration `8a258d50ee87` calling raw `op.create_unique_constraint(...)` on SQLite. Converting that call to `op.batch_alter_table(...)` was verified to make a from-base upgrade succeed. Both changes are needed (migration fix = the actual repair; `render_as_batch=True` = correct future autogenerate behavior).

**Critical discovery — TD-09's dominant root cause:** the backend test suite was runnable only after `uv sync --extra dev` (pytest was **not installed** in the venv — the root cause of the "reference drift" report). With pytest installed, 108 tests fail. ~80% of those failures trace to **one defect**: tests call `/api/dishes/` (trailing slash) while routers register `@router.post("")` paths (`/api/dishes`, no slash), and the SPA catch-all `GET /{full_path:path}` route in `main.py` shadows Starlette's `redirect_slashes` — every trailing-slash API call returns 405, cascading into JSONDecodeError/KeyError in assertions. A single middleware in `main.py` (strip trailing slash for `/api/*`) fixes the entire class; verified by direct probe.

**Primary recommendation:** Fix each item with the smallest safe diff: TD-01 is a documentation sign-off; TD-02/03/04 are config plumbing; TD-05 needs a migration edit + env.py flag; TD-06 adds a programmatic alembic upgrade in the startup hook; TD-07 is a one-line `encodeURIComponent`; TD-08 moves modal-state clearing into `finally` blocks; TD-09 splits into root-cause categories (slash normalization, dep install, smart-extractor fallback, test/schema drift); TD-10 is a mechanical lint baseline with 5 rule categories.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TD-01 | `::before` 字面 override 确认关闭 | Override pre-drafted in archived `14-VERIFICATION.md` frontmatter (lines 19-28); `accepted_by`/`accepted_at` empty, awaiting operator signature. Pure sign-off task — no code. |
| TD-02 | 版本号读 config.yaml 而非 package.json | `config.py:35` already exposes `APP_VERSION` (yaml `app.version` = "0.1.0"). `vite.config.js:8` defines version from `process.env.npm_package_version` (package.json `0.0.0` — wrong). `Sidebar.jsx:22` is the only consumer. Plan: `GET /api/version` in `main.py` + `getVersion()` on ApiClient + Sidebar fetch; delete the Vite `define` (also removes one TD-10 no-undef error). |
| TD-03 | CORS `allow_origins` 已收窄验证 | Verified by grep: only `main.py:220` (uses `settings.CORS_ORIGINS`) and `config.py:58` (fallback `["*"]` only when `cors:` section absent). `config.yaml:36-39` has explicit origins `["http://localhost:5173", "http://localhost:3000"]`. No `["*"]` leak in current config. Optional hardening: safe fallback default. |
| TD-04 | config.yaml 添加 `app.url` | `config.py:38` already reads `app.get("url", "https://family-chef.app")` — code is done. Add `url: "https://family-chef.app"` under `app:` in **both** `config.yaml` and `config.example.yaml` (example lacks it — verified). Zero-code task. |
| TD-05 | env.py `render_as_batch=True` 修复 SQLite batch | **Mis-diagnosis found.** Reproduced fresh-DB failure: `NotImplementedError: No support for ALTER of constraints in SQLite dialect` from `8a258d50ee87` (raw `op.create_unique_constraint`). Empirically verified: env.py flag alone does NOT fix; converting migration to `op.batch_alter_table` makes `upgrade head` from base succeed. Do both. |
| TD-06 | 启动时自动 `alembic upgrade head` | `main.py:227-235` startup hook has a NOTE documenting manual migration. Add programmatic upgrade (`alembic.command.upgrade` with `Config` resolved via `Path(__file__).parent.parent / "alembic.ini"`) before `init_db()`, wrapped in `asyncio.to_thread` (sync/blocking API in async startup). Idempotent for existing DBs. Blocked on TD-05 for fresh DBs. |
| TD-07 | `WishDeepLinkRedirect` 补 `encodeURIComponent(id)` | `App.jsx:98`: `base + '?wish=' + id` — unencoded. Consumers (`ChefWishesPage`/`UserWishesPage` `searchParams.get('wish')`) auto-decode, so encoding is transparent. One-line fix. |
| TD-08 | `actingId` 跨卡片点击残留 | `ChefWishesPage.jsx:58` single global `actingId` guards all 3 handlers. When an in-flight action blocks a second card's click, the guard `return`s **before** `setAdvanceTarget(null)`/`setRejectTarget(null)` — the modal target stays set, and once `actingId` clears the stale modal fires an unintended action (the "leftover"). Fix: clear modal targets in `finally`; optionally per-card pending state. |
| TD-09 | 后端测试 107 fail → 0 fail | Reproduced: **108 failed, 235 passed, 8 errors** (pytest 9.0.3 after `uv sync --extra dev`). Root causes: (1) ~80 failures = trailing-slash 405 shadowed by SPA catch-all; (2) `llama_cpp` missing (test_tools ImportError); (3) model-kwarg drift (`pinyin=` not a column); (4) auth-header missing in test; (5) feishu param drift (422); (6) business-rule ValueError drift. |
| TD-10 | 前端 lint 101 errors → 0, 22 warnings → 0 | Reproduced: exactly 101 errors + 22 warnings. Rules: `no-unused-vars` 59, `react-hooks/immutability` 24 (new in eslint-plugin-react-hooks v7 flat config — rule drift), `react-hooks/exhaustive-deps` 21 (warnings), `react-refresh/only-export-components` 7 (warnings), `react-hooks/set-state-in-effect` 5, `no-undef` 4 (`process` in vite.config.js + Playwright spec), `no-empty` 2, unused disable directive 1. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Version endpoint (TD-02) | API / Backend | Browser / Client | Version truth lives in `config.yaml` read by backend `Settings`; frontend consumes via fetch |
| CORS verification (TD-03) | API / Backend | — | CORS is middleware config at the API tier only; no other tier touches origins |
| App URL config (TD-04) | API / Backend (config) | — | `config.py` is the sole reader; YAML is the config source |
| Alembic migration repair + startup upgrade (TD-05/06) | Database / Storage | API / Backend | Migrations own schema; startup hook in `main.py` orchestrates upgrade-before-serve |
| Deep-link encoding (TD-07) | Browser / Client | — | Pure client-side URL construction in React Router |
| Wish-card action state (TD-08) | Browser / Client | — | Pure React state management, no API changes |
| Test suite baseline (TD-09) | API / Backend | Database / Storage | Mostly router path normalization + service model alignment; test client is httpx+ASGI |
| Lint baseline (TD-10) | Browser / Client | — | Frontend ESLint flat config + source hygiene |

## Standard Stack

No new external packages are required for any of the 10 items. All fixes use the existing, verified stack:

| Component | Version (verified in venv/node_modules) | Purpose | Notes |
|-----------|---------|---------|-------|
| FastAPI | 0.136.1 | Version endpoint, startup hook | `uv pip list` verified |
| Starlette | 1.0.0 | CORSMiddleware, routing, redirect_slashes | **v1.0 major release** — see Pitfalls |
| SQLAlchemy | 2.0.49 | ORM (batch mode semantics) | — |
| Alembic | 1.18.4 | `command.upgrade` programmatic API, batch mode | — |
| pytest | 9.0.3 | TD-09 runner | Installed via `uv sync --extra dev` (was missing!) |
| pytest-asyncio | 1.3.0 | Async tests | `asyncio_mode = "auto"` in pyproject already |
| ESLint | 10.3.0 | TD-10 runner | `npx eslint .` — 101 errors + 22 warnings reproduced |
| eslint-plugin-react-hooks | 7.1.1 | New compiler-oriented rules | `immutability`/`set-state-in-effect` are the drift source |

**Installation (TD-09 prerequisite):**
```bash
cd backend && uv sync --extra dev
```
This installs pytest, pytest-asyncio, pytest-cov, coverage — all already declared in `pyproject.toml` `[project.optional-dependencies] dev`. **No version changes.**

**Do NOT install:** `llama-cpp-python` is NOT required for TD-09 — the correct fix is a graceful fallback in `smart_ingredient_extractor.py` (see TD-09 section). Installing the `smart` extra (heavy native build) to satisfy 3 tests is the wrong trade.

## Package Legitimacy Audit

**No new packages are introduced by this phase.** All tools above are already declared in `backend/pyproject.toml` or `frontend/package.json` (lockfiles present: `uv.lock`, `package-lock.json`). The only install action is `uv sync --extra dev`, which materializes already-pinned lockfile entries (pytest 9.0.3, pytest-asyncio 1.3.0, pytest-cov 7.1.0, coverage 7.13.5 — all resolved from `uv.lock` in-session). No registry verification needed; slopcheck not applicable.

## Architecture Patterns

### TD-06: Startup migration hook

```
uvicorn start
    └─ @app.on_event("startup")
         ├─ run alembic upgrade head (asyncio.to_thread, sync API)
         │    └─ alembic.command.upgrade(Config(alembic.ini resolved via __file__), "head")
         │       └─ idempotent: no-op when DB already at head
         ├─ await init_db()          (create_all — existing behavior, runs after migrations)
         ├─ seed initial data        (existing behavior)
         └─ serve requests
```

Key decisions:
- **Resolve alembic.ini via `Path(__file__).resolve().parent.parent / "alembic.ini"`** — `main.py` lives at `backend/app/main.py`, so this is `backend/alembic.ini` regardless of CWD. Both `scripts/run.sh` and Docker `cd /app/backend` before uvicorn, so CWD-relative `alembic.ini` would also work — but `__file__`-relative is robust to both.
- **`alembic.ini` uses `script_location = %(here)s/alembic`** — `%(here)s` resolves to the ini's directory, so script location works from any CWD. `prepend_sys_path = .` assumes CWD=backend (true for both run paths). [VERIFIED: alembic.ini + Dockerfile inspection]
- **Run BEFORE `init_db()`** — `create_all` only creates missing tables, but migrations may add columns to tables created earlier; upgrade-first guarantees schema is at head before any seed/query runs.
- **Do NOT use subprocess `alembic upgrade head`** — programmatic `command.upgrade` avoids PATH/venv issues in Docker.

### TD-09: Trailing-slash normalization middleware (primary fix)

**What:** One middleware in `main.py` that rewrites `/api/*` request paths with a trailing slash to the canonical no-slash form before routing.
**When to use:** Fixes ~80 test failures without touching ~140 URLs across 20+ test files, and without breaking the frontend (which already calls no-slash).
**Why this form:** The SPA catch-all `@app.get("/{full_path:path}")` (main.py:306) partially matches *every* path, so Starlette's `redirect_slashes` never fires — it returns 405 instead of redirecting. A middleware that normalizes the path (not a 307 redirect — httpx test client doesn't follow redirects by default) restores both URL forms.

```python
# Source: verified by direct probe in-session (405 on /api/categories/, 401 on /api/categories)
@app.middleware("http")
async def normalize_api_trailing_slash(request, call_next):
    path = request.url.path
    if path.startswith("/api/") and path != "/api/" and path.endswith("/"):
        request.scope["path"] = path.rstrip("/")
        request.scope["raw_path"] = request.scope["raw_path"].rstrip(b"/")
    return await call_next(request)
```

**Alternative (if maintainers prefer "fix the tests" per the requirement wording "测试套件引用漂移修复"):** bulk-rewrite test URLs from `/api/x/` → `/api/x` via `sed -i 's#"/api/\([a-z-]*\)/"#"/api/\1"#g' tests/*.py` — mechanical but touches 20+ files and ~140 call sites. Either fix works; the middleware is the smaller, regression-proof diff. **Recommend middleware; do not change routers to `"/"` paths** (that would break the frontend client.js which calls no-slash).

### TD-09: Smart extractor graceful fallback

`backend/app/services/smart_ingredient_extractor.py:75,93` raises `ImportError` when `llama_cpp` is missing. The tools router turns that into HTTP 500. Fix: fall back to the basic pypinyin extractor (`ingredient_extractor.py`) instead of raising — matches the app's own "smart features are optional" philosophy (`config.yaml smart.enabled`). Tests then pass in any environment without the heavy native dep.

### TD-08: Modal-target cleanup in `finally` (ChefWishesPage)

**What:** All three lifecycle handlers (`handleClaim`/`handleAdvance`/`handleReject`, lines 219-272) guard on global `actingId` and clear it in `finally`. But `handleAdvance`/`handleReject` clear their modal targets (`setAdvanceTarget(null)`/`setRejectTarget(null)`) only *inside* `try`, after the API call. When the guard blocks a second card's action, the modal target survives → stale modal fires later.
**When to use:** Any async handler pair (global lock + modal target) in one page.
**Fix:**
1. Move `setAdvanceTarget(null)` / `setRejectTarget(null)` into the `finally` blocks (clear regardless of guard/error).
2. Optional hardening: replace global `actingId` with `pendingIds: Set` so different cards are independent, and pass `pending={pendingIds.has(w.id)}` to `WishCard` for per-card disabled/loading UI. Minimal fix = item 1 only.

### Anti-Patterns to Avoid
- **Editing routers to add trailing slashes (TD-09):** breaks the running frontend (`client.js` calls no-slash); the SPA catch-all then 405s every frontend request.
- **Installing `llama-cpp-python` just to make tests pass (TD-09):** multi-hundred-MB native build for 3 tests; the app itself treats smart features as optional — mirror that in the code path.
- **Running `alembic upgrade head` via subprocess in startup (TD-06):** PATH/venv fragility in Docker; use the Python API.
- **Wholesale `eslint --fix` for react-hooks/immutability (TD-10):** the 24 immutability errors are a *new rule class* (React Compiler semantics); blindly rewriting state updates risks behavior changes. Review each, fix or add targeted disable with justification.
- **Rewriting migration `8a258d50ee87` beyond the constraint call (TD-05):** only the `create_unique_constraint`/`drop_constraint` lines need batch wrapping; touching more increases regression surface for already-applied DBs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration execution in startup (TD-06) | subprocess shell call to `alembic` CLI | `alembic.command.upgrade(Config(...), "head")` | Python API is CWD/venv-independent; CLI depends on PATH and correct working directory |
| Path normalization for /api (TD-09) | Rewriting 140 test URLs OR changing router paths | One ASGI middleware stripping trailing slash | Single-point fix; frontend contract untouched; verified against live app behavior |
| SQLite constraint ALTER (TD-05) | Raw `op.create_unique_constraint` | `op.batch_alter_table` (copy-and-move) | SQLite has no native ALTER CONSTRAINT; alembic raises NotImplementedError without batch mode [VERIFIED: reproduced] |
| Password hashing / JWT | (not in scope — security.py already uses direct bcrypt) | existing `app/utils/security.py` | No change needed; note bcrypt 5.0.0 + passlib 1.7.4 incompatibility exists but is irrelevant here — app imports bcrypt directly, not passlib [VERIFIED: passlib probe failed, app code bypasses it] |

**Key insight:** This phase's biggest traps are *diagnostic* (TD-05 mis-diagnosis, TD-09 environment cause vs. code cause). Every "big" fix decomposes into a root cause + small diff once the actual failure is reproduced — which is why the research verified each by execution rather than by reading.

## Common Pitfalls

### Pitfall 1: SPA catch-all route shadowing API routing (TD-09 root cause)
**What goes wrong:** Any API request whose path doesn't exactly match a registered route returns **405** instead of Starlette's usual 307/404 — and requests with trailing slashes (tests) all fail.
**Why it happens:** `@app.get("/{full_path:path}")` (main.py:306) partially matches every path; Starlette stops at the first partial match and returns 405, never reaching the `redirect_slashes` logic.
**How to avoid:** Normalize `/api/*` paths in a middleware; keep router paths (`@router.post("")`) and frontend URLs (no slash) unchanged.
**Warning signs:** Test failures showing `405 Method Not Allowed` on valid-looking POSTs; `GET /api/health` works but `GET /api/categories/` returns 405.

### Pitfall 2: env.py flag ≠ migration fix (TD-05)
**What goes wrong:** `render_as_batch=True` alone does not make `alembic upgrade head` from a fresh DB succeed — the raw `op.create_unique_constraint` in `8a258d50ee87` still raises `NotImplementedError`. [VERIFIED: both states tested in-session]
**Why it happens:** `render_as_batch` only affects *autogenerate rendering* of future revisions; existing migration scripts execute as written. Batch mode at runtime requires explicit `op.batch_alter_table`.
**How to avoid:** Fix the migration script itself; add `render_as_batch=True` only as future-proofing.
**Warning signs:** Fresh DB (or CI that recreates the DB) fails at `8a258d50ee87` with "No support for ALTER of constraints in SQLite dialect".

### Pitfall 3: Missing dev extras masquerading as test failures (TD-09 environment)
**What goes wrong:** `uv sync` does not install `[project.optional-dependencies] dev` by default. A reporter running tests without `uv sync --extra dev` sees mass failures (`ModuleNotFoundError: pytest` or stale env), recorded as "107 failures".
**Why it happens:** uv 0.6 only installs the project's own dependencies unless extras are requested.
**How to avoid:** Document `uv sync --extra dev` as the test-env bootstrap; add it as step 0 of the TD-09 plan.
**Warning signs:** `pytest` not found despite lockfile containing it; venv bin listing lacks pytest/pytest-asyncio.

### Pitfall 4: New React Hooks lint rules flagging legacy code (TD-10)
**What goes wrong:** 29 of 101 errors come from `react-hooks/immutability` (24) + `react-hooks/set-state-in-effect` (5) — rules that did not exist in the plugin versions the code was written against.
**Why it happens:** eslint-plugin-react-hooks 7.x `flat.recommended` now bundles React-Compiler-era rules.
**How to avoid:** Fix `set-state-in-effect` (5 — the codebase already has `queueMicrotask`/`setTimeout` workarounds for this exact rule, e.g. ChefWishesPage:141); review each `immutability` error individually — many are legitimate (state mutation), some are false positives on refs.
**Warning signs:** Lint count jumps after a plugin minor upgrade without source changes.

### Pitfall 5: Startup migration hook ordering (TD-06)
**What goes wrong:** Running `create_all`/seeding before migrations leaves the DB at `head - 1` and later queries fail on missing columns; running migrations synchronously in an async startup blocks the event loop during the (possibly long) copy-and-move batch operations.
**How to avoid:** upgrade → `init_db()` → seeds; wrap the sync alembic call in `asyncio.to_thread`.
**Warning signs:** Startup hangs on fresh DBs (model download + migration contention); schema drift between `create_all` tables and migration state.

## Code Examples

Verified patterns from official sources and in-session reproduction:

### TD-06: Programmatic Alembic upgrade in startup
```python
# backend/app/main.py — inside startup() BEFORE await init_db()
from pathlib import Path
from alembic import command
from alembic.config import Config

def _run_migrations() -> None:
    ini_path = Path(__file__).resolve().parent.parent / "alembic.ini"
    cfg = Config(str(ini_path))
    command.upgrade(cfg, "head")

# in startup():
await asyncio.to_thread(_run_migrations)
```
[VERIFIED: `command.upgrade(Config("alembic.ini"), "head")` executed successfully in-session against a scratch SQLite DB; `script_location = %(here)s/alembic` confirmed in alembic.ini:8]

### TD-05: Batch-mode constraint fix (verified working)
```python
# backend/alembic/versions/8a258d50ee87_phase_6_add_system_logs_indexes.py
# BEFORE (fails on SQLite):
# op.create_unique_constraint('uq_user_ingredient_pref', 'taste_preferences', ['user_id', 'ingredient_id', 'preference_type'])
# AFTER (verified: `upgrade head` from base succeeds):
with op.batch_alter_table('taste_preferences', schema=None) as batch_op:
    batch_op.create_unique_constraint('uq_user_ingredient_pref', ['user_id', 'ingredient_id', 'preference_type'])
# downgrade() mirrored with batch_op.drop_constraint('uq_user_ingredient_pref', type_='unique')
```
[VERIFIED: in-session from-base upgrade to head succeeded with this change; failed without it. Also add `render_as_batch=True` to both `context.configure()` calls in `env.py` (offline at line 27-32, online at line 39) per the original requirement intent.]

### TD-07: Deep-link encoding (one line)
```jsx
// frontend/src/App.jsx:98 — BEFORE
return <Navigate to={base + '?wish=' + id} replace />;
// AFTER
return <Navigate to={base + '?wish=' + encodeURIComponent(id)} replace />;
```
[VERIFIED: line 98 read from source; consumers use `searchParams.get('wish')` which auto-decodes]

### TD-02: Version endpoint + frontend consumption
```python
# backend/app/main.py — next to /api/health (main.py:260)
@app.get("/api/version")
async def version_check():
    """应用版本"""
    return {"version": settings.APP_VERSION, "name": settings.APP_NAME}
```
```js
// frontend/src/api/client.js — add to ApiClient class
async getVersion() {
  return this.get('/version');
}
```
```jsx
// frontend/src/components/composites/Sidebar.jsx — replace line 22
const [appVersion, setAppVersion] = useState('0.0.0');
useEffect(() => { api.getVersion().then(d => setAppVersion(d.version)).catch(() => {}); }, []);
```
Remove the `define` block from `vite.config.js:7-9` (also clears the `no-undef` `process` error — TD-10 overlap). `package.json` version can remain `0.0.0` (becomes unused).

### TD-09: Root-cause verification commands (for the plan's wave 0)
```bash
cd backend && uv sync --extra dev
.venv/bin/pytest tests/ -q --no-header 2>&1 | tail -3        # expect: 108 failed, 235 passed, 8 errors
.venv/bin/pytest tests/test_categories.py::test_create_category -q  # expect: assert 405 in [201, 501]
cd frontend && npx eslint . 2>&1 | tail -3                   # expect: 101 errors, 22 warnings
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@app.on_event("startup")` | `lifespan` context manager | FastAPI 0.93+ (2023), still not deprecated-enforced | Codebase already uses `on_event` (main.py:227); keep consistent — do not mix both in one app |
| Starlette <1.0 | Starlette 1.0.0 (installed) | 2025 major release | Routing/middleware behavior verified stable for this codebase in-session (probes passed); watch for 307/redirect changes in future upgrades |
| `render_as_batch` as migration-repair tool | Batch mode must be explicit in migration scripts | Always true for Alembic | `render_as_batch=True` is autogenerate-only; the TD-05 fix is in the migration file |
| eslint-plugin-react-hooks <7 (classic rules) | v7 flat.recommended with compiler rules | plugin 7.0 (2025) | 29 new lint errors appeared without code changes; handle by rule category, not blanket fixes |
| pytest-asyncio 0.2x | 1.3.0 (installed) | 1.0 (2024) | `asyncio_mode = "auto"` config already present in pyproject.toml:46 — suite runs correctly with 1.x [VERIFIED: 235 passed] |

**Deprecated/outdated:**
- `python-jose` `datetime.utcnow()` in `security.py:31`: `utcnow()` is deprecated in Python 3.12 — not in the 10 TD items; leave for a future cleanup (flagged, not scoped).
- Pydantic class-based `config` (21 deprecation warnings in test output): `PydanticDeprecatedSince20` — migration to `ConfigDict` is out of scope for Phase 16 (warnings only, not failures).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The intended fix for TD-09 is a middleware in main.py (not test-URL rewrites) | TD-09 | If maintainers prefer "fix the tests" semantics (requirement wording says 引用漂移), the middleware still leaves the 140 odd URLs in tests — cosmetic only, all tests still pass. Both approaches verified compatible with current code. |
| A2 | TD-01 sign-off will be obtained during this phase (frontmatter fill-in) | TD-01 | If operator rejects the override, a real `::before` implementation becomes required (new CSS work + re-verification of 7 pages). Research assumes acceptance per the pre-drafted override suggestion. |
| A3 | `config.example.yaml` should receive `app.url` too (parity) | TD-04 | Low risk either way; example file is documentation-only. |
| A4 | The 108-failure count (vs. 107 in REQUIREMENTS.md) difference is a non-issue | TD-09 | Off-by-one vs. report date; suite state can shift ±1 between runs (order/flaky). No action. |
| A5 | Frontend `process` no-undef errors in `tests/phase15-navigation.spec.js` are fixed by adding `globals.node` for test files (or `/* global process */`) | TD-10 | If instead the project intends browser-only globals, spec files must import `process` from node: — small diff either way. |
| A6 | The `WishDeepLinkRedirect` id is numeric (wish ids are SQLite INTEGER PKs) | TD-07 | Even so, encoding is harmless and future-proofs string ids; no behavior change for numeric ids. |

## Open Questions

1. **TD-09 fix strategy: middleware vs. test-URL rewrite?**
   - What we know: middleware fixes all ~80 slash failures with a 10-line diff; test rewrite matches the "reference drift" wording but touches ~140 URLs across 20 files. Both verified viable.
   - What's unclear: maintainer preference for production code vs. test-code as the fix locus.
   - Recommendation: default to the middleware (smaller regression surface); the planner should present both in the discuss phase if a decision is needed. If discuss-phase is skipped, proceed with middleware.

2. **TD-01 operator decision**
   - What we know: override pre-drafted in archived 14-VERIFICATION.md frontmatter; `accepted_by`/`accepted_at` empty.
   - What's unclear: whether the operator accepts `th:first-child padding-left` as a substitute for the literal `::before` placeholder.
   - Recommendation: `checkpoint:human-verify` task at the start of the phase; if accepted, fill frontmatter and close; if rejected, add a CSS task to implement the literal `::before`.

3. **TD-10 immutability errors: fix vs. tune?**
   - What we know: 24 errors from a new rule; some legitimate (state mutation), some likely false positives on ref patterns.
   - What's unclear: maintainer appetite for refactoring working state logic vs. targeted rule disable.
   - Recommendation: fix the clearly-legitimate ones; add file-scoped disables with justification comments for disputable cases; never blanket-disable the rule.

4. **`uv sync --extra dev` in CI/Docker?**
   - What we know: dev extras are not installed by default; the venv lacked pytest entirely.
   - What's unclear: whether this was the original "107 failures" environment cause.
   - Recommendation: add `uv sync --extra dev` as wave-0 task; document in README dev section if desired.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python (venv) | TD-09 (pytest) | ✓ | 3.11.11 (venv cpython-3.11) | — |
| System python | probes | ✓ | 3.12.3 | — |
| uv | env bootstrap | ✓ | 0.6.0 | pip fallback |
| alembic | TD-05/06 | ✓ | 1.18.4 (venv) | — |
| fastapi / starlette | TD-02/03/06 | ✓ | 0.136.1 / 1.0.0 | — |
| pytest + pytest-asyncio + pytest-cov | TD-09 | ✓ (after `uv sync --extra dev`) | 9.0.3 / 1.3.0 / 7.1.0 | — |
| Node / npm | TD-10 | ✓ | v26.1.0 / 11.13.0 | — |
| eslint | TD-10 | ✓ | 10.3.0 (npx) | — |
| llama-cpp-python | test_tools (TD-09) | ✗ (not installed) | — | Fix code to fall back to basic extractor (no dependency) |
| sqlite3 | TD-05 verification | ✓ | system sqlite3 | — |

**Missing dependencies with no fallback:**
- None. The only missing piece (`llama-cpp-python`) should be *avoided*, not installed (see TD-09 strategy).

**Missing dependencies with fallback:**
- pytest family: install via `uv sync --extra dev` (declared, pinned in uv.lock) — this is a wave-0 task, not a blocker.

## Security Domain

> `security_enforcement: true` in `.planning/config.json` (ASVS level 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no* | JWT unchanged this phase (TD-02 version endpoint is unauthenticated by design — like `/api/health`) |
| V3 Session Management | no | No session changes |
| V4 Access Control | yes (touch) | TD-03 verification confirms CORS origins scoped; ensure the version endpoint and middleware don't widen access |
| V5 Input Validation | yes (touch) | TD-07 `encodeURIComponent` prevents query-param injection via deep links; TD-08 guards are client-side UX state, not security boundary |
| V6 Cryptography | no | No crypto changes (bcrypt/JWT untouched) |

### Known Threat Patterns for FastAPI + React stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CORS wildcard leak | Information disclosure | Already mitigated (config.yaml explicit origins); TD-03 hardens the config.py fallback from `["*"]` to a safe default |
| Query param injection via deep link | Tampering | TD-07 `encodeURIComponent(id)` — wish id can't inject `&`-separated params |
| SQLite batch migration mis-execution | Tampering | TD-05 batch-mode conversion; verify on scratch DB before touching prod DB |
| Startup migration race (two workers) | DoS/Consistency | Single-process uvicorn deployment (documented constraint); `upgrade` is idempotent — acceptable |

**TD-02 note:** `/api/version` must be public (no auth) so the SPA can render the version on the login screen before login — consistent with `/api/health`; it exposes only name/version, no sensitive data. Low risk.

## Sources

### Primary (VERIFIED in-session by execution)
- `backend/tests/` — full pytest run: 108 failed / 235 passed / 8 errors (pytest 9.0.3); failure taxonomy collected to `/tmp/opencode/failures.txt`
- `backend/alembic/` — fresh-DB `upgrade head` reproduction: failed with `NotImplementedError` (raw constraint ALTER), succeeded after batch conversion; `render_as_batch=True` alone proven insufficient
- `frontend/` — `npx eslint . -f json`: 101 errors / 22 warnings, rule+file breakdown
- Direct ASGI probes: `/api/categories` vs `/api/categories/` (401 vs 405) proving SPA catch-all shadowing
- `uv pip list` / lockfile inspection: versions of fastapi 0.136.1, starlette 1.0.0, sqlalchemy 2.0.49, alembic 1.18.4, bcrypt 5.0.0
- Source files read: `config.yaml`, `config.example.yaml`, `backend/app/config.py`, `backend/app/main.py`, `backend/app/database.py`, `backend/app/utils/security.py`, `backend/alembic/env.py`, `backend/alembic.ini`, `backend/pyproject.toml`, `frontend/src/api/client.js`, `frontend/vite.config.js`, `frontend/package.json`, `frontend/src/App.jsx`, `frontend/src/components/composites/Sidebar.jsx`, `frontend/src/pages/ChefWishesPage.jsx`, `frontend/src/components/WishCard.jsx`, `backend/tests/conftest.py`, `backend/alembic/versions/*.py`, `docker/Dockerfile`, `scripts/run.sh`

### Secondary (CITED)
- `.planning/REQUIREMENTS.md` (v1.4 TD table, lines 76-89) — requirement wording and expected outcomes
- `.planning/STATE.md:59` and `milestones/v1.1-MILESTONE-AUDIT.md:98` — TD-05 original diagnosis (superseded by empirical reproduction)
- `.planning/archived/v1.3/14-ui-bugfix-filter-popup/14-VERIFICATION.md` — TD-01 pending override (frontmatter lines 19-28, Gap 1 lines 66-77, human verification item 3)

### Tertiary (LOW confidence)
- None used for critical claims; all decisive claims were verified by execution in-session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via uv pip list / node_modules / execution
- Architecture: HIGH — TD-05, TD-06, TD-09, TD-10 fixes empirically validated; TD-08/TD-07 approaches read from exact source lines
- Pitfalls: HIGH for TD-05/TD-09/TD-10 (reproduced); MEDIUM for TD-08 (low-repro bug, mechanism inferred from code path + guard analysis)

**Research date:** 2026-07-31
**Valid until:** 2026-08-30 (stable project; no fast-moving dependencies involved)

---

*Notes: `nyquist_validation` is explicitly `false` in `.planning/config.json` — Validation Architecture section omitted per config. Runtime State Inventory not applicable (not a rename/refactor phase). No CONTEXT.md exists for Phase 16 (`has_context: false`) — no locked user decisions to constrain research; requirement IDs from REQUIREMENTS.md used instead.*
