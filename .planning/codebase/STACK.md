# Technology Stack

**Analysis Date:** 2026-05-24

## Languages

**Primary:**
- Python 3.11+ — Backend API server, business logic, database models, integrations
- JavaScript (ES2020+, JSX) — Frontend React SPA, API client, auth management

**Secondary:**
- SQL (via SQLAlchemy ORM) — Database schema, migrations, queries
- YAML — Application configuration (`config.yaml`, `docker/config.yaml`)
- Bash — Startup scripts (`scripts/run.sh`, `scripts/run-dev.sh`)
- CSS (Custom Properties) — Theming with light/dark mode variables

## Runtime

**Environment:**
- Python 3.11+ (Docker image: `python:3.11-slim`)
- Node.js 22 (Docker image: `node:22-alpine`)
- Browser (modern evergreen browsers — React 19 target)

**Package Manager:**
- **Backend:** uv (astral-sh/uv) — managed via `pyproject.toml`
  - Lockfile: `backend/uv.lock` (present but gitignored)
- **Frontend:** npm — managed via `frontend/package.json`
  - Lockfile: `frontend/package-lock.json` (present)

## Frameworks

**Core:**
- FastAPI >=0.100.0 — Async Python web framework; powers all REST API routes in `backend/app/routers/`
- React 19.2.5 — Frontend UI framework; SPA with functional components and hooks
- React Router DOM 7.15.0 — Client-side routing with role-based protected routes
- Vite 8.0.10 — Frontend build tool, dev server, and HMR

**Testing:**
- pytest >=7.0.0 — Backend test runner
- pytest-asyncio >=0.21.0 — Async test support (mode: auto)
- pytest-cov >=4.0.0 — Coverage reporting
- httpx >=0.24.0 — HTTP client used in tests for API calls

**Build/Dev:**
- SQLAlchemy >=2.0.0 — Async ORM with `DeclarativeBase`
- Pydantic >=2.0.0 — Request/response validation schemas
- Alembic >=1.12.0 — Database migration tool
- Uvicorn >=0.23.0 — ASGI server (with standard extras for uvloop)
- Hatchling — Python build backend (`pyproject.toml` build-system)

## Key Dependencies

**Critical:**
- `fastapi` >=0.100.0 — Core web framework for all API endpoints
- `sqlalchemy` >=2.0.0 — Async ORM; all models in `backend/app/models/`
- `pydantic` >=2.0.0 — Schema validation in `backend/app/schemas/`
- `pydantic-settings` >=2.0.0 — Settings management (currently not used directly; config is YAML-based)
- `react` ^19.2.5 — UI framework
- `react-router-dom` ^7.15.0 — SPA routing

**Security:**
- `python-jose[cryptography]` >=3.3.0 — JWT token creation and verification
- `bcrypt` (via `passlib[bcrypt]` >=1.7.4) — Password hashing (directly imported in `backend/app/utils/security.py`)
- JWT (HS256 algorithm) — Access tokens (24h expiry) + refresh tokens (7d expiry)

**Infrastructure:**
- `aiosqlite` >=0.19.0 — Async SQLite driver
- `httpx` >=0.24.0 — Async HTTP client for Feishu API calls
- `aiofiles` >=23.0.0 — Async file I/O for uploads
- `python-multipart` >=0.0.6 — File upload parsing for FastAPI
- `uvicorn[standard]` >=0.23.0 — ASGI server with uvloop/httptools

**Domain-Specific:**
- `pypinyin` >=0.49.0 — Chinese character to pinyin conversion (`backend/app/utils/pinyin.py`)
- `marked` ^18.0.3 — Markdown rendering in frontend (recipe display)
- `huggingface-hub` >=1.14.0 — Model download from HuggingFace Hub
- `llama-cpp-python` >=0.2.0 (optional) — Local LLM inference for smart ingredient extraction

## Configuration

**Environment:**
- Configuration loaded from YAML file at project root
- Config path set via `CONFIG_PATH` environment variable (default: `<project_root>/config.yaml`)
- Settings classes: `backend/app/config.py` → `Settings` and `SmartFeatureSettings`
- Global singletons: `settings` and `smart_settings` exported from `backend/app/config.py`

**Key Configuration Areas (`config.yaml`):**
- `app` — Name, version, debug mode, secret key
- `database` — SQLite connection URL (default: `sqlite+aiosqlite:///./data/family_chef.db`)
- `jwt` — Secret key, algorithm (HS256), token expiry (1440 min = 24h)
- `feishu` — App ID, App Secret, App Token (optional)
- `upload` — Directory path, max file size (5MB default)
- `cors` — Allowed origins list
- `smart` — Feature flags, LLM model config (repo, filename, context window, GPU layers, HF mirror)

**Build:**
- Backend: `pyproject.toml` with Hatchling build system
- Frontend: `vite.config.js` with React plugin, dev proxy to backend port 8000
- Docker: `docker/Dockerfile` — multi-stage build (Node frontend → Python backend)
- Linting (frontend): `eslint.config.js` — flat config with react-hooks and react-refresh plugins
- Linting (backend): `ruff` configured in `pyproject.toml` (line-length: 120, target: py311)

**Database Migrations:**
- Alembic config: `backend/alembic.ini`
- Migration scripts: `backend/alembic/versions/`
- Default DB URL in alembic.ini: `sqlite+aiosqlite:///./data/family_chef.db`
- SQLite WAL mode enabled on startup for better concurrent read performance

## Platform Requirements

**Development:**
- Python 3.11+
- Node.js 18+ (Docker uses 22)
- uv (Python package manager)
- npm (Node package manager)

**Production:**
- Single-container Docker deployment (`docker/docker-compose.yaml`)
- Port 8000 exposes both API and frontend static files
- SQLite database file stored in Docker volume `family-chef-data`
- Configuration mounted as read-only volume
- Health check endpoint: `GET /api/health`
- Alternative: bare-metal deployment via `scripts/run.sh` (builds frontend, starts uvicorn)

---

*Stack analysis: 2026-05-24*
