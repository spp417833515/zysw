from datetime import datetime

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.transaction.models import Transaction


def _get_current_quarter_range() -> tuple[str, str, str]:
    """返回当前季度的 (start_date, end_date, quarter_name)"""
    now = datetime.now()
    q = (now.month - 1) // 3 + 1
    start_month = (q - 1) * 3 + 1
    end_month = q * 3
    start_date = f"{now.year}-{start_month:02d}-01"
    if end_month == 12:
        end_date = f"{now.year}-12-31"
    else:
        end_date = f"{now.year}-{end_month + 1:02d}-01"
    quarter_name = f"Q{q}"
    return start_date, end_date, quarter_name


async def get_dashboard_summary(db: AsyncSession) -> dict:
    start_date, end_date, quarter_name = _get_current_quarter_range()

    date_filter = and_(Transaction.date >= start_date, Transaction.date < end_date)

    # Quarterly income
    inc_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(date_filter, Transaction.type == "income"))
    )
    quarterly_income = float(inc_result.scalar() or 0)

    # Quarterly expense
    exp_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(date_filter, Transaction.type == "expense"))
    )
    quarterly_expense = float(exp_result.scalar() or 0)

    # Quarterly invoiced income (income with invoice_completed=True)
    inv_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(
            date_filter,
            Transaction.type == "income",
            Transaction.invoice_completed == True,
        ))
    )
    quarterly_invoiced_income = float(inv_result.scalar() or 0)

    # Pending counts
    pending_payments_count = (await db.execute(
        select(func.count(Transaction.id))
        .where(Transaction.payment_confirmed == False)
    )).scalar() or 0

    pending_invoices_count = (await db.execute(
        select(func.count(Transaction.id))
        .where(and_(Transaction.invoice_needed == True, Transaction.invoice_completed == False))
    )).scalar() or 0

    pending_taxes_count = (await db.execute(
        select(func.count(Transaction.id))
        .where(Transaction.tax_declared == False)
    )).scalar() or 0

    return {
        "quarterlyIncome": quarterly_income,
        "quarterlyExpense": quarterly_expense,
        "quarterlyInvoicedIncome": quarterly_invoiced_income,
        "pendingPaymentsCount": pending_payments_count,
        "pendingInvoicesCount": pending_invoices_count,
        "pendingTaxesCount": pending_taxes_count,
        "quarterName": quarter_name,
    }
