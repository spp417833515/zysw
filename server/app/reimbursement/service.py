import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.reimbursement.models import ReimbursementBatch
from app.reimbursement.schemas import ReimbursementCreate, ReimbursementComplete
from app.transaction.models import Transaction
from app.account.models import Account


async def _load_batch_txns(db: AsyncSession, batch: ReimbursementBatch) -> list:
    """Load all transactions associated with a batch."""
    return [t for tid in json.loads(batch.transaction_ids) if (t := await db.get(Transaction, tid))]


def _to_dict(batch: ReimbursementBatch) -> dict:
    return {
        "id": batch.id,
        "batchNo": batch.batch_no,
        "employeeName": batch.employee_name,
        "transactionIds": json.loads(batch.transaction_ids),
        "totalAmount": batch.total_amount,
        "status": batch.status,
        "note": batch.note,
        "actualAmount": batch.actual_amount,
        "fee": batch.fee,
        "feeTransactionId": batch.fee_transaction_id,
        "completedDate": batch.completed_date,
        "createdAt": batch.created_at,
        "completedAt": batch.completed_at,
    }


async def _generate_batch_no(db: AsyncSession) -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"RB-{today}-"
    result = await db.execute(
        select(func.count(ReimbursementBatch.id))
        .where(ReimbursementBatch.batch_no.like(f"{prefix}%"))
    )
    count = (result.scalar() or 0) + 1
    return f"{prefix}{count:03d}"


async def create_batch(db: AsyncSession, data: ReimbursementCreate) -> dict:
    # Validate transactions
    txns = []
    total = 0.0
    for tid in data.transactionIds:
        txn = await db.get(Transaction, tid)
        if not txn:
            raise ValueError(f"交易 {tid} 不存在")
        if txn.payment_account_type != "personal":
            raise ValueError(f"交易 {tid} 不是个人代付")
        if txn.reimbursement_batch_id:
            raise ValueError(f"交易 {tid} 已关联报销单")
        txns.append(txn)
        total += txn.amount

    batch_no = await _generate_batch_no(db)
    batch = ReimbursementBatch(
        id=str(uuid.uuid4()),
        batch_no=batch_no,
        employee_name=data.employeeName,
        transaction_ids=json.dumps(data.transactionIds),
        total_amount=round(total, 2),
        note=data.note or "",
    )
    db.add(batch)

    for txn in txns:
        txn.reimbursement_batch_id = batch.id
        txn.reimbursement_status = "pending"

    await db.commit()
    await db.refresh(batch)
    return _to_dict(batch)


async def get_batches(db: AsyncSession) -> list:
    result = await db.execute(
        select(ReimbursementBatch).order_by(ReimbursementBatch.created_at.desc())
    )
    return [_to_dict(b) for b in result.scalars().all()]


async def complete_batch(db: AsyncSession, batch_id: str, data: ReimbursementComplete) -> Optional[dict]:
    batch = await db.get(ReimbursementBatch, batch_id)
    if not batch or batch.status != "pending":
        return None

    if data.fee and data.fee > 0 and not data.feeAccountId:
        raise ValueError("手续费大于0时必须选择记账账户")

    now = datetime.now(timezone.utc).isoformat()
    batch.status = "completed"
    batch.completed_at = now
    batch.completed_date = data.completedDate
    batch.actual_amount = data.actualAmount if data.actualAmount is not None else batch.total_amount
    batch.fee = data.fee

    for txn in await _load_batch_txns(db, batch):
        txn.reimbursement_status = "completed"
        txn.payment_confirmed = True
        txn.payment_confirmed_at = now

    if data.fee and data.fee > 0:
        fee_txn = Transaction(
            id=str(uuid.uuid4()),
            type="expense",
            amount=data.fee,
            date=data.completedDate,
            category_id="",
            account_id=data.feeAccountId,
            description=f"报销手续费 - {batch.batch_no} ({batch.employee_name})",
            tags="[]",
            payment_confirmed=True,
            payment_account_type="company",
            payment_confirmed_at=now,
            invoice_needed=False,
        )
        db.add(fee_txn)
        batch.fee_transaction_id = fee_txn.id
        # Update account balance
        account = await db.get(Account, data.feeAccountId)
        if account:
            account.balance -= data.fee

    await db.commit()
    await db.refresh(batch)
    return _to_dict(batch)


async def delete_batch(db: AsyncSession, batch_id: str) -> bool:
    batch = await db.get(ReimbursementBatch, batch_id)
    if not batch or batch.status != "pending":
        return False
    for txn in await _load_batch_txns(db, batch):
        txn.reimbursement_batch_id = None
        txn.reimbursement_status = None
    await db.delete(batch)
    await db.commit()
    return True


async def get_pending_count(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(ReimbursementBatch.id))
        .where(ReimbursementBatch.status == "pending")
    )
    return result.scalar() or 0
