#!/bin/bash
# 停止脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 正在停止服务..."

# 停止后端
if [ -f ".backend.pid" ]; then
    PID=$(cat .backend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✓ 后端服务已停止"
    fi
    rm -f .backend.pid
fi

# 停止前端
if [ -f ".frontend.pid" ]; then
    PID=$(cat .frontend.pid)
    if kill -0 $PID 2>/dev/null; then
        pkill -P $PID
        kill $PID 2>/dev/null
        echo "✓ 前端服务已停止"
    fi
    rm -f .frontend.pid
fi

echo ""
echo "✅ 所有服务已停止"
