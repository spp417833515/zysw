import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.account.models import Account
from app.category.models import Category
from app.contact.models import Contact
from app.plugin.base import registry
from app.transaction.models import Attachment, Transaction
from app.transaction.schemas import TransactionCreate, TransactionUpdate


def _to_dict(txn: Transaction, attachments: Optional[list] = None,
             category_name: str = "", account_name: str = "", to_account_name: str = "",
             contact_name: str = "") -> dict:
    return {
        "id": txn.id,
        "type": txn.type,
        "amount": float(txn.amount),
        "date": txn.date,
        "categoryId": txn.category_id,
        "categoryName": category_name,
        "accountId": txn.account_id,
        "accountName": account_name,
        "toAccountId": txn.to_account_id,
        "toAccountName": to_account_name,
        "contactId": txn.contact_id,
        "contactName": contact_name,
        "description": txn.description,
        "tags": json.loads(txn.tags) if txn.tags else [],
        "attachments": attachments or [],
        "invoiceId": txn.invoice_id,
        "bookId": txn.book_id,
        "createdAt": txn.created_at,
        "updatedAt": txn.updated_at,
        "paymentConfirmed": txn.payment_confirmed,
        "paymentAccountType": txn.payment_account_type,
        "payerName": txn.payer_name,
        "paymentConfirmedAt": txn.payment_confirmed_at,
        "invoiceNeeded": txn.invoice_needed,
        "invoiceCompleted": txn.invoice_completed,
        "invoiceConfirmedAt": txn.invoice_confirmed_at,
        "taxDeclared": txn.tax_declared,
        "taxDeclaredAt": txn.tax_declared_at,
        "taxPeriod": txn.tax_period,
        "invoiceIssued": txn.invoice_issued,
        "invoiceImages": json.loads(txn.invoice_images) if txn.invoice_images else [],
        "companyAccountDate": txn.company_account_date,
        "companyAccountImages": json.loads(txn.company_account_images) if txn.company_account_images else [],
        "reimbursementBatchId": txn.reimbursement_batch_id,
        "reimbursementStatus": txn.reimbursement_status,
    }


async def _get_attachments(db: AsyncSession, transaction_id: str) -> List[dict]:
    result = await db.execute(
        select(Attachment).where(Attachment.transaction_id == transaction_id)
    )
    return [
        {"id": a.id, "name": a.name, "url": a.url, "type": a.type, "size": a.size}
        for a in result.scalars().all()
    ]


async def _get_name(db: AsyncSession, model, obj_id: Optional[str]) -> str:
    if not obj_id:
        return ""
    obj = await db.get(model, obj_id)
    return obj.name if obj else ""


async def _enrich(db: AsyncSession, txn: Transaction, attachments: Optional[list] = None) -> dict:
    if attachments is None:
        att_result = await _get_attachments(db, txn.id)
    else:
        att_result = attachments
    cat_name = await _get_name(db, Category, txn.category_id)
    acc_name = await _get_name(db, Account, txn.account_id)
    to_acc_name = await _get_name(db, Account, txn.to_account_id)
    contact_name = await _get_name(db, Contact, txn.contact_id)
    return _to_dict(txn, att_result, cat_name, acc_name, to_acc_name, contact_name)


async def _batch_enrich(db: AsyncSession, txns: List[Transaction]) -> List[dict]:
    """Batch enrich transactions: 3 IN queries for names + 1 for attachments instead of N+1."""
    if not txns:
        return []

    # Collect all IDs
    txn_ids = [t.id for t in txns]
    cat_ids = {t.category_id for t in txns if t.category_id}
    acc_ids = {t.account_id for t in txns}
    acc_ids.update(t.to_account_id for t in txns if t.to_account_id)
    contact_ids = {t.contact_id for t in txns if t.contact_id}

    # Batch query names
    cat_map: dict[str, str] = {}
    if cat_ids:
        result = await db.execute(select(Category.id, Category.name).where(Category.id.in_(cat_ids)))
        cat_map = {r[0]: r[1] for r in result.all()}

    acc_map: dict[str, str] = {}
    if acc_ids:
        result = await db.execute(select(Account.id, Account.name).where(Account.id.in_(acc_ids)))
        acc_map = {r[0]: r[1] for r in result.all()}

    contact_map: dict[str, str] = {}
    if contact_ids:
        result = await db.execute(select(Contact.id, Contact.name).where(Contact.id.in_(contact_ids)))
        contact_map = {r[0]: r[1] for r in result.all()}

    # Batch query attachments
    att_result = await db.execute(
        select(Attachment).where(Attachment.transaction_id.in_(txn_ids))
    )
    att_map: dict[str, list] = {}
    for a in att_result.scalars().all():
        att_map.setdefault(a.transaction_id, []).append(
            {"id": a.id, "name": a.name, "url": a.url, "type": a.type, "size": a.size}
        )

    # Assemble results
    items = []
    for txn in txns:
        items.append(_to_dict(
            txn,
            attachments=att_map.get(txn.id, []),
            category_name=cat_map.get(txn.category_id, "") if txn.category_id else "",
            account_name=acc_map.get(txn.account_id, ""),
            to_account_name=acc_map.get(txn.to_account_id, "") if txn.to_account_id else "",
            contact_name=contact_map.get(txn.contact_id, "") if txn.contact_id else "",
        ))
    return items


async def _update_balance(db: AsyncSession, txn_type: str, amount: float,
                          account_id: str, to_account_id: Optional[str],
                          reverse: bool = False, payment_account_type: Optional[str] = None):
    # 个人代付不影响公司账户余额
    if payment_account_type == "personal":
        return
    multiplier = -1 if reverse else 1
    delta = Decimal(str(amount)) * multiplier
    account = await db.get(Account, account_id)
    if account:
        if txn_type == "income":
            account.balance += delta
        elif txn_type == "expense":
            account.balance -= delta
        elif txn_type == "transfer":
            account.balance -= delta
    if txn_type == "transfer" and to_account_id:
        to_account = await db.get(Account, to_account_id)
        if to_account:
            to_account.balance += delta


async def get_transactions(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    type_filter: Optional[str] = None,
    category_id: Optional[str] = None,
    account_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    keyword: Optional[str] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
) -> dict:
    conditions = []
    if type_filter:
        conditions.append(Transaction.type == type_filter)
    if category_id:
        conditions.append(Transaction.category_id == category_id)
    if account_id:
        conditions.append(Transaction.account_id == account_id)
    if contact_id:
        conditions.append(Transaction.contact_id == contact_id)
    if date_start:
        conditions.append(Transaction.date >= date_start)
    if date_end:
        conditions.append(Transaction.date <= date_end)
    if keyword:
        conditions.append(Transaction.description.contains(keyword))
    if amount_min is not None:
        conditions.append(Transaction.amount >= amount_min)
    if amount_max is not None:
        conditions.append(Transaction.amount <= amount_max)

    where_clause = and_(*conditions) if conditions else True

    # Count
    count_result = await db.execute(select(func.count(Transaction.id)).where(where_clause))
    total = count_result.scalar() or 0

    # Query
    result = await db.execute(
        select(Transaction)
        .where(where_clause)
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    txns = result.scalars().all()

    items = await _batch_enrich(db, list(txns))

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


async def get_transaction_by_id(db: AsyncSession, txn_id: str) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    return await _enrich(db, txn)


async def create_transaction(db: AsyncSession, data: TransactionCreate) -> dict:
    txn = Transaction(
        type=data.type,
        amount=data.amount,
        date=data.date,
        category_id=data.categoryId or None,
        account_id=data.accountId,
        to_account_id=data.toAccountId,
        description=data.description,
        tags=json.dumps(data.tags),
        invoice_id=data.invoiceId,
        book_id=data.bookId,
        payment_confirmed=data.paymentConfirmed,
        payment_account_type=data.paymentAccountType,
        payer_name=data.payerName,
        invoice_needed=data.invoiceNeeded,
        invoice_completed=data.invoiceCompleted,
        tax_declared=data.taxDeclared,
        tax_period=data.taxPeriod,
        contact_id=data.contactId,
        invoice_issued=data.invoiceIssued,
        invoice_images=json.dumps([a.model_dump() for a in data.invoiceImages]),
        company_account_date=data.companyAccountDate,
        company_account_images=json.dumps([a.model_dump() for a in data.companyAccountImages]),
    )
    db.add(txn)

    # Save attachments
    att_dicts = []
    for att in data.attachments:
        a = Attachment(
            id=att.id or str(uuid.uuid4()),
            transaction_id=txn.id,
            name=att.name,
            url=att.url,
            type=att.type,
            size=att.size,
        )
        db.add(a)
        att_dicts.append({"id": a.id, "name": a.name, "url": a.url, "type": a.type, "size": a.size})

    # Update account balance (personal 代付不扣公司账户)
    await _update_balance(db, data.type, data.amount, data.accountId, data.toAccountId,
                          payment_account_type=data.paymentAccountType)

    await db.commit()
    await db.refresh(txn)

    await registry.emit("transaction.created", {"id": txn.id, "type": txn.type})

    return await _enrich(db, txn, att_dicts)


async def update_transaction(db: AsyncSession, txn_id: str, data: TransactionUpdate) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None

    # Reverse old balance effect
    await _update_balance(db, txn.type, txn.amount, txn.account_id, txn.to_account_id,
                          reverse=True, payment_account_type=txn.payment_account_type)

    update_data = data.model_dump(exclude_unset=True)
    field_map = {
        "categoryId": "category_id",
        "accountId": "account_id",
        "toAccountId": "to_account_id",
        "contactId": "contact_id",
        "invoiceId": "invoice_id",
        "bookId": "book_id",
        "paymentConfirmed": "payment_confirmed",
        "paymentAccountType": "payment_account_type",
        "payerName": "payer_name",
        "invoiceNeeded": "invoice_needed",
        "invoiceCompleted": "invoice_completed",
        "taxDeclared": "tax_declared",
        "taxPeriod": "tax_period",
        "invoiceIssued": "invoice_issued",
        "invoiceImages": "invoice_images",
        "companyAccountDate": "company_account_date",
        "companyAccountImages": "company_account_images",
        "reimbursementBatchId": "reimbursement_batch_id",
        "reimbursementStatus": "reimbursement_status",
    }

    # Handle attachments separately
    new_attachments = update_data.pop("attachments", None)

    json_fields = {"tags", "invoice_images", "company_account_images"}
    for key, value in update_data.items():
        attr = field_map.get(key, key)
        if attr in json_fields:
            if isinstance(value, list):
                setattr(txn, attr, json.dumps([
                    v.model_dump() if hasattr(v, 'model_dump') else v for v in value
                ]))
            else:
                setattr(txn, attr, json.dumps(value))
        else:
            setattr(txn, attr, value)

    txn.updated_at = datetime.now(timezone.utc).isoformat()

    # Apply new balance effect
    await _update_balance(db, txn.type, txn.amount, txn.account_id, txn.to_account_id,
                          payment_account_type=txn.payment_account_type)

    # Update attachments if provided
    if new_attachments is not None:
        # Delete old
        old_atts = await db.execute(
            select(Attachment).where(Attachment.transaction_id == txn_id)
        )
        for old in old_atts.scalars().all():
            await db.delete(old)
        # Add new
        for att_data in new_attachments:
            a = Attachment(
                id=att_data.get("id") or str(uuid.uuid4()),
                transaction_id=txn_id,
                name=att_data.get("name", ""),
                url=att_data.get("url", ""),
                type=att_data.get("type", ""),
                size=att_data.get("size", 0),
            )
            db.add(a)

    await db.commit()
    await db.refresh(txn)

    await registry.emit("transaction.updated", {"id": txn.id})

    return await _enrich(db, txn)


async def delete_transaction(db: AsyncSession, txn_id: str) -> bool:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return False

    # Reverse balance
    await _update_balance(db, txn.type, txn.amount, txn.account_id, txn.to_account_id,
                          reverse=True, payment_account_type=txn.payment_account_type)

    # Delete attachments
    atts = await db.execute(select(Attachment).where(Attachment.transaction_id == txn_id))
    for a in atts.scalars().all():
        await db.delete(a)

    await db.delete(txn)
    await db.commit()

    await registry.emit("transaction.deleted", {"id": txn_id})
    return True


# Workflow operations

async def confirm_payment(db: AsyncSession, txn_id: str, account_type: str) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    txn.payment_confirmed = True
    txn.payment_account_type = account_type
    txn.payment_confirmed_at = datetime.now(timezone.utc).isoformat()
    txn.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(txn)
    await registry.emit("transaction.payment_confirmed", {"id": txn_id})
    return await _enrich(db, txn)


async def confirm_invoice(db: AsyncSession, txn_id: str, invoice_id: Optional[str] = None) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    txn.invoice_completed = True
    txn.invoice_confirmed_at = datetime.now(timezone.utc).isoformat()
    if invoice_id:
        txn.invoice_id = invoice_id
    txn.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(txn)
    await registry.emit("transaction.invoice_confirmed", {"id": txn_id})
    return await _enrich(db, txn)


async def skip_invoice(db: AsyncSession, txn_id: str) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    txn.invoice_needed = False
    txn.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(txn)
    await registry.emit("transaction.invoice_skipped", {"id": txn_id})
    return await _enrich(db, txn)


async def confirm_tax(db: AsyncSession, txn_id: str, tax_period: str) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    txn.tax_declared = True
    txn.tax_declared_at = datetime.now(timezone.utc).isoformat()
    txn.tax_period = tax_period
    txn.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(txn)
    await registry.emit("transaction.tax_declared", {"id": txn_id})
    return await _enrich(db, txn)


async def get_pending_payments(db: AsyncSession) -> List[dict]:
    result = await db.execute(
        select(Transaction)
        .where(Transaction.payment_confirmed == False)
        .order_by(Transaction.date.desc())
    )
    return await _batch_enrich(db, list(result.scalars().all()))


async def get_pending_invoices(db: AsyncSession) -> List[dict]:
    result = await db.execute(
        select(Transaction)
        .where(and_(Transaction.invoice_needed == True, Transaction.invoice_completed == False))
        .order_by(Transaction.date.desc())
    )
    return await _batch_enrich(db, list(result.scalars().all()))


async def get_pending_taxes(db: AsyncSession) -> List[dict]:
    result = await db.execute(
        select(Transaction)
        .where(Transaction.tax_declared == False)
        .order_by(Transaction.date.desc())
    )
    return await _batch_enrich(db, list(result.scalars().all()))


async def batch_confirm_tax(db: AsyncSession, tax_period: str) -> dict:
    """一键申报：将所有未申报交易标记为已申报"""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.execute(
        select(Transaction).where(Transaction.tax_declared == False)
    )
    txns = list(result.scalars().all())
    count = 0
    for txn in txns:
        txn.tax_declared = True
        txn.tax_declared_at = now
        txn.tax_period = tax_period
        txn.updated_at = now
        count += 1
    if count > 0:
        await db.commit()
        await registry.emit("transaction.tax_batch_declared", {"count": count, "period": tax_period})
    return {"count": count, "taxPeriod": tax_period, "declaredAt": now}


async def batch_create_transactions(db: AsyncSession, items_data: list) -> dict:
    created = 0
    errors = []
    for i, data in enumerate(items_data):
        try:
            await create_transaction(db, data)
            created += 1
        except Exception as e:
            errors.append({"index": i, "error": str(e)})
    return {"created": created, "errors": errors}
