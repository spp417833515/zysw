from datetime import datetime, timezone
from typing import Optional, List
import uuid

from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.employee.models import Employee, SalaryRecord
from app.employee.salary_domain import (
    SalaryCalculator, SalaryPeriod, TaxStrategy,
    make_salary_diff_marker, make_salary_diff_like_pattern,
)
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


def calc_monthly_salary(base_salary: float, entry_date_str: str, year: int, month: int, pay_day: int = 0) -> float:
    """计算某月应发工资（入职首月按实际天数折算，与 pay_day 无关）。

    pay_day 参数保留为兼容签名，实际不再使用。
    """
    return SalaryCalculator.prorate_first_month(base_salary, entry_date_str, year, month)


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
    "selfTaxFiling": "self_tax_filing",
}


async def _compute_tax_for(e: Employee, db: AsyncSession, year: int, month: int, base_amount: float) -> dict:
    """统一的当月个税计算：根据员工属性选择策略 + 装载累计上下文。"""
    social_rate = float(e.social_insurance_rate)
    fund_rate = float(e.housing_fund_rate)
    special_ded = float(e.special_deduction)
    cumulative = await _get_cumulative_data(db, e.id, year, month)
    prev_months = cumulative["month_count"]
    prev_records = (await db.execute(
        select(SalaryRecord).where(
            and_(SalaryRecord.employee_id == e.id, SalaryRecord.year == year, SalaryRecord.month < month)
        )
    )).scalars().all()
    prev_deduction = sum(float(r.base_salary) * (social_rate + fund_rate) / 100 for r in prev_records)
    return TaxStrategy.for_employee(e).compute(
        base_amount, social_rate, fund_rate, special_ded,
        month_index=prev_months + 1,
        prev_cumulative_income=cumulative["prev_cumulative_income"],
        prev_cumulative_tax=cumulative["prev_cumulative_tax"],
        prev_cumulative_deduction=prev_deduction,
        prev_cumulative_special=special_ded * prev_months,
    )


async def _to_dict(e: Employee, db: AsyncSession) -> dict:
    base_salary = float(e.base_salary)
    now = datetime.now()
    tax_info = await _compute_tax_for(e, db, now.year, now.month, base_salary)
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
        "socialInsuranceRate": float(e.social_insurance_rate),
        "housingFundRate": float(e.housing_fund_rate),
        "specialDeduction": float(e.special_deduction),
        "selfTaxFiling": bool(e.self_tax_filing),
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
        special_deduction=data.specialDeduction, self_tax_filing=data.selfTaxFiling,
        notes=data.notes,
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
    """获取工资发放提醒和入职周年提醒。

    语义：上月工资在本月 pay_day 日发放。提醒锁定"上月工资是否已发"。
    """
    now = datetime.now()
    today_date = now.date()

    result = await db.execute(select(Employee).where(Employee.status == "active"))
    employees = result.scalars().all()

    reminders = []
    for e in employees:
        # 上月工资 = 本月 pay_day 日要发的那一笔
        target = SalaryCalculator.latest_due_period(today_date, e.pay_day)
        ty, tm = target.year, target.month

        paid = (await db.execute(
            select(SalaryRecord).where(
                and_(SalaryRecord.employee_id == e.id,
                     SalaryRecord.year == ty,
                     SalaryRecord.month == tm)
            )
        )).scalar_one_or_none()

        if not paid:
            diff = (target.due_date - today_date).days
            if diff >= -7:  # 已过期 7 天内仍提醒
                period_label = f"{ty}年{tm}月"
                if diff > 3:
                    label = f"{e.name} 工资发放·{period_label}（{diff}天后）"
                elif diff > 0:
                    label = f"{e.name} 工资发放·{period_label}（即将）"
                elif diff == 0:
                    label = f"{e.name} 工资发放·{period_label}（今天）"
                else:
                    label = f"{e.name} 工资发放·{period_label}（已过期 {abs(diff)} 天）"

                monthly = SalaryCalculator.prorate_first_month(float(e.base_salary), e.entry_date or "", ty, tm)
                tax_info = await _compute_tax_for(e, db, ty, tm, monthly)
                reminders.append({
                    "employeeId": e.id,
                    "employeeName": e.name,
                    "type": "pay_day",
                    "label": label,
                    "daysUntil": diff,
                    "payDate": target.due_date.isoformat(),
                    "salaryYear": ty,
                    "salaryMonth": tm,
                    "amount": monthly,
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
        tax = round(manual_tax, 2)
        net_salary = round(monthly_salary - tax, 2)
    else:
        tax_info = await _compute_tax_for(e, db, year, month, monthly_salary)
        tax = tax_info["tax"]
        net_salary = tax_info["netSalary"]

    # 实际发放金额（手动指定或默认等于税后应发）
    paid_amount = round(actual_paid, 2) if actual_paid is not None else net_salary
    from decimal import Decimal
    total_deduct = Decimal(str(round(paid_amount + transfer_fee, 2)))
    now = datetime.now(timezone.utc).isoformat()

    # 发薪日期：M月工资在 (M+1)月 pay_day 日发放（由 SalaryPeriod 处理跨年/小月）
    pay_date = SalaryPeriod(year, month, e.pay_day).due_date.isoformat()

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

    record_id = str(uuid.uuid4())
    record = SalaryRecord(
        id=record_id,
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

    # 差额：自动生成待处理流水，落入"待支出 / 待到账"流程
    diff_amount = round(net_salary - paid_amount, 2)
    if diff_amount != 0:
        diff_is_underpaid = diff_amount > 0
        marker = make_salary_diff_marker(record_id)
        diff_txn = Transaction(
            id=str(uuid.uuid4()),
            type="expense" if diff_is_underpaid else "income",
            amount=abs(diff_amount),
            date=pay_date,
            category_id="25ad1b78-e213-42f3-9d39-3db46e117208",
            account_id="",  # 留空，由合并付款/确认到账时指定
            description=(
                f"{marker} 工资补发 - {e.name} - {year}年{month}月"
                if diff_is_underpaid else
                f"{marker} 工资多发回收 - {e.name} - {year}年{month}月"
            ),
            tags="[]",
            payment_confirmed=False,
            invoice_needed=False,
        )
        db.add(diff_txn)

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


async def generate_salary_settlement(db: AsyncSession, record_id: str) -> dict:
    """为历史 SalaryRecord 的差额生成对应的待处理流水。

    幂等：若已有未确认的差额流水则不重复创建，直接返回现有项。
    返回创建/已有的差额流水信息。
    """
    from app.transaction.models import Transaction

    record = await db.get(SalaryRecord, record_id)
    if not record:
        raise ValueError("发放记录不存在")

    # 计算当前差额（同 get_salary_differences 逻辑）
    confirmed_total = 0.0
    if record.transaction_id:
        main_txn = await db.get(Transaction, record.transaction_id)
        if main_txn and main_txn.payment_confirmed:
            confirmed_total += float(main_txn.amount)
    pattern = make_salary_diff_like_pattern(record.id)
    linked = (await db.execute(
        select(Transaction).where(Transaction.description.like(pattern))
    )).scalars().all()
    pending = [t for t in linked if not t.payment_confirmed]
    for t in linked:
        if t.payment_confirmed:
            if t.type == "expense":
                confirmed_total += float(t.amount)
            elif t.type == "income":
                confirmed_total -= float(t.amount)

    diff = round(float(record.net_salary) - confirmed_total, 2)
    if diff == 0:
        raise ValueError("当前无差额，无需生成流水")
    if pending:
        # 已有待处理流水，幂等返回
        t = pending[0]
        return {
            "transactionId": t.id, "type": t.type, "amount": float(t.amount),
            "alreadyExists": True,
        }

    is_underpaid = diff > 0
    marker = make_salary_diff_marker(record.id)
    pay_date = SalaryPeriod(record.year, record.month,
                            await _employee_pay_day(db, record.employee_id)).due_date.isoformat()
    diff_txn = Transaction(
        id=str(uuid.uuid4()),
        type="expense" if is_underpaid else "income",
        amount=abs(diff),
        date=pay_date,
        category_id="25ad1b78-e213-42f3-9d39-3db46e117208",
        account_id="",
        description=(
            f"{marker} 工资补发 - {record.employee_name} - {record.year}年{record.month}月"
            if is_underpaid else
            f"{marker} 工资多发回收 - {record.employee_name} - {record.year}年{record.month}月"
        ),
        tags="[]",
        payment_confirmed=False,
        invoice_needed=False,
    )
    db.add(diff_txn)
    await db.commit()
    await db.refresh(diff_txn)
    return {
        "transactionId": diff_txn.id,
        "type": diff_txn.type,
        "amount": float(diff_txn.amount),
        "alreadyExists": False,
    }


async def _employee_pay_day(db: AsyncSession, employee_id: str) -> int:
    e = await db.get(Employee, employee_id)
    return e.pay_day if e else 1


async def get_unpaid_salaries(db: AsyncSession) -> dict:
    """获取所有未发放工资的月份。

    语义：M月工资在 (M+1)月 pay_day 日发放；只有「(M+1)月pay_day日 ≤ today」
    时才将 M 计为已到期/未付。由 SalaryCalculator.iter_unpaid_periods 保证。
    """
    today = datetime.now().date()

    result = await db.execute(select(Employee).where(Employee.status == "active"))
    employees = result.scalars().all()

    paid_result = await db.execute(select(SalaryRecord))
    paid_set = {(r.employee_id, r.year, r.month) for r in paid_result.scalars().all()}

    unpaid = []
    total_amount = 0.0
    for e in employees:
        if not e.entry_date or float(e.base_salary) <= 0:
            continue

        for period in SalaryCalculator.iter_unpaid_periods(e.entry_date, e.pay_day, today):
            y, m = period.year, period.month
            if (e.id, y, m) in paid_set:
                continue
            monthly = SalaryCalculator.prorate_first_month(float(e.base_salary), e.entry_date, y, m)
            if monthly <= 0:
                continue
            tax_info = await _compute_tax_for(e, db, y, m, monthly)
            unpaid.append({
                "employeeId": e.id,
                "employeeName": e.name,
                "year": y,
                "month": m,
                "baseSalary": monthly,
                "netSalary": tax_info["netSalary"],
                "selfTaxFiling": bool(e.self_tax_filing),
                "payDate": period.due_date.isoformat(),
            })
            total_amount += monthly

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
    """获取有差额的工资记录。

    新模型：actualPaid = sum(主流水 + 差额流水中已确认的部分)。
    差额流水未确认时，差额仍存在（在 待支出/待到账 中等待处理）；
    差额流水被合并付款确认后，actualPaid 自动变为 netSalary，差额消失。
    """
    from app.transaction.models import Transaction

    records = (await db.execute(select(SalaryRecord))).scalars().all()
    result = []
    for r in records:
        # 主流水（如有）
        confirmed_total = 0.0
        if r.transaction_id:
            main_txn = await db.get(Transaction, r.transaction_id)
            if main_txn and main_txn.payment_confirmed:
                confirmed_total += float(main_txn.amount)

        # 差额关联流水：通过描述前缀稳定标记定位
        pattern = make_salary_diff_like_pattern(r.id)
        linked = (await db.execute(
            select(Transaction).where(Transaction.description.like(pattern))
        )).scalars().all()
        pending_settlement = []  # 未确认的差额流水
        for t in linked:
            if t.payment_confirmed:
                # 多发回收（income）已收 → 抵减；补发（expense）已付 → 增加 actualPaid
                if t.type == "expense":
                    confirmed_total += float(t.amount)
                elif t.type == "income":
                    confirmed_total -= float(t.amount)
            else:
                pending_settlement.append({
                    "transactionId": t.id,
                    "type": t.type,
                    "amount": float(t.amount),
                })

        net = float(r.net_salary)
        diff = round(net - confirmed_total, 2)
        if diff != 0:
            result.append({
                "id": r.id,
                "employeeId": r.employee_id,
                "employeeName": r.employee_name,
                "year": r.year,
                "month": r.month,
                "baseSalary": float(r.base_salary),
                "tax": float(r.tax),
                "netSalary": net,
                "actualPaid": round(confirmed_total, 2),
                "difference": diff,
                "type": "underpaid" if diff > 0 else "overpaid",
                "label": f"欠{r.employee_name} ¥{abs(diff)}" if diff > 0 else f"{r.employee_name}欠公司 ¥{abs(diff)}",
                "pendingSettlements": pending_settlement,
                "confirmedAt": r.confirmed_at,
            })
    return result
