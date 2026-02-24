from typing import Optional
from pydantic import BaseModel


class ContactCreate(BaseModel):
    name: str
    type: str  # customer | vendor | both
    contactPerson: str = ""
    phone: str = ""
    email: str = ""
    taxNumber: str = ""
    address: str = ""
    notes: str = ""


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    contactPerson: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    taxNumber: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
