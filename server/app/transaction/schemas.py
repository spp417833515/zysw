from typing import Optional, List
from pydantic import BaseModel


class AttachmentSchema(BaseModel):
    id: str = ""
    name: str = ""
    url: str = ""
    type: str = ""
    size: int = 0


class TransactionCreate(BaseModel):
    type: str
    amount: float
    date: str
    categoryId: str = ""
    accountId: str
    toAccountId: Optional[str] = None
    description: str = ""
    tags: List[str] = []
    attachments: List[AttachmentSchema] = []
    invoiceId: Optional[str] = None
    bookId: str = "default"
    paymentConfirmed: bool = False
    paymentAccountType: Optional[str] = None
    payerName: Optional[str] = None
    invoiceNeeded: bool = True
    invoiceCompleted: bool = False
    taxDeclared: bool = False
    taxPeriod: Optional[str] = None
    invoiceIssued: bool = False
    invoiceImages: List[AttachmentSchema] = []
    companyAccountDate: Optional[str] = None
    companyAccountImages: List[AttachmentSchema] = []


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    toAccountId: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[AttachmentSchema]] = None
    invoiceId: Optional[str] = None
    bookId: Optional[str] = None
    paymentConfirmed: Optional[bool] = None
    paymentAccountType: Optional[str] = None
    payerName: Optional[str] = None
    invoiceNeeded: Optional[bool] = None
    invoiceCompleted: Optional[bool] = None
    taxDeclared: Optional[bool] = None
    taxPeriod: Optional[str] = None
    invoiceIssued: Optional[bool] = None
    invoiceImages: Optional[List[AttachmentSchema]] = None
    companyAccountDate: Optional[str] = None
    companyAccountImages: Optional[List[AttachmentSchema]] = None


class ConfirmPaymentRequest(BaseModel):
    accountType: str  # company | personal


class ConfirmInvoiceRequest(BaseModel):
    invoiceId: Optional[str] = None


class ConfirmTaxRequest(BaseModel):
    taxPeriod: str
