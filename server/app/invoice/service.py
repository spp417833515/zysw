import json
import re
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.invoice.models import Invoice
from app.invoice.schemas import InvoiceCreate, InvoiceUpdate
from app.plugin.base import registry
from app.transaction.models import Transaction
from app.settings.models import CompanyInfo


def _to_dict(inv: Invoice) -> dict:
    return {
        "id": inv.id,
        "code": inv.code,
        "number": inv.number,
        "type": inv.type,
        "direction": inv.direction,
        "amount": float(inv.amount),
        "taxAmount": float(inv.tax_amount),
        "totalAmount": float(inv.total_amount),
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


async def get_invoices(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    direction: Optional[str] = None,
    invoice_type: Optional[str] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> dict:
    """分页、筛选查询发票列表"""
    conditions = []

    if direction:
        conditions.append(Invoice.direction == direction)
    if invoice_type:
        conditions.append(Invoice.type == invoice_type)
    if status:
        conditions.append(Invoice.status == status)
    if start_date:
        conditions.append(Invoice.issue_date >= start_date)
    if end_date:
        conditions.append(Invoice.issue_date <= end_date)
    if keyword:
        kw = f"%{keyword}%"
        conditions.append(or_(
            Invoice.number.like(kw),
            Invoice.code.like(kw),
            Invoice.buyer_name.like(kw),
            Invoice.seller_name.like(kw),
        ))

    where_clause = and_(*conditions) if conditions else True

    # 总数
    count_result = await db.execute(
        select(func.count(Invoice.id)).where(where_clause)
    )
    total = count_result.scalar() or 0

    # 分页数据
    result = await db.execute(
        select(Invoice)
        .where(where_clause)
        .order_by(desc(Invoice.issue_date))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    invoices = [_to_dict(inv) for inv in result.scalars().all()]

    return {
        "data": invoices,
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


async def get_invoice_stats(db: AsyncSession) -> dict:
    """发票统计"""
    now = datetime.now()
    current_month = f"{now.year}-{now.month:02d}"

    # 总数
    total_result = await db.execute(select(func.count(Invoice.id)))
    total = total_result.scalar() or 0

    # 收到发票合计
    in_result = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total_amount), 0.0),
            func.coalesce(func.sum(Invoice.tax_amount), 0.0),
        ).where(Invoice.direction == "in")
    )
    in_row = in_result.one()

    # 开出发票合计
    out_result = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total_amount), 0.0),
            func.coalesce(func.sum(Invoice.tax_amount), 0.0),
        ).where(Invoice.direction == "out")
    )
    out_row = out_result.one()

    # 本月收到
    in_month_result = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total_amount), 0.0),
        ).where(and_(
            Invoice.direction == "in",
            Invoice.issue_date.like(f"{current_month}%"),
        ))
    )
    in_month = in_month_result.one()

    # 本月开出
    out_month_result = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total_amount), 0.0),
        ).where(and_(
            Invoice.direction == "out",
            Invoice.issue_date.like(f"{current_month}%"),
        ))
    )
    out_month = out_month_result.one()

    # 待验证
    pending_result = await db.execute(
        select(func.count(Invoice.id)).where(Invoice.status == "pending")
    )
    pending = pending_result.scalar() or 0

    return {
        "total": total,
        "pending": pending,
        "received": {
            "count": in_row[0],
            "totalAmount": float(in_row[1]),
            "taxAmount": float(in_row[2]),
        },
        "issued": {
            "count": out_row[0],
            "totalAmount": float(out_row[1]),
            "taxAmount": float(out_row[2]),
        },
        "monthReceived": {
            "count": in_month[0],
            "totalAmount": float(in_month[1]),
        },
        "monthIssued": {
            "count": out_month[0],
            "totalAmount": float(out_month[1]),
        },
    }


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


async def verify_invoice(db: AsyncSession, invoice_id: str) -> Optional[dict]:
    """标记为已验证"""
    inv = await db.get(Invoice, invoice_id)
    if not inv:
        return None
    inv.status = "verified"
    inv.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(inv)
    return _to_dict(inv)


async def void_invoice(db: AsyncSession, invoice_id: str) -> Optional[dict]:
    """作废发票"""
    inv = await db.get(Invoice, invoice_id)
    if not inv:
        return None
    inv.status = "void"
    inv.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(inv)
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


# ============================================================
# 交易→发票 自动同步
# ============================================================
def _parse_invoice_filename(filename: str) -> dict:
    """从发票 PDF 文件名中解析发票号码和对方公司名称。

    常见格式:
      dzfp_26412000000633019336_深圳市圳兴教育科技有限责任公司_20260225203507.pdf
      知域科技（新安县）有限责任公司_3225498240683315868.pdf
    """
    name = filename.rsplit(".", 1)[0] if "." in filename else filename
    parts = name.split("_")

    result = {"number": "", "counterparty": ""}

    if parts[0] == "dzfp" and len(parts) >= 3:
        # 电子发票: dzfp_发票号码_公司名_时间戳
        result["number"] = parts[1]
        result["counterparty"] = parts[2]
    elif len(parts) >= 2:
        # 其他格式: 公司名_编号
        result["counterparty"] = parts[0]
        result["number"] = parts[1]

    return result


async def sync_invoices_from_transactions(db: AsyncSession) -> dict:
    """扫描有发票数据的交易，自动创建对应的发票记录。

    仅处理 invoice_issued=1 或 invoice_images 非空、且尚未关联 invoice 记录的交易。
    """
    # 获取公司信息
    company_result = await db.execute(select(CompanyInfo).limit(1))
    company = company_result.scalar_one_or_none()
    company_name = company.company_name if company else "知域科技（新安县）有限责任公司"
    tax_number = company.tax_number if company else "91410323MAK75U412Y"

    # 查找已有发票关联的 transaction_id 集合
    linked_result = await db.execute(
        select(Invoice.transaction_id).where(Invoice.transaction_id.isnot(None))
    )
    linked_tx_ids = {r[0] for r in linked_result.all()}

    # 查找有发票数据但未关联的交易
    result = await db.execute(
        select(Transaction).where(
            and_(
                or_(
                    Transaction.invoice_issued == True,
                    and_(
                        Transaction.invoice_images.isnot(None),
                        Transaction.invoice_images != "[]",
                    ),
                ),
                Transaction.id.notin_(linked_tx_ids) if linked_tx_ids else True,
            )
        )
    )
    transactions = result.scalars().all()

    created = 0
    skipped = 0

    for tx in transactions:
        # 跳过已关联的
        if tx.id in linked_tx_ids:
            skipped += 1
            continue

        # 解析发票图片
        images = json.loads(tx.invoice_images) if tx.invoice_images else []
        if not images:
            skipped += 1
            continue

        first_image = images[0]
        parsed = _parse_invoice_filename(first_image.get("name", ""))
        image_url = first_image.get("url", "")

        # 确定方向和买卖双方
        if tx.type == "income":
            # 收入 → 我方开出发票 (out)
            direction = "out"
            seller_name = company_name
            seller_tax = tax_number
            buyer_name = parsed["counterparty"] or tx.payer_name or ""
            buyer_tax = ""
        else:
            # 支出 → 我方收到发票 (in)
            direction = "in"
            buyer_name = company_name
            buyer_tax = tax_number
            seller_name = parsed["counterparty"] or tx.payer_name or ""
            seller_tax = ""

        inv = Invoice(
            code="",
            number=parsed["number"],
            type="electronic",
            direction=direction,
            amount=float(tx.amount),
            tax_amount=0.0,
            total_amount=float(tx.amount),
            issue_date=tx.date,
            buyer_name=buyer_name,
            buyer_tax_number=buyer_tax,
            seller_name=seller_name,
            seller_tax_number=seller_tax,
            items="[]",
            transaction_id=tx.id,
            image_url=image_url,
            status="verified" if tx.invoice_completed else "pending",
        )
        db.add(inv)
        created += 1

    if created > 0:
        await db.commit()

    return {"created": created, "skipped": skipped}
