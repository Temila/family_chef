FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------

FROM python:3.11-slim AS backend

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash gcc g++ cmake && rm -rf /var/lib/apt/lists/*

COPY scripts/build_llama.sh ./scripts/build_llama.sh
RUN chmod +x ./scripts/build_llama.sh
RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml ./backend/
RUN cd backend && sed -i '/llama-cpp-python/d' pyproject.toml && \
    uv pip install --system --no-cache -r pyproject.toml

COPY backend/alembic.ini ./backend/
COPY backend/alembic/ ./backend/alembic/
COPY backend/app/ ./backend/app/

COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

COPY scripts/run.sh ./scripts/run.sh

RUN mkdir -p /app/backend/data/uploads && chmod +x ./scripts/run.sh

ENV DOCKER_MODE=1
ENV CONFIG_PATH=/app/config/config.yaml
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["./scripts/run.sh"]
