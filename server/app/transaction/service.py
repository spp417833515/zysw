import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.account.models import Account
from app.category.models import Category
from app.contact.models import Contact
from app.transaction.models import Attachment, Transaction
from app.transaction.schemas import TransactionCreate, TransactionUpdate


def _to_dict(txn: Transaction, attachments: Optional[list] = None,
             category_name: str = "", account_name: str = "", to_account_name: str = "",
             contact_name: str = "") -> dict:
    return {
        "id": txn.id,
        "type": txn.type,
        "amount": float(txn.amount),
        "date": txn.date,
        "categoryId": txn.category_id or "",
        "categoryName": category_name,
        # 库内 NULL，对外仍输出空串（保持前端契约不变）
        "accountId": txn.account_id or "",
        "accountName": account_name,
        "toAccountId": txn.to_account_id,
        "toAccountName": to_account_name,
        "contactId": txn.contact_id,
        "contactName": contact_name,
        "description": txn.description,
        "tags": json.loads(txn.tags) if txn.tags else [],
        "attachments": attachments or [],
        "invoiceId": txn.invoice_id,
        "createdAt": txn.created_at,
        "updatedAt": txn.updated_at,
        "paymentConfirmed": txn.payment_confirmed,
        "paymentAccountType": txn.payment_account_type,
        "payerName": txn.payer_name,
        "paymentConfirmedAt": txn.payment_confirmed_at,
        "invoiceNeeded": txn.invoice_needed,
        "invoiceCompleted": txn.invoice_completed,
        "invoiceConfirmedAt": txn.invoice_confirmed_at,
        "taxDeclared": txn.tax_declared,
        "taxDeclaredAt": txn.tax_declared_at,
        "taxPeriod": txn.tax_period,
        "invoiceIssued": txn.invoice_issued,
        "invoiceImages": json.loads(txn.invoice_images) if txn.invoice_images else [],
        "companyAccountDate": txn.company_account_date,
        "companyAccountImages": json.loads(txn.company_account_images) if txn.company_account_images else [],
        "reimbursementBatchId": txn.reimbursement_batch_id,
        "reimbursementStatus": txn.reimbursement_status,
    }


async def _get_attachments(db: AsyncSession, transaction_id: str) -> List[dict]:
    result = await db.execute(
        select(Attachment).where(Attachment.transaction_id == transaction_id)
    )
    return [
        {"id": a.id, "name": a.name, "url": a.url, "type": a.type, "size": a.size}
        for a in result.scalars().all()
    ]


async def _get_name(db: AsyncSession, model, obj_id: Optional[str]) -> str:
    if not obj_id:
        return ""
    obj = await db.get(model, obj_id)
    return obj.name if obj else ""


async def _enrich(db: AsyncSession, txn: Transaction, attachments: Optional[list] = None) -> dict:
    if attachments is None:
        att_result = await _get_attachments(db, txn.id)
    else:
        att_result = attachments
    cat_name = await _get_name(db, Category, txn.category_id)
    acc_name = await _get_name(db, Account, txn.account_id)
    to_acc_name = await _get_name(db, Account, txn.to_account_id)
    contact_name = await _get_name(db, Contact, txn.contact_id)
    return _to_dict(txn, att_result, cat_name, acc_name, to_acc_name, contact_name)


async def _batch_enrich(db: AsyncSession, txns: List[Transaction]) -> List[dict]:
    """Batch enrich transactions: 3 IN queries for names + 1 for attachments instead of N+1."""
    if not txns:
        return []

    # Collect all IDs
    txn_ids = [t.id for t in txns]
    cat_ids = {t.category_id for t in txns if t.category_id}
    acc_ids = {t.account_id for t in txns}
    acc_ids.update(t.to_account_id for t in txns if t.to_account_id)
    contact_ids = {t.contact_id for t in txns if t.contact_id}

    # Batch query names
    cat_map: dict[str, str] = {}
    if cat_ids:
        result = await db.execute(select(Category.id, Category.name).where(Category.id.in_(cat_ids)))
        cat_map = {r[0]: r[1] for r in result.all()}

    acc_map: dict[str, str] = {}
    if acc_ids:
        result = await db.execute(select(Account.id, Account.name).where(Account.id.in_(acc_ids)))
        acc_map = {r[0]: r[1] for r in result.all()}

    contact_map: dict[str, str] = {}
    if contact_ids:
        result = await db.execute(select(Contact.id, Contact.name).where(Contact.id.in_(contact_ids)))
        contact_map = {r[0]: r[1] for r in result.all()}

    # Batch query attachments
    att_result = await db.execute(
        select(Attachment).where(Attachment.transaction_id.in_(txn_ids))
    )
    att_map: dict[str, list] = {}
    for a in att_result.scalars().all():
        att_map.setdefault(a.transaction_id, []).append(
            {"id": a.id, "name": a.name, "url": a.url, "type": a.type, "size": a.size}
        )

    # Assemble results
    items = []
    for txn in txns:
        items.append(_to_dict(
            txn,
            attachments=att_map.get(txn.id, []),
            category_name=cat_map.get(txn.category_id, "") if txn.category_id else "",
            account_name=acc_map.get(txn.account_id, ""),
            to_account_name=acc_map.get(txn.to_account_id, "") if txn.to_account_id else "",
            contact_name=contact_map.get(txn.contact_id, "") if txn.contact_id else "",
        ))
    return items


# 报销打款流水的描述前缀标记（仅作展示；口径过滤一律走 payout_batch_id 结构化列）
REIMBURSE_PAYOUT_MARKER_PREFIX = "[RB:"


def exclude_reimburse_payout_condition():
    """排除报销打款流水的过滤条件——打款是清偿负债，
    费用已由员工垫付的原始流水计入，再计一次即双计。
    按结构化关联列判定（描述文本用户可改，不作为口径依据）。"""
    return Transaction.payout_batch_id.is_(None)


def business_expense_conditions() -> list:
    """费用统计的统一口径（全系统唯一定义点，权责视角）：
    type=expense 且排除 [RB:] 报销打款流水。
    Dashboard / 报表中心 / 预算 / 税务报表的费用合计都必须用本条件。
    """
    return [
        Transaction.type == "expense",
        exclude_reimburse_payout_condition(),
    ]


def company_cash_conditions() -> list:
    """公司现金收付的统一口径（收付实现视角）：
    仅计「已确认收付 且 非私户垫付」的流水——私户垫付没动公司的钱，
    [RB:] 报销打款是公司真实出款、自然计入。
    """
    return [
        Transaction.payment_confirmed == True,  # noqa: E712
        or_(Transaction.payment_account_type.is_(None),
            Transaction.payment_account_type != "personal"),
    ]


def _counts_toward_balance(txn_type: str, payment_confirmed: bool,
                           payment_account_type: Optional[str]) -> bool:
    """余额统一口径（全系统唯一判定点）：
    - transfer：内部资金划转，创建即生效
    - income/expense：仅在「已确认收付 且 非私户垫付」时计入公司账户余额
      （未确认=挂账不动钱；personal=员工垫付，公司账户没出钱）
    """
    if txn_type == "transfer":
        return True
    return bool(payment_confirmed) and payment_account_type != "personal"


async def _update_balance(db: AsyncSession, txn_type: str, amount: float,
                          account_id: str, to_account_id: Optional[str],
                          reverse: bool = False):
    """机械施加余额效果。是否应该计入由调用方用 _counts_toward_balance 判定。

    账户不存在时立即抛错（快速失败），禁止「状态改了、余额没动」的静默账实分离。
    """
    multiplier = -1 if reverse else 1
    delta = Decimal(str(amount)) * multiplier
    account = await db.get(Account, account_id)
    if not account:
        raise ValueError(f"账户不存在，无法更新余额: {account_id}")
    if txn_type == "income":
        account.balance += delta
    elif txn_type == "expense":
        account.balance -= delta
    elif txn_type == "transfer":
        account.balance -= delta
    if txn_type == "transfer" and to_account_id:
        to_account = await db.get(Account, to_account_id)
        if not to_account:
            raise ValueError(f"转入账户不存在，无法更新余额: {to_account_id}")
        to_account.balance += delta


async def create_confirmed_transaction(
    db: AsyncSession,
    *,
    txn_type: str,
    amount: float,
    date: str,
    category_id: str,
    account_id: str,
    description: str,
    payment_account_type: str = "company",
    confirmed_at: Optional[str] = None,
    to_account_id: Optional[str] = None,
) -> Transaction:
    """跨模块创建「已确认收付」流水的唯一入口（报销打款/手续费、工资发放等）。

    校验账户存在 → 落流水 → 按统一口径施加余额效果，三件事绑定在一起，
    杜绝各业务模块自己 new Transaction + 手工加减余额造成的口径漂移。
    调用方负责 commit。
    """
    if not await db.get(Account, account_id):
        raise ValueError(f"账户不存在: {account_id}")
    now = confirmed_at or datetime.now(timezone.utc).isoformat()
    txn = Transaction(
        id=str(uuid.uuid4()),
        type=txn_type,
        amount=amount,
        date=date,
        category_id=category_id,
        account_id=account_id,
        to_account_id=to_account_id,
        description=description,
        tags="[]",
        payment_confirmed=True,
        payment_account_type=payment_account_type,
        payment_confirmed_at=now,
        invoice_needed=False,
    )
    db.add(txn)
    if _counts_toward_balance(txn_type, True, payment_account_type):
        await _update_balance(db, txn_type, amount, account_id, to_account_id)
    # 先 flush 落库：调用方常把返回流水的 id 写入带外键的关联表
    # （如 salary_records.transaction_id），不 flush 则插入顺序不保证、外键会违约
    await db.flush()
    return txn


async def adjust_transaction_amount(db: AsyncSession, txn: Transaction, new_amount: float) -> None:
    """修改流水金额并按统一口径同步余额（先冲销旧额，再施加新额）。

    业务模块改金额必须走这里，禁止自己手工加减余额。调用方负责 commit。
    """
    counts = _counts_toward_balance(txn.type, txn.payment_confirmed, txn.payment_account_type)
    if counts:
        await _update_balance(db, txn.type, float(txn.amount), txn.account_id,
                              txn.to_account_id, reverse=True)
    txn.amount = new_amount
    txn.updated_at = datetime.now(timezone.utc).isoformat()
    if counts:
        await _update_balance(db, txn.type, new_amount, txn.account_id, txn.to_account_id)


async def compute_expected_balances(db: AsyncSession) -> dict:
    """按「期初余额 + Σ计入余额的流水」重算每个账户的应有余额。

    这是余额的唯一推导口径（与 _counts_toward_balance 同源），
    seed、对账断言、修复脚本都必须复用本函数，禁止各自重算。
    返回 {account_id: Decimal 应有余额}。
    """
    accounts = (await db.execute(select(Account))).scalars().all()
    expected = {a.id: Decimal(str(float(a.initial_balance or 0))) for a in accounts}
    txns = (await db.execute(select(Transaction))).scalars().all()
    for t in txns:
        if not _counts_toward_balance(t.type, t.payment_confirmed, t.payment_account_type):
            continue
        amt = Decimal(str(float(t.amount)))
        if t.account_id in expected:
            expected[t.account_id] += amt if t.type == "income" else -amt
        if t.type == "transfer" and t.to_account_id in expected:
            expected[t.to_account_id] += amt
    return expected


async def reconcile_accounts(db: AsyncSession) -> List[dict]:
    """只读对账：逐账户比较存储余额与流水重算值，返回差异明细。"""
    accounts = (await db.execute(select(Account))).scalars().all()
    expected = await compute_expected_balances(db)
    report = []
    for a in accounts:
        actual = Decimal(str(float(a.balance)))
        exp = expected[a.id]
        diff = actual - exp
        report.append({
            "accountId": a.id,
            "accountName": a.name,
            "balance": float(actual),
            "expected": float(exp),
            "diff": float(diff),
            "consistent": abs(diff) < Decimal("0.005"),
        })
    return report


async def get_transactions(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    type_filter: Optional[str] = None,
    category_id: Optional[str] = None,
    account_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    keyword: Optional[str] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
) -> dict:
    conditions = []
    if type_filter:
        conditions.append(Transaction.type == type_filter)
    if category_id:
        conditions.append(Transaction.category_id == category_id)
    if account_id:
        conditions.append(Transaction.account_id == account_id)
    if contact_id:
        conditions.append(Transaction.contact_id == contact_id)
    if date_start:
        conditions.append(Transaction.date >= date_start)
    if date_end:
        conditions.append(Transaction.date <= date_end)
    if keyword:
        conditions.append(Transaction.description.contains(keyword))
    if amount_min is not None:
        conditions.append(Transaction.amount >= amount_min)
    if amount_max is not None:
        conditions.append(Transaction.amount <= amount_max)

    where_clause = and_(*conditions) if conditions else True

    # Count
    count_result = await db.execute(select(func.count(Transaction.id)).where(where_clause))
    total = count_result.scalar() or 0

    # Query
    result = await db.execute(
        select(Transaction)
        .where(where_clause)
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    txns = result.scalars().all()

    items = await _batch_enrich(db, list(txns))

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


async def get_transaction_by_id(db: AsyncSession, txn_id: str) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    return await _enrich(db, txn)


async def create_transaction(db: AsyncSession, data: TransactionCreate) -> dict:
    # 分类必填（库 DDL 为 NOT NULL，提前拦截避免 IntegrityError 500）
    if not data.categoryId:
        raise ValueError("必须选择分类")
    # 账户必须真实存在（库层无外键，应用层兜底）
    if not await db.get(Account, data.accountId):
        raise ValueError(f"账户不存在: {data.accountId}")
    if data.type == "transfer":
        if not data.toAccountId:
            raise ValueError("转账必须选择转入账户")
        if not await db.get(Account, data.toAccountId):
            raise ValueError(f"转入账户不存在: {data.toAccountId}")

    txn = Transaction(
        type=data.type,
        amount=data.amount,
        date=data.date,
        category_id=data.categoryId or None,
        account_id=data.accountId,
        to_account_id=data.toAccountId,
        description=data.description,
        tags=json.dumps(data.tags),
        invoice_id=data.invoiceId,
        payment_confirmed=data.paymentConfirmed,
        payment_account_type=data.paymentAccountType,
        payer_name=data.payerName,
        invoice_needed=data.invoiceNeeded,
        invoice_completed=data.invoiceCompleted,
        tax_declared=data.taxDeclared,
        tax_period=data.taxPeriod,
        contact_id=data.contactId,
        invoice_issued=data.invoiceIssued,
        invoice_images=json.dumps([a.model_dump() for a in data.invoiceImages]),
        company_account_date=data.companyAccountDate,
        company_account_images=json.dumps([a.model_dump() for a in data.companyAccountImages]),
    )
    db.add(txn)

    # Save attachments
    att_dicts = []
    for att in data.attachments:
        a = Attachment(
            id=att.id or str(uuid.uuid4()),
            transaction_id=txn.id,
            name=att.name,
            url=att.url,
            type=att.type,
            size=att.size,
        )
        db.add(a)
        att_dicts.append({"id": a.id, "name": a.name, "url": a.url, "type": a.type, "size": a.size})

    # 余额口径：确认收付才计入（未确认=挂账；personal=垫付不动公司账户）
    if _counts_toward_balance(data.type, data.paymentConfirmed, data.paymentAccountType):
        await _update_balance(db, data.type, data.amount, data.accountId, data.toAccountId)

    await db.commit()
    await db.refresh(txn)

    return await _enrich(db, txn, att_dicts)


# 修改这些字段会改变资金语义，已入报销批次的流水必须先解除批次
_MONEY_CRITICAL_FIELDS = {"type", "amount", "date", "accountId", "toAccountId",
                          "paymentAccountType", "paymentConfirmed"}


async def update_transaction(db: AsyncSession, txn_id: str, data: TransactionUpdate) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # 已入报销批次的流水：金额/账户/类型/确认状态被批次快照引用，禁止直改
    if txn.reimbursement_batch_id and _MONEY_CRITICAL_FIELDS & set(update_data):
        raise ValueError("该流水已加入报销批次，请先删除批次或完成打款后再修改")

    # 新账户必须真实存在
    if update_data.get("accountId") and not await db.get(Account, update_data["accountId"]):
        raise ValueError(f"账户不存在: {update_data['accountId']}")
    if update_data.get("toAccountId") and not await db.get(Account, update_data["toAccountId"]):
        raise ValueError(f"转入账户不存在: {update_data['toAccountId']}")

    # Reverse old balance effect（按旧快照判定是否计过）
    if _counts_toward_balance(txn.type, txn.payment_confirmed, txn.payment_account_type):
        await _update_balance(db, txn.type, txn.amount, txn.account_id, txn.to_account_id,
                              reverse=True)

    field_map = {
        "categoryId": "category_id",
        "accountId": "account_id",
        "toAccountId": "to_account_id",
        "contactId": "contact_id",
        "invoiceId": "invoice_id",
        "paymentConfirmed": "payment_confirmed",
        "paymentAccountType": "payment_account_type",
        "payerName": "payer_name",
        "invoiceNeeded": "invoice_needed",
        "invoiceCompleted": "invoice_completed",
        "taxDeclared": "tax_declared",
        "taxPeriod": "tax_period",
        "invoiceIssued": "invoice_issued",
        "invoiceImages": "invoice_images",
        "companyAccountDate": "company_account_date",
        "companyAccountImages": "company_account_images",
        "reimbursementBatchId": "reimbursement_batch_id",
        "reimbursementStatus": "reimbursement_status",
    }

    # Handle attachments separately
    new_attachments = update_data.pop("attachments", None)

    json_fields = {"tags", "invoice_images", "company_account_images"}
    # 引用列禁止空串哨兵：空即 NULL（外键约束下空串会违约）
    ref_fields = {"category_id", "account_id", "to_account_id", "contact_id",
                  "reimbursement_batch_id"}
    for key, value in update_data.items():
        attr = field_map.get(key, key)
        if attr in ref_fields and value == "":
            value = None
        if attr in json_fields:
            if isinstance(value, list):
                setattr(txn, attr, json.dumps([
                    v.model_dump() if hasattr(v, 'model_dump') else v for v in value
                ]))
            else:
                setattr(txn, attr, json.dumps(value))
        else:
            setattr(txn, attr, value)

    txn.updated_at = datetime.now(timezone.utc).isoformat()

    # Apply new balance effect（按新快照判定是否该计）
    if _counts_toward_balance(txn.type, txn.payment_confirmed, txn.payment_account_type):
        if not txn.account_id:
            raise ValueError("已确认收付的流水必须绑定账户")
        await _update_balance(db, txn.type, txn.amount, txn.account_id, txn.to_account_id)

    # Update attachments if provided
    if new_attachments is not None:
        # Delete old
        old_atts = await db.execute(
            select(Attachment).where(Attachment.transaction_id == txn_id)
        )
        for old in old_atts.scalars().all():
            await db.delete(old)
        # Add new
        for att_data in new_attachments:
            a = Attachment(
                id=att_data.get("id") or str(uuid.uuid4()),
                transaction_id=txn_id,
                name=att_data.get("name", ""),
                url=att_data.get("url", ""),
                type=att_data.get("type", ""),
                size=att_data.get("size", 0),
            )
            db.add(a)

    await db.commit()
    await db.refresh(txn)

    return await _enrich(db, txn)


async def delete_transaction(db: AsyncSession, txn_id: str) -> bool:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return False

    # 引用保护：入了报销批次 / 被工资记录引用的流水不能直接删
    if txn.reimbursement_batch_id:
        raise ValueError("该流水已加入报销批次，请先删除批次或完成打款")
    from app.employee.models import SalaryRecord
    linked = await db.execute(
        select(SalaryRecord.id).where(SalaryRecord.transaction_id == txn_id)
    )
    if linked.first():
        raise ValueError("该流水关联工资发放记录，不能直接删除")

    # Reverse balance（仅当创建/确认时计过）
    if _counts_toward_balance(txn.type, txn.payment_confirmed, txn.payment_account_type):
        await _update_balance(db, txn.type, txn.amount, txn.account_id, txn.to_account_id,
                              reverse=True)

    # Delete attachments
    atts = await db.execute(select(Attachment).where(Attachment.transaction_id == txn_id))
    for a in atts.scalars().all():
        await db.delete(a)

    await db.delete(txn)
    await db.commit()
    return True


# Workflow operations

async def _apply_payment_confirmed(db: AsyncSession, txn: Transaction,
                                   account_type: str,
                                   account_id: Optional[str] = None) -> None:
    """将单笔交易标记为已付款。

    新口径（与 _counts_toward_balance 对齐）：未确认流水创建时不动余额，
    确认时一次性计入。personal（私户垫付）确认后仍不动公司余额。

    守卫（均在任何状态变更前抛出，调用方负责 commit）：
    - 已确认的流水不能重复确认（防双扣）
    - 已入报销批次的流水必须走报销打款
    - 非 personal 确认必须落到真实账户（无账户流水须传 account_id 绑定）
    """
    if txn.payment_confirmed:
        raise ValueError("该流水已确认收付，不能重复确认")
    if txn.reimbursement_batch_id:
        raise ValueError("该流水已加入报销批次，请通过报销打款完成支付")

    now = datetime.now(timezone.utc).isoformat()

    if txn.type == "transfer":
        # 转账创建即计入余额，确认仅是状态标记
        txn.payment_confirmed = True
        txn.payment_confirmed_at = now
        txn.updated_at = now
        return

    # 非 personal 确认必须有账户可落（工资差额等无账户流水在此绑定）
    if account_type != "personal" and not txn.account_id:
        if not account_id:
            raise ValueError("该流水未绑定账户，确认时必须指定收付账户")
        account = await db.get(Account, account_id)
        if not account:
            raise ValueError(f"账户不存在: {account_id}")
        txn.account_id = account_id

    txn.payment_confirmed = True
    txn.payment_account_type = account_type
    txn.payment_confirmed_at = now
    txn.updated_at = now

    # 确认时点计入余额（创建时未计）
    if _counts_toward_balance(txn.type, True, account_type):
        await _update_balance(db, txn.type, float(txn.amount),
                              txn.account_id, txn.to_account_id)


async def confirm_payment(db: AsyncSession, txn_id: str, account_type: str,
                          account_id: Optional[str] = None) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    await _apply_payment_confirmed(db, txn, account_type, account_id)
    await db.commit()
    await db.refresh(txn)
    return await _enrich(db, txn)


async def batch_confirm_payment(db: AsyncSession, ids: List[str], account_type: str,
                                account_id: Optional[str] = None) -> dict:
    """合并付款：对一组交易统一标记已付款。

    best-effort：跳过不存在/已确认的，commit 一次提交所有成功项。
    若提供 account_id，则对所有 account_id 为空的交易绑定该账户并扣余额。
    """
    # 提前校验 accountId（如有），避免循环中部分成功
    if account_id and account_type != "personal":
        if not await db.get(Account, account_id):
            raise ValueError(f"账户不存在: {account_id}")

    success_ids: List[str] = []
    skipped: List[dict] = []
    for tid in ids:
        txn = await db.get(Transaction, tid)
        if not txn:
            skipped.append({"id": tid, "reason": "not_found"})
            continue
        if txn.payment_confirmed:
            skipped.append({"id": tid, "reason": "already_confirmed"})
            continue
        try:
            await _apply_payment_confirmed(db, txn, account_type, account_id)
        except ValueError as e:
            # 守卫拒绝（入报销批次/缺账户等），跳过该笔不影响其余
            skipped.append({"id": tid, "reason": str(e)})
            continue
        success_ids.append(tid)
    if success_ids:
        await db.commit()
    return {
        "success": len(success_ids),
        "successIds": success_ids,
        "skipped": skipped,
    }


async def confirm_invoice(db: AsyncSession, txn_id: str, invoice_id: Optional[str] = None) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    txn.invoice_completed = True
    txn.invoice_confirmed_at = datetime.now(timezone.utc).isoformat()
    if invoice_id:
        txn.invoice_id = invoice_id
    txn.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(txn)
    return await _enrich(db, txn)


async def skip_invoice(db: AsyncSession, txn_id: str) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    txn.invoice_needed = False
    txn.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(txn)
    return await _enrich(db, txn)


async def confirm_tax(db: AsyncSession, txn_id: str, tax_period: str) -> Optional[dict]:
    txn = await db.get(Transaction, txn_id)
    if not txn:
        return None
    txn.tax_declared = True
    txn.tax_declared_at = datetime.now(timezone.utc).isoformat()
    txn.tax_period = tax_period
    txn.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(txn)
    return await _enrich(db, txn)


async def get_pending_payments(db: AsyncSession) -> List[dict]:
    result = await db.execute(
        select(Transaction)
        .where(Transaction.payment_confirmed == False)
        .order_by(Transaction.date.desc())
    )
    return await _batch_enrich(db, list(result.scalars().all()))


async def get_pending_invoices(db: AsyncSession) -> List[dict]:
    result = await db.execute(
        select(Transaction)
        .where(and_(Transaction.invoice_needed == True, Transaction.invoice_completed == False))
        .order_by(Transaction.date.desc())
    )
    return await _batch_enrich(db, list(result.scalars().all()))


async def get_reimbursable_transactions(db: AsyncSession) -> List[dict]:
    """全部可入报销批次的流水：私户垫付支出且未关联批次（全量，不分页）。

    创建报销单的候选池必须用本接口，不能复用流水列表页的分页缓存。
    """
    result = await db.execute(
        select(Transaction)
        .where(and_(
            Transaction.type == "expense",
            Transaction.payment_account_type == "personal",
            Transaction.reimbursement_batch_id.is_(None),
        ))
        .order_by(Transaction.date.desc())
    )
    return await _batch_enrich(db, list(result.scalars().all()))


async def get_pending_taxes(db: AsyncSession) -> List[dict]:
    result = await db.execute(
        select(Transaction)
        .where(Transaction.tax_declared == False)
        .order_by(Transaction.date.desc())
    )
    return await _batch_enrich(db, list(result.scalars().all()))


async def batch_confirm_tax(db: AsyncSession, tax_period: str) -> dict:
    """一键申报：将所有未申报交易标记为已申报"""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.execute(
        select(Transaction).where(Transaction.tax_declared == False)
    )
    txns = list(result.scalars().all())
    count = 0
    for txn in txns:
        txn.tax_declared = True
        txn.tax_declared_at = now
        txn.tax_period = tax_period
        txn.updated_at = now
        count += 1
    if count > 0:
        await db.commit()
    return {"count": count, "taxPeriod": tax_period, "declaredAt": now}


async def batch_create_transactions(db: AsyncSession, items_data: list) -> dict:
    created = 0
    errors = []
    for i, data in enumerate(items_data):
        try:
            await create_transaction(db, data)
            created += 1
        except Exception as e:
            errors.append({"index": i, "error": str(e)})
    return {"created": created, "errors": errors}
