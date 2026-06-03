#!/bin/bash
set -e

echo "🔨 检查 llama-cpp-python 是否可用..."
python -c "from llama_cpp import Llama; print('✅ llama-cpp-python 已可用')" 2>/dev/null && exit 0

echo "🔧 llama-cpp-python 不可用，开始在当前环境编译..."
pip install --no-cache-dir --force-reinstall llama-cpp-python 2>&1 || {
    echo "❌ llama-cpp-python 编译失败，智能食材提取功能将不可用"
    exit 0
}
echo "✅ llama-cpp-python 编译完成"
