FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------

FROM python:3.11-slim AS backend

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

COPY backend/alembic.ini ./
COPY backend/alembic/ ./alembic/
COPY backend/app/ ./app/

COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

RUN mkdir -p /app/data/uploads

ENV CONFIG_PATH=/app/config/config.yaml

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
