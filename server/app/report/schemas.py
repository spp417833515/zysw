from pydantic import BaseModel


class ProfitLossReport(BaseModel):
    totalIncome: float
    totalExpense: float
    netProfit: float
    incomeByCategory: List[dict]
    expenseByCategory: List[dict]


class CashFlowReport(BaseModel):
    inflow: float
    outflow: float
    netFlow: float
    byAccount: List[dict]
    byMonth: List[dict]


class CategoryReport(BaseModel):
    categories: List[dict]
    total: float


class TrendReport(BaseModel):
    months: List[dict]
