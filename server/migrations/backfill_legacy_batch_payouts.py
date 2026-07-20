"""一次性补录：为「已打款但没有 [RB:] 打款流水」的历史报销批次补造打款流水。

背景：旧版报销打款直接扣账户余额、不落流水，导致
「余额 = 期初 + Σ已确认流水」这条不变式被破坏（实测差额 -2524.78 =
批次 RB-20260225-001 的打款额），报表和修复脚本被迫各自维护补偿分支。

本脚本：
1. 找出所有 status=paid 且查不到 [RB:批次号] 流水的批次；
2. 按新版 confirm_payment 的字段惯例补造打款流水（描述带「历史补录」字样）；
3. 【不动账户余额】—— 当年打款时余额已被直接扣过，补的只是缺失的流水；
4. 补录流水标记为已申报（tax_period 取打款日所在月），避免在待办里
   冒出一条陈年任务；
5. 结束后重算全部账户「期初 + Σ流水」并与存储余额对账，输出结果。

运行（在 server 目录下）：
    /usr/bin/python3 -m migrations.backfill_legacy_batch_payouts
"""
import asyncio
import uuid
from decimal import Decimal

from sqlalchemy import select

from app.database import async_session
from app.account.models import Account
from app.reimbursement.models import ReimbursementBatch
from app.reimbursement.service import ADVANCE_CATEGORY_ID, make_payout_marker
from app.transaction.models import Transaction
from app.transaction.service import _counts_toward_balance


def _batch_pay_date(batch: ReimbursementBatch) -> str:
    if batch.paid_at:
        return batch.paid_at[:10]
    return batch.completed_date or (batch.completed_at or "")[:10]


async def _expected_balance(db, account: Account) -> Decimal:
    expected = Decimal(str(float(account.initial_balance or 0)))
    txns = (await db.execute(
        select(Transaction).where(Transaction.account_id == account.id)
    )).scalars().all()
    for t in txns:
        if not _counts_toward_balance(t.type, t.payment_confirmed, t.payment_account_type):
            continue
        amt = Decimal(str(float(t.amount)))
        expected += amt if t.type == "income" else -amt
    transfer_in = (await db.execute(
        select(Transaction).where(
            Transaction.to_account_id == account.id,
            Transaction.type == "transfer",
        )
    )).scalars().all()
    for t in transfer_in:
        expected += Decimal(str(float(t.amount)))
    return expected


async def upgrade():
    async with async_session() as db:
        batches = (await db.execute(
            select(ReimbursementBatch).where(ReimbursementBatch.status == "paid")
        )).scalars().all()

        created = 0
        for b in batches:
            marker = make_payout_marker(b.batch_no)
            has_payout = (await db.execute(
                select(Transaction.id).where(Transaction.description.like(f"{marker}%"))
            )).first()
            if has_payout:
                continue

            if not b.payment_account_id:
                print(f"⚠ 批次 {b.batch_no} 缺打款账户，无法补录，跳过")
                continue

            pay_date = _batch_pay_date(b)
            pay_amount = round(float(b.actual_amount if b.actual_amount is not None else b.total_amount), 2)
            confirmed_at = b.paid_at or b.completed_at or f"{pay_date}T00:00:00+00:00"
            txn = Transaction(
                id=str(uuid.uuid4()),
                type="expense",
                amount=pay_amount,
                date=pay_date,
                category_id=ADVANCE_CATEGORY_ID,
                account_id=b.payment_account_id,
                payout_batch_id=b.id,
                description=f"{marker} 报销打款 - {b.employee_name}（历史补录）",
                tags="[]",
                payment_confirmed=True,
                payment_account_type="company",
                payment_confirmed_at=confirmed_at,
                invoice_needed=False,
                tax_declared=True,
                tax_period=pay_date[:7],
            )
            db.add(txn)
            created += 1
            print(f"✚ 批次 {b.batch_no} 补录打款流水 ¥{pay_amount}（{pay_date}，不动余额）")

        await db.commit()
        print(f"\n补录完成：{created} 笔\n")

        # 对账验证
        accounts = (await db.execute(select(Account))).scalars().all()
        all_ok = True
        for acc in accounts:
            expected = await _expected_balance(db, acc)
            actual = Decimal(str(float(acc.balance)))
            diff = actual - expected
            if abs(diff) < Decimal("0.005"):
                print(f"✓ {acc.name}: 余额 ¥{actual} = 期初 + Σ流水，对账一致")
            else:
                all_ok = False
                print(f"✗ {acc.name}: 余额 ¥{actual} vs 重算 ¥{expected}（差 {diff:+}）")
        if not all_ok:
            raise SystemExit("对账仍不一致，请人工检查")


if __name__ == "__main__":
    asyncio.run(upgrade())
