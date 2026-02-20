import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CompanyInfo(Base):
    __tablename__ = "company_info"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    tax_number: Mapped[str] = mapped_column(String, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=True, default="")
    phone: Mapped[str] = mapped_column(String, nullable=True, default="")
    bank_name: Mapped[str] = mapped_column(String, nullable=True, default="")
    bank_account: Mapped[str] = mapped_column(String, nullable=True, default="")
    created_at: Mapped[str] = mapped_column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String, default=lambda: datetime.now(timezone.utc).isoformat())


class TaxSettings(Base):
    """税率设置"""
    __tablename__ = "tax_settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # 增值税设置
    vat_rate: Mapped[float] = mapped_column(Float, default=0.03)  # 增值税率，默认3%
    vat_threshold_quarterly: Mapped[float] = mapped_column(Float, default=300000.0)  # 季度免征额，默认30万

    # 附加税设置（基于增值税）
    additional_tax_rate: Mapped[float] = mapped_column(Float, default=0.12)  # 附加税率，默认12%

    # 企业所得税设置
    income_tax_enabled: Mapped[bool] = mapped_column(Boolean, default=True)  # 是否启用企业所得税

    # 其他设置
    province: Mapped[str] = mapped_column(String, default="河南")  # 省份
    city: Mapped[str] = mapped_column(String, default="")  # 城市
    taxpayer_type: Mapped[str] = mapped_column(String, default="small")  # 纳税人类型：small=小规模，general=一般纳税人

    created_at: Mapped[str] = mapped_column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String, default=lambda: datetime.now(timezone.utc).isoformat())
