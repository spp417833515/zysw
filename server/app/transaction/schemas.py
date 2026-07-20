from typing import Optional, List, Literal
from pydantic import BaseModel, Field

TransactionType = Literal["income", "expense", "transfer"]
PaymentAccountType = Literal["company", "personal"]


class AttachmentSchema(BaseModel):
    id: str = ""
    name: str = ""
    url: str = ""
    type: str = ""
    size: int = 0


class TransactionCreate(BaseModel):
    type: TransactionType
    amount: float = Field(gt=0)
    date: str
    categoryId: Optional[str] = None
    accountId: str = Field(min_length=1)
    toAccountId: Optional[str] = None
    description: str = ""
    tags: List[str] = []
    attachments: List[AttachmentSchema] = []
    invoiceId: Optional[str] = None
    paymentConfirmed: bool = False
    paymentAccountType: Optional[PaymentAccountType] = None
    payerName: Optional[str] = None
    invoiceNeeded: bool = True
    invoiceCompleted: bool = False
    taxDeclared: bool = False
    taxPeriod: Optional[str] = None
    contactId: Optional[str] = None
    invoiceIssued: bool = False
    invoiceImages: List[AttachmentSchema] = []
    companyAccountDate: Optional[str] = None
    companyAccountImages: List[AttachmentSchema] = []


class BatchTransactionCreate(BaseModel):
    items: List[TransactionCreate]


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[float] = Field(default=None, gt=0)
    date: Optional[str] = None
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    toAccountId: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[AttachmentSchema]] = None
    invoiceId: Optional[str] = None
    paymentConfirmed: Optional[bool] = None
    paymentAccountType: Optional[PaymentAccountType] = None
    payerName: Optional[str] = None
    invoiceNeeded: Optional[bool] = None
    invoiceCompleted: Optional[bool] = None
    taxDeclared: Optional[bool] = None
    taxPeriod: Optional[str] = None
    contactId: Optional[str] = None
    invoiceIssued: Optional[bool] = None
    invoiceImages: Optional[List[AttachmentSchema]] = None
    companyAccountDate: Optional[str] = None
    companyAccountImages: Optional[List[AttachmentSchema]] = None


class ConfirmPaymentRequest(BaseModel):
    accountType: PaymentAccountType
    accountId: Optional[str] = None  # 若 txn.account_id 为空，则用此值绑定并扣账户


class BatchConfirmPaymentRequest(BaseModel):
    ids: List[str]
    accountType: PaymentAccountType
    accountId: Optional[str] = None


class ConfirmInvoiceRequest(BaseModel):
    invoiceId: Optional[str] = None


class ConfirmTaxRequest(BaseModel):
    taxPeriod: str
