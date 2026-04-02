from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.invoice import service
from app.invoice.schemas import InvoiceCreate, InvoiceUpdate
from app.response import error, success

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("")
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    direction: Optional[str] = Query(None, description="in=收到, out=开出"),
    type: Optional[str] = Query(None, description="normal|special|electronic"),
    status: Optional[str] = Query(None, description="pending|verified|void"),
    keyword: Optional[str] = Query(None, description="搜索关键字"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_invoices(
        db,
        page=page,
        page_size=page_size,
        direction=direction,
        invoice_type=type,
        status=status,
        keyword=keyword,
        start_date=start_date,
        end_date=end_date,
    )
    return success(result)


@router.get("/stats")
async def invoice_stats(db: AsyncSession = Depends(get_db)):
    """发票统计（总数、收到/开出金额、本月统计）"""
    # 每次获取统计前，先同步交易中的发票数据
    await service.sync_invoices_from_transactions(db)
    stats = await service.get_invoice_stats(db)
    return success(stats)


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


@router.put("/{invoice_id}/verify")
async def verify_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    """标记发票为已验证"""
    invoice = await service.verify_invoice(db, invoice_id)
    if not invoice:
        return error("Invoice not found", code=404)
    return success(invoice)


@router.put("/{invoice_id}/void")
async def void_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    """作废发票"""
    invoice = await service.void_invoice(db, invoice_id)
    if not invoice:
        return error("Invoice not found", code=404)
    return success(invoice)


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete_invoice(db, invoice_id)
    if not deleted:
        return error("Invoice not found", code=404)
    return success(None)


@router.post("/sync")
async def sync_invoices(db: AsyncSession = Depends(get_db)):
    """手动同步：从交易数据自动创建发票记录"""
    result = await service.sync_invoices_from_transactions(db)
    return success(result)
