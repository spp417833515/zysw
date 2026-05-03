"""一次性修复：扫描 payment_confirmed=True 但创建时未扣余额的 txn，补扣账户余额。

根因：旧 confirm_payment 在 payment_account_type 从 'personal' → 'company' 时
覆盖了类型字段但没有补扣余额。导致账户余额比应有值高。

判定规则：本脚本不靠"历史快照"还原，而是 *彻底重算每个账户的应有余额*：
  应有余额 = initial_balance + Σ(payment_confirmed=True AND pat≠personal 的 +/- amount)
  + Σ(reimbursement batch.actual_amount 已确认打款)

如果实际 < 应有 → 余额被错误扣过；如果实际 > 应有 → 漏扣过。
对每个账户，差额会调整到应有值。
"""
import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.database import async_session
from app.account.models import Account
from app.transaction.models import Transaction
from app.reimbursement.models import ReimbursementBatch


async def upgrade():
    async with async_session() as db:
        accounts = (await db.execute(select(Account))).scalars().all()
        for acc in accounts:
            # 重算应有余额
            expected = Decimal(str(float(acc.initial_balance or 0)))

            txns = (await db.execute(
                select(Transaction).where(
                    Transaction.account_id == acc.id,
                    Transaction.payment_confirmed == True,
                )
            )).scalars().all()
            for t in txns:
                if t.payment_account_type == "personal":
                    continue  # personal 不影响公司账户
                amt = Decimal(str(float(t.amount)))
                if t.type == "income":
                    expected += amt
                elif t.type == "expense":
                    expected -= amt
                elif t.type == "transfer":
                    expected -= amt

            # 转入金额（transfer 收方）
            in_txns = (await db.execute(
                select(Transaction).where(
                    Transaction.to_account_id == acc.id,
                    Transaction.type == "transfer",
                    Transaction.payment_confirmed == True,
                )
            )).scalars().all()
            for t in in_txns:
                expected += Decimal(str(float(t.amount)))

            # 报销批次直接扣账户的部分
            batches = (await db.execute(
                select(ReimbursementBatch).where(
                    ReimbursementBatch.payment_account_id == acc.id,
                    ReimbursementBatch.status == "paid",
                )
            )).scalars().all()
            for b in batches:
                pay = b.actual_amount if b.actual_amount is not None else b.total_amount
                expected -= Decimal(str(float(pay)))

            actual = Decimal(str(float(acc.balance)))
            diff = expected - actual
            if abs(diff) < Decimal("0.005"):
                print(f"✓ {acc.name}: balance ¥{actual} 对账正确")
                continue

            print(f"⚠ {acc.name}: 实际 ¥{actual} → 应有 ¥{expected}（差 {diff:+}）")
            acc.balance = expected
            print(f"  已修正为 ¥{expected}")

        await db.commit()
        print("\n所有账户对账完成")


if __name__ == "__main__":
    asyncio.run(upgrade())
