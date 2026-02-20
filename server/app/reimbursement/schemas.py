from typing import List, Optional
from pydantic import BaseModel


class ReimbursementCreate(BaseModel):
    employeeName: str
    transactionIds: List[str]
    note: Optional[str] = ""


class ReimbursementComplete(BaseModel):
    completedDate: str  # 实际转账日期
    actualAmount: Optional[float] = None  # 实际报销金额，不填则等于totalAmount
    fee: float = 0.0  # 手续费
    feeAccountId: Optional[str] = None  # 手续费记账的账户ID
