import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.backup import service
from app.config import BACKUP_DIR
from app.response import success

router = APIRouter(prefix="/backups", tags=["backup"])


def _safe_backup_path(name: str) -> Path:
    path = BACKUP_DIR / name
    if path.parent != BACKUP_DIR or not name.endswith(".zip"):
        raise HTTPException(status_code=400, detail="非法的备份文件名")
    if not path.exists():
        raise HTTPException(status_code=404, detail="备份不存在")
    return path


@router.get("")
async def list_backups():
    return success(service.list_backups())


@router.post("")
async def create_backup():
    return success(await service.create_backup(tag="manual"), message="备份成功")


@router.get("/{name}/download")
async def download_backup(name: str):
    return FileResponse(_safe_backup_path(name), filename=name, media_type="application/zip")


@router.post("/{name}/restore")
async def restore_from_existing(name: str):
    path = _safe_backup_path(name)
    try:
        await service.restore_backup(path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return success(None, message="恢复成功")


@router.post("/restore")
async def restore_from_upload(file: UploadFile = File(...)):
    tmp = BACKUP_DIR / f".upload_{uuid.uuid4().hex}.zip"
    try:
        tmp.write_bytes(await file.read())
        await service.restore_backup(tmp)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        tmp.unlink(missing_ok=True)
    return success(None, message="恢复成功")
