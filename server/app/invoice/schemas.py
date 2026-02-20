from typing import Optional, List
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
    items: List[InvoiceItemSchema] = []
    transactionId: Optional[str] = None
    imageUrl: Optional[str] = None
    status: str = "pending"


class InvoiceUpdate(BaseModel):
    code: Optional[str] = None
    number: Optional[str] = None
    type: Optional[str] = None
    direction: Optional[str] = None
    amount: Optional[float] = None
    taxAmount: Optional[float] = None
    totalAmount: Optional[float] = None
    issueDate: Optional[str] = None
    buyerName: Optional[str] = None
    buyerTaxNumber: Optional[str] = None
    sellerName: Optional[str] = None
    sellerTaxNumber: Optional[str] = None
    items: Optional[List[InvoiceItemSchema]] = None
    transactionId: Optional[str] = None
    imageUrl: Optional[str] = None
    status: Optional[str] = None
