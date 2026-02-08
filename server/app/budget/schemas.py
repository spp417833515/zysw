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
    name: str | None = None
    categoryId: str | None = None
    amount: float | None = None
    period: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    alertThreshold: float | None = None
