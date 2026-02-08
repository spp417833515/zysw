from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.recurring_expense.models import RecurringExpense
from app.recurring_expense.schemas import RecurringExpenseCreate, RecurringExpenseUpdate
from app.category.models import Category
from app.account.models import Account


def _to_dict(item: RecurringExpense, category_name: str = "", account_name: str = "") -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "amount": item.amount,
        "dayOfMonth": item.day_of_month,
        "categoryId": item.category_id,
        "categoryName": category_name,
        "accountId": item.account_id,
        "accountName": account_name,
        "note": item.note,
        "startDate": item.start_date,
        "endDate": item.end_date,
        "durationMonths": item.duration_months,
        "enabled": item.enabled,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
    }


async def _enrich(db: AsyncSession, item: RecurringExpense) -> dict:
    cat_name = ""
    acc_name = ""
    if item.category_id:
        cat = await db.get(Category, item.category_id)
        cat_name = cat.name if cat else ""
    if item.account_id:
        acc = await db.get(Account, item.account_id)
        acc_name = acc.name if acc else ""
    return _to_dict(item, cat_name, acc_name)


async def get_all(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(RecurringExpense).order_by(RecurringExpense.created_at))
    items = result.scalars().all()
    return [await _enrich(db, item) for item in items]


async def create(db: AsyncSession, data: RecurringExpenseCreate) -> dict:
    item = RecurringExpense(
        name=data.name,
        amount=data.amount,
        day_of_month=data.dayOfMonth,
        category_id=data.categoryId,
        account_id=data.accountId,
        note=data.note,
        start_date=data.startDate,
        end_date=data.endDate,
        duration_months=data.durationMonths,
        enabled=data.enabled,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return await _enrich(db, item)


async def update(db: AsyncSession, item_id: str, data: RecurringExpenseUpdate) -> dict | None:
    item = await db.get(RecurringExpense, item_id)
    if not item:
        return None
    update_data = data.model_dump(exclude_unset=True)
    field_map = {
        "dayOfMonth": "day_of_month",
        "categoryId": "category_id",
        "accountId": "account_id",
        "startDate": "start_date",
        "endDate": "end_date",
        "durationMonths": "duration_months",
    }
    for key, value in update_data.items():
        attr = field_map.get(key, key)
        setattr(item, attr, value)
    item.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(item)
    return await _enrich(db, item)


async def delete(db: AsyncSession, item_id: str) -> bool:
    item = await db.get(RecurringExpense, item_id)
    if not item:
        return False
    await db.delete(item)
    await db.commit()
    return True
