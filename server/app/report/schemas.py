from pydantic import BaseModel


class ProfitLossReport(BaseModel):
    totalIncome: float
    totalExpense: float
    netProfit: float
    incomeByCategory: list[dict]
    expenseByCategory: list[dict]


class CashFlowReport(BaseModel):
    inflow: float
    outflow: float
    netFlow: float
    byAccount: list[dict]
    byMonth: list[dict]


class CategoryReport(BaseModel):
    categories: list[dict]
    total: float


class TrendReport(BaseModel):
    months: list[dict]
