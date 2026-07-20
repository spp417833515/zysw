#!/bin/bash
# 一键部署到软路由容器：./deploy.sh
# 免密码：export ZYSW_ROUTER_PASS='xxx'（需已安装 sshpass），否则按提示输入密码
set -e

ROUTER="root@10.0.0.1"
REMOTE_DIR="/mnt/sata1-4"
PORT=46137
IMAGE="zysw-finance:latest"

SSH="ssh -o StrictHostKeyChecking=no"
SCP="scp -o StrictHostKeyChecking=no"
if [ -n "$ZYSW_ROUTER_PASS" ] && command -v sshpass >/dev/null; then
  export SSHPASS="$ZYSW_ROUTER_PASS"
  SSH="sshpass -e $SSH"
  SCP="sshpass -e $SCP"
fi

echo "==> 构建镜像 (linux/amd64)"
docker buildx build --platform linux/amd64 -t $IMAGE --load .

echo "==> 导出并传输到软路由"
docker save $IMAGE | gzip > /tmp/zysw-image.tar.gz
$SCP /tmp/zysw-image.tar.gz $ROUTER:$REMOTE_DIR/
rm /tmp/zysw-image.tar.gz

echo "==> 更新容器（数据卷 $REMOTE_DIR/zysw-data 原样保留）"
$SSH $ROUTER "docker load < $REMOTE_DIR/zysw-image.tar.gz \
  && docker rm -f zysw-finance 2>/dev/null; \
  docker run -d --name zysw-finance --restart unless-stopped \
    -p $PORT:39721 -v $REMOTE_DIR/zysw-data:/data $IMAGE \
  && rm $REMOTE_DIR/zysw-image.tar.gz"

echo "==> 验证"
sleep 6
curl -sf "http://${ROUTER#root@}:$PORT/health" >/dev/null \
  && echo "部署完成: http://${ROUTER#root@}:$PORT" \
  || { echo "健康检查失败，请查看容器日志"; exit 1; }
