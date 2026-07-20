from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent  # server/


class Settings(BaseSettings):
    # 数据目录：data.db / uploads / backups 全部集中于此，容器部署时挂载这一个目录即可
    DATA_DIR: str = str(BASE_DIR)
    DATABASE_URL: str = ""  # 留空则自动指向 DATA_DIR/data.db
    PORT: int = 3001
    ECHO_SQL: bool = False
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://10.0.0.247:5173"
    BACKUP_KEEP: int = 30  # 备份保留份数，超出自动轮转删除
    BACKUP_INTERVAL_HOURS: int = 24  # 自动备份间隔（小时）

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

DATA_DIR = Path(settings.DATA_DIR).resolve()
DB_PATH = DATA_DIR / "data.db"
UPLOAD_DIR = DATA_DIR / "uploads"
BACKUP_DIR = DATA_DIR / "backups"
for _dir in (DATA_DIR, UPLOAD_DIR, BACKUP_DIR):
    _dir.mkdir(parents=True, exist_ok=True)

if not settings.DATABASE_URL:
    settings.DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"
