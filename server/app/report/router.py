from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.report import service
from app.response import success

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/profit-loss")
async def profit_loss(
    startDate: str = Query(...),
    endDate: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_profit_loss(db, startDate, endDate)
    return success(data)


@router.get("/cash-flow")
async def cash_flow(
    startDate: str = Query(...),
    endDate: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_cash_flow(db, startDate, endDate)
    return success(data)


@router.get("/category")
async def category_report(
    startDate: str = Query(...),
    endDate: str = Query(...),
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_category_report(db, startDate, endDate, type)
    return success(data)


@router.get("/trend")
async def trend_report(
    startDate: str = Query(...),
    endDate: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_trend_report(db, startDate, endDate)
    return success(data)


@router.get("/receivables")
async def receivables(db: AsyncSession = Depends(get_db)):
    data = await service.get_receivables(db)
    return success(data)


@router.get("/payables")
async def payables(db: AsyncSession = Depends(get_db)):
    data = await service.get_payables(db)
    return success(data)


@router.get("/aging")
async def aging(type: Optional[str] = "receivable", db: AsyncSession = Depends(get_db)):
    data = await service.get_aging_analysis(db, type or "receivable")
    return success(data)
