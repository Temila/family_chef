<!-- refreshed: 2026-05-24 -->
# Architecture

**Analysis Date:** 2026-05-24

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      Frontend (React SPA)                           │
│  `frontend/src/`                                                    │
├──────────┬──────────┬──────────┬───────────┬────────────────────────┤
│  Pages   │Components│ Contexts │    API    │      Auth              │
│ `pages/` │`comps/`  │ `ctx/`   │ `api/`    │  `auth/`               │
├──────────┴──────────┴──────────┴─────────┬┴────────────────────────┤
│           Vite Dev Proxy / Static Mount  │  JWT Bearer Token       │
│           `/api` → `localhost:8000`      │  localStorage           │
└──────────────────────────────────────────┼─────────────────────────┘
                                           │  HTTP (REST JSON)
                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI Application                               │
│  `backend/app/main.py` — ASGI entry point (uvicorn)                 │
├─────────────────────────────────────────────────────────────────────┤
│  Middleware: CORS · Logging (`middleware/`)                          │
├─────────┬───────────────────────────────────────────────────────────┤
│ Routers │ `routers/` — 14 route modules, `/api/*` prefix            │
├─────────┼───────────────────────────────────────────────────────────┤
│Services │ `services/` — Business logic, singletons                  │
├─────────┼───────────────────────────────────────────────────────────┤
│ Schemas │ `schemas/` — Pydantic V2 request/response validation      │
├─────────┼───────────────────────────────────────────────────────────┤
│  Models │ `models/` — SQLAlchemy 2.0 ORM (async)                    │
├─────────┼───────────────────────────────────────────────────────────┤
│   Utils │ `utils/` — security, pagination, response, pinyin         │
├─────────┼───────────────────────────────────────────────────────────┤
│Integr.  │ `integrations/` — Feishu API client                       │
└─────────┼───────────────────────────────────────────────────────────┘
          │  SQLAlchemy async sessions
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SQLite (aiosqlite, WAL mode) — `data/family_chef.db`               │
│  Migrations: Alembic (`backend/alembic/`)                            │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  External: Feishu Bot API (order notifications)                     │
│  Optional: Local LLM (llama-cpp-python) for ingredient extraction   │
└─────────────────────────────────────────────────────────────────────┘
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

**Overall:** Monolithic two-tier (React SPA + FastAPI REST backend), single-process deployment.

**Key Characteristics:**
- **Backend:** Layered architecture — Router → Service → Model. Routers handle HTTP, auth, and call services. Services contain business logic as `@staticmethod` methods. Models are pure SQLAlchemy ORM.
- **Service pattern:** Each service is a class with all-static methods, instantiated as a module-level singleton (e.g., `dish_service = DishService()`). No dependency injection for services.
- **Frontend:** No state management library — React Context for global state (auth, categories, toasts), local `useState` for page state.
- **API client:** Single `ApiClient` class in `frontend/src/api/client.js` — wraps `fetch`, auto-attaches JWT from localStorage, handles 401 redirects.
- **Async throughout:** All backend DB operations use `AsyncSession` + `aiosqlite`.
- **Configuration:** Single `config.yaml` at project root, parsed by custom `Settings` class (not pydantic-settings). `CONFIG_PATH` env var overrides location.

## Layers

### Backend Layers

**Router Layer:**
- Purpose: HTTP request handling, auth/role checks, input validation via Pydantic schemas, calling services
- Location: `backend/app/routers/`
- Contains: 14 FastAPI `APIRouter` modules (`auth.py`, `users.py`, `dishes.py`, `orders.py`, `ingredients.py`, `categories.py`, `favorites.py`, `preferences.py`, `chefs.py`, `admin.py`, `feishu.py`, `tools.py`, `upload.py`)
- Depends on: Services, Schemas, Models (for query building), `get_db` dependency
- Used by: FastAPI app in `main.py` via `app.include_router()`

**Service Layer:**
- Purpose: Business logic, database queries, data transformation
- Location: `backend/app/services/`
- Contains: 14 service modules (`auth_service.py`, `dish_service.py`, `order_service.py`, `user_service.py`, `ingredient_service.py`, `category_service.py`, `chef_service.py`, `favorite_service.py`, `preference_service.py`, `admin_service.py`, `dashboard_service.py`, `ingredient_extractor.py`, `smart_ingredient_extractor.py`)
- Depends on: Models, Schemas (input), `AsyncSession`
- Used by: Routers

**Schema Layer:**
- Purpose: Request/response validation and serialization (Pydantic V2)
- Location: `backend/app/schemas/`
- Contains: `user.py`, `dish.py`, `order.py`, `ingredient.py`, `category.py`, `preference.py`, `favorite.py`, `common.py`
- Depends on: Pydantic `BaseModel`
- Used by: Routers and Services

**Model Layer:**
- Purpose: SQLAlchemy ORM table definitions
- Location: `backend/app/models/`
- Contains: `user.py`, `dish.py`, `order.py`, `ingredient.py`, `category.py`, `preference.py`, `favorite.py`, `schedule.py`, `log.py`
- Depends on: `Base` from `database.py`
- Used by: Services, Routers (for `select()` queries)

**Integration Layer:**
- Purpose: External service clients
- Location: `backend/app/integrations/`
- Contains: `feishu.py` — `FeishuClient` singleton
- Depends on: `httpx`, `app.config.settings`
- Used by: `order_service.py` (for notifications)

### Frontend Layers

**Page Layer:**
- Purpose: Route-level components with full page UI and business logic
- Location: `frontend/src/pages/`
- Contains: 20 page components (e.g., `UserHomePage.jsx`, `AdminDishesPage.jsx`, `LoginPage.jsx`)

**Component Layer:**
- Purpose: Reusable UI components
- Location: `frontend/src/components/`
- Contains: `Sidebar.jsx`, `Header.jsx`, `BottomBar.jsx`, `DishCard.jsx`, `ThemeToggle.jsx`, `Badge.jsx`, `Loading.jsx`, `EmptyState.jsx`

**Context Layer:**
- Purpose: Global state providers
- Location: `frontend/src/contexts/`
- Contains: `AuthContext.jsx`, `CategoriesContext.jsx`, `ToastContext.jsx`

## Data Flow

### Primary Request Path — User Places an Order

1. User adds dishes to cart on `UserHomePage` (`frontend/src/pages/UserHomePage.jsx`)
2. Cart data stored in local state, submitted via `OrderPage` (`frontend/src/pages/OrderPage.jsx`)
3. `api.createOrder(data)` → `POST /api/orders` (`frontend/src/api/client.js`)
4. Vite proxy forwards to FastAPI backend (dev) or backend serves directly (prod)
5. Router `create_order` in `backend/app/routers/orders.py:89` receives request
6. Auth: `get_current_user_from_token` validates JWT (`backend/app/routers/auth.py:90`)
7. Router calls `order_service.create_order_auto_split()` (`backend/app/services/order_service.py:84`)
8. Service validates dishes, groups items by assigned chef, creates `Order` + `OrderItem` records
9. Service calls `OrderService.notify_order()` → `feishu_client.send_order_notification()` (`backend/app/integrations/feishu.py:82`)
10. Feishu client obtains tenant token, sends interactive card message via HTTP API
11. Router builds `OrderDetailResponse` with `build_order_detail()` helper
12. Response returned as JSON array (one order per chef)

### Dish Browsing with Dietary Warnings

1. `UserHomePage` calls `api.getDishes(params)` → `GET /api/dishes` (`frontend/src/api/client.js:71`)
2. Router `list_dishes` in `backend/app/routers/dishes.py:28` handles request
3. `dish_service.list_dishes()` queries with filters (region, cuisine, taste, season, search, favorites)
4. `dish_service.get_dietary_warnings_batch()` cross-references dish ingredients with user preferences
5. Response includes `dietary_warnings` field per dish (allergy/dislike indicators)

### Authentication Flow

1. `LoginPage` calls `api.login(username, password)` → `POST /api/auth/login`
2. `auth_service.authenticate_user()` verifies password (bcrypt), returns `User`
3. `auth_service.create_tokens()` generates JWT access + refresh tokens (`backend/app/services/auth_service.py:75`)
4. Frontend stores tokens in localStorage via `auth.setTokens()` (`frontend/src/auth/index.js`)
5. Subsequent requests include `Authorization: Bearer <token>` header

**State Management:**
- Backend: Stateless — JWT carries user identity, no server-side sessions
- Frontend: localStorage for tokens/user, React Context for runtime state, local `useState` per page
- Database: Single SQLite file with WAL mode for read concurrency

## Key Abstractions

**Service Singleton Pattern:**
- Purpose: Business logic encapsulation, testability
- Examples: `backend/app/services/dish_service.py`, `backend/app/services/order_service.py`
- Pattern: Class with `@staticmethod` methods, module-level instance `xxx_service = XxxService()`
- Usage in routers: `await dish_service.list_dishes(db, params, ...)`

**Paginated List Query:**
- Purpose: Standardized list endpoints with pagination
- Examples: `dish_service.list_dishes()`, `order_service.list_orders()`
- Pattern: Returns `(items: List[Model], total: int)`, uses `PaginationParams` for offset/limit
- Response: Wrapped in `PageResponse[T]` generic Pydantic model (`backend/app/schemas/common.py`)

**Dependency Injection (FastAPI):**
- Purpose: DB sessions and auth user injection
- `get_db()` — yields `AsyncSession` from `backend/app/database.py:39`
- `get_current_user_from_token()` — extracts user from JWT in `backend/app/routers/auth.py:90`
- `require_role(*roles)` — returns a dependency that enforces role-based access

**Dual-State Dish Model:**
- Purpose: Separation of admin control and chef visibility
- `Dish.status` — admin-level enabled/disabled (`backend/app/models/dish.py:16`)
- `DishChef.status` — per-chef published/hidden (`backend/app/models/dish.py:71`)
- Users only see dishes that are both enabled AND have at least one chef with "published"

**Auto-Split Order:**
- Purpose: Automatically split user's cart into per-chef orders
- Implementation: `order_service.create_order_auto_split()` (`backend/app/services/order_service.py:84`)
- Groups `OrderItemCreate` by `chef_id` (explicit or inferred from `DishChef`), creates separate `Order` per chef

## Entry Points

**Backend API Server:**
- Location: `backend/app/main.py` (ASGI app: `app.main:app`)
- Triggers: `uvicorn app.main:app` (started by `scripts/run-dev.sh` or `scripts/run.sh`)
- Responsibilities: Registers all routers, configures CORS, initializes DB, seeds data, serves frontend static files in production

**Frontend Dev Server:**
- Location: `frontend/vite.config.js`
- Triggers: `npm run dev` → Vite dev server on port 5173
- Responsibilities: Serves React SPA with HMR, proxies `/api` and `/uploads` to backend

**Production Entry Point:**
- Location: `scripts/run.sh`
- Triggers: Direct execution or Docker CMD
- Responsibilities: Builds frontend (`npm run build`), installs backend deps, starts uvicorn (which serves both API and static frontend from `frontend/dist/`)

**Docker Container:**
- Location: `docker/Dockerfile`
- Triggers: `docker compose up` from `docker/docker-compose.yaml`
- Responsibilities: Multi-stage build (Node.js for frontend → Python for backend), exposes port 8000

**Health Check:**
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

**What happens:** `dish_service.list_dishes()` in `backend/app/services/dish_service.py` builds the same filter conditions (search, regions, cuisines, tastes, seasons, chef_filter, favorites) twice — once for the data query and once for the count query, with nearly identical code blocks (~100 lines duplicated).
**Why it's wrong:** Any filter change must be applied in two places, risking inconsistency. The method is 712 lines long.
**Do this instead:** Extract filter predicates into a reusable function that returns a list of `where` clauses, then compose both queries from the same predicate list.

### Inline Model Construction in Routers

**What happens:** `dishes.py` router (`backend/app/routers/dishes.py:199-212`, `dishes.py:281-294`) manually constructs `DishDetailResponse` objects by iterating over relationships and building dicts, duplicating the same pattern in both `create_dish` and `update_dish` handlers.
**Why it's wrong:** 30+ lines of identical relationship-to-dict mapping repeated in two places. If the response shape changes, both must be updated.
**Do this instead:** Move response construction into the service layer or create a shared `build_dish_detail_response(dish)` helper in the service or schema module.

### Fat Router Methods

**What happens:** `backend/app/routers/dishes.py` `create_dish` and `update_dish` contain significant business logic (relationship rebuilding, manual response construction) that should live in the service layer.
**Why it's wrong:** Router should be a thin HTTP adapter. Mixing ORM query construction and response building with HTTP handling makes the router hard to test and violates the layer separation.
**Do this instead:** Move the full create/update + relationship reload + response build into `dish_service`, return the ready-to-serialize response object.

## Error Handling

**Strategy:** HTTP status codes via `HTTPException` in routers, `ValueError` in services for business rule violations.

**Patterns:**
- **Routers:** Catch `ValueError` from services, convert to `HTTPException` with appropriate status code (400, 401, 403, 404)
- **Services:** Raise `ValueError` with Chinese error messages for validation failures
- **External calls:** Feishu API calls wrapped in try/except, failures logged with `print()` and silently swallowed (`backend/app/services/order_service.py:217-218`)
- **DB sessions:** `get_db()` dependency auto-commits on success, auto-rolls back on exception (`backend/app/database.py:39-49`)

## Cross-Cutting Concerns

**Logging:** Custom `log_action()` middleware (`backend/app/middleware/logging.py`) writes to `system_logs` table via `admin_service`. Creates its own DB session (not the request session) to ensure logs persist even if the request transaction rolls back.

**Validation:** Pydantic V2 schemas in `backend/app/schemas/` for request/response validation. Router-level `response_model` annotations trigger automatic serialization.

**Authentication:** JWT (access + refresh tokens). Access token carries `sub` (user ID), `username`, `role`, `type`. Bcrypt password hashing. Tokens stored in browser localStorage. 401 responses trigger automatic redirect to `/login`.

**Authorization:** Role-based access control via `require_role()` dependency (`backend/app/routers/auth.py:107`). Three roles: `admin`, `chef`, `user`. Role checks enforced at router level.

**File Uploads:** Images uploaded via `POST /api/upload/image`, stored in `data/uploads/`, served as static files at `/uploads/`.

**Configuration:** Single `config.yaml` at project root. Docker mounts config as read-only volume. No `.env` file required in production (config.yaml replaces it).

---

*Architecture analysis: 2026-05-24*
