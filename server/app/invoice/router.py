from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.invoice import service
from app.invoice.schemas import InvoiceCreate, InvoiceUpdate
from app.response import error, success

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("")
async def list_invoices(db: AsyncSession = Depends(get_db)):
    invoices = await service.get_invoices(db)
    return success(invoices)


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    invoice = await service.get_invoice_by_id(db, invoice_id)
    if not invoice:
        return error("Invoice not found", code=404)
    return success(invoice)


@router.post("")
async def create_invoice(data: InvoiceCreate, db: AsyncSession = Depends(get_db)):
    invoice = await service.create_invoice(db, data)
    return success(invoice)


@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: str, data: InvoiceUpdate, db: AsyncSession = Depends(get_db)
):
    invoice = await service.update_invoice(db, invoice_id, data)
    if not invoice:
        return error("Invoice not found", code=404)
    return success(invoice)


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete_invoice(db, invoice_id)
    if not deleted:
        return error("Invoice not found", code=404)
    return success(None)
