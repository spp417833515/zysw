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
    toAccountId: str | None = None
    description: str = ""
    tags: list[str] = []
    attachments: list[AttachmentSchema] = []
    invoiceId: str | None = None
    bookId: str = "default"
    paymentConfirmed: bool = False
    paymentAccountType: str | None = None
    invoiceNeeded: bool = True
    invoiceCompleted: bool = False
    taxDeclared: bool = False
    taxPeriod: str | None = None
    invoiceIssued: bool = False
    invoiceImages: list[AttachmentSchema] = []
    companyAccountDate: str | None = None
    companyAccountImages: list[AttachmentSchema] = []


class TransactionUpdate(BaseModel):
    type: str | None = None
    amount: float | None = None
    date: str | None = None
    categoryId: str | None = None
    accountId: str | None = None
    toAccountId: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    attachments: list[AttachmentSchema] | None = None
    invoiceId: str | None = None
    bookId: str | None = None
    paymentConfirmed: bool | None = None
    paymentAccountType: str | None = None
    invoiceNeeded: bool | None = None
    invoiceCompleted: bool | None = None
    taxDeclared: bool | None = None
    taxPeriod: str | None = None
    invoiceIssued: bool | None = None
    invoiceImages: list[AttachmentSchema] | None = None
    companyAccountDate: str | None = None
    companyAccountImages: list[AttachmentSchema] | None = None


class ConfirmPaymentRequest(BaseModel):
    accountType: str  # company | personal


class ConfirmInvoiceRequest(BaseModel):
    invoiceId: str | None = None


class ConfirmTaxRequest(BaseModel):
    taxPeriod: str
