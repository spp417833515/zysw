from datetime import datetime, timezone
from typing import Optional, List
import uuid

from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.employee.models import Employee, SalaryRecord
from app.employee.schemas import EmployeeCreate, EmployeeUpdate


# 个税累进税率表
TAX_BRACKETS = [
    (3000, 0.03, 0),
    (12000, 0.10, 210),
    (25000, 0.20, 1410),
    (35000, 0.25, 2660),
    (55000, 0.30, 4410),
    (80000, 0.35, 7160),
    (float('inf'), 0.45, 15160),
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
    """计算月度个税"""
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


FIELD_MAP = {
    "idNumber": "id_number",
    "entryDate": "entry_date",
    "baseSalary": "base_salary",
    "payDay": "pay_day",
    "socialInsuranceRate": "social_insurance_rate",
    "housingFundRate": "housing_fund_rate",
    "specialDeduction": "special_deduction",
}


def _to_dict(e: Employee) -> dict:
    tax_info = calc_tax(e.base_salary, e.social_insurance_rate, e.housing_fund_rate, e.special_deduction)
    return {
        "id": e.id,
        "name": e.name,
        "phone": e.phone,
        "idNumber": e.id_number,
        "department": e.department,
        "position": e.position,
        "entryDate": e.entry_date,
        "status": e.status,
        "baseSalary": e.base_salary,
        "payDay": e.pay_day,
        "socialInsuranceRate": e.social_insurance_rate,
        "housingFundRate": e.housing_fund_rate,
        "specialDeduction": e.special_deduction,
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
    return {
        "data": [_to_dict(e) for e in result.scalars().all()],
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
    return [_to_dict(e) for e in result.scalars().all()]


async def get_employee_by_id(db: AsyncSession, eid: str) -> Optional[dict]:
    e = await db.get(Employee, eid)
    return _to_dict(e) if e else None


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
    return _to_dict(e)


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
    return _to_dict(e)


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
                reminders.append({
                    "employeeId": e.id,
                    "employeeName": e.name,
                    "type": "pay_day",
                    "label": label,
                    "daysUntil": diff,
                    "amount": e.base_salary,
                    "taxInfo": calc_tax(e.base_salary, e.social_insurance_rate, e.housing_fund_rate, e.special_deduction),
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
    """获取工资发放记录"""
    query = select(SalaryRecord)
    if employee_id:
        query = query.where(SalaryRecord.employee_id == employee_id)
    if year:
        query = query.where(SalaryRecord.year == year)
    query = query.order_by(SalaryRecord.year.desc(), SalaryRecord.month.desc())
    result = await db.execute(query)
    return [{
        "id": r.id,
        "employeeId": r.employee_id,
        "employeeName": r.employee_name,
        "year": r.year,
        "month": r.month,
        "baseSalary": r.base_salary,
        "tax": r.tax,
        "netSalary": r.net_salary,
        "status": r.status,
        "transactionId": r.transaction_id,
        "confirmedAt": r.confirmed_at,
    } for r in result.scalars().all()]


async def confirm_salary(db: AsyncSession, employee_id: str, year: int, month: int, account_id: Optional[str] = None) -> dict:
    """确认工资发放：创建 SalaryRecord + 自动生成支出流水"""
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

    monthly_salary = calc_monthly_salary(e.base_salary, e.entry_date, year, month, e.pay_day)
    tax_info = calc_tax(monthly_salary, e.social_insurance_rate, e.housing_fund_rate, e.special_deduction)
    now = datetime.now(timezone.utc).isoformat()

    # 生成支出流水
    from app.transaction.models import Transaction
    from app.account.models import Account
    txn = Transaction(
        id=str(uuid.uuid4()),
        type="expense",
        amount=monthly_salary,
        date=f"{year}-{month:02d}-{e.pay_day:02d}",
        category_id="",
        account_id=account_id or "",
        description=f"工资发放 - {e.name} - {year}年{month}月",
        tags="[]",
        payment_confirmed=True,
        payment_account_type="company",
        payment_confirmed_at=now,
        invoice_needed=False,
    )
    db.add(txn)

    # 更新账户余额
    if account_id:
        account = await db.get(Account, account_id)
        if account:
            account.balance -= monthly_salary

    record = SalaryRecord(
        id=str(uuid.uuid4()),
        employee_id=employee_id,
        employee_name=e.name,
        year=year,
        month=month,
        base_salary=monthly_salary,
        tax=tax_info["tax"],
        net_salary=tax_info["netSalary"],
        transaction_id=txn.id,
        confirmed_at=now,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {
        "id": record.id,
        "employeeId": record.employee_id,
        "employeeName": record.employee_name,
        "year": record.year,
        "month": record.month,
        "baseSalary": record.base_salary,
        "tax": record.tax,
        "netSalary": record.net_salary,
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
        if not e.entry_date or e.base_salary <= 0:
            continue
        try:
            entry = datetime.fromisoformat(e.entry_date)
        except (ValueError, TypeError):
            continue
        # 从入职月开始到当前月
        y, m = entry.year, entry.month
        while (y, m) <= (current_year, current_month):
            # 当月未到发薪日，工资尚未到期，不算欠款
            if y == current_year and m == current_month and current_day < e.pay_day:
                break
            if (e.id, y, m) not in paid_set:
                monthly = calc_monthly_salary(e.base_salary, e.entry_date, y, m, e.pay_day)
                if monthly > 0:
                    unpaid.append({
                        "employeeId": e.id,
                        "employeeName": e.name,
                        "year": y,
                        "month": m,
                        "baseSalary": monthly,
                    })
                    total_amount += monthly
            m += 1
            if m > 12:
                m = 1
                y += 1

    return {"count": len(unpaid), "totalAmount": round(total_amount, 2), "items": unpaid}
