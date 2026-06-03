#!/bin/bash
# ================================================
# 家味 · Family Chef - 一键启动（生产模式）
# ================================================
set -e

PORT="${PORT:-8000}"

if [ "${DOCKER_MODE:-0}" = "1" ]; then
    if [ ! -f "${CONFIG_PATH:-/app/config/config.yaml}" ]; then
        echo "❌ 配置文件不存在: ${CONFIG_PATH:-/app/config/config.yaml}"
        exit 1
    fi

    mkdir -p /app/backend/data

    /app/scripts/build_llama.sh

    export HOST_PORT="${HOST_PORT:-$PORT}"

    cd /app/backend
    exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 构建前端
echo "🔨 构建前端..."
cd "$FRONTEND_DIR"
if [ ! -f "node_modules/.bin/vite" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi
npm run build

# 检查后端依赖
echo "📦 检查后端依赖..."
cd "$BACKEND_DIR"

export PATH="$HOME/.local/bin:$PATH"

if ! command -v uv > /dev/null 2>&1; then
    echo "❌ 未找到 uv，请先安装: pip install uv"
    exit 1
fi

uv sync

mkdir -p "$BACKEND_DIR/data"

uv run uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
