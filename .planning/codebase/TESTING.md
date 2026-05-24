# Testing Patterns

**Analysis Date:** 2026-05-24

## Overview

Testing exists only in the **backend** (Python). The **frontend** has no test framework configured — no test runner, no test files, no testing dependencies in `package.json`.

---

## Backend Test Framework

**Runner:**
- pytest (>=7.0.0)
- pytest-asyncio (>=0.21.0)
- Config in `backend/pyproject.toml`:
  ```toml
  [tool.pytest.ini_options]
  testpaths = ["tests"]
  asyncio_mode = "auto"
  ```

**Assertion Library:**
- Standard `assert` statements (pytest style)

**HTTP Client for Integration Tests:**
- httpx `AsyncClient` with `ASGITransport` — tests hit FastAPI app directly without network

**Coverage:**
- pytest-cov (>=4.0.0) is listed as a dev dependency
- No coverage threshold enforced in config

**Run Commands:**
```bash
cd backend
uv run pytest tests/ -v             # Run all tests verbose
uv run pytest tests/test_auth.py -v # Run single test file
uv run pytest tests/ --cov=app      # Run with coverage
```

---

## Test Directory Structure

```
backend/tests/
├── __init__.py
├── conftest.py              # Shared fixtures (DB, client, auth tokens)
├── test_auth.py             # Authentication endpoint tests
├── test_dishes.py           # Dish endpoint tests
├── test_orders.py           # Order endpoint tests
├── test_users.py            # User management tests
├── test_ingredients.py      # Ingredient endpoint tests
├── test_categories.py       # Category endpoint tests
├── test_favorites.py        # Favorites endpoint tests
├── test_preferences.py      # Taste preference tests
├── test_chefs.py            # Chef management tests
├── test_admin.py            # Admin endpoint tests
├── test_feishu.py           # Feishu integration tests
├── test_upload.py           # File upload tests
├── test_tools.py            # Tool endpoint tests
├── test_services.py         # Service layer unit tests (direct calls)
├── test_utils.py            # Utility function unit tests
├── test_comprehensive.py    # Cross-cutting integration tests
├── test_advanced.py         # Advanced feature tests
├── test_auth_service_extra.py  # Extra auth service tests
├── test_routes_extra.py     # Extra route tests
├── test_routes_final.py     # Final route coverage tests
├── test_services_extra.py   # Extra service tests
├── test_misc_extra.py       # Miscellaneous extra tests
```

**Pattern:** Tests are organized by **domain module** (auth, dishes, orders) with additional `_*_extra.py` and `test_comprehensive.py` files for supplemental coverage.

---

## Test Fixtures (`backend/tests/conftest.py`)

### Database Setup

- **In-memory SQLite** (`sqlite+aiosqlite:///:memory:`) — isolated per test session
- `setup_database` fixture (session-scoped): Creates all tables once
- `clean_db` fixture (autouse, function-scoped): Truncates all tables before each test

```python
@pytest.fixture(scope="session")
async def setup_database():
    """Create test database tables (once per session)"""
    from app.database import Base
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@pytest.fixture(autouse=True)
async def clean_db(setup_database):
    """Clean all tables before each test"""
    await clean_all_tables()
```

### HTTP Client

```python
@pytest.fixture
async def client(db) -> AsyncGenerator[AsyncClient, None]:
    """Test HTTP client with DB dependency override"""
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        async with test_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c

    app.dependency_overrides.clear()
```

### Authentication Fixtures

Three role-based token fixtures create users directly in DB and return JWT tokens:

| Fixture | User | Password | Role |
|---------|------|----------|------|
| `admin_token` | `admin` | `admin123` | admin |
| `user_token` | `testuser` | `user123` | user |
| `chef_token` | `chef` | `chef123` | chef |

Pattern:
```python
@pytest.fixture
async def admin_token(client: AsyncClient) -> str:
    from app.models.user import User
    from app.utils.security import hash_password

    async with test_session_factory() as session:
        admin = User(username="admin", password_hash=hash_password("admin123"), ...)
        session.add(admin)
        await session.commit()

    response = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return response.json()["access_token"]
```

---

## Test Structure

### Integration Tests (HTTP Endpoint Tests)

**Pattern:** Each test function is a standalone `async def` with `@pytest.mark.asyncio`:

```python
@pytest.mark.asyncio
async def test_create_dish(client: AsyncClient, admin_token: str):
    """测试创建菜品"""
    response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "麻婆豆腐", "description": "经典川菜"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "麻婆豆腐"
```

**Key characteristics:**
- No test classes — all tests are top-level `async def` functions
- `@pytest.mark.asyncio` decorator on every test (required despite `asyncio_mode = "auto"` — belt and suspenders)
- Chinese docstrings describe what's being tested
- Tests are self-contained — they create their own data within the test
- Assertions use plain `assert` with no custom matchers

### Unit Tests (Service Layer)

**File:** `backend/tests/test_services.py`

Tests call service methods directly, bypassing HTTP:

```python
@pytest.mark.asyncio
async def test_dish_service_crud(db: AsyncSession):
    admin = await _create_admin(db)
    dish_data = DishCreate(name="服务层测试菜品CRUD")
    dish = await DishService.create_dish(db, dish_data, created_by=admin.id)
    await db.commit()
    assert dish.name == "服务层测试菜品CRUD"
```

**Helper pattern** for creating FK-related records:
```python
async def _create_admin(db: AsyncSession):
    admin = await UserService.create_user(db, username="svc_admin", ...)
    await db.commit()
    return admin
```

### Utility Tests

**File:** `backend/tests/test_utils.py`

Synchronous tests for pure functions (no DB, no async):

```python
def test_get_pinyin_initial_chinese():
    result = get_pinyin_initial("麻婆豆腐")
    assert result == "MPDF"
```

### Test Data Fixtures

Tests create data inline rather than using factories. Example from `test_orders.py`:

```python
@pytest.fixture
async def sample_dish(client: AsyncClient, admin_token: str) -> int:
    response = await client.post(
        "/api/dishes/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "测试菜品", "status": "published"}
    )
    assert response.status_code == 201
    return response.json()["id"]
```

---

## Test Naming Conventions

**Files:** `test_{domain}.py` where domain matches the router/service module
**Functions:** `test_{action}_{condition}` in Chinese docstrings:

```python
@pytest.mark.asyncio
async def test_login_failure_wrong_password(client: AsyncClient):
    """测试登录失败 - 错误密码"""
```

**Pattern:** `test_{verb}_{entity}[_{scenario}]` — e.g., `test_create_dish`, `test_update_dish_status`, `test_login_failure_wrong_password`

---

## Mocking

**No mocking framework is used.** Tests use:
- Real database (in-memory SQLite)
- Real service instances
- Real HTTP request/response cycle via `httpx.AsyncClient`
- Dependency override pattern for DB injection instead of mocking `get_db`

**What is overridden:**
- `get_db` dependency → replaced with test session factory via `app.dependency_overrides`

**What is NOT mocked:**
- External services (Feishu): Calls are made but failures are caught with `try/except print(...)` in service code
- No `unittest.mock`, `pytest-mock`, or similar libraries used

---

## Coverage

**Requirements:** No coverage threshold enforced in configuration.

**View Coverage:**
```bash
cd backend
uv run pytest tests/ --cov=app --cov-report=term-missing
```

**Coverage Scope:**
- Integration tests cover route handlers end-to-end
- Service layer unit tests cover business logic directly
- Utility tests cover pure functions
- No coverage for: frontend code, external integrations (Feishu API calls)

---

## Test Types Summary

### Unit Tests
- **Scope:** Service methods, utility functions
- **Files:** `test_services.py`, `test_utils.py`, `test_*_service_extra.py`
- **Approach:** Direct function calls with real DB session
- **Database:** In-memory SQLite with real table operations

### Integration Tests
- **Scope:** Full HTTP request/response through FastAPI
- **Files:** `test_auth.py`, `test_dishes.py`, `test_orders.py`, `test_comprehensive.py`, `test_*_extra.py`, `test_*_final.py`
- **Approach:** `httpx.AsyncClient` with `ASGITransport` — no actual network calls
- **Authentication:** Real JWT tokens generated for each role

### E2E Tests
- **Not used** — no browser-based or full-stack E2E testing framework

---

## Common Test Patterns

### Testing Authenticated Endpoints
```python
response = await client.get(
    "/api/dishes/",
    headers={"Authorization": f"Bearer {admin_token}"}
)
```

### Testing Permission Denial
```python
response = await client.post(
    "/api/dishes/",
    headers={"Authorization": f"Bearer {user_token}"},
    json={"name": "测试菜品"}
)
assert response.status_code == 403
```

### Testing CRUD Lifecycle
```python
# Create
create_resp = await client.post("/api/dishes/", headers=auth, json={...})
assert create_resp.status_code == 201
item_id = create_resp.json()["id"]

# Read
get_resp = await client.get(f"/api/dishes/{item_id}", headers=auth)
assert get_resp.status_code == 200

# Update
update_resp = await client.put(f"/api/dishes/{item_id}", headers=auth, json={...})
assert update_resp.status_code == 200

# Delete
delete_resp = await client.delete(f"/api/dishes/{item_id}", headers=auth)
assert delete_resp.status_code == 204
```

### Testing Error Responses
```python
response = await client.get("/api/dishes/99999", headers=auth)
assert response.status_code == 404
assert "不存在" in response.json()["detail"]
```

### Testing Pagination
```python
response = await client.get("/api/orders/?page=1&page_size=2", headers=auth)
assert response.status_code == 200
data = response.json()
assert "total" in data
assert "items" in data
assert len(data["items"]) <= 2
```

---

## Frontend Testing

**Status:** No frontend tests exist.

- No test framework in `package.json` (no vitest, jest, or testing-library)
- No test files in `frontend/src/`
- No test configuration files
- No `test` or `lint:test` script in `package.json`

**To add frontend tests, use:**
- Test runner: Vitest (already have Vite as build tool)
- Component testing: `@testing-library/react`
- Location: Co-located `*.test.jsx` files or `__tests__/` directories alongside components

---

*Testing analysis: 2026-05-24*
