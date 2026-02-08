import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File
from app.config import UPLOAD_DIR
from app.response import success

router = APIRouter(tags=["upload"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = Path(file.filename or "file").suffix
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename

    content = await file.read()
    dest.write_bytes(content)

    return success({
        "id": filename,
        "name": file.filename,
        "url": f"/uploads/{filename}",
        "type": file.content_type or "",
        "size": len(content),
    })
