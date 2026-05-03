#!/bin/bash

# 小微企业财务记账系统 - 开机启动 安装/卸载脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.zysw.finance.plist"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

install_service() {
    echo -e "${BLUE}正在安装开机启动服务...${NC}"

    # 创建日志目录
    mkdir -p "$SCRIPT_DIR/logs"
    mkdir -p "$HOME/Library/LaunchAgents"

    # 如果已存在，先卸载
    if [ -f "$PLIST_DST" ]; then
        echo -e "${YELLOW}检测到已安装，先卸载旧服务...${NC}"
        launchctl unload "$PLIST_DST" 2>/dev/null
        rm -f "$PLIST_DST"
    fi

    # 复制 plist 文件
    cp "$PLIST_SRC" "$PLIST_DST"

    # 加载服务
    launchctl load "$PLIST_DST"

    if launchctl list | grep -q "com.zysw.finance"; then
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  开机启动服务安装成功！${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo -e "  服务名称: ${BLUE}com.zysw.finance${NC}"
        echo -e "  后端地址: ${BLUE}http://localhost:39721${NC}"
        echo -e "  前端地址: ${BLUE}http://localhost:42617${NC}"
        echo -e "  日志目录: ${BLUE}$SCRIPT_DIR/logs/${NC}"
        echo ""
        echo -e "  ${YELLOW}服务将在每次开机后自动启动，异常退出后自动重启${NC}"
        echo ""
    else
        echo -e "${RED}安装失败，请检查错误信息${NC}"
        exit 1
    fi
}

uninstall_service() {
    echo -e "${BLUE}正在卸载开机启动服务...${NC}"

    if [ -f "$PLIST_DST" ]; then
        launchctl unload "$PLIST_DST" 2>/dev/null
        rm -f "$PLIST_DST"
        echo -e "${GREEN}开机启动服务已卸载${NC}"
    else
        echo -e "${YELLOW}未检测到已安装的开机启动服务${NC}"
    fi
}

status_service() {
    echo -e "${BLUE}服务状态：${NC}"
    echo ""

    if [ -f "$PLIST_DST" ]; then
        echo -e "  plist 文件: ${GREEN}已安装${NC}"
    else
        echo -e "  plist 文件: ${RED}未安装${NC}"
    fi

    if launchctl list | grep -q "com.zysw.finance"; then
        echo -e "  launchd 状态: ${GREEN}已加载${NC}"
    else
        echo -e "  launchd 状态: ${RED}未加载${NC}"
    fi

    if [ -f "$SCRIPT_DIR/.backend.pid" ] && kill -0 $(cat "$SCRIPT_DIR/.backend.pid") 2>/dev/null; then
        echo -e "  后端服务: ${GREEN}运行中${NC} (PID: $(cat "$SCRIPT_DIR/.backend.pid"))"
    else
        echo -e "  后端服务: ${RED}未运行${NC}"
    fi

    if [ -f "$SCRIPT_DIR/.frontend.pid" ] && kill -0 $(cat "$SCRIPT_DIR/.frontend.pid") 2>/dev/null; then
        echo -e "  前端服务: ${GREEN}运行中${NC} (PID: $(cat "$SCRIPT_DIR/.frontend.pid"))"
    else
        echo -e "  前端服务: ${RED}未运行${NC}"
    fi
}

restart_service() {
    echo -e "${BLUE}正在重启服务...${NC}"
    if [ -f "$PLIST_DST" ]; then
        launchctl unload "$PLIST_DST" 2>/dev/null
        sleep 2
        launchctl load "$PLIST_DST"
        echo -e "${GREEN}服务已重启${NC}"
    else
        echo -e "${RED}服务未安装，请先执行 install${NC}"
    fi
}

case "${1:-}" in
    install)
        install_service
        ;;
    uninstall|remove)
        uninstall_service
        ;;
    status)
        status_service
        ;;
    restart)
        restart_service
        ;;
    *)
        echo ""
        echo -e "${BLUE}小微企业财务记账系统 - 开机启动管理${NC}"
        echo ""
        echo "用法: $0 {install|uninstall|status|restart}"
        echo ""
        echo "  install    - 安装开机启动服务（注册 + 立即启动）"
        echo "  uninstall  - 卸载开机启动服务"
        echo "  status     - 查看服务状态"
        echo "  restart    - 重启服务"
        echo ""
        ;;
esac
