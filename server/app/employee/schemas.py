from typing import Optional
from pydantic import BaseModel


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
