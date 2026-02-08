from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.category.models import Category
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


async def get_category_report(db: AsyncSession, start_date: str, end_date: str, type_filter: str | None = None) -> dict:
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
