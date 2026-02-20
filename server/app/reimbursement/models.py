import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReimbursementBatch(Base):
    __tablename__ = "reimbursement_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_no: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    employee_name: Mapped[str] = mapped_column(String(100), nullable=False)
    transaction_ids: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | completed
    note: Mapped[str] = mapped_column(String(500), default="")
    actual_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    fee: Mapped[float] = mapped_column(Float, default=0.0)
    fee_transaction_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default=None)
    completed_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default=None)
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.now(timezone.utc).isoformat()
    )
    completed_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default=None)
