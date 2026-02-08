from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.budget import service
from app.budget.schemas import BudgetCreate, BudgetUpdate
from app.deps import get_db
from app.response import error, success

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("")
async def list_budgets(db: AsyncSession = Depends(get_db)):
    budgets = await service.get_budgets(db)
    return success(budgets)


@router.post("")
async def create_budget(data: BudgetCreate, db: AsyncSession = Depends(get_db)):
    budget = await service.create_budget(db, data)
    return success(budget)


@router.put("/{budget_id}")
async def update_budget(
    budget_id: str, data: BudgetUpdate, db: AsyncSession = Depends(get_db)
):
    budget = await service.update_budget(db, budget_id, data)
    if not budget:
        return error("Budget not found", code=404)
    return success(budget)


@router.delete("/{budget_id}")
async def delete_budget(budget_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete_budget(db, budget_id)
    if not deleted:
        return error("Budget not found", code=404)
    return success(None)
