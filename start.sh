#!/bin/bash

# 小微企业财务记账系统 - macOS启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PID文件
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"

# 显示菜单
show_menu() {
    clear
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  小微企业财务记账系统${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    echo "1. 启动后端服务"
    echo "2. 启动前端服务"
    echo "3. 启动全部服务"
    echo "4. 停止后端服务"
    echo "5. 停止前端服务"
    echo "6. 停止全部服务"
    echo "7. 重启后端服务"
    echo "8. 重启前端服务"
    echo "9. 重启全部服务"
    echo "s. 查看服务状态"
    echo "l. 查看后端日志"
    echo "f. 查看前端日志"
    echo "0. 退出"
    echo ""
    echo -n "请选择操作: "
}

# 启动后端
start_backend() {
    if [ -f "$BACKEND_PID_FILE" ] && kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        echo -e "${YELLOW}后端服务已在运行中${NC}"
        return
    fi

    echo -e "${GREEN}正在启动后端服务...${NC}"
    cd "$SCRIPT_DIR/server"

    # 检查依赖
    if ! python3 -c "import uvicorn" 2>/dev/null; then
        echo -e "${YELLOW}正在安装后端依赖...${NC}"
        python3 -m pip install -r requirements.txt --user
    fi

    # 启动后端
    nohup /Users/admin/Library/Python/3.9/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$SCRIPT_DIR/backend.log" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"

    sleep 2
    if kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        echo -e "${GREEN}✓ 后端服务启动成功${NC}"
        echo -e "  地址: ${BLUE}http://localhost:8000${NC}"
        echo -e "  文档: ${BLUE}http://localhost:8000/docs${NC}"
    else
        echo -e "${RED}✗ 后端服务启动失败，请查看日志${NC}"
        rm -f "$BACKEND_PID_FILE"
    fi
    cd "$SCRIPT_DIR"
}

# 启动前端
start_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ] && kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
        echo -e "${YELLOW}前端服务已在运行中${NC}"
        return
    fi

    echo -e "${GREEN}正在启动前端服务...${NC}"
    cd "$SCRIPT_DIR"

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}正在安装前端依赖...${NC}"
        npm install
    fi

    # 启动前端
    nohup npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"

    sleep 3
    if kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
        echo -e "${GREEN}✓ 前端服务启动成功${NC}"
        echo -e "  地址: ${BLUE}http://localhost:5173${NC}"
    else
        echo -e "${RED}✗ 前端服务启动失败，请查看日志${NC}"
        rm -f "$FRONTEND_PID_FILE"
    fi
}

# 停止后端
stop_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            echo -e "${YELLOW}正在停止后端服务...${NC}"
            kill $PID
            sleep 1
            if kill -0 $PID 2>/dev/null; then
                kill -9 $PID
            fi
            echo -e "${GREEN}✓ 后端服务已停止${NC}"
        fi
        rm -f "$BACKEND_PID_FILE"
    else
        echo -e "${YELLOW}后端服务未运行${NC}"
    fi
}

# 停止前端
stop_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            echo -e "${YELLOW}正在停止前端服务...${NC}"
            # 杀死npm及其子进程
            pkill -P $PID
            kill $PID 2>/dev/null
            sleep 1
            echo -e "${GREEN}✓ 前端服务已停止${NC}"
        fi
        rm -f "$FRONTEND_PID_FILE"
    else
        echo -e "${YELLOW}前端服务未运行${NC}"
    fi
}

# 查看状态
show_status() {
    echo -e "${BLUE}服务状态：${NC}"
    echo ""

    # 后端状态
    if [ -f "$BACKEND_PID_FILE" ] && kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        echo -e "后端服务: ${GREEN}运行中${NC} (PID: $(cat "$BACKEND_PID_FILE"))"
        echo -e "  地址: http://localhost:8000"
    else
        echo -e "后端服务: ${RED}未运行${NC}"
    fi

    # 前端状态
    if [ -f "$FRONTEND_PID_FILE" ] && kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
        echo -e "前端服务: ${GREEN}运行中${NC} (PID: $(cat "$FRONTEND_PID_FILE"))"
        echo -e "  地址: http://localhost:5173"
    else
        echo -e "前端服务: ${RED}未运行${NC}"
    fi
}

# 查看后端日志
show_backend_log() {
    if [ -f "$SCRIPT_DIR/backend.log" ]; then
        echo -e "${BLUE}后端日志 (最后50行):${NC}"
        tail -50 "$SCRIPT_DIR/backend.log"
    else
        echo -e "${YELLOW}暂无后端日志${NC}"
    fi
}

# 查看前端日志
show_frontend_log() {
    if [ -f "$SCRIPT_DIR/frontend.log" ]; then
        echo -e "${BLUE}前端日志 (最后50行):${NC}"
        tail -50 "$SCRIPT_DIR/frontend.log"
    else
        echo -e "${YELLOW}暂无前端日志${NC}"
    fi
}

# 主循环
while true; do
    show_menu
    read choice
    echo ""

    case $choice in
        1)
            start_backend
            ;;
        2)
            start_frontend
            ;;
        3)
            start_backend
            echo ""
            start_frontend
            ;;
        4)
            stop_backend
            ;;
        5)
            stop_frontend
            ;;
        6)
            stop_backend
            echo ""
            stop_frontend
            ;;
        7)
            stop_backend
            echo ""
            start_backend
            ;;
        8)
            stop_frontend
            echo ""
            start_frontend
            ;;
        9)
            stop_backend
            echo ""
            stop_frontend
            echo ""
            start_backend
            echo ""
            start_frontend
            ;;
        s|S)
            show_status
            ;;
        l|L)
            show_backend_log
            ;;
        f|F)
            show_frontend_log
            ;;
        0)
            echo -e "${GREEN}再见！${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}无效选择，请重试${NC}"
            ;;
    esac

    echo ""
    echo -n "按回车键继续..."
    read
done
