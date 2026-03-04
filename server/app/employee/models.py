import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Float, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), default="")
    id_number: Mapped[str] = mapped_column(String(30), default="")  # 身份证号
    department: Mapped[str] = mapped_column(String(100), default="")
    position: Mapped[str] = mapped_column(String(100), default="")
    entry_date: Mapped[str] = mapped_column(String(30), default="")  # 入职日期
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | departed
    base_salary: Mapped[float] = mapped_column(Float, default=0)  # 基本工资
    pay_day: Mapped[int] = mapped_column(Integer, default=15)  # 每月发薪日
    # 五险一金（个人部分比例，默认0 - 一人公司可不缴）
    social_insurance_rate: Mapped[float] = mapped_column(Float, default=0)  # 社保个人比例 %
    housing_fund_rate: Mapped[float] = mapped_column(Float, default=0)  # 公积金个人比例 %
    # 专项附加扣除
    special_deduction: Mapped[float] = mapped_column(Float, default=0)  # 专项附加扣除总额/月
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: Mapped[str] = mapped_column(
        String(30),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
    )


class SalaryRecord(Base):
    __tablename__ = "salary_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id: Mapped[str] = mapped_column(String(36), nullable=False)
    employee_name: Mapped[str] = mapped_column(String(100), default="")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    base_salary: Mapped[float] = mapped_column(Float, default=0)
    tax: Mapped[float] = mapped_column(Float, default=0)
    net_salary: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="confirmed")  # confirmed
    transaction_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default=None)
    confirmed_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.now(timezone.utc).isoformat()
    )
