import json
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.invoice.models import Invoice
from app.invoice.schemas import InvoiceCreate, InvoiceUpdate
from app.plugin.base import registry


def _to_dict(inv: Invoice) -> dict:
    return {
        "id": inv.id,
        "code": inv.code,
        "number": inv.number,
        "type": inv.type,
        "direction": inv.direction,
        "amount": inv.amount,
        "taxAmount": inv.tax_amount,
        "totalAmount": inv.total_amount,
        "issueDate": inv.issue_date,
        "buyerName": inv.buyer_name,
        "buyerTaxNumber": inv.buyer_tax_number,
        "sellerName": inv.seller_name,
        "sellerTaxNumber": inv.seller_tax_number,
        "items": json.loads(inv.items) if inv.items else [],
        "transactionId": inv.transaction_id,
        "imageUrl": inv.image_url,
        "status": inv.status,
        "createdAt": inv.created_at,
        "updatedAt": inv.updated_at,
    }


async def get_invoices(db: AsyncSession) -> List[dict]:
    result = await db.execute(select(Invoice).order_by(Invoice.issue_date.desc()))
    return [_to_dict(inv) for inv in result.scalars().all()]


async def get_invoice_by_id(db: AsyncSession, invoice_id: str) -> Optional[dict]:
    inv = await db.get(Invoice, invoice_id)
    return _to_dict(inv) if inv else None


async def create_invoice(db: AsyncSession, data: InvoiceCreate) -> dict:
    inv = Invoice(
        code=data.code,
        number=data.number,
        type=data.type,
        direction=data.direction,
        amount=data.amount,
        tax_amount=data.taxAmount,
        total_amount=data.totalAmount,
        issue_date=data.issueDate,
        buyer_name=data.buyerName,
        buyer_tax_number=data.buyerTaxNumber,
        seller_name=data.sellerName,
        seller_tax_number=data.sellerTaxNumber,
        items=json.dumps([item.model_dump() for item in data.items]),
        transaction_id=data.transactionId,
        image_url=data.imageUrl,
        status=data.status,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    await registry.emit("invoice.created", {"id": inv.id})
    return _to_dict(inv)


async def update_invoice(db: AsyncSession, invoice_id: str, data: InvoiceUpdate) -> Optional[dict]:
    inv = await db.get(Invoice, invoice_id)
    if not inv:
        return None

    update_data = data.model_dump(exclude_unset=True)
    field_map = {
        "taxAmount": "tax_amount",
        "totalAmount": "total_amount",
        "issueDate": "issue_date",
        "buyerName": "buyer_name",
        "buyerTaxNumber": "buyer_tax_number",
        "sellerName": "seller_name",
        "sellerTaxNumber": "seller_tax_number",
        "transactionId": "transaction_id",
        "imageUrl": "image_url",
    }

    items_data = update_data.pop("items", None)
    for key, value in update_data.items():
        attr = field_map.get(key, key)
        setattr(inv, attr, value)

    if items_data is not None:
        inv.items = json.dumps([item if isinstance(item, dict) else item.model_dump() for item in items_data])

    inv.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(inv)
    await registry.emit("invoice.updated", {"id": inv.id})
    return _to_dict(inv)


async def delete_invoice(db: AsyncSession, invoice_id: str) -> bool:
    inv = await db.get(Invoice, invoice_id)
    if not inv:
        return False
    await db.delete(inv)
    await db.commit()
    await registry.emit("invoice.deleted", {"id": invoice_id})
    return True
