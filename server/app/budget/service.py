from datetime import datetime, timezone

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.budget.models import Budget
from app.budget.schemas import BudgetCreate, BudgetUpdate
from app.category.models import Category
from app.transaction.models import Transaction


def _to_dict(budget: Budget, category_name: str = "") -> dict:
    return {
        "id": budget.id,
        "name": budget.name,
        "categoryId": budget.category_id,
        "categoryName": category_name,
        "amount": budget.amount,
        "spent": budget.spent,
        "period": budget.period,
        "startDate": budget.start_date,
        "endDate": budget.end_date,
        "alertThreshold": budget.alert_threshold,
        "createdAt": budget.created_at,
        "updatedAt": budget.updated_at,
    }


async def _calc_spent(db: AsyncSession, category_id: str, start_date: str, end_date: str) -> float:
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
            and_(
                Transaction.category_id == category_id,
                Transaction.type == "expense",
                Transaction.date >= start_date,
                Transaction.date <= end_date,
            )
        )
    )
    return float(result.scalar() or 0.0)


async def get_budgets(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Budget).order_by(Budget.created_at))
    budgets = result.scalars().all()
    items = []
    for b in budgets:
        spent = await _calc_spent(db, b.category_id, b.start_date, b.end_date)
        b.spent = spent
        cat = await db.get(Category, b.category_id)
        cat_name = cat.name if cat else ""
        items.append(_to_dict(b, cat_name))
    return items


async def create_budget(db: AsyncSession, data: BudgetCreate) -> dict:
    budget = Budget(
        name=data.name,
        category_id=data.categoryId,
        amount=data.amount,
        period=data.period,
        start_date=data.startDate,
        end_date=data.endDate,
        alert_threshold=data.alertThreshold,
    )
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    spent = await _calc_spent(db, budget.category_id, budget.start_date, budget.end_date)
    budget.spent = spent
    cat = await db.get(Category, budget.category_id)
    cat_name = cat.name if cat else ""
    return _to_dict(budget, cat_name)


async def update_budget(db: AsyncSession, budget_id: str, data: BudgetUpdate) -> dict | None:
    budget = await db.get(Budget, budget_id)
    if not budget:
        return None
    update_data = data.model_dump(exclude_unset=True)
    field_map = {
        "categoryId": "category_id",
        "startDate": "start_date",
        "endDate": "end_date",
        "alertThreshold": "alert_threshold",
    }
    for key, value in update_data.items():
        attr = field_map.get(key, key)
        setattr(budget, attr, value)
    budget.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(budget)
    spent = await _calc_spent(db, budget.category_id, budget.start_date, budget.end_date)
    budget.spent = spent
    cat = await db.get(Category, budget.category_id)
    cat_name = cat.name if cat else ""
    return _to_dict(budget, cat_name)


async def delete_budget(db: AsyncSession, budget_id: str) -> bool:
    budget = await db.get(Budget, budget_id)
    if not budget:
        return False
    await db.delete(budget)
    await db.commit()
    return True
