from typing import Optional
from pydantic import BaseModel


class AccountCreate(BaseModel):
    name: str
    type: str
    balance: float = 0.0
    initialBalance: float = 0.0
    icon: str = ""
    color: str = ""
    description: str = ""
    isDefault: bool = False


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None
    initialBalance: Optional[float] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    isDefault: Optional[bool] = None


class AccountOut(BaseModel):
    id: str
    name: str
    type: str
    balance: float
    initialBalance: float
    icon: str
    color: str
    description: str
    isDefault: bool
    createdAt: str
    updatedAt: str
