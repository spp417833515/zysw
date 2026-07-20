from typing import Optional
from pydantic import BaseModel


class AccountCreate(BaseModel):
    """余额不可直接指定：balance 恒由「期初余额 + Σ流水」推导（单一事实来源）。"""
    name: str
    type: str
    initialBalance: float = 0.0
    icon: str = ""
    color: str = ""
    description: str = ""
    isDefault: bool = False


class AccountUpdate(BaseModel):
    """不含 balance：余额只能被流水驱动，禁止 API 直接覆写。"""
    name: Optional[str] = None
    type: Optional[str] = None
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
