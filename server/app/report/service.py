from typing import Optional
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.account.models import Account
from app.category.models import Category
from app.contact.models import Contact
from app.transaction.models import Transaction


async def _batch_category_names(db: AsyncSession, cat_ids: set) -> dict:
    if not cat_ids:
        return {}
    result = await db.execute(select(Category.id, Category.name, Category.icon, Category.color).where(Category.id.in_(cat_ids)))
    return {r[0]: {"name": r[1], "icon": r[2], "color": r[3]} for r in result.all()}


async def _batch_contact_names(db: AsyncSession, contact_ids: set) -> dict:
    if not contact_ids:
        return {}
    result = await db.execute(select(Contact.id, Contact.name).where(Contact.id.in_(contact_ids)))
    return {r[0]: r[1] for r in result.all()}


async def _batch_account_names(db: AsyncSession, account_ids: set) -> dict:
    if not account_ids:
        return {}
    result = await db.execute(select(Account.id, Account.name).where(Account.id.in_(account_ids)))
    return {r[0]: r[1] for r in result.all()}


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
    inc_rows = inc_by_cat.all()

    # Expense by category
    exp_by_cat = await db.execute(
        select(Transaction.category_id, func.sum(Transaction.amount).label("total"))
        .where(and_(date_filter, Transaction.type == "expense"))
        .group_by(Transaction.category_id)
    )
    exp_rows = exp_by_cat.all()

    # Batch query category names
    all_cat_ids = {r[0] for r in inc_rows if r[0]} | {r[0] for r in exp_rows if r[0]}
    cat_map = await _batch_category_names(db, all_cat_ids)

    income_categories = []
    for row in inc_rows:
        cat_info = cat_map.get(row[0], {})
        income_categories.append({
            "categoryId": row[0] or "",
            "categoryName": cat_info.get("name", "未分类"),
            "amount": float(row[1]),
        })

    expense_categories = []
    for row in exp_rows:
        cat_info = cat_map.get(row[0], {})
        expense_categories.append({
            "categoryId": row[0] or "",
            "categoryName": cat_info.get("name", "未分类"),
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
    acc_rows = by_account_result.all()

    # Batch query account names
    acc_ids = {r[0] for r in acc_rows if r[0]}
    acc_map = await _batch_account_names(db, acc_ids)

    by_account = []
    for row in acc_rows:
        by_account.append({
            "accountId": row[0] or "",
            "accountName": acc_map.get(row[0], "未知账户"),
            "inflow": float(row[1]),
            "outflow": float(row[2]),
            "net": float(row[1]) - float(row[2]),
        })

    # By month
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
    rows = result.all()

    # Batch query category names
    cat_ids = {r[0] for r in rows if r[0]}
    cat_map = await _batch_category_names(db, cat_ids)

    categories = []
    grand_total = 0.0
    for row in rows:
        cat_info = cat_map.get(row[0], {})
        amount = float(row[1])
        grand_total += amount
        categories.append({
            "categoryId": row[0] or "",
            "categoryName": cat_info.get("name", "未分类"),
            "icon": cat_info.get("icon", ""),
            "color": cat_info.get("color", ""),
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
    rows = result.all()

    # Batch query contact names
    contact_ids = {r[0] for r in rows if r[0]}
    contact_map = await _batch_contact_names(db, contact_ids)

    items = []
    grand_total = 0.0
    for row in rows:
        amount = float(row[1])
        grand_total += amount
        items.append({
            "contactId": row[0] or "",
            "contactName": contact_map.get(row[0], "未指定客户") if row[0] else "未指定客户",
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
    rows = result.all()

    # Batch query contact names
    contact_ids = {r[0] for r in rows if r[0]}
    contact_map = await _batch_contact_names(db, contact_ids)

    items = []
    grand_total = 0.0
    for row in rows:
        amount = float(row[1])
        grand_total += amount
        items.append({
            "contactId": row[0] or "",
            "contactName": contact_map.get(row[0], "未指定供应商") if row[0] else "未指定供应商",
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
