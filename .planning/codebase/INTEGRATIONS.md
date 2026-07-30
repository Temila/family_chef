# External Integrations

**Analysis Date:** 2026-05-24

## APIs & External Services

**Feishu (飞书) Open Platform:**
- Purpose: Push order notifications to users and chefs via Feishu Bot messages
- SDK/Client: Custom `FeishuClient` class using `httpx` async HTTP client
- Implementation: `backend/app/integrations/feishu.py`
- API Base URL: `https://open.feishu.cn/open-apis`
- Auth: Tenant access token obtained via `POST /auth/v3/tenant_access_token/internal` using App ID + App Secret
- Capabilities:
  - Send interactive card messages (Markdown) via `POST /im/v1/messages`
  - Send order notifications with dish lists, ingredient lists, meal time, dietary restrictions
- Configuration: `feishu` section in `config.yaml` (app_id, app_secret, app_token)
- Router: `backend/app/routers/feishu.py` — endpoints for binding Feishu accounts and sending notifications
- Token caching: In-memory (`_tenant_access_token`, `_token_expires_at`) — no persistent cache

**HuggingFace Hub:**
- Purpose: Download local LLM model (GGUF format) for smart ingredient extraction
- SDK/Client: `huggingface_hub` Python package — `hf_hub_download()` function
- Implementation: `backend/app/services/smart_ingredient_extractor.py`
- Default model: `unsloth/Qwen3.5-0.8B-GGUF` → `Qwen3.5-0.8B-Q4_K_M.gguf`
- Mirror support: Configurable via `smart.llm.hf_mirror` (e.g., `https://hf-mirror.com` for China)
- Feature flag: `smart.enabled` (master switch) + `smart.features.ingredient_extraction` (per-feature)

**Local LLM Inference (llama-cpp-python):**
- Purpose: Run quantized LLM model locally for ingredient extraction from recipe text
- SDK/Client: `llama-cpp-python` Python package — `Llama` class
- Implementation: `backend/app/services/smart_ingredient_extractor.py`
- Model loading: Lazy initialization via `_ensure_model_loaded()` (loaded on first use)
- Configuration: Context window (`n_ctx`: 2048), GPU layers (`n_gpu_layers`: 0 = CPU only)
- Optional dependency: Installed via `[project.optional-dependencies] smart` in `pyproject.toml`

## Data Storage

**Databases:**
- SQLite (file-based)
  - Connection URL: `sqlite+aiosqlite:///./data/family_chef.db`
  - Async driver: `aiosqlite` >=0.19.0
  - Client/ORM: SQLAlchemy 2.0 async (`create_async_engine`, `async_sessionmaker`)
  - WAL mode enabled: `PRAGMA journal_mode=WAL` on startup (`backend/app/database.py`)
  - Connection setting: `check_same_thread=False` (required for SQLite + async)
  - ORM base class: `DeclarativeBase` in `backend/app/database.py`
  - Migrations: Alembic (`backend/alembic/`)

**File Storage:**
- Local filesystem only
  - Upload directory: `./data/uploads` (configurable via `config.yaml` → `upload.dir`)
  - Allowed file types: JPEG, PNG, WebP
  - Max file size: 5MB (configurable)
  - File naming: UUID-based hex + original extension
  - Static file serving: FastAPI `StaticFiles` mount at `/uploads`
  - Implementation: `backend/app/routers/upload.py`

**Caching:**
- None (no Redis, Memcached, or in-memory caching layer)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication (no third-party auth provider)
  - Implementation: `backend/app/services/auth_service.py`, `backend/app/utils/security.py`
  - Password hashing: bcrypt (via `passlib[bcrypt]`, directly using `bcrypt` module)
  - Token format: JWT (HS256 algorithm) via `python-jose`
  - Access token: Contains `sub` (user ID), `username`, `role`, `type: "access"`, expiry 24h
  - Refresh token: Contains `sub` (user ID), `username`, `type: "refresh"`, expiry 7 days
  - Token storage (frontend): `localStorage` keys `fc_access_token`, `fc_refresh_token`, `fc_user`
  - Auth context (frontend): `frontend/src/contexts/AuthContext.jsx` (React Context)
  - Auth utility (frontend): `frontend/src/auth/index.js` — token management, role checking
  - Role-based access: Three roles — `admin`, `chef`, `user`
  - Protected routes: `ProtectedRoute` component in `frontend/src/App.jsx`

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Rollbar, or similar)

**Logs:**
- Application logging: Python `logging` module (e.g., `logging.getLogger(__name__)` in services)
- System operation logs: Stored in database via `SystemLog` model (`backend/app/models/log.py`)
  - Log middleware: `backend/app/middleware/logging.py` — `log_action()` function
  - Admin log viewer: `GET /api/admin/logs` endpoint
- Console output: `print()` statements used for startup messages and error notifications
- Health check: `GET /api/health` returns `{"status": "ok"}`

## CI/CD & Deployment

**Hosting:**
- Docker (single container)
  - Dockerfile: `docker/Dockerfile` — multi-stage build
  - Docker Compose: `docker/docker-compose.yaml` — single service `family-chef`
  - Image: `temila/family-chef:latest`
  - Port: 8000 (both API and static frontend)
  - Volume: `family-chef-data` mounted at `/app/backend/data`
  - Config: Mounted read-only from `docker/config.yaml`

**CI Pipeline:**
- GitHub Actions (two workflows):
  - `.github/workflows/branch-name-validation.yml` — PR source branch must match `feature/` or `fix/`
  - `.github/workflows/pr-target-check.yml` — Feature/fix PRs must target `dev` branch
- No automated test execution in CI
- No automated build/push in CI

## Environment Configuration

**Required config keys (via `config.yaml`):**
- `app.secret_key` — Application secret (MUST change in production)
- `jwt.secret_key` — JWT signing key (MUST change in production)
- `database.url` — SQLite connection string

**Optional config keys:**
- `feishu.app_id` / `feishu.app_secret` — Required for Feishu integration
- `feishu.app_token` — Reserved for future use (Bitable integration)
- `smart.enabled` / `smart.features.ingredient_extraction` — LLM feature flags
- `smart.llm.model_repo` / `smart.llm.model_filename` — LLM model selection
- `smart.llm.hf_mirror` — HuggingFace mirror URL
- `smart.llm.n_gpu_layers` — GPU acceleration (-1 for all layers, 0 for CPU)

**Config path:**
- Set via `CONFIG_PATH` environment variable
- Default: `<project_root>/config.yaml`
- Docker default: `/app/config/config.yaml`

**Secrets location:**
- Secrets stored directly in `config.yaml` (NOT a secrets manager)
- `docker/config.yaml` is gitignored
- Root `config.yaml` is committed (contains dev/test credentials)
- `docker/config.example.yaml` provided as template with placeholder secrets

## Webhooks & Callbacks

**Incoming:**
- None (no inbound webhook endpoints)

**Outgoing:**
- Feishu API calls — Outgoing HTTP requests to `https://open.feishu.cn/open-apis` for:
  - Tenant token acquisition
  - Message sending (card messages to users/chefs)
  - Triggered by: Order creation (`backend/app/services/order_service.py` → `notify_order()`), order status changes (`update_order_status()`)
- HuggingFace Hub — Outgoing HTTPS to download LLM model files
  - Triggered by: First use of smart ingredient extraction (lazy model download)
  - Configurable mirror for China users (`https://hf-mirror.com`)

---

*Integration audit: 2026-05-24*
