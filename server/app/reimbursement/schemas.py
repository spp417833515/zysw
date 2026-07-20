from typing import List, Optional
from pydantic import BaseModel, Field


class ReimbursementCreate(BaseModel):
    employeeName: str = Field(min_length=1)
    transactionIds: List[str] = Field(min_length=1)
    note: Optional[str] = ""


class ReimbursementComplete(BaseModel):
    completedDate: str  # 实际转账日期
    actualAmount: Optional[float] = Field(default=None, ge=0)  # 实际报销金额，不填则等于totalAmount
    fee: float = Field(default=0.0, ge=0)  # 手续费
    feeAccountId: Optional[str] = None  # 手续费记账的账户ID


class ReimbursementConfirmPayment(BaseModel):
    accountId: str = Field(min_length=1)  # 打款账户ID（必填：打款必须落账户）
