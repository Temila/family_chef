<!-- GSD:project-start source:PROJECT.md -->
## Project

**家味 · Family Chef — 访客点菜邀请**

在现有的家庭点菜系统（家味·Family Chef）上新增"访客点菜邀请"功能。家庭成员（chef 或 user 角色）可以生成一个一次性邀请链接，发给来访的朋友，让朋友在无需注册的情况下浏览菜品并提前点好想吃的菜。这是一个面向家庭社交场景的功能，让做客的朋友也能参与到家庭用餐的菜品选择中。

**Core Value:** 让未注册的访客通过一次性链接安全、简单地完成点菜，一次提交、即时通知厨师。

### Constraints

- **Tech Stack**: 必须沿用现有的 FastAPI + React 技术栈，不引入新框架
- **Database**: 继续使用 SQLite，需通过 Alembic 迁移新增表
- **Security**: 访客链接需使用不可猜测的 token（UUID 或类似机制），防止暴力枚举
- **Mobile**: 访客主要通过手机浏览器访问，前端必须移动端友好
- **No Auth**: 访客路由不走 JWT 认证，但需通过链接 token 验证访问权限
- **Branch**: 开发在 `feature/guest_order` 分支上进行
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Python 3.11+ — Backend API server, business logic, database models, integrations
- JavaScript (ES2020+, JSX) — Frontend React SPA, API client, auth management
- SQL (via SQLAlchemy ORM) — Database schema, migrations, queries
- YAML — Application configuration (`config.yaml`, `docker/config.yaml`)
- Bash — Startup scripts (`scripts/run.sh`, `scripts/run-dev.sh`)
- CSS (Custom Properties) — Theming with light/dark mode variables
## Runtime
- Python 3.11+ (Docker image: `python:3.11-slim`)
- Node.js 22 (Docker image: `node:22-alpine`)
- Browser (modern evergreen browsers — React 19 target)
- **Backend:** uv (astral-sh/uv) — managed via `pyproject.toml`
- **Frontend:** npm — managed via `frontend/package.json`
## Frameworks
- FastAPI >=0.100.0 — Async Python web framework; powers all REST API routes in `backend/app/routers/`
- React 19.2.5 — Frontend UI framework; SPA with functional components and hooks
- React Router DOM 7.15.0 — Client-side routing with role-based protected routes
- Vite 8.0.10 — Frontend build tool, dev server, and HMR
- pytest >=7.0.0 — Backend test runner
- pytest-asyncio >=0.21.0 — Async test support (mode: auto)
- pytest-cov >=4.0.0 — Coverage reporting
- httpx >=0.24.0 — HTTP client used in tests for API calls
- SQLAlchemy >=2.0.0 — Async ORM with `DeclarativeBase`
- Pydantic >=2.0.0 — Request/response validation schemas
- Alembic >=1.12.0 — Database migration tool
- Uvicorn >=0.23.0 — ASGI server (with standard extras for uvloop)
- Hatchling — Python build backend (`pyproject.toml` build-system)
## Key Dependencies
- `fastapi` >=0.100.0 — Core web framework for all API endpoints
- `sqlalchemy` >=2.0.0 — Async ORM; all models in `backend/app/models/`
- `pydantic` >=2.0.0 — Schema validation in `backend/app/schemas/`
- `pydantic-settings` >=2.0.0 — Settings management (currently not used directly; config is YAML-based)
- `react` ^19.2.5 — UI framework
- `react-router-dom` ^7.15.0 — SPA routing
- `python-jose[cryptography]` >=3.3.0 — JWT token creation and verification
- `bcrypt` (via `passlib[bcrypt]` >=1.7.4) — Password hashing (directly imported in `backend/app/utils/security.py`)
- JWT (HS256 algorithm) — Access tokens (24h expiry) + refresh tokens (7d expiry)
- `aiosqlite` >=0.19.0 — Async SQLite driver
- `httpx` >=0.24.0 — Async HTTP client for Feishu API calls
- `aiofiles` >=23.0.0 — Async file I/O for uploads
- `python-multipart` >=0.0.6 — File upload parsing for FastAPI
- `uvicorn[standard]` >=0.23.0 — ASGI server with uvloop/httptools
- `pypinyin` >=0.49.0 — Chinese character to pinyin conversion (`backend/app/utils/pinyin.py`)
- `marked` ^18.0.3 — Markdown rendering in frontend (recipe display)
- `huggingface-hub` >=1.14.0 — Model download from HuggingFace Hub
- `llama-cpp-python` >=0.2.0 (optional) — Local LLM inference for smart ingredient extraction
## Configuration
- Configuration loaded from YAML file at project root
- Config path set via `CONFIG_PATH` environment variable (default: `<project_root>/config.yaml`)
- Settings classes: `backend/app/config.py` → `Settings` and `SmartFeatureSettings`
- Global singletons: `settings` and `smart_settings` exported from `backend/app/config.py`
- `app` — Name, version, debug mode, secret key
- `database` — SQLite connection URL (default: `sqlite+aiosqlite:///./data/family_chef.db`)
- `jwt` — Secret key, algorithm (HS256), token expiry (1440 min = 24h)
- `feishu` — App ID, App Secret, App Token (optional)
- `upload` — Directory path, max file size (5MB default)
- `cors` — Allowed origins list
- `smart` — Feature flags, LLM model config (repo, filename, context window, GPU layers, HF mirror)
- Backend: `pyproject.toml` with Hatchling build system
- Frontend: `vite.config.js` with React plugin, dev proxy to backend port 8000
- Docker: `docker/Dockerfile` — multi-stage build (Node frontend → Python backend)
- Linting (frontend): `eslint.config.js` — flat config with react-hooks and react-refresh plugins
- Linting (backend): `ruff` configured in `pyproject.toml` (line-length: 120, target: py311)
- Alembic config: `backend/alembic.ini`
- Migration scripts: `backend/alembic/versions/`
- Default DB URL in alembic.ini: `sqlite+aiosqlite:///./data/family_chef.db`
- SQLite WAL mode enabled on startup for better concurrent read performance
## Platform Requirements
- Python 3.11+
- Node.js 18+ (Docker uses 22)
- uv (Python package manager)
- npm (Node package manager)
- Single-container Docker deployment (`docker/docker-compose.yaml`)
- Port 8000 exposes both API and frontend static files
- SQLite database file stored in Docker volume `family-chef-data`
- Configuration mounted as read-only volume
- Health check endpoint: `GET /api/health`
- Alternative: bare-metal deployment via `scripts/run.sh` (builds frontend, starts uvicorn)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Project Overview
## Backend Conventions (Python / FastAPI)
### File Organization
- **Module docstring**: Every Python file starts with a triple-quote docstring identifying the module:
- **Imports**: Standard library → third-party → application, separated by blank lines. No explicit grouping with `# ---` separators.
### Naming Patterns
- Python modules: `snake_case.py` — e.g., `auth_service.py`, `dish_service.py`, `pagination.py`
- Test files: `test_{module}.py` — e.g., `test_auth.py`, `test_dishes.py`
- `PascalCase` for SQLAlchemy models and service classes: `User`, `Dish`, `AuthService`, `DishService`
- Pydantic schemas: `PascalCase` with suffix indicating purpose: `UserCreate`, `UserResponse`, `DishUpdate`, `PageResponse`
- `snake_case` for all functions and methods: `get_dish_by_id()`, `create_user()`, `hash_password()`
- Service methods are `@staticmethod` — no `self` parameter:
- `snake_case` everywhere: `order_no`, `dish_id`, `user_result`
- Constants use `UPPER_SNAKE_CASE`: `TEST_DATABASE_URL`, `TOKEN_KEY`
- Plural `snake_case` via `__tablename__`: `"users"`, `"dishes"`, `"order_items"`
### Code Style
- Configured via Ruff in `backend/pyproject.toml`:
- No Prettier/Black config file detected; Ruff is configured but may not be enforced in CI.
- 4 spaces (Python standard)
- All I/O-bound service and route functions are `async def`
- SQLAlchemy uses async engine and sessions: `AsyncSession`, `create_async_engine`
- Database sessions use `async with` pattern
### Type Annotations
- **Type hints are used consistently** throughout the backend
- Function signatures include full type annotations:
- `from typing import Optional, List` used extensively
- Pydantic V2 models use `Optional[str] = None` for nullable fields
- Generic types via `TypeVar` for reusable schemas:
### Error Handling
- HTTP errors raised via `HTTPException` with `status_code` and `detail`:
- `ValueError` from service layer is caught and converted to `HTTPException` in routes:
- Returns `None` for "not found" rather than raising exceptions
- Raises `ValueError` for business rule violations with Chinese-language messages:
- `get_db()` dependency uses try/except with rollback:
### Logging
- **Standard `print()` statements** used for operational logging — no `logging` module in most files
- `app/middleware/logging.py` provides `log_action()` for audit trail (writes to `system_logs` DB table)
- `app/config.py` uses `logging.getLogger(__name__)` — the only file using the `logging` module
- Print messages use emoji prefixes for visual distinction:
### Service Layer Pattern
- **Singleton instances** at module level:
- Services are **stateless** — all methods are `@staticmethod` accepting `db: AsyncSession` as first parameter
- Services handle business logic; routers handle HTTP concerns
### Dependency Injection
- FastAPI `Depends()` used for:
### Database Patterns
- SQLAlchemy 2.0 declarative style with `DeclarativeBase`
- Eager loading via `selectinload()` for relationships:
- `flush()` + `refresh()` pattern used instead of `commit()` inside services (commit happens in route or `get_db`):
- Pagination via `PaginationParams` utility class: `backend/app/utils/pagination.py`
### Pydantic Schema Patterns
- Separate schemas for Create/Update/Response:
- `from_attributes = True` config for ORM model conversion:
- Custom `@field_validator` for data transformation (e.g., mapping relationship objects to flat dicts):
- Input sanitization helpers in `backend/app/schemas/user.py`: `_sanitize()`, `_check_unsafe()`
### Comments
- Module-level docstrings in Chinese for every file
- Function/method docstrings in Chinese:
- Inline comments in Chinese for business logic explanation
- Section headers in test files using `# ========== Section ==========`
## Frontend Conventions (React / JSX)
### File Organization
- **Components**: `PascalCase.jsx` — e.g., `DishCard.jsx`, `ThemeToggle.jsx`, `Sidebar.jsx`
- **Pages**: `PascalCase.jsx` with suffix `Page` — e.g., `LoginPage.jsx`, `AdminDishesPage.jsx`
- **Utilities**: `camelCase.js` — e.g., `client.js`, `index.js`
- **Hooks**: `camelCase.js` prefixed with `use` — e.g., `usePendingOrderCount.js`
- **Contexts**: `PascalCase.jsx` with suffix `Context` — e.g., `AuthContext.jsx`, `ToastContext.jsx`
### Naming Patterns
- `export default function ComponentName()` — default exports
- Props destructured in function signature: `function DishCard({ dish, simple })`
- `camelCase` everywhere: `loginData`, `handleLogin`, `showToast`
- State setters named `set` + state name: `const [user, setUser] = useState(null)`
- `UPPER_SNAKE_CASE` for constants: `VALID_ROLES`, `TOKEN_KEY`
### Code Style
- ESLint configured in `frontend/eslint.config.js` with:
- No Prettier config detected — formatting relies on ESLint only
- 2-space indentation (JSX/JS standard)
- Single quotes for strings
- ES modules (`"type": "module"` in `package.json`)
- Named and default exports both used
### Component Patterns
- All components are function components with hooks
- No class components detected
- React Context for global state (auth, toast, categories)
- Custom hook for consuming context: `useAuth()`, `useToast()`
- Provider wrapping in `App.jsx`:
- `ProtectedRoute` wrapper component with `requiredRoles` prop:
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
- Toast notifications for success/error feedback via `ToastContext`
- API client auto-handles 401 by clearing tokens and redirecting
### Import Organization
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
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
```
## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| `main.py` | App factory, startup/shutdown, route registration, static file serving | `backend/app/main.py` |
| `config.py` | YAML config loader, `Settings` and `SmartFeatureSettings` classes | `backend/app/config.py` |
| `database.py` | Async engine, session factory, `Base` declarative model, `get_db` dependency | `backend/app/database.py` |
| `initial_data.py` | Seeds default admin, preset categories, and preset ingredients on first run | `backend/app/initial_data.py` |
| Auth router | Login, register, refresh token, `get_current_user_from_token`, `require_role` | `backend/app/routers/auth.py` |
| Dish router | CRUD dishes, chef publish/unpublish, dietary warnings | `backend/app/routers/dishes.py` |
| Order router | Create orders (auto-split by chef), list/get/update status/cancel | `backend/app/routers/orders.py` |
| Feishu integration | `FeishuClient` — tenant token, send card messages, order notifications | `backend/app/integrations/feishu.py` |
| API Client | Frontend HTTP wrapper, JWT auth headers, all endpoint methods | `frontend/src/api/client.js` |
| Auth manager | Token & user persistence in localStorage | `frontend/src/auth/index.js` |
| AuthContext | React context for user state, login/logout/updateUser | `frontend/src/contexts/AuthContext.jsx` |
| CategoriesContext | Global category cache shared across pages | `frontend/src/contexts/CategoriesContext.jsx` |
| ToastContext | Global toast notification system | `frontend/src/contexts/ToastContext.jsx` |
| App.jsx | Route definitions, `ProtectedRoute` with role gating, `PcLayout` shell | `frontend/src/App.jsx` |
## Pattern Overview
- **Backend:** Layered architecture — Router → Service → Model. Routers handle HTTP, auth, and call services. Services contain business logic as `@staticmethod` methods. Models are pure SQLAlchemy ORM.
- **Service pattern:** Each service is a class with all-static methods, instantiated as a module-level singleton (e.g., `dish_service = DishService()`). No dependency injection for services.
- **Frontend:** No state management library — React Context for global state (auth, categories, toasts), local `useState` for page state.
- **API client:** Single `ApiClient` class in `frontend/src/api/client.js` — wraps `fetch`, auto-attaches JWT from localStorage, handles 401 redirects.
- **Async throughout:** All backend DB operations use `AsyncSession` + `aiosqlite`.
- **Configuration:** Single `config.yaml` at project root, parsed by custom `Settings` class (not pydantic-settings). `CONFIG_PATH` env var overrides location.
## Layers
### Backend Layers
- Purpose: HTTP request handling, auth/role checks, input validation via Pydantic schemas, calling services
- Location: `backend/app/routers/`
- Contains: 14 FastAPI `APIRouter` modules (`auth.py`, `users.py`, `dishes.py`, `orders.py`, `ingredients.py`, `categories.py`, `favorites.py`, `preferences.py`, `chefs.py`, `admin.py`, `feishu.py`, `tools.py`, `upload.py`)
- Depends on: Services, Schemas, Models (for query building), `get_db` dependency
- Used by: FastAPI app in `main.py` via `app.include_router()`
- Purpose: Business logic, database queries, data transformation
- Location: `backend/app/services/`
- Contains: 14 service modules (`auth_service.py`, `dish_service.py`, `order_service.py`, `user_service.py`, `ingredient_service.py`, `category_service.py`, `chef_service.py`, `favorite_service.py`, `preference_service.py`, `admin_service.py`, `dashboard_service.py`, `ingredient_extractor.py`, `smart_ingredient_extractor.py`)
- Depends on: Models, Schemas (input), `AsyncSession`
- Used by: Routers
- Purpose: Request/response validation and serialization (Pydantic V2)
- Location: `backend/app/schemas/`
- Contains: `user.py`, `dish.py`, `order.py`, `ingredient.py`, `category.py`, `preference.py`, `favorite.py`, `common.py`
- Depends on: Pydantic `BaseModel`
- Used by: Routers and Services
- Purpose: SQLAlchemy ORM table definitions
- Location: `backend/app/models/`
- Contains: `user.py`, `dish.py`, `order.py`, `ingredient.py`, `category.py`, `preference.py`, `favorite.py`, `schedule.py`, `log.py`
- Depends on: `Base` from `database.py`
- Used by: Services, Routers (for `select()` queries)
- Purpose: External service clients
- Location: `backend/app/integrations/`
- Contains: `feishu.py` — `FeishuClient` singleton
- Depends on: `httpx`, `app.config.settings`
- Used by: `order_service.py` (for notifications)
### Frontend Layers
- Purpose: Route-level components with full page UI and business logic
- Location: `frontend/src/pages/`
- Contains: 20 page components (e.g., `UserHomePage.jsx`, `AdminDishesPage.jsx`, `LoginPage.jsx`)
- Purpose: Reusable UI components
- Location: `frontend/src/components/`
- Contains: `Sidebar.jsx`, `Header.jsx`, `BottomBar.jsx`, `DishCard.jsx`, `ThemeToggle.jsx`, `Badge.jsx`, `Loading.jsx`, `EmptyState.jsx`
- Purpose: Global state providers
- Location: `frontend/src/contexts/`
- Contains: `AuthContext.jsx`, `CategoriesContext.jsx`, `ToastContext.jsx`
## Data Flow
### Primary Request Path — User Places an Order
### Dish Browsing with Dietary Warnings
### Authentication Flow
- Backend: Stateless — JWT carries user identity, no server-side sessions
- Frontend: localStorage for tokens/user, React Context for runtime state, local `useState` per page
- Database: Single SQLite file with WAL mode for read concurrency
## Key Abstractions
- Purpose: Business logic encapsulation, testability
- Examples: `backend/app/services/dish_service.py`, `backend/app/services/order_service.py`
- Pattern: Class with `@staticmethod` methods, module-level instance `xxx_service = XxxService()`
- Usage in routers: `await dish_service.list_dishes(db, params, ...)`
- Purpose: Standardized list endpoints with pagination
- Examples: `dish_service.list_dishes()`, `order_service.list_orders()`
- Pattern: Returns `(items: List[Model], total: int)`, uses `PaginationParams` for offset/limit
- Response: Wrapped in `PageResponse[T]` generic Pydantic model (`backend/app/schemas/common.py`)
- Purpose: DB sessions and auth user injection
- `get_db()` — yields `AsyncSession` from `backend/app/database.py:39`
- `get_current_user_from_token()` — extracts user from JWT in `backend/app/routers/auth.py:90`
- `require_role(*roles)` — returns a dependency that enforces role-based access
- Purpose: Separation of admin control and chef visibility
- `Dish.status` — admin-level enabled/disabled (`backend/app/models/dish.py:16`)
- `DishChef.status` — per-chef published/hidden (`backend/app/models/dish.py:71`)
- Users only see dishes that are both enabled AND have at least one chef with "published"
- Purpose: Automatically split user's cart into per-chef orders
- Implementation: `order_service.create_order_auto_split()` (`backend/app/services/order_service.py:84`)
- Groups `OrderItemCreate` by `chef_id` (explicit or inferred from `DishChef`), creates separate `Order` per chef
## Entry Points
- Location: `backend/app/main.py` (ASGI app: `app.main:app`)
- Triggers: `uvicorn app.main:app` (started by `scripts/run-dev.sh` or `scripts/run.sh`)
- Responsibilities: Registers all routers, configures CORS, initializes DB, seeds data, serves frontend static files in production
- Location: `frontend/vite.config.js`
- Triggers: `npm run dev` → Vite dev server on port 5173
- Responsibilities: Serves React SPA with HMR, proxies `/api` and `/uploads` to backend
- Location: `scripts/run.sh`
- Triggers: Direct execution or Docker CMD
- Responsibilities: Builds frontend (`npm run build`), installs backend deps, starts uvicorn (which serves both API and static frontend from `frontend/dist/`)
- Location: `docker/Dockerfile`
- Triggers: `docker compose up` from `docker/docker-compose.yaml`
- Responsibilities: Multi-stage build (Node.js for frontend → Python for backend), exposes port 8000
- Location: `backend/app/main.py:56` — `GET /api/health`
- Returns: `{"status": "ok"}`
## Architectural Constraints
- **Threading:** Single-process async event loop (uvicorn with asyncio). SQLite `check_same_thread=False` configured. LLM inference (`smart_ingredient_extractor`) runs synchronously in the event loop — blocks during model loading and inference.
- **Global state:** Module-level singletons — `settings` and `smart_settings` in `backend/app/config.py`, `engine` and `async_session_factory` in `backend/app/database.py`, service instances at bottom of each service file, `feishu_client` in `backend/app/integrations/feishu.py`.
- **Circular imports:** `backend/app/routers/orders.py` has an inline import of `app.integrations.feishu` inside a service method (lazy import to avoid circular dependency at module load time). Same pattern in `backend/app/services/order_service.py`.
- **Database:** SQLite only — not designed for concurrent writes at scale. WAL mode mitigates read/write contention but does not support true concurrent writes.
- **No background task system:** Feishu notifications are sent inline during request handling (with try/except to swallow failures). No task queue or background worker.
## Anti-Patterns
### Duplicated Query-Building Logic in Dish Service
### Inline Model Construction in Routers
### Fat Router Methods
## Error Handling
- **Routers:** Catch `ValueError` from services, convert to `HTTPException` with appropriate status code (400, 401, 403, 404)
- **Services:** Raise `ValueError` with Chinese error messages for validation failures
- **External calls:** Feishu API calls wrapped in try/except, failures logged with `print()` and silently swallowed (`backend/app/services/order_service.py:217-218`)
- **DB sessions:** `get_db()` dependency auto-commits on success, auto-rolls back on exception (`backend/app/database.py:39-49`)
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
