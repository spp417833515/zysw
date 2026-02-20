from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.response import error, success
from app.transaction import service
from app.transaction.schemas import (
    ConfirmInvoiceRequest,
    ConfirmPaymentRequest,
    ConfirmTaxRequest,
    TransactionCreate,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/pending/payments")
async def pending_payments(db: AsyncSession = Depends(get_db)):
    items = await service.get_pending_payments(db)
    return success(items)


@router.get("/pending/invoices")
async def pending_invoices(db: AsyncSession = Depends(get_db)):
    items = await service.get_pending_invoices(db)
    return success(items)


@router.get("/pending/taxes")
async def pending_taxes(db: AsyncSession = Depends(get_db)):
    items = await service.get_pending_taxes(db)
    return success(items)


@router.get("")
async def list_transactions(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    categoryId: Optional[str] = None,
    accountId: Optional[str] = None,
    dateStart: Optional[str] = None,
    dateEnd: Optional[str] = None,
    keyword: Optional[str] = None,
    amountMin: Optional[float] = None,
    amountMax: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_transactions(
        db,
        page=page,
        page_size=pageSize,
        type_filter=type,
        category_id=categoryId,
        account_id=accountId,
        date_start=dateStart,
        date_end=dateEnd,
        keyword=keyword,
        amount_min=amountMin,
        amount_max=amountMax,
    )
    return success(result)


@router.get("/{txn_id}")
async def get_transaction(txn_id: str, db: AsyncSession = Depends(get_db)):
    txn = await service.get_transaction_by_id(db, txn_id)
    if not txn:
        return error("Transaction not found", code=404)
    return success(txn)


@router.post("")
async def create_transaction(data: TransactionCreate, db: AsyncSession = Depends(get_db)):
    txn = await service.create_transaction(db, data)
    return success(txn)


@router.put("/{txn_id}")
async def update_transaction(
    txn_id: str, data: TransactionUpdate, db: AsyncSession = Depends(get_db)
):
    txn = await service.update_transaction(db, txn_id, data)
    if not txn:
        return error("Transaction not found", code=404)
    return success(txn)


@router.delete("/{txn_id}")
async def delete_transaction(txn_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete_transaction(db, txn_id)
    if not deleted:
        return error("Transaction not found", code=404)
    return success(None)


@router.post("/{txn_id}/confirm-payment")
async def confirm_payment(
    txn_id: str, data: ConfirmPaymentRequest, db: AsyncSession = Depends(get_db)
):
    txn = await service.confirm_payment(db, txn_id, data.accountType)
    if not txn:
        return error("Transaction not found", code=404)
    return success(txn)


@router.post("/{txn_id}/confirm-invoice")
async def confirm_invoice(
    txn_id: str, data: ConfirmInvoiceRequest, db: AsyncSession = Depends(get_db)
):
    txn = await service.confirm_invoice(db, txn_id, data.invoiceId)
    if not txn:
        return error("Transaction not found", code=404)
    return success(txn)


@router.post("/{txn_id}/skip-invoice")
async def skip_invoice(txn_id: str, db: AsyncSession = Depends(get_db)):
    txn = await service.skip_invoice(db, txn_id)
    if not txn:
        return error("Transaction not found", code=404)
    return success(txn)


@router.post("/{txn_id}/confirm-tax")
async def confirm_tax(
    txn_id: str, data: ConfirmTaxRequest, db: AsyncSession = Depends(get_db)
):
    txn = await service.confirm_tax(db, txn_id, data.taxPeriod)
    if not txn:
        return error("Transaction not found", code=404)
    return success(txn)
