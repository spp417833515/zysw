#!/bin/bash

# 小微企业财务记账系统 - 统一服务管理脚本
# 用法: ./service.sh {start|stop|restart|status|update}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 配置
BACKEND_PORT=39721
FRONTEND_PORT=42617
PYTHON="/usr/bin/python3"
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"
BACKEND_LOG="$SCRIPT_DIR/backend.log"
FRONTEND_LOG="$SCRIPT_DIR/frontend.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数（同时输出到终端和日志文件）
SERVICE_LOG="$SCRIPT_DIR/service.log"
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" >> "$SERVICE_LOG"
    echo -e "$1"
}

# ============================================================
# 端口清理：确保端口没有残余进程占用
# ============================================================
cleanup_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        log "${YELLOW}清理端口 $port 上的残留进程: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
    fi
}

# ============================================================
# 启动后端
# ============================================================
start_backend() {
    # 检查是否已运行
    if [ -f "$BACKEND_PID_FILE" ] && kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        log "${YELLOW}后端服务已在运行中 (PID: $(cat "$BACKEND_PID_FILE"))${NC}"
        return 0
    fi

    # 清理残留
    cleanup_port $BACKEND_PORT
    rm -f "$BACKEND_PID_FILE"

    log "${GREEN}正在启动后端服务...${NC}"

    # 确保 Python 可用
    if ! command -v $PYTHON &>/dev/null; then
        # 尝试其他 Python 路径
        for p in /opt/homebrew/bin/python3 /usr/local/bin/python3; do
            if command -v $p &>/dev/null; then
                PYTHON=$p
                break
            fi
        done
    fi

    # 检查依赖
    if ! $PYTHON -c "import uvicorn" 2>/dev/null; then
        log "${YELLOW}正在安装后端依赖...${NC}"
        $PYTHON -m pip install -r "$SCRIPT_DIR/server/requirements.txt" --user --quiet
    fi

    # 启动后端（不使用 --reload，生产环境更稳定）
    cd "$SCRIPT_DIR/server"
    nohup $PYTHON -m uvicorn app.main:app \
        --host 0.0.0.0 \
        --port $BACKEND_PORT \
        > "$BACKEND_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$BACKEND_PID_FILE"
    cd "$SCRIPT_DIR"

    # 等待启动完成
    local retries=10
    while [ $retries -gt 0 ]; do
        sleep 1
        if curl -s "http://localhost:$BACKEND_PORT/docs" > /dev/null 2>&1; then
            log "${GREEN}✓ 后端服务启动成功 (PID: $pid)${NC}"
            log "  地址: http://localhost:$BACKEND_PORT"
            return 0
        fi
        # 检查进程是否还在
        if ! kill -0 $pid 2>/dev/null; then
            log "${RED}✗ 后端服务启动失败，进程已退出${NC}"
            log "  请查看日志: $BACKEND_LOG"
            rm -f "$BACKEND_PID_FILE"
            return 1
        fi
        retries=$((retries - 1))
    done

    # 进程在但端口未响应，仍认为启动成功（可能还在初始化）
    if kill -0 $pid 2>/dev/null; then
        log "${GREEN}✓ 后端服务已启动 (PID: $pid)，等待就绪...${NC}"
        return 0
    fi

    log "${RED}✗ 后端服务启动超时${NC}"
    rm -f "$BACKEND_PID_FILE"
    return 1
}

# ============================================================
# 启动前端
# ============================================================
start_frontend() {
    # 检查是否已运行
    if [ -f "$FRONTEND_PID_FILE" ] && kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
        log "${YELLOW}前端服务已在运行中 (PID: $(cat "$FRONTEND_PID_FILE"))${NC}"
        return 0
    fi

    # 清理残留
    cleanup_port $FRONTEND_PORT
    rm -f "$FRONTEND_PID_FILE"

    log "${GREEN}正在启动前端服务...${NC}"

    # 确保 npm 可用
    if ! command -v npm &>/dev/null; then
        # launchd 环境下 PATH 可能不完整，手动补充
        export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
        if ! command -v npm &>/dev/null; then
            # 尝试 nvm
            [ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"
        fi
    fi

    if ! command -v npm &>/dev/null; then
        log "${RED}✗ 未找到 npm，请确保 Node.js 已安装${NC}"
        return 1
    fi

    # 检查依赖
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        log "${YELLOW}正在安装前端依赖...${NC}"
        cd "$SCRIPT_DIR"
        npm install --silent
    fi

    # 启动前端
    cd "$SCRIPT_DIR"
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$FRONTEND_PID_FILE"

    # 等待启动
    local retries=15
    while [ $retries -gt 0 ]; do
        sleep 1
        if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
            log "${GREEN}✓ 前端服务启动成功 (PID: $pid)${NC}"
            log "  地址: http://localhost:$FRONTEND_PORT"
            return 0
        fi
        if ! kill -0 $pid 2>/dev/null; then
            log "${RED}✗ 前端服务启动失败，进程已退出${NC}"
            log "  请查看日志: $FRONTEND_LOG"
            rm -f "$FRONTEND_PID_FILE"
            return 1
        fi
        retries=$((retries - 1))
    done

    if kill -0 $pid 2>/dev/null; then
        log "${GREEN}✓ 前端服务已启动 (PID: $pid)，等待就绪...${NC}"
        return 0
    fi

    log "${RED}✗ 前端服务启动超时${NC}"
    rm -f "$FRONTEND_PID_FILE"
    return 1
}

# ============================================================
# 停止后端
# ============================================================
stop_backend() {
    log "${YELLOW}正在停止后端服务...${NC}"

    # 通过 PID 文件停止
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if kill -0 $pid 2>/dev/null; then
            # 先发 TERM 信号，等待优雅退出
            kill $pid 2>/dev/null
            local wait=5
            while [ $wait -gt 0 ] && kill -0 $pid 2>/dev/null; do
                sleep 1
                wait=$((wait - 1))
            done
            # 如果还在运行，强制杀死
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null
            fi
        fi
        rm -f "$BACKEND_PID_FILE"
    fi

    # 确保端口释放（清理孤儿进程）
    cleanup_port $BACKEND_PORT

    log "${GREEN}✓ 后端服务已停止${NC}"
}

# ============================================================
# 停止前端
# ============================================================
stop_frontend() {
    log "${YELLOW}正在停止前端服务...${NC}"

    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if kill -0 $pid 2>/dev/null; then
            # 杀死 npm 及其子进程（vite dev server）
            pkill -P $pid 2>/dev/null
            kill $pid 2>/dev/null
            sleep 1
            # 强制清理
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null
            fi
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi

    # 确保端口释放
    cleanup_port $FRONTEND_PORT

    log "${GREEN}✓ 前端服务已停止${NC}"
}

# ============================================================
# 启动全部
# ============================================================
do_start() {
    log "${BLUE}========== 启动财务记账系统 ==========${NC}"
    start_backend
    local be_status=$?
    echo ""
    start_frontend
    local fe_status=$?
    echo ""

    if [ $be_status -eq 0 ] && [ $fe_status -eq 0 ]; then
        log "${GREEN}========== 系统启动完成 ==========${NC}"
        log ""
        log "  前端界面: ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
        log "  后端API:  ${BLUE}http://localhost:$BACKEND_PORT${NC}"
        log "  API文档:  ${BLUE}http://localhost:$BACKEND_PORT/docs${NC}"
    else
        log "${RED}========== 系统启动异常，请检查日志 ==========${NC}"
        return 1
    fi
}

# ============================================================
# 停止全部
# ============================================================
do_stop() {
    log "${BLUE}========== 停止财务记账系统 ==========${NC}"
    stop_backend
    echo ""
    stop_frontend
    echo ""
    log "${GREEN}========== 系统已停止 ==========${NC}"
}

# ============================================================
# 重启全部
# ============================================================
do_restart() {
    log "${BLUE}========== 重启财务记账系统 ==========${NC}"
    do_stop
    echo ""
    sleep 2
    do_start
}

# ============================================================
# 更新并重启（git pull + 重装依赖 + 重启）
# ============================================================
do_update() {
    log "${BLUE}========== 更新并重启财务记账系统 ==========${NC}"
    echo ""

    # 1. 停止服务
    log "${YELLOW}[1/4] 停止服务...${NC}"
    do_stop
    echo ""

    # 2. 拉取更新
    log "${YELLOW}[2/4] 拉取最新代码...${NC}"
    cd "$SCRIPT_DIR"
    if git pull 2>&1; then
        log "${GREEN}✓ 代码更新成功${NC}"
    else
        log "${RED}✗ 代码更新失败，可能有冲突需要手动解决${NC}"
        log "${YELLOW}仍将尝试启动旧版本...${NC}"
    fi
    echo ""

    # 3. 更新依赖
    log "${YELLOW}[3/4] 更新依赖...${NC}"
    # 后端依赖
    $PYTHON -m pip install -r "$SCRIPT_DIR/server/requirements.txt" --user --quiet 2>&1
    log "  ✓ 后端依赖已更新"
    # 前端依赖
    cd "$SCRIPT_DIR"
    npm install --silent 2>&1
    log "  ✓ 前端依赖已更新"
    echo ""

    # 4. 启动服务
    log "${YELLOW}[4/4] 启动服务...${NC}"
    do_start
}

# ============================================================
# 查看状态
# ============================================================
do_status() {
    echo -e "${BLUE}========== 服务状态 ==========${NC}"
    echo ""

    # 后端状态
    local be_running=false
    if [ -f "$BACKEND_PID_FILE" ] && kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        be_running=true
        local be_pid=$(cat "$BACKEND_PID_FILE")
        echo -e "后端服务: ${GREEN}● 运行中${NC} (PID: $be_pid)"
        echo -e "  地址: http://localhost:$BACKEND_PORT"
        # 检查是否响应
        if curl -s "http://localhost:$BACKEND_PORT/docs" > /dev/null 2>&1; then
            echo -e "  健康: ${GREEN}正常${NC}"
        else
            echo -e "  健康: ${YELLOW}进程在运行但未响应${NC}"
        fi
    else
        echo -e "后端服务: ${RED}● 未运行${NC}"
    fi

    echo ""

    # 前端状态
    local fe_running=false
    if [ -f "$FRONTEND_PID_FILE" ] && kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
        fe_running=true
        local fe_pid=$(cat "$FRONTEND_PID_FILE")
        echo -e "前端服务: ${GREEN}● 运行中${NC} (PID: $fe_pid)"
        echo -e "  地址: http://localhost:$FRONTEND_PORT"
        if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
            echo -e "  健康: ${GREEN}正常${NC}"
        else
            echo -e "  健康: ${YELLOW}进程在运行但未响应${NC}"
        fi
    else
        echo -e "前端服务: ${RED}● 未运行${NC}"
    fi

    echo ""

    # 自启动状态
    local plist="$HOME/Library/LaunchAgents/com.zysw.finance.plist"
    if [ -f "$plist" ]; then
        echo -e "开机自启: ${GREEN}● 已启用${NC}"
    else
        echo -e "开机自启: ${RED}● 未启用${NC}"
        echo -e "  安装自启: ./auto-start-install.sh"
    fi

    echo ""
}

# ============================================================
# 查看日志
# ============================================================
do_logs() {
    local target=${1:-all}
    case $target in
        backend|be)
            echo -e "${BLUE}===== 后端日志 (最后 50 行) =====${NC}"
            [ -f "$BACKEND_LOG" ] && tail -50 "$BACKEND_LOG" || echo "暂无日志"
            ;;
        frontend|fe)
            echo -e "${BLUE}===== 前端日志 (最后 50 行) =====${NC}"
            [ -f "$FRONTEND_LOG" ] && tail -50 "$FRONTEND_LOG" || echo "暂无日志"
            ;;
        service)
            echo -e "${BLUE}===== 服务管理日志 (最后 50 行) =====${NC}"
            [ -f "$SERVICE_LOG" ] && tail -50 "$SERVICE_LOG" || echo "暂无日志"
            ;;
        *)
            echo -e "${BLUE}===== 后端日志 (最后 20 行) =====${NC}"
            [ -f "$BACKEND_LOG" ] && tail -20 "$BACKEND_LOG" || echo "暂无日志"
            echo ""
            echo -e "${BLUE}===== 前端日志 (最后 20 行) =====${NC}"
            [ -f "$FRONTEND_LOG" ] && tail -20 "$FRONTEND_LOG" || echo "暂无日志"
            ;;
    esac
}

# ============================================================
# 使用说明
# ============================================================
show_usage() {
    echo -e "${BLUE}小微企业财务记账系统 - 服务管理${NC}"
    echo ""
    echo "用法: $0 {命令}"
    echo ""
    echo "命令:"
    echo "  start       启动所有服务"
    echo "  stop        停止所有服务"
    echo "  restart     重启所有服务"
    echo "  update      拉取更新 + 重装依赖 + 重启"
    echo "  status      查看服务状态"
    echo "  logs [类型] 查看日志 (backend/frontend/service/all)"
    echo ""
    echo "示例:"
    echo "  ./service.sh start           # 启动系统"
    echo "  ./service.sh stop            # 停止系统"
    echo "  ./service.sh restart         # 重启系统"
    echo "  ./service.sh update          # 更新代码并重启"
    echo "  ./service.sh status          # 查看运行状态"
    echo "  ./service.sh logs backend    # 查看后端日志"
    echo ""
}

# ============================================================
# 主入口
# ============================================================
case "${1:-}" in
    start)
        do_start
        ;;
    stop)
        do_stop
        ;;
    restart)
        do_restart
        ;;
    update)
        do_update
        ;;
    status)
        do_status
        ;;
    logs|log)
        do_logs "${2:-all}"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
