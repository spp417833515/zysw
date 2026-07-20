"""修复工具：把每个账户的存储余额校正为「期初余额 + Σ计入余额的流水」。

历史背景：旧 confirm_payment 在 payment_account_type 从 'personal' → 'company'
时只改字段没补扣余额（该通道已在新版 _apply_payment_confirmed 中堵死）；
旧报销打款只扣余额不落流水（已由 backfill_legacy_batch_payouts.py 补录）。

判定口径完全复用 app.transaction.service.compute_expected_balances
（全系统唯一推导点），本脚本不做任何自己的重算。

运行前请先执行 backfill_legacy_batch_payouts.py，否则历史批次的
账外扣款会被本脚本误判为"多扣"而错误回补。

运行（在 server 目录下）：
    /usr/bin/python3 -m migrations.fix_balance_inconsistency
"""
import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.database import async_session
from app.account.models import Account
from app.transaction.service import compute_expected_balances


async def upgrade():
    async with async_session() as db:
        expected = await compute_expected_balances(db)
        accounts = (await db.execute(select(Account))).scalars().all()
        for acc in accounts:
            actual = Decimal(str(float(acc.balance)))
            exp = expected[acc.id]
            diff = exp - actual
            if abs(diff) < Decimal("0.005"):
                print(f"✓ {acc.name}: balance ¥{actual} 对账正确")
                continue
            print(f"⚠ {acc.name}: 实际 ¥{actual} → 应有 ¥{exp}（差 {diff:+}），已修正")
            acc.balance = exp

        await db.commit()
        print("\n所有账户对账完成")


if __name__ == "__main__":
    asyncio.run(upgrade())
