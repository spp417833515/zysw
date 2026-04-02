#!/bin/bash

# 小微企业财务记账系统 - 开机自启动卸载脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.zysw.finance"
PLIST_FILE="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  财务记账系统 - 卸载开机自启动${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if [ ! -f "$PLIST_FILE" ]; then
    echo -e "${YELLOW}开机自启动未安装，无需卸载${NC}"
    exit 0
fi

# 卸载 LaunchAgent
echo -e "${YELLOW}正在卸载开机自启动...${NC}"
launchctl bootout "gui/$(id -u)/${PLIST_NAME}" 2>/dev/null

# 删除 plist 文件
rm -f "$PLIST_FILE"

# 验证
if [ ! -f "$PLIST_FILE" ]; then
    echo -e "${GREEN}✓ 开机自启动已卸载${NC}"
    echo ""
    echo -e "${YELLOW}注意: 当前正在运行的服务不会受影响${NC}"
    echo -e "  停止服务请运行: ${BLUE}./service.sh stop${NC}"
    echo -e "  重新安装请运行: ${BLUE}./auto-start-install.sh${NC}"
else
    echo -e "${RED}✗ 卸载失败，请手动删除: ${PLIST_FILE}${NC}"
    exit 1
fi
