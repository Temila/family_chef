# Coding Conventions

**Analysis Date:** 2026-05-24

## Project Overview

Family Chef (家味) is a full-stack application with a **Python (FastAPI) backend** and a **React (JSX) frontend**. The codebase uses Chinese-language comments and docstrings throughout. Both subprojects have distinct conventions documented below.

---

## Backend Conventions (Python / FastAPI)

### File Organization

- **Module docstring**: Every Python file starts with a triple-quote docstring identifying the module:
  ```python
  """
  家味 · Family Chef - 认证路由
  """
  ```
- **Imports**: Standard library → third-party → application, separated by blank lines. No explicit grouping with `# ---` separators.
  ```python
  from typing import Optional
  from fastapi import APIRouter, Depends, HTTPException, status
  from sqlalchemy.ext.asyncio import AsyncSession
  from app.database import get_db
  from app.schemas.user import UserLogin, UserCreate
  from app.services.auth_service import auth_service
  ```

### Naming Patterns

**Files:**
- Python modules: `snake_case.py` — e.g., `auth_service.py`, `dish_service.py`, `pagination.py`
- Test files: `test_{module}.py` — e.g., `test_auth.py`, `test_dishes.py`

**Classes:**
- `PascalCase` for SQLAlchemy models and service classes: `User`, `Dish`, `AuthService`, `DishService`
- Pydantic schemas: `PascalCase` with suffix indicating purpose: `UserCreate`, `UserResponse`, `DishUpdate`, `PageResponse`

**Functions & Methods:**
- `snake_case` for all functions and methods: `get_dish_by_id()`, `create_user()`, `hash_password()`
- Service methods are `@staticmethod` — no `self` parameter:
  ```python
  class DishService:
      @staticmethod
      async def get_dish_by_id(db: AsyncSession, dish_id: int) -> Optional[Dish]:
  ```

**Variables:**
- `snake_case` everywhere: `order_no`, `dish_id`, `user_result`
- Constants use `UPPER_SNAKE_CASE`: `TEST_DATABASE_URL`, `TOKEN_KEY`

**Model table names:**
- Plural `snake_case` via `__tablename__`: `"users"`, `"dishes"`, `"order_items"`

### Code Style

**Formatting:**
- Configured via Ruff in `backend/pyproject.toml`:
  - Line length: 120
  - Target: Python 3.11
  ```toml
  [tool.ruff]
  line-length = 120
  target-version = "py311"
  ```
- No Prettier/Black config file detected; Ruff is configured but may not be enforced in CI.

**Indentation:**
- 4 spaces (Python standard)

**Async patterns:**
- All I/O-bound service and route functions are `async def`
- SQLAlchemy uses async engine and sessions: `AsyncSession`, `create_async_engine`
- Database sessions use `async with` pattern

### Type Annotations

- **Type hints are used consistently** throughout the backend
- Function signatures include full type annotations:
  ```python
  async def get_dish_by_id(db: AsyncSession, dish_id: int, user_id: Optional[int] = None) -> Optional[Dish]:
  ```
- `from typing import Optional, List` used extensively
- Pydantic V2 models use `Optional[str] = None` for nullable fields
- Generic types via `TypeVar` for reusable schemas:
  ```python
  T = TypeVar("T")
  class PageResponse(BaseModel, Generic[T]):
  ```

### Error Handling

**Route layer:**
- HTTP errors raised via `HTTPException` with `status_code` and `detail`:
  ```python
  raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="菜品不存在",
  )
  ```
- `ValueError` from service layer is caught and converted to `HTTPException` in routes:
  ```python
  try:
      user = await auth_service.create_user(db, ...)
  except ValueError as e:
      await db.rollback()
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
  ```

**Service layer:**
- Returns `None` for "not found" rather than raising exceptions
- Raises `ValueError` for business rule violations with Chinese-language messages:
  ```python
  raise ValueError(f"无效的状态: {status}")
  raise ValueError(f"用户名 '{username}' 已存在")
  ```

**Database sessions:**
- `get_db()` dependency uses try/except with rollback:
  ```python
  async def get_db():
      async with async_session_factory() as session:
          try:
              yield session
              await session.commit()
          except Exception:
              await session.rollback()
              raise
  ```

### Logging

- **Standard `print()` statements** used for operational logging — no `logging` module in most files
- `app/middleware/logging.py` provides `log_action()` for audit trail (writes to `system_logs` DB table)
- `app/config.py` uses `logging.getLogger(__name__)` — the only file using the `logging` module
- Print messages use emoji prefixes for visual distinction:
  ```python
  print(f"✅ {settings.APP_NAME} v{settings.APP_VERSION} 启动成功")
  print(f"⚠️ 飞书通知发送失败：{e}")
  print(f"❌ 获取飞书 Token 失败：{response.text}")
  ```

### Service Layer Pattern

- **Singleton instances** at module level:
  ```python
  # Global instance at bottom of each service file
  auth_service = AuthService()
  dish_service = DishService()
  order_service = OrderService()
  ```
- Services are **stateless** — all methods are `@staticmethod` accepting `db: AsyncSession` as first parameter
- Services handle business logic; routers handle HTTP concerns

### Dependency Injection

- FastAPI `Depends()` used for:
  - Database sessions: `db: AsyncSession = Depends(get_db)`
  - Authentication: `current_user: User = Depends(get_current_user_from_token)`
  - Role authorization: `require_role("admin", "chef")` returns a dependency

### Database Patterns

- SQLAlchemy 2.0 declarative style with `DeclarativeBase`
- Eager loading via `selectinload()` for relationships:
  ```python
  select(Dish).options(
      selectinload(Dish.ingredients).selectinload(DishIngredient.ingredient),
      selectinload(Dish.categories).selectinload(DishCategory.category),
  )
  ```
- `flush()` + `refresh()` pattern used instead of `commit()` inside services (commit happens in route or `get_db`):
  ```python
  db.add(dish)
  await db.flush()
  await db.refresh(dish)
  ```
- Pagination via `PaginationParams` utility class: `backend/app/utils/pagination.py`

### Pydantic Schema Patterns

- Separate schemas for Create/Update/Response:
  ```python
  class DishCreate(BaseModel): ...
  class DishUpdate(BaseModel): ...
  class DishDetailResponse(BaseModel): ...
  ```
- `from_attributes = True` config for ORM model conversion:
  ```python
  class Config:
      from_attributes = True
  ```
- Custom `@field_validator` for data transformation (e.g., mapping relationship objects to flat dicts):
  ```python
  @field_validator('categories', mode='before')
  @classmethod
  def map_categories(cls, v):
      if v and hasattr(v[0], 'category_id'):
          return [{'id': dc.category.id, 'name': dc.category.name, 'type': dc.category.type} for dc in v]
      return v
  ```
- Input sanitization helpers in `backend/app/schemas/user.py`: `_sanitize()`, `_check_unsafe()`

### Comments

- Module-level docstrings in Chinese for every file
- Function/method docstrings in Chinese:
  ```python
  async def get_dish_by_id(db, dish_id, user_id=None) -> Optional[Dish]:
      """根据 ID 获取菜品详情"""
  ```
- Inline comments in Chinese for business logic explanation
- Section headers in test files using `# ========== Section ==========`

---

## Frontend Conventions (React / JSX)

### File Organization

- **Components**: `PascalCase.jsx` — e.g., `DishCard.jsx`, `ThemeToggle.jsx`, `Sidebar.jsx`
- **Pages**: `PascalCase.jsx` with suffix `Page` — e.g., `LoginPage.jsx`, `AdminDishesPage.jsx`
- **Utilities**: `camelCase.js` — e.g., `client.js`, `index.js`
- **Hooks**: `camelCase.js` prefixed with `use` — e.g., `usePendingOrderCount.js`
- **Contexts**: `PascalCase.jsx` with suffix `Context` — e.g., `AuthContext.jsx`, `ToastContext.jsx`

### Naming Patterns

**Components:**
- `export default function ComponentName()` — default exports
- Props destructured in function signature: `function DishCard({ dish, simple })`

**Variables & Functions:**
- `camelCase` everywhere: `loginData`, `handleLogin`, `showToast`
- State setters named `set` + state name: `const [user, setUser] = useState(null)`

**Constants:**
- `UPPER_SNAKE_CASE` for constants: `VALID_ROLES`, `TOKEN_KEY`

### Code Style

**Formatting:**
- ESLint configured in `frontend/eslint.config.js` with:
  - `js.configs.recommended`
  - `react-hooks.configs.flat.recommended`
  - `reactRefresh.configs.vite`
- No Prettier config detected — formatting relies on ESLint only
- 2-space indentation (JSX/JS standard)
- Single quotes for strings

**Module System:**
- ES modules (`"type": "module"` in `package.json`)
- Named and default exports both used

### Component Patterns

**Functional Components Only:**
- All components are function components with hooks
- No class components detected

**Context Pattern:**
- React Context for global state (auth, toast, categories)
- Custom hook for consuming context: `useAuth()`, `useToast()`
- Provider wrapping in `App.jsx`:
  ```jsx
  <BrowserRouter>
    <AuthProvider>
      <CategoriesProvider>
        <ToastProvider>
          <Routes>...</Routes>
        </ToastProvider>
      </CategoriesProvider>
    </AuthProvider>
  </BrowserRouter>
  ```

**Protected Route Pattern:**
- `ProtectedRoute` wrapper component with `requiredRoles` prop:
  ```jsx
  <ProtectedRoute requiredRoles={['admin', 'chef']}>
    <AdminDishesPage />
  </ProtectedRoute>
  ```

### API Client Pattern

- Single `ApiClient` class in `frontend/src/api/client.js`
- Exported as singleton: `export const api = new ApiClient()`
- Method naming: `camelCase` with entity prefix: `getDishes()`, `createOrder()`, `updateDish()`
- Query parameter building via `URLSearchParams`
- 401 responses trigger automatic logout and redirect to `/login`

### CSS & Styling

- Custom CSS with `data-theme` attribute for light/dark mode
- CSS files in `frontend/src/css/` — `styles.css`, `index.css`, `App.css`
- BEM-like class naming: `dish-card`, `dish-card-image`, `dish-card-body`, `dish-card-name`
- Responsive breakpoints: 420px, 768px, 1200px

### Error Handling

- API errors caught in `try/catch` blocks in event handlers:
  ```javascript
  try {
      const res = await api.login(username, password);
      login(res.access_token, res.refresh_token, res.user);
  } catch (err) {
      setLoginError(err.message || '登录失败');
  }
  ```
- Toast notifications for success/error feedback via `ToastContext`
- API client auto-handles 401 by clearing tokens and redirecting

### Import Organization

1. React/Router imports
2. Context hooks
3. API client
4. Components
5. Utilities
6. CSS files

```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import { theme } from '../utils';
```

---

## Cross-Cutting Conventions

### Language

- **Chinese** for all user-facing strings, error messages, comments, and docstrings
- **English** for variable names, function names, class names, and technical identifiers
- Error messages returned to frontend are in Chinese: `"菜品不存在"`, `"权限不足"`

### Configuration

- Backend reads from `config.yaml` at project root (not `.env` for app config)
- `.env.example` exists for secrets template (never read `.env` contents)
- Frontend proxy configuration in `vite.config.js` forwards `/api` and `/uploads` to backend

### API Design

- RESTful routes: `GET /api/dishes`, `POST /api/dishes`, `PUT /api/dishes/{id}`, `DELETE /api/dishes/{id}`
- Route prefix pattern: `/api/{resource}`
- Pagination returns `PageResponse` with `total`, `page`, `page_size`, `items`
- Authentication via `Authorization: Bearer {token}` header

---

*Convention analysis: 2026-05-24*
