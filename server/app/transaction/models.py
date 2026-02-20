import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # income | expense | transfer
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[str] = mapped_column(String(30), nullable=False)
    category_id: Mapped[str] = mapped_column(String(36), default="")
    account_id: Mapped[str] = mapped_column(String(36), nullable=False)
    to_account_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default=None)
    description: Mapped[str] = mapped_column(String(500), default="")
    tags: Mapped[str] = mapped_column(Text, default="[]")  # JSON array stored as text
    invoice_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default=None)
    book_id: Mapped[str] = mapped_column(String(36), default="default")

    # Workflow fields
    payment_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    payment_account_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)
    payer_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    payment_confirmed_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default=None)

    invoice_needed: Mapped[bool] = mapped_column(Boolean, default=True)
    invoice_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    invoice_confirmed_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default=None)

    tax_declared: Mapped[bool] = mapped_column(Boolean, default=False)
    tax_declared_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default=None)
    tax_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)

    # Reimbursement fields
    reimbursement_batch_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default=None)
    reimbursement_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)

    # Income record fields
    invoice_issued: Mapped[bool] = mapped_column(Boolean, default=False)
    invoice_images: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    company_account_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default=None)
    company_account_images: Mapped[str] = mapped_column(Text, default="[]")  # JSON array

    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: Mapped[str] = mapped_column(
        String(30),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
    )


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(200), default="")
    url: Mapped[str] = mapped_column(String(500), default="")
    type: Mapped[str] = mapped_column(String(50), default="")
    size: Mapped[int] = mapped_column(Integer, default=0)
