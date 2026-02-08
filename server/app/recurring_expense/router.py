from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.recurring_expense import service
from app.recurring_expense.schemas import RecurringExpenseCreate, RecurringExpenseUpdate
from app.deps import get_db
from app.response import error, success

router = APIRouter(prefix="/recurring-expenses", tags=["recurring-expenses"])


@router.get("")
async def list_items(db: AsyncSession = Depends(get_db)):
    items = await service.get_all(db)
    return success(items)


@router.post("")
async def create_item(data: RecurringExpenseCreate, db: AsyncSession = Depends(get_db)):
    item = await service.create(db, data)
    return success(item)


@router.put("/{item_id}")
async def update_item(
    item_id: str, data: RecurringExpenseUpdate, db: AsyncSession = Depends(get_db)
):
    item = await service.update(db, item_id, data)
    if not item:
        return error("Recurring expense not found", code=404)
    return success(item)


@router.delete("/{item_id}")
async def delete_item(item_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete(db, item_id)
    if not deleted:
        return error("Recurring expense not found", code=404)
    return success(None)
