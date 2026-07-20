"""数据备份/恢复核心逻辑。

备份 = 一个 zip：data.db（SQLite VACUUM INTO 热备，不停服）+ uploads/ 全部附件。
恢复 = 校验 zip → 先做安全备份 → 断开数据库连接 → 覆盖 data.db 与 uploads → 自动重连。
"""
import asyncio
import shutil
import sqlite3
import zipfile
from datetime import datetime
from pathlib import Path

from app.config import BACKUP_DIR, DB_PATH, UPLOAD_DIR, settings

BACKUP_PREFIX = "backup_"


def _backup_info(path: Path) -> dict:
    stat = path.stat()
    return {
        "name": path.name,
        "size": stat.st_size,
        "createdAt": datetime.fromtimestamp(stat.st_mtime).astimezone().isoformat(),
    }


def list_backups() -> list[dict]:
    files = sorted(BACKUP_DIR.glob(f"{BACKUP_PREFIX}*.zip"), reverse=True)
    return [_backup_info(p) for p in files]


def _snapshot_db(dest: Path) -> None:
    """SQLite 原生 VACUUM INTO：生成一致性快照，不阻塞在线读写。"""
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("VACUUM INTO ?", (str(dest),))
    finally:
        conn.close()


def _create_backup_sync(tag: str) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_path = BACKUP_DIR / f"{BACKUP_PREFIX}{stamp}_{tag}.zip"
    tmp_db = BACKUP_DIR / f".tmp_{stamp}.db"
    _snapshot_db(tmp_db)
    try:
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(tmp_db, "data.db")
            for f in UPLOAD_DIR.rglob("*"):
                if f.is_file():
                    zf.write(f, f"uploads/{f.relative_to(UPLOAD_DIR)}")
    finally:
        tmp_db.unlink(missing_ok=True)
    return zip_path


def _rotate_sync(keep: int) -> None:
    if keep <= 0:
        return
    files = sorted(BACKUP_DIR.glob(f"{BACKUP_PREFIX}*.zip"))
    for old in files[:-keep]:
        old.unlink(missing_ok=True)


async def create_backup(tag: str = "manual") -> dict:
    path = await asyncio.to_thread(_create_backup_sync, tag)
    await asyncio.to_thread(_rotate_sync, settings.BACKUP_KEEP)
    return _backup_info(path)


def _validate_zip(zip_path: Path) -> None:
    try:
        with zipfile.ZipFile(zip_path) as zf:
            if "data.db" not in zf.namelist():
                raise ValueError("备份文件无效：缺少 data.db")
            with zf.open("data.db") as f:
                if f.read(16) != b"SQLite format 3\x00":
                    raise ValueError("备份文件无效：data.db 不是 SQLite 数据库")
    except zipfile.BadZipFile:
        raise ValueError("备份文件无效：不是合法的 zip 文件")


def _restore_files_sync(zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path) as zf:
        # 连同 WAL 残留一起清掉，避免旧日志污染还原后的库
        for suffix in ("", "-wal", "-shm"):
            Path(str(DB_PATH) + suffix).unlink(missing_ok=True)
        with zf.open("data.db") as src, open(DB_PATH, "wb") as dst:
            shutil.copyfileobj(src, dst)

        shutil.rmtree(UPLOAD_DIR, ignore_errors=True)
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        upload_root = UPLOAD_DIR.resolve()
        for member in zf.namelist():
            if not member.startswith("uploads/") or member.endswith("/"):
                continue
            dest = (UPLOAD_DIR / Path(member).relative_to("uploads")).resolve()
            if not dest.is_relative_to(upload_root):  # zip 路径穿越防护
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, open(dest, "wb") as dst:
                shutil.copyfileobj(src, dst)


async def restore_backup(zip_path: Path) -> None:
    """从备份 zip 整体还原（恢复前自动做一次 pre_restore 安全备份）。"""
    await asyncio.to_thread(_validate_zip, zip_path)
    await create_backup(tag="pre_restore")

    from app.database import engine
    await engine.dispose()  # 关闭连接池，之后的请求会自动连上还原后的库
    await asyncio.to_thread(_restore_files_sync, zip_path)


async def backup_scheduler() -> None:
    """常驻任务：最近一次备份超过间隔就自动备一次，每小时醒来检查。"""
    while True:
        try:
            files = sorted(BACKUP_DIR.glob(f"{BACKUP_PREFIX}*.zip"), reverse=True)
            interval = settings.BACKUP_INTERVAL_HOURS * 3600
            due = (
                not files
                or datetime.now().timestamp() - files[0].stat().st_mtime >= interval
            )
            if due:
                info = await create_backup(tag="auto")
                print(f"[自动备份] 已生成 {info['name']}")
        except Exception as e:  # 备份失败不能拖垮主服务，记录后等下一轮
            print(f"⚠️  [自动备份] 失败: {e}")
        await asyncio.sleep(3600)
