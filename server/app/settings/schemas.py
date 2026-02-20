from typing import Optional
from pydantic import BaseModel


class CompanyInfoCreate(BaseModel):
    companyName: str
    taxNumber: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    bankName: Optional[str] = ""
    bankAccount: Optional[str] = ""


class CompanyInfoUpdate(BaseModel):
    companyName: Optional[str] = None
    taxNumber: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    bankName: Optional[str] = None
    bankAccount: Optional[str] = None


class CompanyInfoOut(BaseModel):
    id: str
    companyName: str
    taxNumber: str
    address: str
    phone: str
    bankName: str
    bankAccount: str
    createdAt: str
    updatedAt: str


class TaxSettingsCreate(BaseModel):
    vatRate: float = 0.03
    vatThresholdQuarterly: float = 300000.0
    additionalTaxRate: float = 0.12
    incomeTaxEnabled: bool = True
    province: str = "河南"
    city: Optional[str] = ""
    taxpayerType: str = "small"


class TaxSettingsUpdate(BaseModel):
    vatRate: Optional[float] = None
    vatThresholdQuarterly: Optional[float] = None
    additionalTaxRate: Optional[float] = None
    incomeTaxEnabled: Optional[bool] = None
    province: Optional[str] = None
    city: Optional[str] = None
    taxpayerType: Optional[str] = None


class TaxSettingsOut(BaseModel):
    id: str
    vatRate: float
    vatThresholdQuarterly: float
    additionalTaxRate: float
    incomeTaxEnabled: bool
    province: str
    city: str
    taxpayerType: str
    createdAt: str
    updatedAt: str
