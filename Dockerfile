# ---- 阶段一：构建前端（跨架构时在本机原生跑，产物与架构无关） ----
FROM --platform=$BUILDPLATFORM node:22-alpine AS web
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npx vite build

# ---- 阶段二：运行 ----
FROM python:3.12-slim
WORKDIR /app/server

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/app ./app
COPY server/alembic ./alembic
COPY server/alembic.ini .
COPY --from=web /build/dist /app/dist

# 数据（数据库/附件/备份）统一放 /data，用 volume 挂载持久化
ENV DATA_DIR=/data
ENV TZ=Asia/Shanghai

EXPOSE 39721
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:39721/health')" || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "39721"]
