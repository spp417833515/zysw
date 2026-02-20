from typing import Optional
from pydantic import BaseModel


class BudgetCreate(BaseModel):
    name: str
    categoryId: str
    amount: float
    period: str
    startDate: str
    endDate: str
    alertThreshold: float = 0.8


class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    categoryId: Optional[str] = None
    amount: Optional[float] = None
    period: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    alertThreshold: Optional[float] = None
