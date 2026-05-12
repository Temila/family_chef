#!/bin/bash
# ================================================
# 家味 · Family Chef - 一键启动（开发模式）
# ================================================
set -e

[ -d "$HOME/.local/bin" ] && export PATH="$HOME/.local/bin:$PATH"

SCRIPT_DIR=$(cd "$(dirname "$0")";pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")
BACKEND_DIR=$PROJECT_DIR/backend
FRONTEND_DIR=$PROJECT_DIR/frontend

echo "SCRIPT_DIR: $SCRIPT_DIR"
echo "PROJECT_DIR: $PROJECT_DIR"

echo "🍲 家味 · Family Chef 启动中（开发模式）..."

# 检查依赖
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ 后端目录不存在: $BACKEND_DIR"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ 前端目录不存在: $FRONTEND_DIR"
    exit 1
fi

# 检查前端依赖
echo "📦 检查前端依赖..."
cd "$FRONTEND_DIR"
if [ ! -f "node_modules/.bin/vite" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 检查后端依赖
echo "📦 检查后端依赖..."
cd "$BACKEND_DIR"

# 安装依赖
uv sync --extra smart

# 创建数据目录
mkdir -p "$BACKEND_DIR/data"

# 启动后端（开发模式，带热重载）
echo "🚀 启动后端服务 (端口 8000, 热重载已开启)..."
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 捕获退出信号
trap "echo '🛑 停止服务...'; kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit" INT TERM

# 等待后端就绪
echo "⏳ 等待后端服务就绪..."
MAX_RETRY=30
for i in $(seq 1 $MAX_RETRY); do
    if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
        break
    fi
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ 后端启动失败"
        exit 1
    fi
    sleep 1
done

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ 后端启动超时"
    exit 1
fi
echo "✅ 后端服务已就绪"

# 启动前端开发服务器
echo "🚀 启动前端开发服务器 (端口 5173)..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

# 等待任意子进程退出
wait
