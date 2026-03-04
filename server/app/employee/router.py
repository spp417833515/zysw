from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.response import success, error
from app.employee import service
from app.employee.schemas import EmployeeCreate, EmployeeUpdate

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
):
    """个税计算器"""
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


@router.post("/salary-records/confirm")
async def confirm_salary(
    employeeId: str = Query(...),
    year: int = Query(...),
    month: int = Query(...),
    accountId: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await service.confirm_salary(db, employeeId, year, month, accountId)
        return success(data)
    except ValueError as e:
        return error(str(e))


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
