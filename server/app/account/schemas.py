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
    name: str | None = None
    type: str | None = None
    balance: float | None = None
    initialBalance: float | None = None
    icon: str | None = None
    color: str | None = None
    description: str | None = None
    isDefault: bool | None = None


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
