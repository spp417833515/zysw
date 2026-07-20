# 小微企业财务记账系统

React + Antd 前端，FastAPI + SQLite 后端。

## 生产环境（软路由容器）

正式服务跑在软路由 Docker 里：**http://10.0.0.1:46137**

- 数据（数据库/附件/备份）在路由器 `/mnt/sata1-4/zysw-data`，容器重建不丢
- 容器内每天自动备份一次（保留 30 份），设置页可手动备份/下载/恢复
- 断电重启后容器自动拉起（restart=unless-stopped）

## 日常工作流（换任何电脑都一样）

```bash
git clone https://github.com/spp417833515/zysw && cd zysw   # 1. 拉代码
# ... 改代码、本地调试 ...                                    # 2. 升级
git add -A && git commit -m "..." && git push                # 3. 备份推送
./deploy.sh                                                  # 4. 一键部署到软路由
```

`deploy.sh` 会自动：构建 amd64 镜像 → 传到路由器 → 换新容器（数据卷不动）→ 健康检查。
需要本机装有 Docker；免密码可 `export ZYSW_ROUTER_PASS='...'`（配合 sshpass）。

## 本地开发（手动启动，不再开机自启）

```bash
# 后端 :3001（首次先 python3 -m venv server/.venv && server/.venv/bin/pip install -r server/requirements.txt）
cd server && .venv/bin/python -m uvicorn app.main:app --port 3001 --reload
# 前端 :42617（vite 代理 /api 到后端，见 vite.config.ts）
npm run dev
```

## 数据备份 / 恢复

- 自动：每天一次，打包 data.db + uploads 为 zip，存 `DATA_DIR/backups`，保留最近 30 份
- 手动：设置页「数据备份」可立即备份 / 下载 / 一键恢复 / 上传 zip 恢复
- 恢复前系统自动生成一次 `pre_restore` 安全备份
- 生产数据只在软路由上，建议定期从设置页下载备份 zip 存到别处

环境变量（可选，写 `server/.env`）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `DATA_DIR` | `server/` | 数据目录（data.db / uploads / backups） |
| `BACKUP_KEEP` | 30 | 备份保留份数 |
| `BACKUP_INTERVAL_HOURS` | 24 | 自动备份间隔 |
