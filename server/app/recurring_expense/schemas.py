from typing import Optional

from pydantic import BaseModel


class RecurringExpenseCreate(BaseModel):
    name: str
    amount: float
    dayOfMonth: int
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    note: Optional[str] = None
    startDate: str
    endDate: Optional[str] = None
    durationMonths: Optional[int] = None
    enabled: bool = True


class RecurringExpenseUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    dayOfMonth: Optional[int] = None
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    note: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    durationMonths: Optional[int] = None
    enabled: Optional[bool] = None
