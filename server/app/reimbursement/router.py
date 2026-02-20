from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.reimbursement import service
from app.reimbursement.schemas import ReimbursementCreate, ReimbursementComplete
from app.response import error, success

router = APIRouter(prefix="/reimbursements", tags=["reimbursements"])


@router.get("")
async def list_batches(db: AsyncSession = Depends(get_db)):
    return success(await service.get_batches(db))


@router.get("/pending/count")
async def pending_count(db: AsyncSession = Depends(get_db)):
    return success(await service.get_pending_count(db))



@router.post("")
async def create_batch(data: ReimbursementCreate, db: AsyncSession = Depends(get_db)):
    try:
        batch = await service.create_batch(db, data)
        return success(batch)
    except ValueError as e:
        return error(str(e))


@router.put("/{batch_id}/complete")
async def complete_batch(batch_id: str, data: ReimbursementComplete, db: AsyncSession = Depends(get_db)):
    try:
        batch = await service.complete_batch(db, batch_id, data)
    except ValueError as e:
        return error(str(e))
    if not batch:
        return error("报销单不存在或已完成")
    return success(batch)


@router.delete("/{batch_id}")
async def delete_batch(batch_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete_batch(db, batch_id)
    if not deleted:
        return error("报销单不存在或已完成，无法删除")
    return success(None)
