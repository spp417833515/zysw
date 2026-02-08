from pydantic import BaseModel


class InvoiceItemSchema(BaseModel):
    name: str = ""
    quantity: float = 0
    unitPrice: float = 0
    amount: float = 0
    taxRate: float = 0
    taxAmount: float = 0


class InvoiceCreate(BaseModel):
    code: str = ""
    number: str = ""
    type: str
    direction: str
    amount: float = 0
    taxAmount: float = 0
    totalAmount: float = 0
    issueDate: str = ""
    buyerName: str = ""
    buyerTaxNumber: str = ""
    sellerName: str = ""
    sellerTaxNumber: str = ""
    items: list[InvoiceItemSchema] = []
    transactionId: str | None = None
    imageUrl: str | None = None
    status: str = "pending"


class InvoiceUpdate(BaseModel):
    code: str | None = None
    number: str | None = None
    type: str | None = None
    direction: str | None = None
    amount: float | None = None
    taxAmount: float | None = None
    totalAmount: float | None = None
    issueDate: str | None = None
    buyerName: str | None = None
    buyerTaxNumber: str | None = None
    sellerName: str | None = None
    sellerTaxNumber: str | None = None
    items: list[InvoiceItemSchema] | None = None
    transactionId: str | None = None
    imageUrl: str | None = None
    status: str | None = None
