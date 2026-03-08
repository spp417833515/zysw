from pathlib import Path

from pydantic_settings import BaseSettings

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./data.db"
    PORT: int = 3001
    ECHO_SQL: bool = False
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://10.0.0.247:5173"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
