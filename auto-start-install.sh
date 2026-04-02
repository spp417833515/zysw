#!/bin/bash

# 小微企业财务记账系统 - 开机自启动安装脚本
# 使用 macOS launchd 实现登录自动启动

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
echo -e "${BLUE}  财务记账系统 - 开机自启动安装${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 确保 LaunchAgents 目录存在
mkdir -p "$HOME/Library/LaunchAgents"

# 如果已安装，先卸载旧的
if [ -f "$PLIST_FILE" ]; then
    echo -e "${YELLOW}检测到已有配置，正在更新...${NC}"
    launchctl bootout "gui/$(id -u)/${PLIST_NAME}" 2>/dev/null
    rm -f "$PLIST_FILE"
    sleep 1
fi

# 创建 LaunchAgent plist
cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${SCRIPT_DIR}/service.sh</string>
        <string>start</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>

    <key>StandardOutPath</key>
    <string>${SCRIPT_DIR}/launchd-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>${SCRIPT_DIR}/launchd-stderr.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>${HOME}</string>
    </dict>

    <!-- 启动失败后10秒重试 -->
    <key>ThrottleInterval</key>
    <integer>10</integer>

    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
EOF

# 加载 LaunchAgent
launchctl bootstrap "gui/$(id -u)" "$PLIST_FILE" 2>/dev/null
if [ $? -eq 0 ] || launchctl print "gui/$(id -u)/${PLIST_NAME}" &>/dev/null; then
    echo -e "${GREEN}✓ 开机自启动已安装成功${NC}"
    echo ""
    echo -e "  配置文件: ${BLUE}${PLIST_FILE}${NC}"
    echo -e "  启动脚本: ${BLUE}${SCRIPT_DIR}/service.sh${NC}"
    echo ""
    echo -e "${GREEN}系统将在下次登录时自动启动财务记账系统${NC}"
    echo ""
    echo -e "${YELLOW}其他操作：${NC}"
    echo -e "  卸载自启动: ${BLUE}./auto-start-uninstall.sh${NC}"
    echo -e "  手动启动:   ${BLUE}./service.sh start${NC}"
    echo -e "  手动停止:   ${BLUE}./service.sh stop${NC}"
    echo -e "  查看状态:   ${BLUE}./service.sh status${NC}"
    echo -e "  更新重启:   ${BLUE}./service.sh restart${NC}"
else
    echo -e "${RED}✗ 开机自启动安装失败${NC}"
    echo -e "  请检查日志: ${SCRIPT_DIR}/launchd-stderr.log"
    exit 1
fi
