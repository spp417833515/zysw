#!/bin/bash
# 快速启动脚本 - 一键启动前后端

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 正在启动小微企业财务记账系统..."
echo ""

# 启动后端
echo "📦 启动后端服务..."
cd server
nohup /Users/admin/Library/Python/3.9/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
echo $! > ../.backend.pid
cd ..

sleep 2

# 启动前端
echo "🎨 启动前端服务..."
nohup npm run dev > frontend.log 2>&1 &
echo $! > .frontend.pid

sleep 3

echo ""
echo "✅ 启动完成！"
echo ""
echo "📍 访问地址："
echo "   前端界面: http://localhost:5173"
echo "   后端API:  http://localhost:8000"
echo "   API文档:  http://localhost:8000/docs"
echo ""
echo "💡 提示："
echo "   - 使用 ./stop.sh 停止服务"
echo "   - 使用 ./start.sh 进入管理菜单"
echo ""
