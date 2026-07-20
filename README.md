# 小微企业财务记账系统

React + Antd 前端，FastAPI + SQLite 后端。

## 本地运行（macOS 开机自启已配置）

launchd 服务开机自动启动、崩溃自动重启：

- 后端 `com.zysw.backend` → http://localhost:39721 （API 文档 /docs）
- 前端 `com.zysw.frontend` → http://localhost:42617 （vite dev，代理 /api 到后端）

```bash
# 手动重启 / 查看
launchctl kickstart -k gui/$(id -u)/com.zysw.backend
launchctl list | grep zysw
# 日志在项目 logs/ 目录
```

## 容器部署

```bash
docker compose up -d --build
# 访问 http://localhost:39721 （前端静态文件由 FastAPI 直接托管）
```

数据库、附件、备份全部在挂载目录 `./zysw-data`（容器内 `/data`），迁移主机只需拷走这个目录。

## 数据备份 / 恢复

- 自动：每天一次，打包 data.db + uploads 为 zip，存 `DATA_DIR/backups`，保留最近 30 份
- 手动：设置页「数据备份」可立即备份 / 下载 / 一键恢复 / 上传 zip 恢复
- 恢复前系统自动生成一次 `pre_restore` 安全备份

环境变量（可选，写 `server/.env`）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `DATA_DIR` | `server/` | 数据目录（data.db / uploads / backups） |
| `BACKUP_KEEP` | 30 | 备份保留份数 |
| `BACKUP_INTERVAL_HOURS` | 24 | 自动备份间隔 |
