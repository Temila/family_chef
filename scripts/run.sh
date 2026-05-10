#!/bin/bash
# ================================================
# 家味 · Family Chef - 一键启动（生产模式）
# ================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "🍲 家味 · Family Chef 启动中..."

# 检查依赖
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ 后端目录不存在: $BACKEND_DIR"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ 前端目录不存在: $FRONTEND_DIR"
    exit 1
fi

# 构建前端
echo "🔨 构建前端..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi
npm run build

# 检查后端依赖
echo "📦 检查后端依赖..."
cd "$BACKEND_DIR"

# 检查 uv
if ! command -v uv &> /dev/null; then
    echo "❌ 未找到 uv，请先安装: pip install uv"
    exit 1
fi

# 安装依赖（离线模式如已安装）
uv sync

# 启动后端（生产模式，无 reload）
echo "🚀 启动后端服务 (端口 8000)..."
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
