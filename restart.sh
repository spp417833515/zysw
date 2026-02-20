#!/bin/bash
# 重启脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 正在重启服务..."
echo ""

# 停止服务
./stop.sh

echo ""
sleep 2

# 启动服务
./quick-start.sh
