import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, Integer, Numeric, String, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_date", "date"),
        Index("ix_transactions_type", "type"),
        Index("ix_transactions_account_id", "account_id"),
        Index("ix_transactions_category_id", "category_id"),
        Index("ix_transactions_contact_id", "contact_id"),
        Index("ix_transactions_payment_confirmed", "payment_confirmed"),
        Index("ix_transactions_tax_declared", "tax_declared"),
        Index("ix_transactions_invoice_pending", "invoice_needed", "invoice_completed"),
        Index("ix_transactions_reimbursement_batch_id", "reimbursement_batch_id"),
        Index("ix_transactions_payout_batch_id", "payout_batch_id"),
        Index("ix_transactions_salary_record_id", "salary_record_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # income | expense | transfer
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    date: Mapped[str] = mapped_column(String(30), nullable=False)
    # 分类必填由 service 层校验（income/expense 建单必须选分类）；
    # 列本身可空以兼容无分类的系统流水，外键保证引用完整性
    category_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("categories.id"), nullable=True, default=None)
    # 可空：工资差额等挂账流水创建时尚无账户，确认收付时绑定（None，禁止空串哨兵）
    account_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True, default=None)
    to_account_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True, default=None)
    description: Mapped[str] = mapped_column(String(500), default="")
    tags: Mapped[str] = mapped_column(Text, default="[]")  # JSON array stored as text
    invoice_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default=None)

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

    # Contact（删联系人时自动解除关联，不阻断删除）
    contact_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, default=None)

    # Reimbursement fields
    reimbursement_batch_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("reimbursement_batches.id"), nullable=True, default=None)
    reimbursement_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)

    # 结构化业务关联（替代 [RB:]/[SR:] 描述文本标记 + LIKE 查询；描述仅作展示）
    # 本流水是某报销批次的打款流水（区别于 reimbursement_batch_id = 批次成员垫付流水）
    payout_batch_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("reimbursement_batches.id"), nullable=True, default=None)
    # 本流水是某工资记录的差额流水（补发/回收）。
    # 不设 FK：salary_records.transaction_id 已引用本表，再反向引用会构成循环外键，
    # SQLite/建表排序均无法处理；引用有效性由 employee service 保证
    salary_record_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default=None)

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
    transaction_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("transactions.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), default="")
    url: Mapped[str] = mapped_column(String(500), default="")
    type: Mapped[str] = mapped_column(String(50), default="")
    size: Mapped[int] = mapped_column(Integer, default=0)
