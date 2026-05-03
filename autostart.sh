#!/bin/bash

# 小微企业财务记账系统 - 非交互式启动脚本（供 launchd 调用）
# 同时启动后端和前端服务

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

PYTHON="/usr/bin/python3"
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# 检查 node/npm 路径
if command -v node &>/dev/null; then
    NODE_DIR="$(dirname "$(which node)")"
    export PATH="$NODE_DIR:$PATH"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 系统启动 - 开始启动所有服务..." >> "$LOG_DIR/autostart.log"

# ========== 启动后端 ==========
start_backend() {
    cd "$SCRIPT_DIR/server"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 启动后端服务..." >> "$LOG_DIR/autostart.log"
    $PYTHON -m uvicorn app.main:app --host 0.0.0.0 --port 39721 >> "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$SCRIPT_DIR/.backend.pid"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 后端服务已启动 PID=$BACKEND_PID" >> "$LOG_DIR/autostart.log"
}

# ========== 启动前端 ==========
start_frontend() {
    cd "$SCRIPT_DIR"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 启动前端服务..." >> "$LOG_DIR/autostart.log"
    npm run dev >> "$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$SCRIPT_DIR/.frontend.pid"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 前端服务已启动 PID=$FRONTEND_PID" >> "$LOG_DIR/autostart.log"
}

# 启动服务
start_backend
start_frontend

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 所有服务启动完成" >> "$LOG_DIR/autostart.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 后端: http://localhost:39721" >> "$LOG_DIR/autostart.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 前端: http://localhost:42617" >> "$LOG_DIR/autostart.log"

# 等待子进程，防止 launchd 认为服务已退出
wait
