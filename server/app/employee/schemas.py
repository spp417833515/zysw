from typing import Optional, List
from pydantic import BaseModel


class VoucherItem(BaseModel):
    id: str = ""
    name: str = ""
    url: str = ""
    type: str = ""
    size: int = 0


class SalaryConfirmRequest(BaseModel):
    employeeId: str
    year: int
    month: int
    accountId: Optional[str] = None
    transferFee: float = 0
    manualTax: Optional[float] = None      # 手动填写个税（不传则系统自动算）
    actualPaid: Optional[float] = None     # 实际发放金额（不传则等于税后应发）
    voucher: List[VoucherItem] = []


class EmployeeCreate(BaseModel):
    name: str
    phone: str = ""
    idNumber: str = ""
    department: str = ""
    position: str = ""
    entryDate: str = ""
    status: str = "active"
    baseSalary: float = 0
    payDay: int = 15
    socialInsuranceRate: float = 0
    housingFundRate: float = 0
    specialDeduction: float = 0
    notes: str = ""


class SalaryRecordUpdate(BaseModel):
    tax: Optional[float] = None
    actualPaid: Optional[float] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    idNumber: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    entryDate: Optional[str] = None
    status: Optional[str] = None
    baseSalary: Optional[float] = None
    payDay: Optional[int] = None
    socialInsuranceRate: Optional[float] = None
    housingFundRate: Optional[float] = None
    specialDeduction: Optional[float] = None
    notes: Optional[str] = None
