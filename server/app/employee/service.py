from datetime import datetime, timezone
from typing import Optional, List
import uuid

from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.employee.models import Employee, SalaryRecord
from app.employee.schemas import EmployeeCreate, EmployeeUpdate


# 个税月度累进税率表（用于简单单月计算）
TAX_BRACKETS = [
    (3000, 0.03, 0),
    (12000, 0.10, 210),
    (25000, 0.20, 1410),
    (35000, 0.25, 2660),
    (55000, 0.30, 4410),
    (80000, 0.35, 7160),
    (float('inf'), 0.45, 15160),
]

# 个税累计预扣税率表（年度，用于累计预扣法）
CUMULATIVE_TAX_BRACKETS = [
    (36000, 0.03, 0),
    (144000, 0.10, 2520),
    (300000, 0.20, 16920),
    (420000, 0.25, 31920),
    (660000, 0.30, 52920),
    (960000, 0.35, 85920),
    (float('inf'), 0.45, 181920),
]

THRESHOLD = 5000  # 起征点


def calc_monthly_salary(base_salary: float, entry_date_str: str, year: int, month: int, pay_day: int) -> float:
    """计算某月应发工资，入职首月按实际天数折算"""
    try:
        entry = datetime.fromisoformat(entry_date_str)
    except (ValueError, TypeError):
        return base_salary
    if year == entry.year and month == entry.month:
        # 入职首月：从入职日到发薪日的天数折算
        work_days = pay_day - entry.day
        if work_days <= 0:
            return 0.0
        return round(base_salary / 30 * work_days, 2)
    return base_salary


def calc_tax(salary: float, social_rate: float = 0, fund_rate: float = 0, special_deduction: float = 0) -> dict:
    """计算月度个税（简单模式，不含累计）"""
    social_insurance = salary * social_rate / 100
    housing_fund = salary * fund_rate / 100
    total_deduction = social_insurance + housing_fund
    taxable = salary - total_deduction - THRESHOLD - special_deduction
    if taxable <= 0:
        return {
            "salary": salary,
            "socialInsurance": round(social_insurance, 2),
            "housingFund": round(housing_fund, 2),
            "specialDeduction": special_deduction,
            "taxableIncome": 0,
            "tax": 0,
            "netSalary": round(salary - total_deduction, 2),
        }
    tax = 0
    for upper, rate, quick_deduction in TAX_BRACKETS:
        if taxable <= upper:
            tax = taxable * rate - quick_deduction
            break
    tax = round(tax, 2)
    return {
        "salary": salary,
        "socialInsurance": round(social_insurance, 2),
        "housingFund": round(housing_fund, 2),
        "specialDeduction": special_deduction,
        "taxableIncome": round(taxable, 2),
        "tax": tax,
        "netSalary": round(salary - total_deduction - tax, 2),
    }


def calc_tax_cumulative(
    current_salary: float,
    social_rate: float = 0,
    fund_rate: float = 0,
    special_deduction: float = 0,
    month_index: int = 1,
    prev_cumulative_income: float = 0,
    prev_cumulative_tax: float = 0,
    prev_cumulative_deduction: float = 0,
    prev_cumulative_special: float = 0,
) -> dict:
    """累计预扣法计算个税

    Args:
        current_salary: 当月税前工资
        social_rate: 社保个人比例(%)
        fund_rate: 公积金个人比例(%)
        special_deduction: 当月专项附加扣除
        month_index: 当年第几个月(1-12)
        prev_cumulative_income: 前几月累计收入
        prev_cumulative_tax: 前几月累计已扣税
        prev_cumulative_deduction: 前几月累计社保公积金扣除
        prev_cumulative_special: 前几月累计专项附加扣除
    """
    social_insurance = current_salary * social_rate / 100
    housing_fund = current_salary * fund_rate / 100
    current_deduction = social_insurance + housing_fund

    # 累计数据
    cumulative_income = prev_cumulative_income + current_salary
    cumulative_deduction = prev_cumulative_deduction + current_deduction
    cumulative_special = prev_cumulative_special + special_deduction
    cumulative_threshold = THRESHOLD * month_index  # 5000 × 月数

    # 累计应纳税所得额
    cumulative_taxable = cumulative_income - cumulative_deduction - cumulative_threshold - cumulative_special

    if cumulative_taxable <= 0:
        return {
            "salary": current_salary,
            "socialInsurance": round(social_insurance, 2),
            "housingFund": round(housing_fund, 2),
            "specialDeduction": special_deduction,
            "taxableIncome": 0,
            "tax": 0,
            "netSalary": round(current_salary - current_deduction, 2),
            "cumulativeTaxable": 0,
            "cumulativeTax": 0,
        }

    # 用累计应纳税所得额查累计预扣税率表
    cumulative_tax = 0
    for upper, rate, quick_deduction in CUMULATIVE_TAX_BRACKETS:
        if cumulative_taxable <= upper:
            cumulative_tax = cumulative_taxable * rate - quick_deduction
            break

    cumulative_tax = round(cumulative_tax, 2)
    # 本月应扣税 = 累计应扣税 - 前几月已扣税
    current_tax = round(max(cumulative_tax - prev_cumulative_tax, 0), 2)

    return {
        "salary": current_salary,
        "socialInsurance": round(social_insurance, 2),
        "housingFund": round(housing_fund, 2),
        "specialDeduction": special_deduction,
        "taxableIncome": round(max(cumulative_taxable, 0), 2),
        "tax": current_tax,
        "netSalary": round(current_salary - current_deduction - current_tax, 2),
        "cumulativeTaxable": round(max(cumulative_taxable, 0), 2),
        "cumulativeTax": cumulative_tax,
    }


async def _get_cumulative_data(db: AsyncSession, employee_id: str, year: int, before_month: int) -> dict:
    """获取某员工当年某月之前的累计数据（从已发放的SalaryRecord中汇总）"""
    result = await db.execute(
        select(SalaryRecord).where(
            and_(
                SalaryRecord.employee_id == employee_id,
                SalaryRecord.year == year,
                SalaryRecord.month < before_month,
            )
        )
    )
    records = result.scalars().all()

    cumulative_income = sum(float(r.base_salary) for r in records)
    cumulative_tax = sum(float(r.tax) for r in records)
    month_count = len(records)

    # 社保公积金和专项附加扣除需要从员工信息重新计算（SalaryRecord中未存储）
    # 这里假设每月扣除一致，用当前员工设置 × 月数
    return {
        "prev_cumulative_income": cumulative_income,
        "prev_cumulative_tax": cumulative_tax,
        "month_count": month_count,
    }


FIELD_MAP = {
    "idNumber": "id_number",
    "entryDate": "entry_date",
    "baseSalary": "base_salary",
    "payDay": "pay_day",
    "socialInsuranceRate": "social_insurance_rate",
    "housingFundRate": "housing_fund_rate",
    "specialDeduction": "special_deduction",
}


async def _to_dict(e: Employee, db: AsyncSession) -> dict:
    base_salary = float(e.base_salary)
    social_rate = float(e.social_insurance_rate)
    fund_rate = float(e.housing_fund_rate)
    special_ded = float(e.special_deduction)

    # 用累计预扣法计算当月个税
    now = datetime.now()
    current_year = now.year
    current_month = now.month
    cumulative = await _get_cumulative_data(db, e.id, current_year, current_month)
    prev_months = cumulative["month_count"]
    month_index = prev_months + 1
    prev_records = (await db.execute(
        select(SalaryRecord).where(
            and_(SalaryRecord.employee_id == e.id, SalaryRecord.year == current_year, SalaryRecord.month < current_month)
        )
    )).scalars().all()
    prev_deduction = sum(float(r.base_salary) * (social_rate + fund_rate) / 100 for r in prev_records)
    tax_info = calc_tax_cumulative(
        base_salary, social_rate, fund_rate, special_ded,
        month_index=month_index,
        prev_cumulative_income=cumulative["prev_cumulative_income"],
        prev_cumulative_tax=cumulative["prev_cumulative_tax"],
        prev_cumulative_deduction=prev_deduction,
        prev_cumulative_special=special_ded * prev_months,
    )
    return {
        "id": e.id,
        "name": e.name,
        "phone": e.phone,
        "idNumber": e.id_number,
        "department": e.department,
        "position": e.position,
        "entryDate": e.entry_date,
        "status": e.status,
        "baseSalary": base_salary,
        "payDay": e.pay_day,
        "socialInsuranceRate": social_rate,
        "housingFundRate": fund_rate,
        "specialDeduction": special_ded,
        "notes": e.notes,
        "taxInfo": tax_info,
        "createdAt": e.created_at,
        "updatedAt": e.updated_at,
    }


async def get_employees(
    db: AsyncSession, page: int = 1, page_size: int = 20,
    keyword: Optional[str] = None, status: Optional[str] = None,
) -> dict:
    query = select(Employee)
    if keyword:
        query = query.where(or_(Employee.name.contains(keyword), Employee.phone.contains(keyword), Employee.department.contains(keyword)))
    if status:
        query = query.where(Employee.status == status)
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    query = query.order_by(Employee.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    employees = result.scalars().all()
    data = [await _to_dict(e, db) for e in employees]
    return {
        "data": data,
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


async def get_all_employees(db: AsyncSession, status: Optional[str] = None) -> List[dict]:
    query = select(Employee)
    if status:
        query = query.where(Employee.status == status)
    query = query.order_by(Employee.name)
    result = await db.execute(query)
    return [await _to_dict(e, db) for e in result.scalars().all()]


async def get_employee_by_id(db: AsyncSession, eid: str) -> Optional[dict]:
    e = await db.get(Employee, eid)
    return (await _to_dict(e, db)) if e else None


async def create_employee(db: AsyncSession, data: EmployeeCreate) -> dict:
    e = Employee(
        name=data.name, phone=data.phone, id_number=data.idNumber,
        department=data.department, position=data.position, entry_date=data.entryDate,
        status=data.status, base_salary=data.baseSalary, pay_day=data.payDay,
        social_insurance_rate=data.socialInsuranceRate, housing_fund_rate=data.housingFundRate,
        special_deduction=data.specialDeduction, notes=data.notes,
    )
    db.add(e)
    await db.commit()
    await db.refresh(e)
    return await _to_dict(e, db)


async def update_employee(db: AsyncSession, eid: str, data: EmployeeUpdate) -> Optional[dict]:
    e = await db.get(Employee, eid)
    if not e:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(e, FIELD_MAP.get(key, key), value)
    e.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(e)
    return await _to_dict(e, db)


async def delete_employee(db: AsyncSession, eid: str) -> bool:
    e = await db.get(Employee, eid)
    if not e:
        return False
    await db.delete(e)
    await db.commit()
    return True


async def get_pay_reminders(db: AsyncSession) -> List[dict]:
    """获取工资发放提醒和入职周年提醒"""
    now = datetime.now()
    today = now.day
    current_month = now.month
    current_year = now.year

    result = await db.execute(select(Employee).where(Employee.status == "active"))
    employees = result.scalars().all()

    # 查询当月已发放记录，已发工资的不再提醒
    paid_result = await db.execute(
        select(SalaryRecord).where(
            SalaryRecord.year == current_year,
            SalaryRecord.month == current_month,
        )
    )
    paid_employee_ids = {r.employee_id for r in paid_result.scalars().all()}

    reminders = []
    for e in employees:
        # 工资发放提醒：从月初到发薪日后3天，已发放的不提醒
        if e.id not in paid_employee_ids:
            diff = e.pay_day - today
            if diff >= -3:
                if diff > 3:
                    label = f"{e.name} 工资发放（{diff}天后）"
                elif diff > 0:
                    label = f"{e.name} 工资发放（即将）"
                elif diff == 0:
                    label = f"{e.name} 工资发放（今天）"
                else:
                    label = f"{e.name} 工资发放（已过期）"
                # 累计预扣法计算当月个税
                social_rate = float(e.social_insurance_rate)
                fund_rate = float(e.housing_fund_rate)
                special_ded = float(e.special_deduction)
                cumulative = await _get_cumulative_data(db, e.id, current_year, current_month)
                prev_months = cumulative["month_count"]
                month_index = prev_months + 1
                prev_records = (await db.execute(
                    select(SalaryRecord).where(
                        and_(SalaryRecord.employee_id == e.id, SalaryRecord.year == current_year, SalaryRecord.month < current_month)
                    )
                )).scalars().all()
                prev_deduction = sum(float(r.base_salary) * (social_rate + fund_rate) / 100 for r in prev_records)
                tax_info = calc_tax_cumulative(
                    float(e.base_salary), social_rate, fund_rate, special_ded,
                    month_index=month_index,
                    prev_cumulative_income=cumulative["prev_cumulative_income"],
                    prev_cumulative_tax=cumulative["prev_cumulative_tax"],
                    prev_cumulative_deduction=prev_deduction,
                    prev_cumulative_special=special_ded * prev_months,
                )
                reminders.append({
                    "employeeId": e.id,
                    "employeeName": e.name,
                    "type": "pay_day",
                    "label": label,
                    "daysUntil": diff,
                    "amount": float(e.base_salary),
                    "taxInfo": tax_info,
                })
        # 入职周年提醒：入职日期前后3天
        if e.entry_date:
            try:
                entry = datetime.fromisoformat(e.entry_date)
                entry_this_year = entry.replace(year=now.year)
                delta = (entry_this_year.date() - now.date()).days
                years = now.year - entry.year
                if years > 0 and -1 <= delta <= 3:
                    reminders.append({
                        "employeeId": e.id,
                        "employeeName": e.name,
                        "type": "anniversary",
                        "label": f"{e.name} 入职 {years} 周年",
                        "daysUntil": delta,
                    })
            except (ValueError, TypeError):
                pass
    reminders.sort(key=lambda r: r["daysUntil"])
    return reminders


async def get_salary_records(db: AsyncSession, employee_id: Optional[str] = None, year: Optional[int] = None) -> List[dict]:
    """获取工资发放记录（含实际支付金额和差额）"""
    from app.transaction.models import Transaction

    query = select(SalaryRecord)
    if employee_id:
        query = query.where(SalaryRecord.employee_id == employee_id)
    if year:
        query = query.where(SalaryRecord.year == year)
    query = query.order_by(SalaryRecord.year.desc(), SalaryRecord.month.desc())
    result = await db.execute(query)
    records = result.scalars().all()

    items = []
    for r in records:
        net = float(r.net_salary)
        actual_paid = net  # 默认等于应发
        if r.transaction_id:
            txn = await db.get(Transaction, r.transaction_id)
            if txn:
                actual_paid = float(txn.amount)
        difference = round(net - actual_paid, 2)
        items.append({
            "id": r.id,
            "employeeId": r.employee_id,
            "employeeName": r.employee_name,
            "year": r.year,
            "month": r.month,
            "baseSalary": float(r.base_salary),
            "tax": float(r.tax),
            "netSalary": net,
            "actualPaid": actual_paid,
            "difference": difference,
            "status": r.status,
            "transactionId": r.transaction_id,
            "confirmedAt": r.confirmed_at,
        })
    return items


async def confirm_salary(db: AsyncSession, employee_id: str, year: int, month: int, account_id: Optional[str] = None, transfer_fee: float = 0, voucher: Optional[list] = None, manual_tax: Optional[float] = None, actual_paid: Optional[float] = None) -> dict:
    """确认工资发放：创建 SalaryRecord + 自动生成支出流水（金额=实际发放+可选手续费）"""
    from app.transaction.models import Transaction, Attachment
    from app.account.models import Account

    # 检查是否已发放
    existing = await db.execute(
        select(SalaryRecord).where(
            and_(SalaryRecord.employee_id == employee_id, SalaryRecord.year == year, SalaryRecord.month == month)
        )
    )
    if existing.scalar():
        raise ValueError(f"{year}年{month}月工资已发放")

    e = await db.get(Employee, employee_id)
    if not e:
        raise ValueError("员工不存在")

    # 验证账户（如有）
    if account_id:
        account = await db.get(Account, account_id)
        if not account:
            raise ValueError("发放账户不存在")
    else:
        account = None

    monthly_salary = calc_monthly_salary(float(e.base_salary), e.entry_date, year, month, e.pay_day)

    if manual_tax is not None:
        # 手动填写个税
        tax = round(manual_tax, 2)
        net_salary = round(monthly_salary - tax, 2)
    else:
        # 累计预扣法：获取当年前几月累计数据
        social_rate = float(e.social_insurance_rate)
        fund_rate = float(e.housing_fund_rate)
        special_ded = float(e.special_deduction)
        cumulative = await _get_cumulative_data(db, employee_id, year, month)
        prev_months = cumulative["month_count"]
        month_index = prev_months + 1
        prev_deduction = sum(
            float(r.base_salary) * (social_rate + fund_rate) / 100
            for r in (await db.execute(
                select(SalaryRecord).where(
                    and_(SalaryRecord.employee_id == employee_id, SalaryRecord.year == year, SalaryRecord.month < month)
                )
            )).scalars().all()
        )
        tax_info = calc_tax_cumulative(
            monthly_salary, social_rate, fund_rate, special_ded,
            month_index=month_index,
            prev_cumulative_income=cumulative["prev_cumulative_income"],
            prev_cumulative_tax=cumulative["prev_cumulative_tax"],
            prev_cumulative_deduction=prev_deduction,
            prev_cumulative_special=special_ded * prev_months,
        )
        tax = tax_info["tax"]
        net_salary = tax_info["netSalary"]

    # 实际发放金额（手动指定或默认等于税后应发）
    paid_amount = round(actual_paid, 2) if actual_paid is not None else net_salary
    from decimal import Decimal
    total_deduct = Decimal(str(round(paid_amount + transfer_fee, 2)))
    now = datetime.now(timezone.utc).isoformat()

    # 安全的发薪日期（避免如2月31日等无效日期）
    import calendar
    max_day = calendar.monthrange(year, month)[1]
    safe_pay_day = min(e.pay_day, max_day)
    pay_date = f"{year}-{month:02d}-{safe_pay_day:02d}"

    def _make_txn(amount: float, category_id: str, description: str) -> Transaction:
        return Transaction(
            id=str(uuid.uuid4()),
            type="expense",
            amount=amount,
            date=pay_date,
            category_id=category_id,
            account_id=account_id or "",
            description=description,
            tags="[]",
            payment_confirmed=True,
            payment_account_type="company",
            payment_confirmed_at=now,
            invoice_needed=False,
        )

    # 工资流水（实际发放金额）
    txn = _make_txn(paid_amount, "25ad1b78-e213-42f3-9d39-3db46e117208", f"工资发放 - {e.name} - {year}年{month}月")
    db.add(txn)

    # 手续费单独一笔流水
    if transfer_fee > 0:
        fee_txn = _make_txn(transfer_fee, "cat_e2", f"工资发放手续费 - {e.name} - {year}年{month}月")
        db.add(fee_txn)

    # 更新账户余额
    if account:
        account.balance -= total_deduct

    # 保存凭证附件
    if voucher:
        for v in voucher:
            db.add(Attachment(
                id=v.get("id") or str(uuid.uuid4()),
                transaction_id=txn.id,
                name=v.get("name", ""),
                url=v.get("url", ""),
                type=v.get("type", ""),
                size=v.get("size", 0),
            ))

    record = SalaryRecord(
        id=str(uuid.uuid4()),
        employee_id=employee_id,
        employee_name=e.name,
        year=year,
        month=month,
        base_salary=monthly_salary,
        tax=tax,
        net_salary=net_salary,
        transaction_id=txn.id,
        confirmed_at=now,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    difference = round(net_salary - paid_amount, 2)
    return {
        "id": record.id,
        "employeeId": record.employee_id,
        "employeeName": record.employee_name,
        "year": record.year,
        "month": record.month,
        "baseSalary": float(record.base_salary),
        "tax": float(record.tax),
        "netSalary": float(record.net_salary),
        "actualPaid": paid_amount,
        "difference": difference,
        "transferFee": transfer_fee,
        "disbursement": float(total_deduct),
        "status": record.status,
        "transactionId": record.transaction_id,
        "confirmedAt": record.confirmed_at,
    }


async def get_unpaid_salaries(db: AsyncSession) -> dict:
    """获取所有未发放工资的月份（从入职月到当前月，当月须过发薪日才计入）"""
    now = datetime.now()
    current_year = now.year
    current_month = now.month
    current_day = now.day

    result = await db.execute(select(Employee).where(Employee.status == "active"))
    employees = result.scalars().all()

    # 获取所有已发放记录
    paid_result = await db.execute(select(SalaryRecord))
    paid_set = {(r.employee_id, r.year, r.month) for r in paid_result.scalars().all()}

    unpaid = []
    total_amount = 0.0
    for e in employees:
        if not e.entry_date or float(e.base_salary) <= 0:
            continue
        try:
            entry = datetime.fromisoformat(e.entry_date)
        except (ValueError, TypeError):
            continue

        social_rate = float(e.social_insurance_rate)
        fund_rate = float(e.housing_fund_rate)
        special_ded = float(e.special_deduction)

        # 从入职月开始到当前月
        y, m = entry.year, entry.month
        while (y, m) <= (current_year, current_month):
            # 当月未到发薪日，工资尚未到期，不算欠款
            if y == current_year and m == current_month and current_day < e.pay_day:
                break
            if (e.id, y, m) not in paid_set:
                monthly = calc_monthly_salary(float(e.base_salary), e.entry_date, y, m, e.pay_day)
                if monthly > 0:
                    # 累计预扣法计算
                    cumulative = await _get_cumulative_data(db, e.id, y, m)
                    prev_months = cumulative["month_count"]
                    month_index = prev_months + 1
                    prev_records = (await db.execute(
                        select(SalaryRecord).where(
                            and_(SalaryRecord.employee_id == e.id, SalaryRecord.year == y, SalaryRecord.month < m)
                        )
                    )).scalars().all()
                    prev_deduction = sum(float(r.base_salary) * (social_rate + fund_rate) / 100 for r in prev_records)
                    tax_info = calc_tax_cumulative(
                        monthly, social_rate, fund_rate, special_ded,
                        month_index=month_index,
                        prev_cumulative_income=cumulative["prev_cumulative_income"],
                        prev_cumulative_tax=cumulative["prev_cumulative_tax"],
                        prev_cumulative_deduction=prev_deduction,
                        prev_cumulative_special=special_ded * prev_months,
                    )
                    unpaid.append({
                        "employeeId": e.id,
                        "employeeName": e.name,
                        "year": y,
                        "month": m,
                        "baseSalary": monthly,
                        "netSalary": tax_info["netSalary"],
                    })
                    total_amount += monthly
            m += 1
            if m > 12:
                m = 1
                y += 1

    return {"count": len(unpaid), "totalAmount": round(total_amount, 2), "items": unpaid}


async def update_salary_record(db: AsyncSession, record_id: str, data) -> Optional[dict]:
    """修改发放记录：可更新个税和实际发放金额"""
    record = await db.get(SalaryRecord, record_id)
    if not record:
        return None

    from app.transaction.models import Transaction
    from app.account.models import Account
    from decimal import Decimal

    # 更新个税 → 重算税后应发
    if data.tax is not None:
        record.tax = data.tax
        record.net_salary = round(float(record.base_salary) - data.tax, 2)

    # 更新实际发放金额 → 改关联流水 + 调账户余额
    if data.actualPaid is not None and record.transaction_id:
        txn = await db.get(Transaction, record.transaction_id)
        if txn:
            if txn.account_id:
                account = await db.get(Account, txn.account_id)
                if account:
                    old_amount = Decimal(str(float(txn.amount)))
                    new_amount = Decimal(str(data.actualPaid))
                    account.balance += old_amount - new_amount
            txn.amount = data.actualPaid

    await db.commit()
    await db.refresh(record)

    # 取实际发放金额
    actual_paid = float(record.net_salary)
    if record.transaction_id:
        txn = await db.get(Transaction, record.transaction_id)
        if txn:
            actual_paid = float(txn.amount)

    difference = round(float(record.net_salary) - actual_paid, 2)
    return {
        "id": record.id,
        "employeeId": record.employee_id,
        "employeeName": record.employee_name,
        "year": record.year,
        "month": record.month,
        "baseSalary": float(record.base_salary),
        "tax": float(record.tax),
        "netSalary": float(record.net_salary),
        "actualPaid": actual_paid,
        "difference": difference,
        "confirmedAt": record.confirmed_at,
    }


async def get_salary_differences(db: AsyncSession) -> list:
    """获取有差额的工资记录（欠员工 / 员工欠公司）"""
    from app.transaction.models import Transaction

    records = (await db.execute(select(SalaryRecord))).scalars().all()
    result = []
    for r in records:
        actual_paid = float(r.net_salary)
        if r.transaction_id:
            txn = await db.get(Transaction, r.transaction_id)
            if txn:
                actual_paid = float(txn.amount)
        diff = round(float(r.net_salary) - actual_paid, 2)
        if diff != 0:
            result.append({
                "id": r.id,
                "employeeId": r.employee_id,
                "employeeName": r.employee_name,
                "year": r.year,
                "month": r.month,
                "baseSalary": float(r.base_salary),
                "tax": float(r.tax),
                "netSalary": float(r.net_salary),
                "actualPaid": actual_paid,
                "difference": diff,
                "type": "underpaid" if diff > 0 else "overpaid",
                "label": f"欠{r.employee_name} ¥{abs(diff)}" if diff > 0 else f"{r.employee_name}欠公司 ¥{abs(diff)}",
                "confirmedAt": r.confirmed_at,
            })
    return result
