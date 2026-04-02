from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.response import success, error
from app.employee import service
from app.employee.schemas import EmployeeCreate, EmployeeUpdate, SalaryConfirmRequest, SalaryRecordUpdate

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("")
async def list_employees(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_employees(db, page=page, page_size=pageSize, keyword=keyword, status=status)
    return success(result)


@router.get("/all")
async def all_employees(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    data = await service.get_all_employees(db, status=status)
    return success(data)


@router.get("/reminders")
async def pay_reminders(db: AsyncSession = Depends(get_db)):
    data = await service.get_pay_reminders(db)
    return success(data)


@router.get("/calc-tax")
async def calc_tax(
    salary: float = Query(...),
    socialInsuranceRate: float = Query(0),
    housingFundRate: float = Query(0),
    specialDeduction: float = Query(0),
    month: Optional[int] = Query(None, description="当年第几个月(1-12)，传入则使用累计预扣法"),
    employeeId: Optional[str] = Query(None, description="员工ID，配合month使用累计预扣法"),
    db: AsyncSession = Depends(get_db),
):
    """个税计算器（支持累计预扣法）"""
    if month and employeeId:
        # 累计预扣法：查询前几月数据
        from app.employee.models import SalaryRecord
        from sqlalchemy import and_
        import datetime
        year = datetime.datetime.now().year
        cumulative = await service._get_cumulative_data(db, employeeId, year, month)
        prev_months = cumulative["month_count"]
        month_index = prev_months + 1
        prev_records = (await db.execute(
            select(SalaryRecord).where(
                and_(SalaryRecord.employee_id == employeeId, SalaryRecord.year == year, SalaryRecord.month < month)
            )
        )).scalars().all()
        prev_deduction = sum(float(r.base_salary) * (socialInsuranceRate + housingFundRate) / 100 for r in prev_records)
        result = service.calc_tax_cumulative(
            salary, socialInsuranceRate, housingFundRate, specialDeduction,
            month_index=month_index,
            prev_cumulative_income=cumulative["prev_cumulative_income"],
            prev_cumulative_tax=cumulative["prev_cumulative_tax"],
            prev_cumulative_deduction=prev_deduction,
            prev_cumulative_special=specialDeduction * prev_months,
        )
    elif month:
        # 没有employeeId，用简单累计（假设每月工资相同，无历史记录）
        result = service.calc_tax_cumulative(
            salary, socialInsuranceRate, housingFundRate, specialDeduction,
            month_index=month,
            prev_cumulative_income=salary * (month - 1),
            prev_cumulative_tax=0,
            prev_cumulative_deduction=salary * (socialInsuranceRate + housingFundRate) / 100 * (month - 1),
            prev_cumulative_special=specialDeduction * (month - 1),
        )
        # 简单累计时需要重新算前几月的税来得到正确的当月税
        # 先算前N-1月的累计税
        if month > 1:
            prev_taxable = salary * (month - 1) - salary * (socialInsuranceRate + housingFundRate) / 100 * (month - 1) - 5000 * (month - 1) - specialDeduction * (month - 1)
            prev_tax = 0
            if prev_taxable > 0:
                for upper, rate, qd in service.CUMULATIVE_TAX_BRACKETS:
                    if prev_taxable <= upper:
                        prev_tax = prev_taxable * rate - qd
                        break
            result = service.calc_tax_cumulative(
                salary, socialInsuranceRate, housingFundRate, specialDeduction,
                month_index=month,
                prev_cumulative_income=salary * (month - 1),
                prev_cumulative_tax=round(prev_tax, 2),
                prev_cumulative_deduction=salary * (socialInsuranceRate + housingFundRate) / 100 * (month - 1),
                prev_cumulative_special=specialDeduction * (month - 1),
            )
    else:
        result = service.calc_tax(salary, socialInsuranceRate, housingFundRate, specialDeduction)
    return success(result)


@router.get("/salary-records")
async def salary_records(
    employeeId: Optional[str] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_salary_records(db, employee_id=employeeId, year=year)
    return success(data)


@router.get("/unpaid-salaries")
async def unpaid_salaries(db: AsyncSession = Depends(get_db)):
    data = await service.get_unpaid_salaries(db)
    return success(data)


@router.get("/salary-differences")
async def salary_differences(db: AsyncSession = Depends(get_db)):
    data = await service.get_salary_differences(db)
    return success(data)


@router.put("/salary-records/{record_id}")
async def update_salary_record(
    record_id: str,
    body: SalaryRecordUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await service.update_salary_record(db, record_id, body)
        if not data:
            return error("记录不存在", code=404)
        return success(data)
    except Exception as e:
        import traceback; traceback.print_exc()
        return error(f"更新失败：{e}")


@router.post("/salary-records/confirm")
async def confirm_salary(
    body: SalaryConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        voucher = [v.model_dump() for v in body.voucher] if body.voucher else []
        data = await service.confirm_salary(
            db, body.employeeId, body.year, body.month,
            body.accountId, body.transferFee, voucher,
            manual_tax=body.manualTax, actual_paid=body.actualPaid,
        )
        return success(data)
    except ValueError as e:
        return error(str(e))
    except Exception as e:
        import traceback; traceback.print_exc()
        return error(f"工资发放失败：{e}")


@router.get("/{employee_id}")
async def get_employee(employee_id: str, db: AsyncSession = Depends(get_db)):
    e = await service.get_employee_by_id(db, employee_id)
    if not e:
        return error("Employee not found", code=404)
    return success(e)


@router.post("")
async def create_employee(data: EmployeeCreate, db: AsyncSession = Depends(get_db)):
    e = await service.create_employee(db, data)
    return success(e)


@router.put("/{employee_id}")
async def update_employee(employee_id: str, data: EmployeeUpdate, db: AsyncSession = Depends(get_db)):
    e = await service.update_employee(db, employee_id, data)
    if not e:
        return error("Employee not found", code=404)
    return success(e)


@router.delete("/{employee_id}")
async def delete_employee(employee_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete_employee(db, employee_id)
    if not deleted:
        return error("Employee not found", code=404)
    return success(None)
