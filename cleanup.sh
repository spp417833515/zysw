#!/bin/bash
# 强制清理脚本 - 用于清理残留进程

echo "🔍 正在查找残留进程..."

# 查找并停止后端进程
BACKEND_PIDS=$(lsof -ti:8000)
if [ ! -z "$BACKEND_PIDS" ]; then
    echo "发现后端进程: $BACKEND_PIDS"
    kill $BACKEND_PIDS 2>/dev/null
    echo "✓ 后端进程已清理"
else
    echo "✓ 无后端残留进程"
fi

# 查找并停止前端进程
FRONTEND_PIDS=$(lsof -ti:5173)
if [ ! -z "$FRONTEND_PIDS" ]; then
    echo "发现前端进程: $FRONTEND_PIDS"
    kill $FRONTEND_PIDS 2>/dev/null
    echo "✓ 前端进程已清理"
else
    echo "✓ 无前端残留进程"
fi

# 清理PID文件
rm -f .backend.pid .frontend.pid

echo ""
echo "✅ 清理完成！"
