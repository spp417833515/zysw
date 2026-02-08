import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(50), default="")
    number: Mapped[str] = mapped_column(String(50), default="")
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # normal | special | electronic
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # in | out
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    issue_date: Mapped[str] = mapped_column(String(30), default="")
    buyer_name: Mapped[str] = mapped_column(String(200), default="")
    buyer_tax_number: Mapped[str] = mapped_column(String(50), default="")
    seller_name: Mapped[str] = mapped_column(String(200), default="")
    seller_tax_number: Mapped[str] = mapped_column(String(50), default="")
    items: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    transaction_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default=None)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | verified | void
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: Mapped[str] = mapped_column(
        String(30),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
    )
