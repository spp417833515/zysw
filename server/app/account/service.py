from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Union, List

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.account.models import Account
from app.account.schemas import AccountCreate, AccountUpdate
from app.transaction.models import Transaction


def _to_dict(account: Account) -> dict:
    return {
        "id": account.id,
        "name": account.name,
        "type": account.type,
        "balance": float(account.balance),
        "initialBalance": float(account.initial_balance),
        "icon": account.icon,
        "color": account.color,
        "description": account.description,
        "isDefault": account.is_default,
        "createdAt": account.created_at,
        "updatedAt": account.updated_at,
    }


async def get_accounts(db: AsyncSession) -> List[dict]:
    result = await db.execute(select(Account).order_by(Account.created_at))
    return [_to_dict(a) for a in result.scalars().all()]


async def get_account_by_id(db: AsyncSession, account_id: str) -> Optional[dict]:
    account = await db.get(Account, account_id)
    return _to_dict(account) if account else None


async def create_account(db: AsyncSession, data: AccountCreate) -> dict:
    # 新账户尚无流水，余额恒等于期初余额
    account = Account(
        name=data.name,
        type=data.type,
        balance=data.initialBalance,
        initial_balance=data.initialBalance,
        icon=data.icon,
        color=data.color,
        description=data.description,
        is_default=data.isDefault,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return _to_dict(account)


async def update_account(db: AsyncSession, account_id: str, data: AccountUpdate) -> Optional[dict]:
    account = await db.get(Account, account_id)
    if not account:
        return None
    update_data = data.model_dump(exclude_unset=True)
    # 期初余额修改时把差额同步平移到余额，保持「余额 = 期初 + Σ流水」不变式
    if "initialBalance" in update_data:
        delta = Decimal(str(update_data["initialBalance"])) - Decimal(str(float(account.initial_balance or 0)))
        account.balance += delta
    field_map = {"initialBalance": "initial_balance", "isDefault": "is_default"}
    for key, value in update_data.items():
        attr = field_map.get(key, key)
        setattr(account, attr, value)
    account.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(account)
    return _to_dict(account)


async def delete_account(db: AsyncSession, account_id: str) -> Union[bool, str]:
    account = await db.get(Account, account_id)
    if not account:
        return False
    # Check for referencing transactions
    result = await db.execute(
        select(Transaction.id)
        .where(or_(Transaction.account_id == account_id, Transaction.to_account_id == account_id))
        .limit(1)
    )
    if result.first():
        return "in_use"
    await db.delete(account)
    await db.commit()
    return True
