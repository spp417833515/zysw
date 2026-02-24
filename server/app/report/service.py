from typing import Optional
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.category.models import Category
from app.contact.models import Contact
from app.transaction.models import Transaction


async def get_profit_loss(db: AsyncSession, start_date: str, end_date: str) -> dict:
    date_filter = and_(Transaction.date >= start_date, Transaction.date <= end_date)

    # Total income
    inc_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(date_filter, Transaction.type == "income"))
    )
    total_income = float(inc_result.scalar() or 0)

    # Total expense
    exp_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(date_filter, Transaction.type == "expense"))
    )
    total_expense = float(exp_result.scalar() or 0)

    # Income by category
    inc_by_cat = await db.execute(
        select(Transaction.category_id, func.sum(Transaction.amount).label("total"))
        .where(and_(date_filter, Transaction.type == "income"))
        .group_by(Transaction.category_id)
    )
    income_categories = []
    for row in inc_by_cat.all():
        cat = await db.get(Category, row[0]) if row[0] else None
        income_categories.append({
            "categoryId": row[0] or "",
            "categoryName": cat.name if cat else "未分类",
            "amount": float(row[1]),
        })

    # Expense by category
    exp_by_cat = await db.execute(
        select(Transaction.category_id, func.sum(Transaction.amount).label("total"))
        .where(and_(date_filter, Transaction.type == "expense"))
        .group_by(Transaction.category_id)
    )
    expense_categories = []
    for row in exp_by_cat.all():
        cat = await db.get(Category, row[0]) if row[0] else None
        expense_categories.append({
            "categoryId": row[0] or "",
            "categoryName": cat.name if cat else "未分类",
            "amount": float(row[1]),
        })

    return {
        "totalIncome": total_income,
        "totalExpense": total_expense,
        "netProfit": total_income - total_expense,
        "incomeByCategory": income_categories,
        "expenseByCategory": expense_categories,
    }


async def get_cash_flow(db: AsyncSession, start_date: str, end_date: str) -> dict:
    date_filter = and_(Transaction.date >= start_date, Transaction.date <= end_date)

    # Inflow (income)
    inflow_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(date_filter, Transaction.type == "income"))
    )
    inflow = float(inflow_result.scalar() or 0)

    # Outflow (expense)
    outflow_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(date_filter, Transaction.type == "expense"))
    )
    outflow = float(outflow_result.scalar() or 0)

    # By account
    by_account_result = await db.execute(
        select(
            Transaction.account_id,
            func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)).label("inflow"),
            func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)).label("outflow"),
        )
        .where(date_filter)
        .group_by(Transaction.account_id)
    )
    from app.account.models import Account
    by_account = []
    for row in by_account_result.all():
        acc = await db.get(Account, row[0]) if row[0] else None
        by_account.append({
            "accountId": row[0] or "",
            "accountName": acc.name if acc else "未知账户",
            "inflow": float(row[1]),
            "outflow": float(row[2]),
            "net": float(row[1]) - float(row[2]),
        })

    # By month - use substr for SQLite compatibility
    by_month_result = await db.execute(
        select(
            func.substr(Transaction.date, 1, 7).label("month"),
            func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)).label("inflow"),
            func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)).label("outflow"),
        )
        .where(date_filter)
        .group_by(func.substr(Transaction.date, 1, 7))
        .order_by(func.substr(Transaction.date, 1, 7))
    )
    by_month = []
    for row in by_month_result.all():
        by_month.append({
            "month": row[0],
            "inflow": float(row[1]),
            "outflow": float(row[2]),
            "net": float(row[1]) - float(row[2]),
        })

    return {
        "inflow": inflow,
        "outflow": outflow,
        "netFlow": inflow - outflow,
        "byAccount": by_account,
        "byMonth": by_month,
    }


async def get_category_report(db: AsyncSession, start_date: str, end_date: str, type_filter: Optional[str] = None) -> dict:
    date_filter = and_(Transaction.date >= start_date, Transaction.date <= end_date)
    conditions = [date_filter]
    if type_filter:
        conditions.append(Transaction.type == type_filter)

    result = await db.execute(
        select(Transaction.category_id, func.sum(Transaction.amount).label("total"))
        .where(and_(*conditions))
        .group_by(Transaction.category_id)
        .order_by(func.sum(Transaction.amount).desc())
    )

    categories = []
    grand_total = 0.0
    for row in result.all():
        cat = await db.get(Category, row[0]) if row[0] else None
        amount = float(row[1])
        grand_total += amount
        categories.append({
            "categoryId": row[0] or "",
            "categoryName": cat.name if cat else "未分类",
            "icon": cat.icon if cat else "",
            "color": cat.color if cat else "",
            "amount": amount,
        })

    # Calculate percentage
    for c in categories:
        c["percentage"] = round(c["amount"] / grand_total * 100, 2) if grand_total > 0 else 0

    return {
        "categories": categories,
        "total": grand_total,
    }


async def get_trend_report(db: AsyncSession, start_date: str, end_date: str) -> dict:
    date_filter = and_(Transaction.date >= start_date, Transaction.date <= end_date)

    result = await db.execute(
        select(
            func.substr(Transaction.date, 1, 7).label("month"),
            func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)).label("income"),
            func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)).label("expense"),
        )
        .where(date_filter)
        .group_by(func.substr(Transaction.date, 1, 7))
        .order_by(func.substr(Transaction.date, 1, 7))
    )

    months = []
    for row in result.all():
        income = float(row[1])
        expense = float(row[2])
        months.append({
            "month": row[0],
            "income": income,
            "expense": expense,
            "profit": income - expense,
        })

    return {"months": months}


async def get_receivables(db: AsyncSession) -> dict:
    """按客户汇总未到账收入（payment_confirmed=False, type=income）"""
    result = await db.execute(
        select(
            Transaction.contact_id,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
            func.min(Transaction.date).label("earliest"),
        )
        .where(and_(Transaction.type == "income", Transaction.payment_confirmed == False))
        .group_by(Transaction.contact_id)
        .order_by(func.sum(Transaction.amount).desc())
    )
    items = []
    grand_total = 0.0
    for row in result.all():
        contact = await db.get(Contact, row[0]) if row[0] else None
        amount = float(row[1])
        grand_total += amount
        items.append({
            "contactId": row[0] or "",
            "contactName": contact.name if contact else "未指定客户",
            "amount": amount,
            "count": row[2],
            "earliestDate": row[3],
        })
    return {"items": items, "total": grand_total}


async def get_payables(db: AsyncSession) -> dict:
    """按供应商汇总未付支出（payment_confirmed=False, type=expense）"""
    result = await db.execute(
        select(
            Transaction.contact_id,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
            func.min(Transaction.date).label("earliest"),
        )
        .where(and_(Transaction.type == "expense", Transaction.payment_confirmed == False))
        .group_by(Transaction.contact_id)
        .order_by(func.sum(Transaction.amount).desc())
    )
    items = []
    grand_total = 0.0
    for row in result.all():
        contact = await db.get(Contact, row[0]) if row[0] else None
        amount = float(row[1])
        grand_total += amount
        items.append({
            "contactId": row[0] or "",
            "contactName": contact.name if contact else "未指定供应商",
            "amount": amount,
            "count": row[2],
            "earliestDate": row[3],
        })
    return {"items": items, "total": grand_total}


async def get_aging_analysis(db: AsyncSession, report_type: str = "receivable") -> dict:
    """账龄分析: 30/60/90/120/120+天分桶"""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if report_type == "receivable":
        conditions = and_(Transaction.type == "income", Transaction.payment_confirmed == False)
    else:
        conditions = and_(Transaction.type == "expense", Transaction.payment_confirmed == False)

    result = await db.execute(
        select(Transaction.date, Transaction.amount).where(conditions)
    )

    buckets = {"0-30": 0.0, "31-60": 0.0, "61-90": 0.0, "91-120": 0.0, "120+": 0.0}
    for row in result.all():
        days = (datetime.strptime(now, "%Y-%m-%d") - datetime.strptime(row[0][:10], "%Y-%m-%d")).days
        amount = float(row[1])
        if days <= 30:
            buckets["0-30"] += amount
        elif days <= 60:
            buckets["31-60"] += amount
        elif days <= 90:
            buckets["61-90"] += amount
        elif days <= 120:
            buckets["91-120"] += amount
        else:
            buckets["120+"] += amount

    return {
        "type": report_type,
        "buckets": [{"range": k, "amount": round(v, 2)} for k, v in buckets.items()],
        "total": round(sum(buckets.values()), 2),
    }
