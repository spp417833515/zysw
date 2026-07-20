import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.reimbursement.models import ReimbursementBatch
from app.reimbursement.schemas import ReimbursementCreate, ReimbursementComplete
from app.transaction.models import Transaction
from app.transaction.service import (
    REIMBURSE_PAYOUT_MARKER_PREFIX,
    create_confirmed_transaction,
)

# 流水分类（与 seed 数据一致）
ADVANCE_CATEGORY_ID = "f1107c6b-efa8-4f8b-a6ce-970f158cdd87"  # 垫付
TRANSFER_FEE_CATEGORY_ID = "fecee137-47e8-4e81-b50d-b0316fe2f806"  # 转账手续费


def make_payout_marker(batch_no: str) -> str:
    return f"{REIMBURSE_PAYOUT_MARKER_PREFIX}{batch_no}]"


async def _load_batch_txns(db: AsyncSession, batch: ReimbursementBatch) -> list:
    """Load all transactions associated with a batch using a single IN query."""
    txn_ids = json.loads(batch.transaction_ids)
    if not txn_ids:
        return []
    result = await db.execute(select(Transaction).where(Transaction.id.in_(txn_ids)))
    return list(result.scalars().all())


def _to_dict(batch: ReimbursementBatch) -> dict:
    return {
        "id": batch.id,
        "batchNo": batch.batch_no,
        "employeeName": batch.employee_name,
        "transactionIds": json.loads(batch.transaction_ids),
        "totalAmount": float(batch.total_amount),
        "status": batch.status,
        "note": batch.note,
        "actualAmount": float(batch.actual_amount) if batch.actual_amount is not None else None,
        "fee": float(batch.fee),
        "feeTransactionId": batch.fee_transaction_id,
        "completedDate": batch.completed_date,
        "createdAt": batch.created_at,
        "completedAt": batch.completed_at,
        "paidAt": batch.paid_at,
        "paymentAccountId": batch.payment_account_id,
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
    # Validate transactions（去重，防同一 ID 传两次导致金额双计）
    txn_ids = list(dict.fromkeys(data.transactionIds))
    if not txn_ids:
        raise ValueError("至少选择一笔垫付流水")
    txns = []
    total = Decimal("0")
    for tid in txn_ids:
        txn = await db.get(Transaction, tid)
        if not txn:
            raise ValueError(f"交易 {tid} 不存在")
        if txn.type != "expense":
            raise ValueError(f"交易 {tid} 不是支出流水，不能报销")
        if txn.payment_account_type != "personal":
            raise ValueError(f"交易 {tid} 不是个人代付")
        if txn.reimbursement_batch_id:
            raise ValueError(f"交易 {tid} 已关联报销单")
        txns.append(txn)
        total += Decimal(str(float(txn.amount)))

    batch_no = await _generate_batch_no(db)
    batch = ReimbursementBatch(
        id=str(uuid.uuid4()),
        batch_no=batch_no,
        employee_name=data.employeeName,
        transaction_ids=json.dumps(txn_ids),
        total_amount=round(float(total), 2),
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
    batches = []
    for b in result.scalars().all():
        d = _to_dict(b)
        txns = await _load_batch_txns(db, b)
        d["transactions"] = [
            {"id": t.id, "date": t.date, "description": t.description, "amount": float(t.amount)}
            for t in txns
        ]
        batches.append(d)
    return batches


async def complete_batch(db: AsyncSession, batch_id: str, data: ReimbursementComplete) -> Optional[dict]:
    batch = await db.get(ReimbursementBatch, batch_id)
    if not batch or batch.status != "pending":
        return None

    if data.fee and data.fee > 0 and not data.feeAccountId:
        raise ValueError("手续费大于0时必须选择记账账户")

    now = datetime.now(timezone.utc).isoformat()
    batch.status = "confirmed"
    batch.completed_at = now
    batch.completed_date = data.completedDate
    batch.actual_amount = data.actualAmount if data.actualAmount is not None else batch.total_amount
    batch.fee = data.fee

    for txn in await _load_batch_txns(db, batch):
        txn.reimbursement_status = "confirmed"

    if data.fee and data.fee > 0:
        # 落流水 + 扣余额统一走 transaction 模块唯一入口
        fee_txn = await create_confirmed_transaction(
            db,
            txn_type="expense",
            amount=data.fee,
            date=data.completedDate,
            category_id=TRANSFER_FEE_CATEGORY_ID,
            account_id=data.feeAccountId,
            description=f"报销手续费 - {batch.batch_no} ({batch.employee_name})",
            confirmed_at=now,
        )
        batch.fee_transaction_id = fee_txn.id

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


async def get_unpaid_completed(db: AsyncSession) -> dict:
    """获取已确认但未打款的批次数和总金额"""
    result = await db.execute(
        select(ReimbursementBatch)
        .where(ReimbursementBatch.status == "confirmed")
    )
    batches = result.scalars().all()
    total_amount = sum(float(b.actual_amount) if b.actual_amount is not None else float(b.total_amount) for b in batches)
    return {"count": len(batches), "totalAmount": round(total_amount, 2)}


async def confirm_payment(db: AsyncSession, batch_id: str, account_id: Optional[str] = None) -> Optional[dict]:
    """确认报销打款：标记已打款 + 生成打款流水 + 扣减账户余额。

    打款流水带 [RB:批次号] 标记：报销打款是清偿对员工的负债，
    利润表费用口径会按此标记排除（费用已在垫付原始流水确认），
    现金流量表则按公司实际出款计入。
    """
    batch = await db.get(ReimbursementBatch, batch_id)
    if not batch or batch.status != "confirmed":
        return None
    if not account_id:
        raise ValueError("必须选择打款账户")

    now = datetime.now(timezone.utc).isoformat()
    batch.status = "paid"
    batch.paid_at = now
    batch.payment_account_id = account_id

    # 标记关联交易的 payment_confirmed 和 reimbursement_status
    for txn in await _load_batch_txns(db, batch):
        txn.payment_confirmed = True
        txn.payment_confirmed_at = now
        txn.reimbursement_status = "paid"

    # 打款落流水 + 扣账户余额统一走 transaction 模块唯一入口
    pay_amount = round(float(batch.actual_amount if batch.actual_amount is not None else batch.total_amount), 2)
    payout_txn = await create_confirmed_transaction(
        db,
        txn_type="expense",
        amount=pay_amount,
        date=now[:10],
        category_id=ADVANCE_CATEGORY_ID,
        account_id=account_id,
        description=f"{make_payout_marker(batch.batch_no)} 报销打款 - {batch.employee_name}",
        confirmed_at=now,
    )
    # 结构化关联（口径过滤/对账都查这一列，描述标记仅作展示）
    payout_txn.payout_batch_id = batch.id

    await db.commit()
    await db.refresh(batch)
    return _to_dict(batch)
